jest.mock('../prisma.service', () => ({
  PrismaService: class PrismaService {},
}));
jest.mock('node:fs/promises', () => ({
  mkdir: jest.fn().mockResolvedValue(undefined),
  unlink: jest.fn().mockResolvedValue(undefined),
  writeFile: jest.fn().mockResolvedValue(undefined),
}));

import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { writeFile } from 'node:fs/promises';
import { QuestionMode } from './question-mode';
import { QuestionsService } from './questions.service';
import { PrismaService } from '../prisma.service';

describe('QuestionsService', () => {
  let service: QuestionsService;
  let findMany: jest.Mock;
  let create: jest.Mock;
  let findChapter: jest.Mock;

  beforeEach(async () => {
    findMany = jest.fn().mockResolvedValue([]);
    create = jest.fn();
    findChapter = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuestionsService,
        {
          provide: PrismaService,
          useValue: {
            chapter: {
              findUnique: findChapter,
            },
            question: {
              create,
              findMany,
              findUnique: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<QuestionsService>(QuestionsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('creates a question for an existing chapter', async () => {
    const payload = {
      chapterId: 3,
      text: 'Question?',
      optionA: 'A',
      optionB: 'B',
      optionC: 'C',
      optionD: 'D',
      correctOption: 'A',
    };
    findChapter.mockResolvedValue({ id: 3 });
    create.mockResolvedValue({ id: 1, ...payload });

    await expect(service.create(payload)).resolves.toEqual({
      id: 1,
      ...payload,
    });
    expect(findChapter).toHaveBeenCalledWith({
      where: { id: 3 },
      select: { id: true },
    });
    expect(create).toHaveBeenCalledWith({ data: payload });
  });

  it('rejects a question for a missing chapter', async () => {
    findChapter.mockResolvedValue(null);

    await expect(
      service.create({
        chapterId: 3,
        text: 'Question?',
        optionA: 'A',
        optionB: 'B',
        optionC: 'C',
        optionD: 'D',
        correctOption: 'A',
      }),
    ).rejects.toThrow('Chapter not found');
    expect(create).not.toHaveBeenCalled();
  });

  it('stores a valid question image and persists its URL', async () => {
    const payload = {
      chapterId: 3,
      text: 'Question?',
      optionA: 'A',
      optionB: 'B',
      optionC: 'C',
      optionD: 'D',
      correctOption: 'A',
    };
    const image = {
      buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      mimetype: 'image/png',
      size: 8,
    };
    findChapter.mockResolvedValue({ id: 3 });
    create.mockImplementation(({ data }) =>
      Promise.resolve({ id: 1, ...data }),
    );

    const question = await service.create(payload, image);

    expect(writeFile).toHaveBeenCalledWith(
      expect.stringMatching(/uploads[/\\]questions[/\\].+\.png$/),
      image.buffer,
    );
    expect(create).toHaveBeenCalledWith({
      data: {
        ...payload,
        imageUrl: expect.stringMatching(
          /^\/uploads\/questions\/.+\.png$/,
        ) as string,
      },
    });
    expect(question.imageUrl).toMatch(/^\/uploads\/questions\/.+\.png$/);
  });

  it('rejects a file whose content is not a supported image', async () => {
    findChapter.mockResolvedValue({ id: 3 });

    await expect(
      service.create(
        {
          chapterId: 3,
          text: 'Question?',
          optionA: 'A',
          optionB: 'B',
          optionC: 'C',
          optionD: 'D',
          correctOption: 'A',
        },
        {
          buffer: Buffer.from('not an image'),
          mimetype: 'image/png',
          size: 12,
        },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(create).not.toHaveBeenCalled();
  });

  it('returns every question for all mode', async () => {
    await service.findAll(12, QuestionMode.All);

    expect(findMany).toHaveBeenCalledWith({
      orderBy: { createdAt: 'desc' },
      where: { chapter: { bookId: 12 } },
    });
  });

  it('returns questions for a chapter', async () => {
    await service.findByChapter(3, QuestionMode.All);

    expect(findMany).toHaveBeenCalledWith({
      orderBy: { createdAt: 'desc' },
      where: { chapterId: 3 },
    });
  });

  it('filters wrong chapter questions by the authenticated user', async () => {
    await service.findByChapter(3, QuestionMode.Wrong, 7);

    expect(findMany).toHaveBeenCalledWith({
      orderBy: { createdAt: 'desc' },
      where: {
        chapterId: 3,
        answers: {
          some: {
            userId: 7,
            isCorrect: false,
          },
        },
      },
      include: {
        favoriteQuestions: {
          where: { userId: 7 },
          select: { userId: true },
        },
      },
    });
  });

  it('rejects wrong chapter questions without authentication', async () => {
    await expect(service.findByChapter(3, QuestionMode.Wrong)).rejects.toThrow(
      'Authentication is required to fetch wrong questions',
    );
  });

  it('filters wrong questions by the authenticated user', async () => {
    await service.findAll(12, QuestionMode.Wrong, 7);

    expect(findMany).toHaveBeenCalledWith({
      orderBy: { createdAt: 'desc' },
      where: {
        chapter: { bookId: 12 },
        answers: {
          some: {
            userId: 7,
            isCorrect: false,
          },
        },
      },
      include: {
        favoriteQuestions: {
          where: { userId: 7 },
          select: { userId: true },
        },
      },
    });
  });

  it('adds the favorite status for the authenticated user', async () => {
    findMany.mockResolvedValueOnce([
      { id: 1, favoriteQuestions: [{ userId: 7 }] },
      { id: 2, favoriteQuestions: [] },
    ]);

    await expect(service.findAll(12, QuestionMode.All, 7)).resolves.toEqual([
      { id: 1, isFavorite: true },
      { id: 2, isFavorite: false },
    ]);
  });

  it('rejects wrong mode without an authenticated user', async () => {
    await expect(service.findAll(12, QuestionMode.Wrong)).rejects.toThrow(
      'Authentication is required to fetch wrong questions',
    );
  });
});
