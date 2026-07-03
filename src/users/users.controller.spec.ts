jest.mock('../prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

describe('UsersController', () => {
  let controller: UsersController;
  let usersService: { signup: jest.Mock };

  beforeEach(async () => {
    usersService = {
      signup: jest.fn(),
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
});
