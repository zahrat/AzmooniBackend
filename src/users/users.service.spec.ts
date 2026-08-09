/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
jest.mock('../prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import { Test, TestingModule } from '@nestjs/testing';
import { HttpException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { createHmac } from 'node:crypto';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma.service';
import { SMS_SENDER } from './sms-sender';
import { UsersService } from './users.service';

describe('UsersService', () => {
  let service: UsersService;
  let prisma: any;
  let jwtService: { signAsync: jest.Mock; verifyAsync: jest.Mock };
  let smsSender: { sendOtp: jest.Mock };

  beforeEach(async () => {
    const transaction = {
      otpChallenge: { deleteMany: jest.fn() },
      user: { upsert: jest.fn() },
    };
    prisma = {
      otpChallenge: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
        deleteMany: jest.fn(),
        updateMany: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      $transaction: jest.fn((callback: (tx: any) => unknown) =>
        callback(transaction),
      ),
      transaction,
    };
    jwtService = {
      signAsync: jest
        .fn()
        .mockResolvedValueOnce('access-token')
        .mockResolvedValueOnce('refresh-token'),
      verifyAsync: jest.fn(),
    };
    smsSender = { sendOtp: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwtService },
        { provide: SMS_SENDER, useValue: smsSender },
      ],
    }).compile();

    service = module.get(UsersService);
  });

  it('requests an OTP using a canonical phone number and a hashed code', async () => {
    prisma.otpChallenge.findUnique.mockResolvedValue(null);

    await expect(service.requestOtp({ phone: '09121234567' })).resolves.toEqual(
      { retryAfterSeconds: 60 },
    );

    const code = smsSender.sendOtp.mock.calls[0][1] as string;
    expect(smsSender.sendOtp).toHaveBeenCalledWith('+989121234567', code);
    expect(code).toMatch(/^\d{6}$/);
    expect(prisma.otpChallenge.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { phone: '+989121234567' },
        create: expect.objectContaining({
          phone: '+989121234567',
          codeHash: expect.not.stringContaining(code),
        }),
      }),
    );
  });

  it('rate limits repeated OTP requests', async () => {
    prisma.otpChallenge.findUnique.mockResolvedValue({
      lastSentAt: new Date(),
    });

    await expect(
      service.requestOtp({ phone: '+989121234567' }),
    ).rejects.toBeInstanceOf(HttpException);
    expect(smsSender.sendOtp).not.toHaveBeenCalled();
  });

  it('verifies an OTP, creates the user, and returns tokens', async () => {
    const phone = '+989121234567';
    const code = '123456';
    const codeHash = createHmac('sha256', 'dev-otp-secret')
      .update(`${phone}:${code}`)
      .digest('hex');
    prisma.otpChallenge.findUnique.mockResolvedValue({
      phone,
      codeHash,
      attempts: 0,
      expiresAt: new Date(Date.now() + 60_000),
    });
    prisma.transaction.otpChallenge.deleteMany.mockResolvedValue({ count: 1 });
    prisma.transaction.user.upsert.mockResolvedValue({
      id: 1,
      phone,
      password: null,
    });

    await expect(
      service.verifyOtp({ phone: '09121234567', code, name: 'Test' }),
    ).resolves.toEqual({
      id: 1,
      phone,
      hasPassword: false,
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    });
    expect(prisma.transaction.user.upsert).toHaveBeenCalledWith({
      where: { phone },
      create: { phone, name: 'Test' },
      update: {},
      select: { id: true, phone: true, password: true },
    });
  });

  it('counts an invalid OTP attempt', async () => {
    prisma.otpChallenge.findUnique.mockResolvedValue({
      codeHash: 'wrong-hash',
      attempts: 0,
      expiresAt: new Date(Date.now() + 60_000),
    });

    await expect(
      service.verifyOtp({ phone: '09121234567', code: '123456' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(prisma.otpChallenge.updateMany).toHaveBeenCalledWith({
      where: { phone: '+989121234567', codeHash: 'wrong-hash' },
      data: { attempts: { increment: 1 } },
    });
  });

  it('signs in using phone and an existing password', async () => {
    const password = 'StrongPass123!';
    prisma.user.findUnique.mockResolvedValue({
      id: 1,
      phone: '+989121234567',
      password: await bcrypt.hash(password, 10),
    });

    await expect(
      service.signIn({ phone: '09121234567', password }),
    ).resolves.toEqual({
      id: 1,
      phone: '+989121234567',
      hasPassword: true,
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    });
  });

  it('allows setting the first password without a current password', async () => {
    prisma.user.findUnique.mockResolvedValue({ password: null });

    await expect(
      service.changePassword(1, { newPassword: 'StrongPass123!' }),
    ).resolves.toBeUndefined();
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: {
        password: expect.not.stringMatching('StrongPass123!'),
        refreshTokenHash: null,
      },
    });
  });

  it('requires the current password when changing an existing password', async () => {
    prisma.user.findUnique.mockResolvedValue({
      password: await bcrypt.hash('StrongPass123!', 10),
    });

    await expect(
      service.changePassword(1, { newPassword: 'NewStrongPass456!' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });
});
