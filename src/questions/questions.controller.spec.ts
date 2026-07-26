jest.mock('../prisma.service', () => ({
  PrismaService: class PrismaService {},
}));
import { Test, TestingModule } from '@nestjs/testing';
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

    await controller.getFavorite(request as never, 3);

    expect(mockQuestionsService.findFavorites).toHaveBeenCalledWith(7, 3);
  });

  it('returns questions for a chapter', async () => {
    const request = { user: { id: 7, email: 'user@example.com' } };

    await controller.getByChapterId(request as never, 3, 'all' as never);

    expect(mockQuestionsService.findByChapter).toHaveBeenCalledWith(
      3,
      'all',
      7,
    );
  });
});
