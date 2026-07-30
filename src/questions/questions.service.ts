import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma.service';
import { CreateQuestionDTO } from './create-question-dto';
import { PaginationQueryDTO } from './pagination-query.dto';
import { QuestionMode } from './question-mode';

interface UploadedImage {
  buffer: Buffer;
  mimetype: string;
  size: number;
}

const IMAGE_TYPES = {
  'image/jpeg': {
    extension: 'jpg',
    matches: (buffer: Buffer) =>
      buffer.length >= 3 &&
      buffer[0] === 0xff &&
      buffer[1] === 0xd8 &&
      buffer[2] === 0xff,
  },
  'image/png': {
    extension: 'png',
    matches: (buffer: Buffer) =>
      buffer.length >= 8 &&
      buffer
        .subarray(0, 8)
        .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  },
  'image/gif': {
    extension: 'gif',
    matches: (buffer: Buffer) =>
      buffer.length >= 6 &&
      ['GIF87a', 'GIF89a'].includes(buffer.subarray(0, 6).toString('ascii')),
  },
  'image/webp': {
    extension: 'webp',
    matches: (buffer: Buffer) =>
      buffer.length >= 12 &&
      buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
      buffer.subarray(8, 12).toString('ascii') === 'WEBP',
  },
} as const;

const DEFAULT_PAGINATION: PaginationQueryDTO = { page: 1, limit: 20 };

@Injectable()
export class QuestionsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(payload: CreateQuestionDTO, image?: UploadedImage) {
    const chapter = await this.prisma.chapter.findUnique({
      where: { id: payload.chapterId },
      select: { id: true },
    });

    if (!chapter) {
      throw new NotFoundException('Chapter not found');
    }

    let storedImagePath: string | undefined;
    let imageUrl: string | undefined;

    if (image) {
      const imageType = IMAGE_TYPES[image.mimetype as keyof typeof IMAGE_TYPES];

      if (!imageType || !imageType.matches(image.buffer)) {
        throw new BadRequestException(
          'Image must be a valid JPEG, PNG, GIF, or WebP file',
        );
      }

      const uploadsDirectory = join(process.cwd(), 'uploads', 'questions');
      const filename = `${randomUUID()}.${imageType.extension}`;
      storedImagePath = join(uploadsDirectory, filename);
      imageUrl = `/uploads/questions/${filename}`;

      await mkdir(uploadsDirectory, { recursive: true });
      await writeFile(storedImagePath, image.buffer);
    }

