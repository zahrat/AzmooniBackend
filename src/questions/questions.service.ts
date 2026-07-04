import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateQuestionDTO } from './create-question-dto';

@Injectable()
export class QuestionsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(payload: CreateQuestionDTO) {
    return await this.prisma.question.create({
      data: payload,
    });
  }

  async findAll(bookId: number) {
    return await this.prisma.question.findMany({
      orderBy: { createdAt: 'desc' },
      where: { bookId },
    });
  }

  async findOne(id: number) {
    const question = await this.prisma.question.findUnique({ where: { id } });

    if (!question) throw new NotFoundException('Question not found');
    return question;
  }
}
