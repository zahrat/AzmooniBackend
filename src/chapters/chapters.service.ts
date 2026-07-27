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
    const chapters = await this.prisma.chapter.findMany({
      where: { bookId },
      orderBy: { order: 'asc' },
      include: {
        _count: {
          select: { questions: true },
        },
      },
    });

    const answeredQuestions = await this.prisma.question.findMany({
      where: {
        chapter: { bookId },
        answers: { some: { userId } },
      },
      select: {
        id: true,
        chapterId: true,
        answers: {
          where: { userId },
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { createdAt: true },
        },
      },
    });

    const progressByChapter = answeredQuestions.reduce(
      (progress, question) => {
        const current = progress.get(question.chapterId) ?? {
          answeredQuestions: 0,
          lastAnsweredQuestionId: null,
          lastAnsweredAt: null,
        };
        const answeredAt = question.answers[0]?.createdAt ?? null;

        current.answeredQuestions += 1;
        if (
          answeredAt &&
          (!current.lastAnsweredAt || answeredAt > current.lastAnsweredAt)
        ) {
          current.lastAnsweredQuestionId = question.id;
          current.lastAnsweredAt = answeredAt;
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
        }
      >(),
    );

    return chapters.map(({ _count, ...chapter }) => {
      const chapterProgress = progressByChapter.get(chapter.id);
      const answered = chapterProgress?.answeredQuestions ?? 0;
      const total = _count.questions;

      return {
        ...chapter,
        progress: {
          answeredQuestions: answered,
          totalQuestions: total,
          lastAnsweredQuestionId:
            chapterProgress?.lastAnsweredQuestionId ?? null,
          lastAnsweredAt: chapterProgress?.lastAnsweredAt ?? null,
          percentage: total === 0 ? 0 : Math.round((answered / total) * 100),
        },
      };
    });
  }
}
