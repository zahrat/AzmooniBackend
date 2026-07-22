jest.mock('../prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import { Test, TestingModule } from '@nestjs/testing';
import { QuestionMode } from './question-mode';
import { QuestionsService } from './questions.service';
import { PrismaService } from '../prisma.service';

describe('QuestionsService', () => {
  let service: QuestionsService;
  let findMany: jest.Mock;

  beforeEach(async () => {
    findMany = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuestionsService,
        {
          provide: PrismaService,
          useValue: {
            question: {
              create: jest.fn(),
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

  it('returns every question for all mode', async () => {
    await service.findAll(12, QuestionMode.All);

    expect(findMany).toHaveBeenCalledWith({
      orderBy: { createdAt: 'desc' },
      where: { bookId: 12 },
    });
  });

  it('filters wrong questions by the authenticated user', async () => {
    await service.findAll(12, QuestionMode.Wrong, 7);

    expect(findMany).toHaveBeenCalledWith({
      orderBy: { createdAt: 'desc' },
      where: {
        bookId: 12,
        answers: {
          some: {
            userId: 7,
            isCorrect: false,
          },
        },
      },
    });
  });

  it('rejects wrong mode without an authenticated user', async () => {
    await expect(service.findAll(12, QuestionMode.Wrong)).rejects.toThrow(
      'Authentication is required to fetch wrong questions',
    );
  });
});
