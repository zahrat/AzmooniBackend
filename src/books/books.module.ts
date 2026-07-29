import { Module } from '@nestjs/common';
import { BooksService } from './books.service';
import { BooksController } from './books.controller';
import { PrismaService } from '../prisma.service';
import { RolesGuard } from '../users/roles.guard';

@Module({
  providers: [BooksService, PrismaService, RolesGuard],
  controllers: [BooksController],
})
export class BooksModule {}
