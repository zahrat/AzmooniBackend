import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import { BooksService } from './books.service';
import { CreateBookDTO } from './create-book-dto';

@Controller('books')
export class BooksController {
  constructor(private readonly bookService: BooksService) {}

  @Get()
  getAll() {
    return this.bookService.findAll();
  }

  @Get(':id')
  getOne(@Param('id', ParseIntPipe) id: number) {
    return this.bookService.findOne(id);
  }

  @Post('add')
  createBook(@Body() body: CreateBookDTO) {
    return this.bookService.create(body);
  }
}
