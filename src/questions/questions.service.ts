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
      return await this.prisma.question.create({
        data: {
          ...payload,
          ...(imageUrl ? { imageUrl } : {}),
        },
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
  ) {
    if (mode === QuestionMode.Wrong && userId === undefined) {
      throw new UnauthorizedException(
        'Authentication is required to fetch wrong questions',
      );
    }

    const questions = await this.prisma.question.findMany({
      orderBy: { createdAt: 'desc' },
      where: {
        chapter: { bookId },
        ...(mode === QuestionMode.Wrong
          ? {
              answers: {
                some: {
                  userId,
                  isCorrect: false,
                },
              },
            }
          : {}),
      },
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
    });

    return questions.map((question) => {
      const { favoriteQuestions = [], ...questionData } =
        question as typeof question & {
          favoriteQuestions?: { userId: number }[];
        };

      return {
        ...questionData,
        isFavorite: favoriteQuestions.length > 0,
      };
    });
  }

  async findByChapter(
    chapterId: number,
    mode: QuestionMode = QuestionMode.All,
    userId?: number,
  ) {
    if (mode === QuestionMode.Wrong && userId === undefined) {
      throw new UnauthorizedException(
        'Authentication is required to fetch wrong questions',
      );
    }

    const questions = await this.prisma.question.findMany({
      orderBy: { createdAt: 'desc' },
      where: {
        chapterId,
        ...(mode === QuestionMode.Wrong
          ? {
              answers: {
                some: {
                  userId,
                  isCorrect: false,
                },
              },
            }
          : {}),
      },
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
    });

    return questions.map((question) => {
      const { favoriteQuestions = [], ...questionData } =
        question as typeof question & {
          favoriteQuestions?: { userId: number }[];
        };

      return {
        ...questionData,
        isFavorite: favoriteQuestions.length > 0,
      };
    });
  }

  async findOne(id: number) {
    const question = await this.prisma.question.findUnique({ where: { id } });

    if (!question) throw new NotFoundException('Question not found');
    return question;
  }

  async findFavorites(userId: number, bookId?: number) {
    const favorites = await this.prisma.favoriteQuestion.findMany({
      where: {
        userId,
        ...(bookId !== undefined ? { question: { chapter: { bookId } } } : {}),
      },
      select: {
        question: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return favorites.map(({ question }) => question);
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
}
