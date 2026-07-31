import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { Request } from 'express';
import { PrismaService } from '../prisma.service';
import type { JwtUser } from '../users/user';

interface RequestWithUser extends Request {
  user?: JwtUser;
}

@Injectable()
export class QuestionAccessGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const userId = request.user?.id;
    const { bookId, chapterId, id: questionId } = request.params;

    let access: { bookId: number; isFree: boolean } | null;

    if (bookId !== undefined) {
      const book = await this.prisma.book.findUnique({
        where: { id: Number(bookId) },
        select: { id: true },
      });
      access = book ? { bookId: book.id, isFree: false } : null;
    } else if (chapterId !== undefined) {
      const chapter = await this.prisma.chapter.findUnique({
        where: { id: Number(chapterId) },
        select: {
          bookId: true,
          isFree: true,
        },
      });
      access = chapter
        ? {
            bookId: chapter.bookId,
            isFree: chapter.isFree,
          }
        : null;
    } else {
      const question = await this.prisma.question.findUnique({
        where: { id: Number(questionId) },
        select: {
          chapter: {
            select: {
              bookId: true,
              isFree: true,
            },
          },
        },
      });
      access = question
        ? {
            bookId: question.chapter.bookId,
            isFree: question.chapter.isFree,
          }
        : null;
    }

    if (!access || access.isFree) {
      return true;
    }

    if (userId !== undefined) {
      const purchase = await this.prisma.userBookPurchase.findUnique({
        where: {
          userId_bookId: {
            userId,
            bookId: access.bookId,
          },
        },
        select: { userId: true },
      });

      if (purchase) {
        return true;
      }
    }

    throw new ForbiddenException('Purchase is required to access this content');
  }
}
