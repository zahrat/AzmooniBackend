jest.mock('../prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { BooksService } from './books.service';
import { PrismaService } from '../prisma.service';

describe('BooksService', () => {
  let service: BooksService;
  let findMany: jest.Mock;
  let create: jest.Mock;

  beforeEach(async () => {
    findMany = jest.fn();
    create = jest.fn();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BooksService,
        {
          provide: PrismaService,
          useValue: {
            book: {
              create,
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
        chapters: [
          {
            questions: [
              { answers: [{ id: 10 }, { id: 11 }] },
              { answers: [{ id: 12 }] },
            ],
          },
        ],
      },
    ]);

    await expect(service.findWrongBooks(7)).resolves.toEqual([
      { id: 1, title: 'Book 1', wrongAnswersCount: 3 },
    ]);
    expect(findMany).toHaveBeenCalledWith({
      where: {
        chapters: {
          some: {
            questions: {
              some: {
                answers: {
                  some: { userId: 7, isCorrect: false },
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
                  where: { userId: 7, isCorrect: false },
                  select: { id: true },
                },
              },
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
        chapters: [
          {
            questions: [
              { favoriteQuestions: [{ questionId: 10 }] },
              {
                favoriteQuestions: [{ questionId: 11 }, { questionId: 12 }],
              },
            ],
          },
        ],
      },
    ]);

    await expect(service.findFavoriteBooks(7)).resolves.toEqual([
      { id: 1, title: 'Book 1', favoriteQuestionsCount: 3 },
    ]);
    expect(findMany).toHaveBeenCalledWith({
      where: {
        chapters: {
          some: {
            questions: {
              some: {
                favoriteQuestions: {
                  some: { userId: 7 },
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
                  where: { userId: 7 },
                  select: { questionId: true },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  });

  it('creates a paid book with a price in toman', async () => {
    create.mockResolvedValue({
      id: 1,
      title: 'Paid book',
      isPaid: true,
      priceToman: 10_000,
    });

    await expect(
      service.create({
        title: 'Paid book',
        isPaid: true,
        priceToman: 10_000,
      }),
    ).resolves.toMatchObject({ id: 1 });
  });

  it('rejects a paid book without a price', async () => {
    await expect(
      service.create({
        title: 'Paid book',
        isPaid: true,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(create).not.toHaveBeenCalled();
  });
});
