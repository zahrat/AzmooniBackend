jest.mock('../prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma.service';
import { ChaptersService } from './chapters.service';

describe('ChaptersService', () => {
  let service: ChaptersService;
  let findBook: jest.Mock;
  let createChapter: jest.Mock;
  let findChapters: jest.Mock;
  let findQuestions: jest.Mock;
  let findPurchaseState: jest.Mock;

  beforeEach(async () => {
    findBook = jest.fn();
    createChapter = jest.fn();
    findChapters = jest.fn();
    findQuestions = jest.fn().mockResolvedValue([]);
    findPurchaseState = jest
      .fn()
      .mockResolvedValue({ purchases: [{ userId: 7 }] });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChaptersService,
        {
          provide: PrismaService,
          useValue: {
            book: {
              findUnique: jest.fn((...args: unknown[]) => {
                const query = args[0] as {
                  select?: { purchases?: unknown };
                };
                return (
                  query.select?.purchases
                    ? findPurchaseState(...args)
                    : findBook(...args)
                ) as unknown;
              }),
            },
            chapter: {
              create: createChapter,
              findMany: findChapters,
            },
            question: {
              findMany: findQuestions,
            },
          },
        },
      ],
    }).compile();

    service = module.get<ChaptersService>(ChaptersService);
  });

  it('creates a chapter for an existing book', async () => {
    const payload = { bookId: 1, title: 'Meaningful Names', order: 2 };
    findBook.mockResolvedValue({ id: 1 });
    createChapter.mockResolvedValue({ id: 3, ...payload });

    await expect(service.create(payload)).resolves.toEqual({
      id: 3,
      ...payload,
    });
    expect(createChapter).toHaveBeenCalledWith({ data: payload });
  });

  it('rejects a chapter for a missing book', async () => {
    findBook.mockResolvedValue(null);

    await expect(
      service.create({ bookId: 99, title: 'Chapter', order: 1 }),
    ).rejects.toThrow('Book not found');
    expect(createChapter).not.toHaveBeenCalled();
  });

  it('returns book chapters in their defined order', async () => {
    findChapters.mockResolvedValue([]);

    await service.findByBook(1, 7);

    expect(findPurchaseState).toHaveBeenCalledWith({
      where: { id: 1 },
      select: {
        purchases: {
          where: { userId: 7 },
          select: { userId: true },
          take: 1,
        },
      },
    });
    expect(findChapters).toHaveBeenCalledWith({
      where: { bookId: 1 },
      orderBy: { order: 'asc' },
      include: {
        _count: {
          select: { questions: true },
        },
      },
    });
    expect(findQuestions).toHaveBeenCalledWith({
      where: {
        chapter: { bookId: 1 },
      },
      select: {
        id: true,
        chapterId: true,
        order: true,
        answers: {
          where: { userId: 7 },
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { createdAt: true },
        },
      },
    });
  });

  it('returns progress based on distinct answered questions in each chapter', async () => {
    findChapters.mockResolvedValue([
      {
        id: 10,
        bookId: 1,
        title: 'First',
        order: 1,
        _count: { questions: 4 },
      },
      {
        id: 11,
        bookId: 1,
        title: 'Second',
        order: 2,
        _count: { questions: 0 },
      },
    ]);
    findQuestions.mockResolvedValue([
      {
        id: 101,
        chapterId: 10,
        order: 1,
        answers: [{ createdAt: new Date('2026-07-27T08:00:00.000Z') }],
      },
      {
        id: 102,
        chapterId: 10,
        order: 2,
        answers: [{ createdAt: new Date('2026-07-27T10:00:00.000Z') }],
      },
      {
        id: 103,
        chapterId: 10,
        order: 3,
        answers: [{ createdAt: new Date('2026-07-27T09:00:00.000Z') }],
      },
      {
        id: 104,
        chapterId: 10,
        order: 4,
        answers: [],
      },
    ]);

    await expect(service.findByBook(1, 7)).resolves.toEqual([
      {
        id: 10,
        bookId: 1,
        title: 'First',
        order: 1,
        canAccess: true,
        progress: {
          answeredQuestions: 3,
          totalQuestions: 4,
          lastAnsweredQuestionId: 102,
          lastAnsweredAt: new Date('2026-07-27T10:00:00.000Z'),
          nextQuestionId: 103,
          percentage: 75,
        },
      },
      {
        id: 11,
        bookId: 1,
        title: 'Second',
        order: 2,
        canAccess: true,
        progress: {
          answeredQuestions: 0,
          totalQuestions: 0,
          lastAnsweredQuestionId: null,
          lastAnsweredAt: null,
          nextQuestionId: null,
          percentage: 0,
        },
      },
    ]);
  });

  it('only grants access to free chapters of an unpurchased book', async () => {
    findPurchaseState.mockResolvedValue({ purchases: [] });
    findChapters.mockResolvedValue([
      {
        id: 10,
        bookId: 1,
        title: 'Preview',
        order: 1,
        isFree: true,
        _count: { questions: 0 },
      },
      {
        id: 11,
        bookId: 1,
        title: 'Premium',
        order: 2,
        isFree: false,
        _count: { questions: 0 },
      },
    ]);

    const chapters = await service.findByBook(1, 7);

    expect(chapters.map(({ id, canAccess }) => ({ id, canAccess }))).toEqual([
      { id: 10, canAccess: true },
      { id: 11, canAccess: false },
    ]);
  });

  it('grants access to every chapter after purchasing a book', async () => {
    findPurchaseState.mockResolvedValue({
      purchases: [{ userId: 7 }],
    });
    findChapters.mockResolvedValue([
      {
        id: 10,
        bookId: 1,
        title: 'Premium',
        order: 1,
        isFree: false,
        _count: { questions: 0 },
      },
    ]);

    const chapters = await service.findByBook(1, 7);

    expect(chapters[0].canAccess).toBe(true);
  });

  it('rejects chapter listing for a missing book', async () => {
    findPurchaseState.mockResolvedValue(null);
    findChapters.mockResolvedValue([]);

    await expect(service.findByBook(99, 7)).rejects.toThrow('Book not found');
  });
});
