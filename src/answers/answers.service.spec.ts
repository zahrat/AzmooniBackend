jest.mock('../prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import { Test, TestingModule } from '@nestjs/testing';
import { AnswersService } from './answers.service';
import { PrismaService } from '../prisma.service';

describe('AnswersService', () => {
  let service: AnswersService;
  let prisma: {
    question: {
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      count: jest.Mock;
    };
    userAnswer: { create: jest.Mock; findMany: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      question: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        count: jest.fn(),
      },
      userAnswer: {
        create: jest.fn(),
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnswersService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = module.get<AnswersService>(AnswersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('returns the updated progress after saving an answer', async () => {
    prisma.question.findUnique.mockResolvedValue({
      correctOption: 'B',
      chapterId: 3,
      order: 2,
    });
    prisma.userAnswer.create.mockResolvedValue({
      id: 9,
      userId: 7,
      questionId: 12,
      selectedOption: 'B',
      isCorrect: true,
      createdAt: new Date('2026-07-27T10:00:00.000Z'),
    });
    prisma.question.count.mockResolvedValue(4);
    prisma.question.findFirst.mockResolvedValue({ id: 13 });
    prisma.userAnswer.findMany.mockResolvedValue([
      { questionId: 10 },
      { questionId: 12 },
    ]);

    await expect(
      service.create(7, { questionId: 12, selectedOption: 'B' }),
    ).resolves.toEqual({
      id: 9,
      userId: 7,
      questionId: 12,
      selectedOption: 'B',
      isCorrect: true,
      createdAt: new Date('2026-07-27T10:00:00.000Z'),
      progress: {
        chapterId: 3,
        answeredQuestions: 2,
        totalQuestions: 4,
        lastAnsweredQuestionId: 12,
        lastAnsweredAt: new Date('2026-07-27T10:00:00.000Z'),
        nextQuestionId: 13,
        percentage: 50,
      },
    });

    expect(prisma.userAnswer.findMany).toHaveBeenCalledWith({
      where: {
        userId: 7,
        question: { chapterId: 3 },
      },
      distinct: ['questionId'],
      select: { questionId: true },
    });
    expect(prisma.question.findFirst).toHaveBeenCalledWith({
      where: {
        chapterId: 3,
        order: { gt: 2 },
      },
      orderBy: [{ order: 'asc' }, { id: 'asc' }],
      select: { id: true },
    });
  });

  it('returns only unique questions whose latest answer is wrong', async () => {
    const latestWrongAnswer = {
      id: 15,
      userId: 7,
      questionId: 13,
      selectedOption: 'A',
      isCorrect: false,
      createdAt: new Date('2026-07-27T11:00:00.000Z'),
      question: { id: 13 },
    };
    prisma.userAnswer.findMany.mockResolvedValue([
      {
        id: 16,
        userId: 7,
        questionId: 12,
        selectedOption: 'B',
        isCorrect: true,
        createdAt: new Date('2026-07-27T12:00:00.000Z'),
        question: { id: 12 },
      },
      latestWrongAnswer,
    ]);

    await expect(service.findWrongAnswersByBookId(7, 4)).resolves.toEqual([
      latestWrongAnswer,
    ]);
    expect(prisma.userAnswer.findMany).toHaveBeenCalledWith({
      where: {
        userId: 7,
        question: {
          chapter: { bookId: 4 },
        },
      },
      include: {
        question: true,
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      distinct: ['questionId'],
    });
  });
});
