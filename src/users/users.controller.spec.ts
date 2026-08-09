jest.mock('../prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

describe('UsersController', () => {
  let controller: UsersController;
  let usersService: Record<string, jest.Mock>;

  beforeEach(async () => {
    usersService = {
      requestOtp: jest.fn(),
      verifyOtp: jest.fn(),
      signIn: jest.fn(),
      refresh: jest.fn(),
      changePassword: jest.fn(),
    };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: usersService }],
    }).compile();
    controller = module.get(UsersController);
  });

  it('delegates OTP requests', async () => {
    const payload = { phone: '09121234567' };
    usersService.requestOtp.mockResolvedValue({ retryAfterSeconds: 60 });
    await expect(controller.requestOtp(payload)).resolves.toEqual({
      retryAfterSeconds: 60,
    });
    expect(usersService.requestOtp).toHaveBeenCalledWith(payload);
  });

  it('delegates OTP verification', async () => {
    const payload = { phone: '09121234567', code: '123456' };
    usersService.verifyOtp.mockResolvedValue({ id: 1 });
    await controller.verifyOtp(payload);
    expect(usersService.verifyOtp).toHaveBeenCalledWith(payload);
  });

  it('delegates password sign in', async () => {
    const payload = { phone: '09121234567', password: 'StrongPass123!' };
    usersService.signIn.mockResolvedValue({ id: 1 });
    await controller.signIn(payload);
    expect(usersService.signIn).toHaveBeenCalledWith(payload);
  });

  it('returns the authenticated user', () => {
    const request = { user: { id: 1, phone: '+989121234567' } };
    expect(controller.me(request as never)).toEqual(request.user);
  });

  it('allows an authenticated user to set a password', async () => {
    const request = { user: { id: 1, phone: '+989121234567' } };
    const payload = { newPassword: 'StrongPass123!' };
    await controller.changePassword(request as never, payload);
    expect(usersService.changePassword).toHaveBeenCalledWith(1, payload);
  });
});
