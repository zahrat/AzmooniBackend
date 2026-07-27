jest.mock('../prisma.service', () => ({
  PrismaService: class PrismaService {},
}));
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma.service';
import { QuestionAccessGuard } from './question-access.guard';
import { QuestionsController } from './questions.controller';
import { QuestionsService } from './questions.service';

describe('QuestionsController', () => {
  let controller: QuestionsController;

  const mockQuestionsService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findByChapter: jest.fn(),
    findOne: jest.fn(),
    favorite: jest.fn(),
    unfavorite: jest.fn(),
    findFavorites: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [QuestionsController],
      providers: [
        {
          provide: QuestionAccessGuard,
          useValue: { canActivate: jest.fn().mockReturnValue(true) },
        },
        {
          provide: PrismaService,
          useValue: {},
        },
        {
          provide: QuestionsService,
          useValue: mockQuestionsService,
        },
      ],
    }).compile();

    controller = module.get<QuestionsController>(QuestionsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('passes an optional image when creating a question', async () => {
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
      buffer: Buffer.from('image'),
      mimetype: 'image/png',
      size: 5,
    };

    await controller.add(payload, image);

    expect(mockQuestionsService.create).toHaveBeenCalledWith(payload, image);
  });

  it('favorites a question for the authenticated user', async () => {
    const request = { user: { id: 7, email: 'user@example.com' } };

    await controller.favorite(request as never, 12);

    expect(mockQuestionsService.favorite).toHaveBeenCalledWith(12, 7);
  });

  it('unfavorites a question for the authenticated user', async () => {
    const request = { user: { id: 7, email: 'user@example.com' } };

    await controller.unFavorite(request as never, 12);

    expect(mockQuestionsService.unfavorite).toHaveBeenCalledWith(12, 7);
  });

  it('returns favorite questions for a book and authenticated user', async () => {
    const request = { user: { id: 7, email: 'user@example.com' } };
    const pagination = { page: 2, limit: 10 };

    await controller.getFavorite(request as never, 3, pagination);

    expect(mockQuestionsService.findFavorites).toHaveBeenCalledWith(
      7,
      3,
      pagination,
    );
  });

  it('returns questions for a chapter', async () => {
    const request = { user: { id: 7, email: 'user@example.com' } };
    const pagination = { page: 2, limit: 10 };

    await controller.getByChapterId(
      request as never,
      3,
      'all' as never,
      pagination,
    );

    expect(mockQuestionsService.findByChapter).toHaveBeenCalledWith(
      3,
      'all',
      7,
      pagination,
    );
  });

  it('returns questions for a book with pagination', async () => {
    const request = { user: { id: 7, email: 'user@example.com' } };
    const pagination = { page: 3, limit: 25 };

    await controller.getByBookId(
      request as never,
      12,
      'wrong' as never,
      pagination,
    );

    expect(mockQuestionsService.findAll).toHaveBeenCalledWith(
      12,
      'wrong',
      7,
      pagination,
    );
  });
});
