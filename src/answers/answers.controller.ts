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
import { JwtAuthGuard } from 'src/users/jwt-auth.guard';
import { CreateAnswerDTO } from './create-answer-dto';
import { AnswersService } from './answers.service';

@Controller('answers')
export class AnswersController {
  constructor(private readonly answersService: AnswersService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Req() request, @Body() createAnswerDto: CreateAnswerDTO) {
    return this.answersService.create(request.user.id, createAnswerDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('/book/:bookId')
  getAnswersByBookId(
    @Req() request,
    @Param('bookId', ParseIntPipe) bookId: number,
  ) {
    return this.answersService.findAll(request.user.id, bookId);
  }
}
