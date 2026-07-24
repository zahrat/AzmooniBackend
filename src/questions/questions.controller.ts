import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  Param,
  ParseEnumPipe,
  ParseIntPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';

import type { Request } from 'express';
import { JwtAuthGuard } from '../users/jwt-auth.guard';
import type { JwtUser } from '../users/user';
import { CreateQuestionDTO } from './create-question-dto';
import { QuestionMode } from './question-mode';
import { QuestionsModeAuthGuard } from './questions-mode-auth.guard';
import { QuestionsService } from './questions.service';

interface RequestWithUser extends Request {
  user?: JwtUser;
}

@Controller('questions')
export class QuestionsController {
  constructor(private readonly questionsService: QuestionsService) {}

  @Post()
  add(@Body() createQuestionDto: CreateQuestionDTO) {
    return this.questionsService.create(createQuestionDto);
  }

  @UseGuards(QuestionsModeAuthGuard)
  @Get('/book/:bookId')
  getByBookId(
    @Req() request: RequestWithUser,
    @Param('bookId', ParseIntPipe) bookId: number,
    @Query(
      'mode',
      new DefaultValuePipe(QuestionMode.All),
      new ParseEnumPipe(QuestionMode),
    )
    mode: QuestionMode,
  ) {
    return this.questionsService.findAll(bookId, mode, request.user?.id);
  }

  @Get(':id')
  getByQuestionId(@Param('id', ParseIntPipe) id: number) {
    return this.questionsService.findOne(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/favorite')
  favorite(
    @Req() request: RequestWithUser,
    @Param('id', ParseIntPipe) questionId: number,
  ) {
    return this.questionsService.favorite(questionId, request.user?.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/unFavorite')
  unFavorite(
    @Req() request: RequestWithUser,
    @Param('id', ParseIntPipe) questionId: number,
  ) {
    return this.questionsService.unfavorite(questionId, request.user?.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('favorites/:bookId')
  getFavorite(
    @Req() request: RequestWithUser,
    @Param('bookId', ParseIntPipe) bookId: number,
  ) {
    return this.questionsService.findFavorites(request.user?.id, bookId);
  }
}
