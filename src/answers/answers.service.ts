import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateAnswerDTO } from './create-answer-dto';

@Injectable()
export class AnswersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: number, payload: CreateAnswerDTO) {
    const question = await this.prisma.question.findUnique({
      where: { id: payload.questionId },
      select: {
        correctOption: true,
        chapterId: true,
        order: true,
      },
    });

    if (!question) {
      throw new NotFoundException('Question not found');
    }

    const answer = await this.prisma.userAnswer.create({
      data: {
        ...payload,
        isCorrect: payload.selectedOption === question.correctOption,
        userId,
      },
    });

    const [totalQuestions, answeredQuestions, nextQuestion] = await Promise.all(
      [
        this.prisma.question.count({
          where: { chapterId: question.chapterId },
        }),
        this.prisma.userAnswer.findMany({
          where: {
            userId,
            question: { chapterId: question.chapterId },
          },
          distinct: ['questionId'],
          select: { questionId: true },
        }),
        this.prisma.question.findFirst({
          where: {
            chapterId: question.chapterId,
            order: { gt: question.order },
          },
          orderBy: [{ order: 'asc' }, { id: 'asc' }],
          select: { id: true },
        }),
      ],
    );

    return {
      ...answer,
      progress: {
        chapterId: question.chapterId,
        answeredQuestions: answeredQuestions.length,
        totalQuestions,
        lastAnsweredQuestionId: answer.questionId,
        lastAnsweredAt: answer.createdAt,
        nextQuestionId: nextQuestion?.id ?? null,
        percentage:
          totalQuestions === 0
            ? 0
            : Math.round((answeredQuestions.length / totalQuestions) * 100),
      },
    };
  }

  async findAll(userId: number, bookId: number) {
    return await this.prisma.userAnswer.findMany({
      orderBy: { createdAt: 'desc' },
      where: { question: { chapter: { bookId } }, userId },
    });
  }

  async findWrongAnswersByBookId(userId: number, bookId: number) {
    const latestAnswers = await this.prisma.userAnswer.findMany({
      where: {
        userId,
        question: {
          chapter: { bookId },
        },
      },
      include: {
        question: true,
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      distinct: ['questionId'],
    });

    return latestAnswers.filter((answer) => !answer.isCorrect);
  }
}
