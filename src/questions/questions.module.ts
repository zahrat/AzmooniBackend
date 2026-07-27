import { Module } from '@nestjs/common';
import { QuestionsService } from './questions.service';
import { QuestionsController } from './questions.controller';
import { PrismaService } from '../prisma.service';
import { QuestionAccessGuard } from './question-access.guard';

@Module({
  providers: [QuestionsService, QuestionAccessGuard, PrismaService],
  controllers: [QuestionsController],
})
export class QuestionsModule {}
