jest.mock('../prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import { Test, TestingModule } from '@nestjs/testing';
import { AnswersService } from './answers.service';
import { PrismaService } from '../prisma.service';

describe('AnswersService', () => {
  let service: AnswersService;
  let prisma: {
    question: { findUnique: jest.Mock; count: jest.Mock };
    userAnswer: { create: jest.Mock; findMany: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      question: {
        findUnique: jest.fn(),
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
  });
});
