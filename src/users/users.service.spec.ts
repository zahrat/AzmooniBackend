jest.mock('../prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma.service';
import * as bcrypt from 'bcryptjs';

describe('UsersService', () => {
  let service: UsersService;
  let prisma: {
    user: { create: jest.Mock; findUnique: jest.Mock; update: jest.Mock };
  };
  let jwtService: { signAsync: jest.Mock; verifyAsync: jest.Mock };

  beforeEach(async () => {
    prisma = {
      user: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };
    jwtService = {
      signAsync: jest
        .fn()
        .mockResolvedValueOnce('access-token')
        .mockResolvedValueOnce('refresh-token'),
      verifyAsync: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
        {
          provide: JwtService,
          useValue: jwtService,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should create a user with a hashed password', async () => {
    prisma.user.create.mockResolvedValue({ id: 1, email: 'user@example.com' });

    await expect(
      service.signup({
        email: 'user@example.com',
        name: 'Test User',
        password: 'StrongPass123!',
      }),
    ).resolves.toEqual({ id: 1, email: 'user@example.com' });

    expect(prisma.user.create).toHaveBeenCalledWith({
      data: {
        email: 'user@example.com',
        name: 'Test User',
        // Jest asymmetric matchers are intentionally typed as any.
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        password: expect.not.stringMatching('StrongPass123!'),
      },
      select: {
        id: true,
        email: true,
      },
    });
  });

  it('should sign in a user with valid credentials', async () => {
    const password = 'StrongPass123!';
    const hashedPassword = await bcrypt.hash(password, 10);

    prisma.user.findUnique.mockResolvedValue({
      id: 1,
      email: 'user@example.com',
      password: hashedPassword,
    });

    await expect(
      service.signIn({
        email: 'user@example.com',
        password,
      }),
    ).resolves.toEqual({
      id: 1,
      email: 'user@example.com',
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    });

    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: {
        email: 'user@example.com',
      },
    });
    expect(jwtService.signAsync).toHaveBeenNthCalledWith(
      1,
      {
        sub: 1,
        email: 'user@example.com',
        type: 'access',
      },
      {
        secret: 'dev-access-secret',
        expiresIn: 1209600,
      },
    );
    expect(jwtService.signAsync).toHaveBeenNthCalledWith(
      2,
      {
        sub: 1,
        email: 'user@example.com',
        type: 'refresh',
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        jti: expect.any(String),
      },
      {
        secret: 'dev-refresh-secret',
        expiresIn: 86400,
      },
    );
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        refreshTokenHash: expect.not.stringMatching('refresh-token'),
      },
    });
  });

  it('should rotate a valid refresh token', async () => {
    const oldRefreshToken = 'old-refresh-token';
    jwtService.verifyAsync.mockResolvedValue({
      sub: 1,
      email: 'user@example.com',
      type: 'refresh',
    });
    prisma.user.findUnique.mockResolvedValue({
      id: 1,
      email: 'user@example.com',
      refreshTokenHash: await bcrypt.hash(oldRefreshToken, 10),
    });

    await expect(service.refresh(oldRefreshToken)).resolves.toEqual({
      id: 1,
      email: 'user@example.com',
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    });

    expect(jwtService.verifyAsync).toHaveBeenCalledWith(oldRefreshToken, {
      secret: 'dev-refresh-secret',
    });
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        refreshTokenHash: expect.not.stringMatching('refresh-token'),
      },
    });
  });

  it('should reject an expired or malformed refresh token', async () => {
    jwtService.verifyAsync.mockRejectedValue(new Error('expired'));

    await expect(service.refresh('expired-token')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it('should reject a refresh token that has been rotated', async () => {
    jwtService.verifyAsync.mockResolvedValue({
      sub: 1,
      email: 'user@example.com',
      type: 'refresh',
    });
    prisma.user.findUnique.mockResolvedValue({
      id: 1,
      email: 'user@example.com',
      refreshTokenHash: await bcrypt.hash('newer-token', 10),
    });

    await expect(service.refresh('old-token')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('should reject sign in when the email does not exist', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(
      service.signIn({
        email: 'missing@example.com',
        password: 'StrongPass123!',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('should reject sign in when the password is invalid', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 1,
      email: 'user@example.com',
      password: await bcrypt.hash('StrongPass123!', 10),
    });

    await expect(
      service.signIn({
        email: 'user@example.com',
        password: 'WrongPass123!',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
