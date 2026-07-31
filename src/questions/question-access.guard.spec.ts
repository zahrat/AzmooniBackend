jest.mock('../prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { QuestionAccessGuard } from './question-access.guard';

describe('QuestionAccessGuard', () => {
  const context = (params: Record<string, string>, userId?: number) =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({
          params,
          user: userId === undefined ? undefined : { id: userId },
        }),
      }),
    }) as ExecutionContext;

  it('allows a free chapter', async () => {
    const prisma = {
      chapter: {
        findUnique: jest.fn().mockResolvedValue({
          bookId: 1,
          isFree: true,
        }),
      },
    };
    const guard = new QuestionAccessGuard(prisma as never);

    await expect(guard.canActivate(context({ chapterId: '10' }))).resolves.toBe(
      true,
    );
  });

  it('allows purchased content', async () => {
    const prisma = {
      book: {
        findUnique: jest.fn().mockResolvedValue({ id: 1 }),
      },
      userBookPurchase: {
        findUnique: jest.fn().mockResolvedValue({ userId: 7 }),
      },
    };
    const guard = new QuestionAccessGuard(prisma as never);

    await expect(guard.canActivate(context({ bookId: '1' }, 7))).resolves.toBe(
      true,
    );
  });

  it('rejects non-free content without a purchase', async () => {
    const prisma = {
      question: {
        findUnique: jest.fn().mockResolvedValue({
          chapter: {
            bookId: 1,
            isFree: false,
          },
        }),
      },
      userBookPurchase: {
        findUnique: jest.fn().mockResolvedValue(null),
      },
    };
    const guard = new QuestionAccessGuard(prisma as never);

    await expect(
      guard.canActivate(context({ id: '20' }, 7)),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
