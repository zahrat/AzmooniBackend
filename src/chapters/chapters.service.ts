import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateChapterDTO } from './create-chapter-dto';

@Injectable()
export class ChaptersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(payload: CreateChapterDTO) {
    const book = await this.prisma.book.findUnique({
      where: { id: payload.bookId },
      select: { id: true },
    });

    if (!book) {
      throw new NotFoundException('Book not found');
    }

    return await this.prisma.chapter.create({ data: payload });
  }

  async findByBook(bookId: number) {
    return await this.prisma.chapter.findMany({
      where: { bookId },
      orderBy: { order: 'asc' },
    });
  }
}
