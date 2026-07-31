import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateChapterDTO } from './create-chapter-dto';

@Injectable()
export class ChaptersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(payload: CreateChapterDTO) {
    const book = await this.prisma.book.findUnique({
      where: { id: payload.bookId },
      select: { id: true },
    });

    if (!book) {
      throw new NotFoundException('Book not found');
    }

    return await this.prisma.chapter.create({ data: payload });
  }

  async findByBook(bookId: number, userId: number) {
    const [book, chapters, questions] = await Promise.all([
      this.prisma.book.findUnique({
        where: { id: bookId },
        select: {
          purchases: {
            where: { userId },
            select: { userId: true },
            take: 1,
          },
        },
      }),
      this.prisma.chapter.findMany({
        where: { bookId },
        orderBy: { order: 'asc' },
        include: {
          _count: {
            select: { questions: true },
          },
        },
      }),
      this.prisma.question.findMany({
        where: {
          chapter: { bookId },
        },
        select: {
          id: true,
          chapterId: true,
          order: true,
          answers: {
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: { createdAt: true },
          },
        },
      }),
    ]);

    if (!book) {
      throw new NotFoundException('Book not found');
    }

    const hasPurchasedBook = book.purchases.length > 0;

    const progressByChapter = questions.reduce(
      (progress, question) => {
        const answeredAt = question.answers[0]?.createdAt ?? null;
        if (!answeredAt) {
          return progress;
        }

        const current = progress.get(question.chapterId) ?? {
          answeredQuestions: 0,
          lastAnsweredQuestionId: null,
          lastAnsweredAt: null,
          lastAnsweredQuestionOrder: null,
        };

        current.answeredQuestions += 1;
        if (!current.lastAnsweredAt || answeredAt > current.lastAnsweredAt) {
          current.lastAnsweredQuestionId = question.id;
          current.lastAnsweredAt = answeredAt;
          current.lastAnsweredQuestionOrder = question.order;
        }

        progress.set(question.chapterId, current);
        return progress;
      },
      new Map<
        number,
        {
          answeredQuestions: number;
          lastAnsweredQuestionId: number | null;
          lastAnsweredAt: Date | null;
          lastAnsweredQuestionOrder: number | null;
        }
      >(),
    );

    return chapters.map(({ _count, nextQuestionOrder, ...chapter }) => {
      void nextQuestionOrder;
      const chapterProgress = progressByChapter.get(chapter.id);
      const answered = chapterProgress?.answeredQuestions ?? 0;
      const total = _count.questions;
      const lastOrder = chapterProgress?.lastAnsweredQuestionOrder ?? null;
      const nextQuestion =
        lastOrder === null
          ? questions
              .filter((question) => question.chapterId === chapter.id)
              .sort((a, b) => a.order - b.order)[0]
          : questions
              .filter(
                (question) =>
                  question.chapterId === chapter.id &&
                  question.order > lastOrder,
              )
              .sort((a, b) => a.order - b.order)[0];

      return {
        ...chapter,
        canAccess: chapter.isFree || hasPurchasedBook,
        progress: {
          answeredQuestions: answered,
          totalQuestions: total,
          lastAnsweredQuestionId:
            chapterProgress?.lastAnsweredQuestionId ?? null,
          lastAnsweredAt: chapterProgress?.lastAnsweredAt ?? null,
          nextQuestionId: nextQuestion?.id ?? null,
          percentage: total === 0 ? 0 : Math.round((answered / total) * 100),
        },
      };
    });
  }
}
