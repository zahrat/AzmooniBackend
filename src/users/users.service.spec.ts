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
  let prisma: { user: { create: jest.Mock; findUnique: jest.Mock } };
  let jwtService: { signAsync: jest.Mock };

  beforeEach(async () => {
    prisma = {
      user: {
        create: jest.fn(),
        findUnique: jest.fn(),
      },
    };
    jwtService = {
      signAsync: jest.fn().mockResolvedValue('jwt-token'),
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
      accessToken: 'jwt-token',
    });

    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: {
        email: 'user@example.com',
      },
    });
    expect(jwtService.signAsync).toHaveBeenCalledWith({
      sub: 1,
      email: 'user@example.com',
    });
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