    try {
      return await this.prisma.$transaction(async (transaction) => {
        const chapterWithAllocatedOrder = await transaction.chapter.update({
          where: { id: payload.chapterId },
          data: {
            nextQuestionOrder: { increment: 1 },
          },
          select: { nextQuestionOrder: true },
        });

        return transaction.question.create({
          data: {
            ...payload,
            order: chapterWithAllocatedOrder.nextQuestionOrder - 1,
            ...(imageUrl ? { imageUrl } : {}),
          },
        });
      });
    } catch (error) {
      if (storedImagePath) {
        await unlink(storedImagePath).catch(() => undefined);
      }
      throw error;
    }
  }

  async findAll(
    bookId: number,
    mode: QuestionMode = QuestionMode.All,
    userId?: number,
    pagination: PaginationQueryDTO = DEFAULT_PAGINATION,
  ) {
    if (mode !== QuestionMode.All && userId === undefined) {
      throw new UnauthorizedException(
        `Authentication is required to fetch ${mode} questions`,
      );
    }

    const wrongQuestionIds =
      mode === QuestionMode.Wrong
        ? await this.findLatestWrongQuestionIds(userId!, {
            chapter: { bookId },
          })
        : undefined;

    const where = {
      chapter: { bookId },
      ...(wrongQuestionIds ? { id: { in: wrongQuestionIds } } : {}),
      ...(mode === QuestionMode.Favorite
        ? { favoriteQuestions: { some: { userId: userId! } } }
        : {}),
    };

    const [total, questions] = await Promise.all([
      this.prisma.question.count({ where }),
      this.prisma.question.findMany({
        orderBy: [
          { chapter: { order: 'asc' } },
          { order: 'asc' },
          { id: 'asc' },
        ],
        where,
        skip: (pagination.page - 1) * pagination.limit,
        take: pagination.limit,
        ...(userId !== undefined
          ? {
              include: {
                favoriteQuestions: {
                  where: { userId },
                  select: { userId: true },
                },
              },
            }
          : {}),
      }),
    ]);

    const data = questions.map((question) => {
      const { favoriteQuestions = [], ...questionData } =
        question as typeof question & {
          favoriteQuestions?: { userId: number }[];
        };

      return {
        ...questionData,
        isFavorite: favoriteQuestions.length > 0,
      };
    });

    return this.paginatedResponse(data, total, pagination);
  }

  async findByChapter(
    chapterId: number,
    mode: QuestionMode = QuestionMode.All,
    userId?: number,
    pagination: PaginationQueryDTO = DEFAULT_PAGINATION,
  ) {
    if (mode !== QuestionMode.All && userId === undefined) {
      throw new UnauthorizedException(
        `Authentication is required to fetch ${mode} questions`,
      );
    }

    const wrongQuestionIds =
      mode === QuestionMode.Wrong
        ? await this.findLatestWrongQuestionIds(userId!, { chapterId })
        : undefined;

    const where = {
      chapterId,
      ...(wrongQuestionIds ? { id: { in: wrongQuestionIds } } : {}),
      ...(mode === QuestionMode.Favorite
        ? { favoriteQuestions: { some: { userId: userId! } } }
        : {}),
    };

    const [total, questions] = await Promise.all([
      this.prisma.question.count({ where }),
      this.prisma.question.findMany({
        orderBy: [{ order: 'asc' }, { id: 'asc' }],
        where,
        skip: (pagination.page - 1) * pagination.limit,
        take: pagination.limit,
        ...(userId !== undefined
          ? {
              include: {
                favoriteQuestions: {
                  where: { userId },
                  select: { userId: true },
                },
              },
            }
          : {}),
      }),
    ]);

    const data = questions.map((question) => {
      const { favoriteQuestions = [], ...questionData } =
        question as typeof question & {
          favoriteQuestions?: { userId: number }[];
        };

      return {
        ...questionData,
        isFavorite: favoriteQuestions.length > 0,
      };
    });

    return this.paginatedResponse(data, total, pagination);
  }

  async findOne(id: number) {
    const question = await this.prisma.question.findUnique({ where: { id } });

    if (!question) throw new NotFoundException('Question not found');
    return question;
  }

  private async findLatestWrongQuestionIds(
    userId: number,
    questionWhere: { chapterId: number } | { chapter: { bookId: number } },
  ) {
    const latestAnswers = await this.prisma.userAnswer.findMany({
      where: {
        userId,
        question: questionWhere,
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      select: {
        questionId: true,
        isCorrect: true,
      },
    });

    const seenQuestionIds = new Set<number>();

    return latestAnswers
      .filter((answer) => {
        if (seenQuestionIds.has(answer.questionId)) {
          return false;
        }

        seenQuestionIds.add(answer.questionId);
        return true;
      })
      .filter((answer) => !answer.isCorrect)
      .map((answer) => answer.questionId);
  }

  async findFavorites(
    userId: number,
    bookId?: number,
    pagination: PaginationQueryDTO = DEFAULT_PAGINATION,
  ) {
    const where = {
      userId,
      ...(bookId !== undefined ? { question: { chapter: { bookId } } } : {}),
    };

    const [total, favorites] = await Promise.all([
      this.prisma.favoriteQuestion.count({ where }),
      this.prisma.favoriteQuestion.findMany({
        where,
        select: {
          question: true,
        },
        orderBy: [{ createdAt: 'desc' }, { questionId: 'desc' }],
        skip: (pagination.page - 1) * pagination.limit,
        take: pagination.limit,
      }),
    ]);

    return this.paginatedResponse(
      favorites.map(({ question }) => question),
      total,
      pagination,
    );
  }

  async favorite(questionId: number, userId: number) {
    const isExist = await this.prisma.favoriteQuestion.findUnique({
      where: {
        userId_questionId: {
          userId,
          questionId,
        },
      },
    });

    if (isExist) {
      throw new ConflictException('Question is already favorited');
    }

    return await this.prisma.favoriteQuestion.create({
      data: { userId, questionId },
    });
  }

  async unfavorite(questionId: number, userId: number) {
    const isExist = await this.prisma.favoriteQuestion.findUnique({
      where: {
        userId_questionId: {
          userId,
          questionId,
        },
      },
    });

    if (!isExist) {
      throw new NotFoundException('Question is not favorited');
    }

    return await this.prisma.favoriteQuestion.delete({
      where: { userId_questionId: { userId, questionId } },
    });
  }

  private paginatedResponse<T>(
    data: T[],
    total: number,
    { page, limit }: PaginationQueryDTO,
  ) {
    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
