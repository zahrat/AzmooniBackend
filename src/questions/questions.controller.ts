import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import { CreateQuestionDTO } from './create-question-dto';
import { QuestionsService } from './questions.service';

@Controller('questions')
export class QuestionsController {
  constructor(private readonly questionsService: QuestionsService) {}

  @Post()
  add(@Body() createQuestionDto: CreateQuestionDTO) {
    return this.questionsService.create(createQuestionDto);
  }

  @Get('/book/:bookId')
  getByBookId(@Param('bookId', ParseIntPipe) bookId) {
    return this.questionsService.findAll(bookId);
  }

  @Get(':id')
  getByQuestionId(@Param('id', ParseIntPipe) id) {
    return this.questionsService.findOne(id);
  }
}
