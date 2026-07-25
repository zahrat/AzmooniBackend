jest.mock('../prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

describe('UsersController', () => {
  let controller: UsersController;
  let usersService: {
    signup: jest.Mock;
    signIn: jest.Mock;
    refresh: jest.Mock;
  };

  beforeEach(async () => {
    usersService = {
      signup: jest.fn(),
      signIn: jest.fn(),
      refresh: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: usersService,
        },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should delegate signup to the users service', async () => {
    const payload = {
      email: 'user@example.com',
      name: 'Test User',
      password: 'StrongPass123!',
    };

    usersService.signup.mockResolvedValue({ id: 1, email: payload.email });

    await expect(controller.create(payload)).resolves.toEqual({
      id: 1,
      email: payload.email,
    });
    expect(usersService.signup).toHaveBeenCalledWith(payload);
  });

  it('should delegate sign in to the users service', async () => {
    const payload = {
      email: 'user@example.com',
      password: 'StrongPass123!',
    };

    usersService.signIn.mockResolvedValue({
      id: 1,
      email: payload.email,
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    });

    await expect(controller.signIn(payload)).resolves.toEqual({
      id: 1,
      email: payload.email,
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    });
    expect(usersService.signIn).toHaveBeenCalledWith(payload);
  });

  it('should delegate refresh to the users service', async () => {
    usersService.refresh.mockResolvedValue({
      id: 1,
      email: 'user@example.com',
      accessToken: 'new-access-token',
      refreshToken: 'new-refresh-token',
    });

    await expect(
      controller.refresh({ refreshToken: 'old-refresh-token' }),
    ).resolves.toEqual({
      id: 1,
      email: 'user@example.com',
      accessToken: 'new-access-token',
      refreshToken: 'new-refresh-token',
    });
    expect(usersService.refresh).toHaveBeenCalledWith('old-refresh-token');
  });

  it('should return the authenticated user', () => {
    const request = {
      user: {
        id: 1,
        email: 'user@example.com',
      },
    };

    expect(controller.me(request as never)).toEqual(request.user);
  });
});
