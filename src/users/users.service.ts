import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { CreateUserDTO } from './create-user-dto';
import { AuthResponse, UserResponse } from './user';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma.service';
import { SignInDTO } from './sign-in-dto';
import { JwtPayload } from './user';
import { randomUUID } from 'node:crypto';

const ACCESS_TOKEN_TTL_SECONDS = 14 * 24 * 60 * 60;
const REFRESH_TOKEN_TTL_SECONDS = 24 * 60 * 60;

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async encryptPassword(
    plainText: string,
    saltRounds: number,
  ): Promise<string> {
    return await bcrypt.hash(plainText, saltRounds);
  }

  async signup(payload: CreateUserDTO): Promise<UserResponse> {
    const password = await this.encryptPassword(payload.password, 10);

    try {
      const user = await this.prisma.user.create({
        data: {
          email: payload.email,
          name: payload.name,
          password,
        },
        select: {
          id: true,
          email: true,
        },
      });

      return user;
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException('Email is already registered');
      }

      throw error;
    }
  }

  async signIn(payload: SignInDTO): Promise<AuthResponse> {
    const user = await this.prisma.user.findUnique({
      where: {
        email: payload.email,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isPasswordValid = await bcrypt.compare(
      payload.password,
      user.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const tokens = await this.issueTokens(user.id, user.email);
    await this.storeRefreshToken(user.id, tokens.refreshToken);

    return {
      id: user.id,
      email: user.email,
      ...tokens,
    };
  }

  async refresh(refreshToken: string): Promise<AuthResponse> {
    const payload = await this.verifyRefreshToken(refreshToken);
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        refreshTokenHash: true,
      },
    });

    if (
      !user?.refreshTokenHash ||
      !(await bcrypt.compare(refreshToken, user.refreshTokenHash))
    ) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const tokens = await this.issueTokens(user.id, user.email);
    await this.storeRefreshToken(user.id, tokens.refreshToken);

    return {
      id: user.id,
      email: user.email,
      ...tokens,
    };
  }

  private async issueTokens(
    userId: number,
    email: string,
  ): Promise<Pick<AuthResponse, 'accessToken' | 'refreshToken'>> {
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        { sub: userId, email, type: 'access' satisfies JwtPayload['type'] },
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
          email,
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
        {
          secret: process.env.JWT_REFRESH_SECRET ?? 'dev-refresh-secret',
        },
      );

      if (payload.type !== 'refresh') {
        throw new UnauthorizedException('Invalid refresh token');
      }

      return payload;
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  private async storeRefreshToken(
    userId: number,
    refreshToken: string,
  ): Promise<void> {
    const refreshTokenHash = await this.encryptPassword(refreshToken, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshTokenHash },
    });
  }

  private getTokenTtl(value: string | undefined, fallback: number): number {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
  }

  private isUniqueConstraintError(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'P2002'
    );
  }
}
