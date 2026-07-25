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

  beforeEach(async () => {
    findBook = jest.fn();
    createChapter = jest.fn();
    findChapters = jest.fn();

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

    await service.findByBook(1);

    expect(findChapters).toHaveBeenCalledWith({
      where: { bookId: 1 },
      orderBy: { order: 'asc' },
    });
  });
});
