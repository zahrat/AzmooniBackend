import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../users/jwt-auth.guard';
import type { JwtUser } from '../users/user';
import { BooksService } from './books.service';
import { CreateBookDTO } from './create-book-dto';

interface AuthenticatedRequest extends Request {
  user: JwtUser;
}

@Controller('books')
export class BooksController {
  constructor(private readonly bookService: BooksService) {}

  @Get()
  getAll() {
    return this.bookService.findAll();
  }

  @UseGuards(JwtAuthGuard)
  @Get('wrong')
  getWrongBooks(@Req() request: AuthenticatedRequest) {
    return this.bookService.findWrongBooks(request.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('favorites')
  getFavoriteBooks(@Req() request: AuthenticatedRequest) {
    return this.bookService.findFavoriteBooks(request.user.id);
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
