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

    let access: { bookId: number; isFree: boolean; isPaid: boolean } | null;

    if (bookId !== undefined) {
      const book = await this.prisma.book.findUnique({
        where: { id: Number(bookId) },
        select: { id: true, isPaid: true },
      });
      access = book
        ? { bookId: book.id, isFree: false, isPaid: book.isPaid }
        : null;
    } else if (chapterId !== undefined) {
      const chapter = await this.prisma.chapter.findUnique({
        where: { id: Number(chapterId) },
        select: {
          bookId: true,
          isFree: true,
          book: { select: { isPaid: true } },
        },
      });
      access = chapter
        ? {
            bookId: chapter.bookId,
            isFree: chapter.isFree,
            isPaid: chapter.book.isPaid,
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
              book: { select: { isPaid: true } },
            },
          },
        },
      });
      access = question
        ? {
            bookId: question.chapter.bookId,
            isFree: question.chapter.isFree,
            isPaid: question.chapter.book.isPaid,
          }
        : null;
    }

    if (!access || !access.isPaid || access.isFree) {
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
