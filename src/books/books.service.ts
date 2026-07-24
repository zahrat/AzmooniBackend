import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateBookDTO } from './create-book-dto';

@Injectable()
export class BooksService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return await this.prisma.book.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async findWrongBooks(userId: number) {
    const books = await this.prisma.book.findMany({
      where: {
        questions: {
          some: {
            answers: {
              some: { userId, isCorrect: false },
            },
          },
        },
      },
      include: {
        questions: {
          select: {
            answers: {
              where: { userId, isCorrect: false },
              select: { id: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return books.map(({ questions, ...book }) => ({
      ...book,
      wrongAnswersCount: questions.reduce(
        (count, question) => count + question.answers.length,
        0,
      ),
    }));
  }

  async findFavoriteBooks(userId: number) {
    const books = await this.prisma.book.findMany({
      where: {
        questions: {
          some: {
            favoriteQuestions: {
              some: { userId },
            },
          },
        },
      },
      include: {
        questions: {
          select: {
            favoriteQuestions: {
              where: { userId },
              select: { questionId: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return books.map(({ questions, ...book }) => ({
      ...book,
      favoriteQuestionsCount: questions.reduce(
        (count, question) => count + question.favoriteQuestions.length,
        0,
      ),
    }));
  }

  async findOne(id: number) {
    const book = await this.prisma.book.findUnique({ where: { id } });

    if (!book) throw new NotFoundException();
    return book;
  }

  async create(bookDto: CreateBookDTO) {
    await this.prisma.book.create({ data: bookDto });
  }
}
