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
import { ChaptersService } from './chapters.service';
import { CreateChapterDTO } from './create-chapter-dto';
import { JwtAuthGuard } from '../users/jwt-auth.guard';
import type { Request } from 'express';
import type { JwtUser } from '../users/user';
import { UserRole } from '../../generated/prisma/enums';
import { Roles } from '../users/roles.decorator';
import { RolesGuard } from '../users/roles.guard';

interface AuthenticatedRequest extends Request {
  user: JwtUser;
}

@Controller('chapters')
export class ChaptersController {
  constructor(private readonly chaptersService: ChaptersService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post()
  create(@Body() payload: CreateChapterDTO) {
    return this.chaptersService.create(payload);
  }

  @UseGuards(JwtAuthGuard)
  @Get('book/:bookId')
  findByBook(
    @Req() request: AuthenticatedRequest,
    @Param('bookId', ParseIntPipe) bookId: number,
  ) {
    return this.chaptersService.findByBook(bookId, request.user.id);
  }
}
