import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateBookDTO } from './create-book-dto';

@Injectable()
export class BooksService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return await this.prisma.book.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async findOne(id: number) {
    const book = await this.prisma.book.findUnique({ where: { id } });

    if (!book) throw new NotFoundException();
    return book;
  }

  async create(bookDto: CreateBookDTO) {
    await this.prisma.book.create({ data: bookDto });
  }
}
