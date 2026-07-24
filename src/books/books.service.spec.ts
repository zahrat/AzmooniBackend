jest.mock('../prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import { Test, TestingModule } from '@nestjs/testing';
import { BooksService } from './books.service';
import { PrismaService } from '../prisma.service';

describe('BooksService', () => {
  let service: BooksService;
  let findMany: jest.Mock;

  beforeEach(async () => {
    findMany = jest.fn();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BooksService,
        {
          provide: PrismaService,
          useValue: {
            book: {
              create: jest.fn(),
              findMany,
              findUnique: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<BooksService>(BooksService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('returns only books with wrong answers and their wrong answer count', async () => {
    findMany.mockResolvedValue([
      {
        id: 1,
        title: 'Book 1',
        questions: [
          { answers: [{ id: 10 }, { id: 11 }] },
          { answers: [{ id: 12 }] },
        ],
      },
    ]);

    await expect(service.findWrongBooks(7)).resolves.toEqual([
      { id: 1, title: 'Book 1', wrongAnswersCount: 3 },
    ]);
    expect(findMany).toHaveBeenCalledWith({
      where: {
        questions: {
          some: {
            answers: {
              some: { userId: 7, isCorrect: false },
            },
          },
        },
      },
      include: {
        questions: {
          select: {
            answers: {
              where: { userId: 7, isCorrect: false },
              select: { id: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  });

  it('returns only books with favorite questions and their count', async () => {
    findMany.mockResolvedValue([
      {
        id: 1,
        title: 'Book 1',
        questions: [
          { favoriteQuestions: [{ questionId: 10 }] },
          {
            favoriteQuestions: [{ questionId: 11 }, { questionId: 12 }],
          },
        ],
      },
    ]);

    await expect(service.findFavoriteBooks(7)).resolves.toEqual([
      { id: 1, title: 'Book 1', favoriteQuestionsCount: 3 },
    ]);
    expect(findMany).toHaveBeenCalledWith({
      where: {
        questions: {
          some: {
            favoriteQuestions: {
              some: { userId: 7 },
            },
          },
        },
      },
      include: {
        questions: {
          select: {
            favoriteQuestions: {
              where: { userId: 7 },
              select: { questionId: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  });
});
