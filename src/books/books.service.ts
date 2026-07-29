import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateBookDTO } from './create-book-dto';

@Injectable()
export class BooksService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return await this.prisma.book.findMany({
      include: { chapters: { orderBy: { order: 'asc' } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findWrongBooks(userId: number) {
    const books = await this.prisma.book.findMany({
      where: {
        chapters: {
          some: {
            questions: {
              some: {
                answers: {
                  some: { userId, isCorrect: false },
                },
              },
            },
          },
        },
      },
      include: {
        chapters: {
          select: {
            questions: {
              select: {
                answers: {
                  where: { userId, isCorrect: false },
                  select: { id: true },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return books.map(({ chapters, ...book }) => ({
      ...book,
      wrongAnswersCount: chapters.reduce(
        (count, chapter) =>
          count +
          chapter.questions.reduce(
            (chapterCount, question) => chapterCount + question.answers.length,
            0,
          ),
        0,
      ),
    }));
  }

  async findFavoriteBooks(userId: number) {
    const books = await this.prisma.book.findMany({
      where: {
        chapters: {
          some: {
            questions: {
              some: {
                favoriteQuestions: {
                  some: { userId },
                },
              },
            },
          },
        },
      },
      include: {
        chapters: {
          select: {
            questions: {
              select: {
                favoriteQuestions: {
                  where: { userId },
                  select: { questionId: true },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return books.map(({ chapters, ...book }) => ({
      ...book,
      favoriteQuestionsCount: chapters.reduce(
        (count, chapter) =>
          count +
          chapter.questions.reduce(
            (chapterCount, question) =>
              chapterCount + question.favoriteQuestions.length,
            0,
          ),
        0,
      ),
    }));
  }

  async findOne(id: number) {
    const book = await this.prisma.book.findUnique({
      where: { id },
      include: { chapters: { orderBy: { order: 'asc' } } },
    });

    if (!book) throw new NotFoundException();
    return book;
  }

  async create(bookDto: CreateBookDTO) {
    if (bookDto.isPaid && !bookDto.priceToman) {
      throw new BadRequestException('Paid books must have a price in toman');
    }

    if (!bookDto.isPaid && bookDto.priceToman !== undefined) {
      throw new BadRequestException('Free books cannot have a price');
    }

    return await this.prisma.book.create({ data: bookDto });
  }
}
