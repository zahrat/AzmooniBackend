import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateQuestionDTO } from './create-question-dto';
import { QuestionMode } from './question-mode';

@Injectable()
export class QuestionsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(payload: CreateQuestionDTO) {
    return await this.prisma.question.create({
      data: payload,
    });
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
        bookId,
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
        ...(bookId !== undefined ? { question: { bookId } } : {}),
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

  async favorite(userId: number, questionId: number) {
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

  async unfavorite(userId: number, questionId: number) {
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
