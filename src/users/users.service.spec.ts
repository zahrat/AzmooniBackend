jest.mock('../prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma.service';

describe('UsersService', () => {
  let service: UsersService;
  let prisma: { user: { create: jest.Mock } };

  beforeEach(async () => {
    prisma = {
      user: {
        create: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: prisma,
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
});
