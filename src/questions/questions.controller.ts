import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  Param,
  ParseFilePipe,
  ParseEnumPipe,
  ParseIntPipe,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';

import type { Request } from 'express';
import { JwtAuthGuard } from '../users/jwt-auth.guard';
import type { JwtUser } from '../users/user';
import { UserRole } from '../../generated/prisma/enums';
import { Roles } from '../users/roles.decorator';
import { RolesGuard } from '../users/roles.guard';
import { CreateQuestionDTO } from './create-question-dto';
import { PaginationQueryDTO } from './pagination-query.dto';
import { QuestionAccessGuard } from './question-access.guard';
import { QuestionMode } from './question-mode';
import { QuestionsModeAuthGuard } from './questions-mode-auth.guard';
import { QuestionsService } from './questions.service';

interface RequestWithUser extends Request {
  user?: JwtUser;
}

interface AuthenticatedRequest extends Request {
  user: JwtUser;
}

interface UploadedImage {
  buffer: Buffer;
  mimetype: string;
  size: number;
}

@Controller('questions')
export class QuestionsController {
  constructor(private readonly questionsService: QuestionsService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post()
  @UseInterceptors(
    FileInterceptor('image', {
      limits: { fileSize: 5 * 1024 * 1024, files: 1 },
    }),
  )
  add(
    @Body() createQuestionDto: CreateQuestionDTO,
    @UploadedFile(new ParseFilePipe({ fileIsRequired: false }))
    image?: UploadedImage,
  ) {
    return this.questionsService.create(createQuestionDto, image);
  }

  @UseGuards(QuestionsModeAuthGuard, QuestionAccessGuard)
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
    @Query() pagination: PaginationQueryDTO,
  ) {
    return this.questionsService.findAll(
      bookId,
      mode,
      request.user?.id,
      pagination,
    );
  }

  @UseGuards(QuestionsModeAuthGuard, QuestionAccessGuard)
  @Get('/chapter/:chapterId')
  getByChapterId(
    @Req() request: RequestWithUser,
    @Param('chapterId', ParseIntPipe) chapterId: number,
    @Query(
      'mode',
      new DefaultValuePipe(QuestionMode.All),
      new ParseEnumPipe(QuestionMode),
    )
    mode: QuestionMode,
    @Query() pagination: PaginationQueryDTO,
  ) {
    return this.questionsService.findByChapter(
      chapterId,
      mode,
      request.user?.id,
      pagination,
    );
  }

  @UseGuards(QuestionsModeAuthGuard, QuestionAccessGuard)
  @Get(':id')
  getByQuestionId(@Param('id', ParseIntPipe) id: number) {
    return this.questionsService.findOne(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/favorite')
  favorite(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseIntPipe) questionId: number,
  ) {
    return this.questionsService.favorite(questionId, request.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/unfavorite')
  unFavorite(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseIntPipe) questionId: number,
  ) {
    return this.questionsService.unfavorite(questionId, request.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('favorites/:bookId')
  getFavorite(
    @Req() request: AuthenticatedRequest,
    @Param('bookId', ParseIntPipe) bookId: number,
    @Query() pagination: PaginationQueryDTO,
  ) {
    return this.questionsService.findFavorites(
      request.user.id,
      bookId,
      pagination,
    );
  }
}
