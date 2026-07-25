import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import { ChaptersService } from './chapters.service';
import { CreateChapterDTO } from './create-chapter-dto';

@Controller('chapters')
export class ChaptersController {
  constructor(private readonly chaptersService: ChaptersService) {}

  @Post()
  create(@Body() payload: CreateChapterDTO) {
    return this.chaptersService.create(payload);
  }

  @Get('book/:bookId')
  findByBook(@Param('bookId', ParseIntPipe) bookId: number) {
    return this.chaptersService.findByBook(bookId);
  }
}
