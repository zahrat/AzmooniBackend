import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateQuestionDTO } from './create-question-dto';
import { QuestionMode } from './question-mode';

@Injectable()
export class QuestionsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(payload: CreateQuestionDTO) {
    return await this.prisma.question.create({
      data: payload,
    });
  }

  async findAll(
    bookId: number,
    mode: QuestionMode = QuestionMode.All,
    userId?: number,
  ) {
    if (mode === QuestionMode.Wrong && userId === undefined) {
      throw new UnauthorizedException(
        'Authentication is required to fetch wrong questions',
      );
    }

    return await this.prisma.question.findMany({
      orderBy: { createdAt: 'desc' },
      where: {
        bookId,
        ...(mode === QuestionMode.Wrong
          ? {
              answers: {
                some: {
                  userId,
                  isCorrect: false,
                },
              },
            }
          : {}),
      },
    });
  }

  async findOne(id: number) {
    const question = await this.prisma.question.findUnique({ where: { id } });

    if (!question) throw new NotFoundException('Question not found');
    return question;
  }
}
