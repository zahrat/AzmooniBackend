import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { createHmac, randomInt, randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma.service';
import { ChangePasswordDTO } from './change-password-dto';
import { RequestOtpDTO } from './request-otp-dto';
import { SignInDTO } from './sign-in-dto';
import { SMS_SENDER, type SmsSender } from './sms-sender';
import type { AuthResponse, JwtPayload } from './user';
import { VerifyOtpDTO } from './verify-otp-dto';

const ACCESS_TOKEN_TTL_SECONDS = 14 * 24 * 60 * 60;
const REFRESH_TOKEN_TTL_SECONDS = 24 * 60 * 60;
const OTP_TTL_SECONDS = 2 * 60;
const OTP_RESEND_SECONDS = 60;
const OTP_MAX_ATTEMPTS = 5;

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    @Inject(SMS_SENDER) private readonly smsSender: SmsSender,
  ) {}

  async requestOtp(
    payload: RequestOtpDTO,
  ): Promise<{ retryAfterSeconds: number }> {
    const phone = this.normalizePhone(payload.phone);
    const now = new Date();
    const existing = await this.prisma.otpChallenge.findUnique({
      where: { phone },
      select: { lastSentAt: true },
    });

    if (existing) {
      const elapsedSeconds = Math.floor(
        (now.getTime() - existing.lastSentAt.getTime()) / 1000,
      );
      if (elapsedSeconds < OTP_RESEND_SECONDS) {
        throw new HttpException(
          {
            message: 'Please wait before requesting another code',
            retryAfterSeconds: OTP_RESEND_SECONDS - elapsedSeconds,
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    }

    const code = randomInt(100_000, 1_000_000).toString();
    const codeHash = this.hashOtp(phone, code);
    await this.prisma.otpChallenge.upsert({
      where: { phone },
      create: {
        phone,
        codeHash,
        expiresAt: new Date(now.getTime() + OTP_TTL_SECONDS * 1000),
        lastSentAt: now,
      },
      update: {
        codeHash,
        expiresAt: new Date(now.getTime() + OTP_TTL_SECONDS * 1000),
        attempts: 0,
        lastSentAt: now,
      },
    });

    try {
      await this.smsSender.sendOtp(phone, code);
    } catch {
      await this.prisma.otpChallenge.deleteMany({
        where: { phone, codeHash },
      });
      throw new ServiceUnavailableException('Unable to send verification code');
    }

    return { retryAfterSeconds: OTP_RESEND_SECONDS };
  }

  async verifyOtp(payload: VerifyOtpDTO): Promise<AuthResponse> {
    const phone = this.normalizePhone(payload.phone);
    const challenge = await this.prisma.otpChallenge.findUnique({
      where: { phone },
    });
    const now = new Date();

    if (!challenge || challenge.expiresAt <= now) {
      if (challenge) {
        await this.prisma.otpChallenge.deleteMany({ where: { phone } });
      }
      throw new UnauthorizedException('Invalid or expired verification code');
    }

    if (challenge.attempts >= OTP_MAX_ATTEMPTS) {
      throw new UnauthorizedException('Too many verification attempts');
    }

    if (challenge.codeHash !== this.hashOtp(phone, payload.code)) {
      await this.prisma.otpChallenge.updateMany({
        where: { phone, codeHash: challenge.codeHash },
        data: { attempts: { increment: 1 } },
      });
      throw new UnauthorizedException('Invalid or expired verification code');
    }

    const user = await this.prisma.$transaction(async (transaction) => {
      const consumed = await transaction.otpChallenge.deleteMany({
        where: {
          phone,
          codeHash: challenge.codeHash,
          expiresAt: { gt: now },
          attempts: { lt: OTP_MAX_ATTEMPTS },
        },
      });
      if (consumed.count !== 1) {
        throw new UnauthorizedException('Verification code was already used');
      }

      return transaction.user.upsert({
        where: { phone },
        create: { phone, name: payload.name },
        update: {},
        select: { id: true, phone: true, password: true },
      });
    });

    return this.authenticate(user.id, phone, Boolean(user.password));
  }

  async signIn(payload: SignInDTO): Promise<AuthResponse> {
    const phone = this.normalizePhone(payload.phone);
    const user = await this.prisma.user.findUnique({ where: { phone } });

    if (
      !user?.password ||
      !(await bcrypt.compare(payload.password, user.password))
    ) {
      throw new UnauthorizedException('Invalid phone or password');
    }

    return this.authenticate(user.id, phone, true);
  }

  async refresh(refreshToken: string): Promise<AuthResponse> {
    const payload = await this.verifyRefreshToken(refreshToken);
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        phone: true,
        password: true,
        refreshTokenHash: true,
      },
    });

    if (
      !user?.phone ||
      !user.refreshTokenHash ||
      !(await bcrypt.compare(refreshToken, user.refreshTokenHash))
    ) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    return this.authenticate(user.id, user.phone, Boolean(user.password));
  }

  async changePassword(
    userId: number,
    payload: ChangePasswordDTO,
  ): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { password: true },
    });
    if (!user) {
      throw new UnauthorizedException();
    }

    if (user.password) {
      if (
        !payload.currentPassword ||
        !(await bcrypt.compare(payload.currentPassword, user.password))
      ) {
        throw new UnauthorizedException('Current password is incorrect');
      }
      if (await bcrypt.compare(payload.newPassword, user.password)) {
        throw new BadRequestException(
          'New password must be different from current password',
        );
      }
    }

    const password = await bcrypt.hash(payload.newPassword, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { password, refreshTokenHash: null },
    });
  }

  private async authenticate(
    userId: number,
    phone: string,
    hasPassword: boolean,
  ): Promise<AuthResponse> {
    const tokens = await this.issueTokens(userId, phone);
    await this.storeRefreshToken(userId, tokens.refreshToken);
    return { id: userId, phone, hasPassword, ...tokens };
  }

  private async issueTokens(userId: number, phone: string) {
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        { sub: userId, phone, type: 'access' satisfies JwtPayload['type'] },
        {
          secret: process.env.JWT_ACCESS_SECRET ?? 'dev-access-secret',
          expiresIn: this.getTokenTtl(
            process.env.JWT_ACCESS_TTL_SECONDS,
            ACCESS_TOKEN_TTL_SECONDS,
          ),
        },
      ),
      this.jwtService.signAsync(
        {
          sub: userId,
          phone,
          type: 'refresh' satisfies JwtPayload['type'],
          jti: randomUUID(),
        },
        {
          secret: process.env.JWT_REFRESH_SECRET ?? 'dev-refresh-secret',
          expiresIn: this.getTokenTtl(
            process.env.JWT_REFRESH_TTL_SECONDS,
            REFRESH_TOKEN_TTL_SECONDS,
          ),
        },
      ),
    ]);
    return { accessToken, refreshToken };
  }

  private async verifyRefreshToken(refreshToken: string): Promise<JwtPayload> {
    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(
        refreshToken,
        { secret: process.env.JWT_REFRESH_SECRET ?? 'dev-refresh-secret' },
      );
      if (payload.type !== 'refresh') {
        throw new Error('wrong token type');
      }
      return payload;
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  private async storeRefreshToken(userId: number, refreshToken: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshTokenHash: await bcrypt.hash(refreshToken, 10) },
    });
  }

  private normalizePhone(value: string): string {
    const digits = value.replace(/^\+/, '').replace(/^00/, '');
    if (digits.startsWith('0')) return `+98${digits.slice(1)}`;
    if (digits.startsWith('98')) return `+${digits}`;
    return `+98${digits}`;
  }

  private hashOtp(phone: string, code: string): string {
    const secret = process.env.OTP_SECRET?.trim();
    if (!secret && process.env.NODE_ENV === 'production') {
      throw new ServiceUnavailableException('OTP service is not configured');
    }
    return createHmac('sha256', secret || 'dev-otp-secret')
      .update(`${phone}:${code}`)
      .digest('hex');
  }

  private getTokenTtl(value: string | undefined, fallback: number): number {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
  }
}
