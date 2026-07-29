jest.mock('../prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '../../generated/prisma/enums';
import { PrismaService } from '../prisma.service';
import type { JwtUser } from './user';
import { RolesGuard } from './roles.guard';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: { getAllAndOverride: jest.Mock };
  let prisma: { user: { findUnique: jest.Mock } };

  function context(user?: JwtUser): ExecutionContext {
    return {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    } as unknown as ExecutionContext;
  }

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn().mockReturnValue([UserRole.ADMIN]),
    };
    prisma = {
      user: {
        findUnique: jest.fn(),
      },
    };

    guard = new RolesGuard(
      reflector as unknown as Reflector,
      prisma as unknown as PrismaService,
    );
  });

  it('allows an administrator using the current database role', async () => {
    prisma.user.findUnique.mockResolvedValue({ role: UserRole.ADMIN });

    await expect(
      guard.canActivate(context({ id: 7, email: 'admin@example.com' })),
    ).resolves.toBe(true);

    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: 7 },
      select: { role: true },
    });
  });

  it('rejects a regular user', async () => {
    prisma.user.findUnique.mockResolvedValue({ role: UserRole.USER });

    await expect(
      guard.canActivate(context({ id: 7, email: 'user@example.com' })),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects a missing authenticated user', async () => {
    await expect(guard.canActivate(context())).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it('allows routes without role requirements', async () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);

    await expect(guard.canActivate(context())).resolves.toBe(true);
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });
});
