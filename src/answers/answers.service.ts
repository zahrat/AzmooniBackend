import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateAnswerDTO } from './create-answer-dto';

@Injectable()
export class AnswersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: number, payload: CreateAnswerDTO) {
    const question = await this.prisma.question.findUnique({
      where: { id: payload.questionId },
    });

    if (!question) {
      throw new NotFoundException();
    }

    return this.prisma.userAnswer.create({
      data: {
        ...payload,
        isCorrect: payload.selectedOption === question.correctOption,
        userId,
      },
    });
  }

  async findAll(userId: number, bookId: number) {
    return await this.prisma.userAnswer.findMany({
      orderBy: { createdAt: 'desc' },
      where: { question: { bookId }, userId },
    });
  }
}
