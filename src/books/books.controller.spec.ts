jest.mock('../prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import { Test, TestingModule } from '@nestjs/testing';
import { BooksController } from './books.controller';
import { BooksService } from './books.service';

describe('BooksController', () => {
  let controller: BooksController;

  const mockBooksService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findWrongBooks: jest.fn(),
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BooksController],
      providers: [
        {
          provide: BooksService,
          useValue: mockBooksService,
        },
      ],
    }).compile();

    controller = module.get<BooksController>(BooksController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('returns books with wrong answers for the authenticated user', () => {
    const books = [{ id: 1, wrongAnswersCount: 2 }];
    mockBooksService.findWrongBooks.mockReturnValue(books);

    expect(controller.getWrongBooks({ user: { id: 7 } })).toBe(books);
    expect(mockBooksService.findWrongBooks).toHaveBeenCalledWith(7);
  });
});
