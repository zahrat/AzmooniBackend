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

  beforeEach(async () => {
    findBook = jest.fn();
    createChapter = jest.fn();
    findChapters = jest.fn();
    findQuestions = jest.fn().mockResolvedValue([]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChaptersService,
        {
          provide: PrismaService,
          useValue: {
            book: { findUnique: findBook },
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
});
