import {
  BadGatewayException,
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Payment } from '../../generated/prisma/client';
import { PaymentStatus } from '../../generated/prisma/enums';
import { PrismaService } from '../prisma.service';
import {
  PAYMENT_GATEWAY,
  PaymentGatewayError,
  type PaymentGateway,
  type PaymentGatewayRequestResult,
  type PaymentGatewayVerifyResult,
} from './payment-gateway';

const PAYMENT_TTL_MS = 30 * 60 * 1000;

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(PAYMENT_GATEWAY)
    private readonly gateway: PaymentGateway,
  ) {}

  async requestBookPayment(userId: number, email: string, bookId: number) {
    const book = await this.prisma.book.findUnique({
      where: { id: bookId },
      select: {
        id: true,
        title: true,
        priceToman: true,
        purchases: {
          where: { userId },
          select: { userId: true },
          take: 1,
        },
      },
    });

    if (!book) {
      throw new NotFoundException('Book not found');
    }

    if (!book.priceToman || book.priceToman <= 0) {
      throw new BadRequestException('This book does not have a valid price');
    }

    if (book.purchases.length > 0) {
      throw new ConflictException('Book has already been purchased');
    }

    const activeKey = this.activePaymentKey(userId, bookId);
    const now = new Date();
    await this.prisma.payment.updateMany({
      where: {
        activeKey,
        status: PaymentStatus.PENDING,
        expiresAt: { lte: now },
      },
      data: {
        status: PaymentStatus.EXPIRED,
        activeKey: null,
      },
    });

    const existingPayment = await this.prisma.payment.findUnique({
      where: { activeKey },
    });
    if (existingPayment) {
      return this.activePaymentResponse(existingPayment);
    }

    const expiresAt = new Date(now.getTime() + PAYMENT_TTL_MS);
    let payment: { id: number };
    try {
      payment = await this.prisma.payment.create({
        data: {
          userId,
          bookId,
          amountToman: book.priceToman,
          activeKey,
          expiresAt,
        },
        select: { id: true },
      });
    } catch (error) {
      if (!this.isUniqueConstraintError(error)) {
        throw error;
      }

      const concurrentPayment = await this.prisma.payment.findUnique({
        where: { activeKey },
      });
      if (!concurrentPayment) {
        throw error;
      }

      return this.activePaymentResponse(concurrentPayment);
    }

    let gatewayResult: PaymentGatewayRequestResult;
    try {
      gatewayResult = await this.gateway.requestPayment({
        amountToman: book.priceToman,
        description: `Purchase of book: ${book.title}`,
        email,
        orderId: payment.id,
      });
    } catch (error) {
      const gatewayError =
        error instanceof PaymentGatewayError ? error : undefined;

      await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.FAILED,
          activeKey: null,
          failureCode: gatewayError?.code,
        },
      });

      throw new BadGatewayException({
        message: 'Unable to create payment',
        code: gatewayError?.code,
      });
    }

    const updatedPayment = await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        authority: gatewayResult.authority,
        paymentUrl: gatewayResult.paymentUrl,
        feeToman: gatewayResult.feeToman,
      },
    });

    return this.activePaymentResponse(updatedPayment);
  }

  async handleZarinpalCallback(authority: string, status: string) {
    if (!authority || authority.length > 100) {
      throw new BadRequestException('Invalid payment authority');
    }

    if (status !== 'OK' && status !== 'NOK') {
      throw new BadRequestException('Invalid payment status');
    }

    const payment = await this.prisma.payment.findUnique({
      where: { authority },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (payment.status === PaymentStatus.PAID) {
      return this.callbackResponse(payment);
    }

    if (status === 'NOK') {
      return this.cancelPayment(payment);
    }

    return this.verifyAndComplete(payment);
  }

  async retryVerification(userId: number, paymentId: number) {
    const payment = await this.prisma.payment.findFirst({
      where: {
        id: paymentId,
        userId,
      },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (payment.status === PaymentStatus.PAID) {
      return this.callbackResponse(payment);
    }

    if (!payment.authority || payment.status === PaymentStatus.CANCELED) {
      throw new BadRequestException('Payment cannot be verified');
    }

    return this.verifyAndComplete(payment);
  }

  async findOneForUser(userId: number, paymentId: number) {
    const payment = await this.prisma.payment.findFirst({
      where: {
        id: paymentId,
        userId,
      },
      select: {
        id: true,
        bookId: true,
        amountToman: true,
        status: true,
        authority: true,
        refId: true,
        cardPan: true,
        failureCode: true,
        verifyAttempts: true,
        createdAt: true,
        expiresAt: true,
        lastVerifiedAt: true,
        paidAt: true,
      },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    return payment;
  }

  private async verifyAndComplete(payment: Payment) {
    if (!payment.authority) {
      throw new BadRequestException('Payment authority is missing');
    }

    const verificationStartedAt = new Date();
    await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        verifyAttempts: { increment: 1 },
        lastVerifiedAt: verificationStartedAt,
      },
    });

    let verification: PaymentGatewayVerifyResult;
    try {
      verification = await this.gateway.verifyPayment({
        amountToman: payment.amountToman,
        authority: payment.authority,
      });
    } catch (error) {
      const gatewayError =
        error instanceof PaymentGatewayError ? error : undefined;

      if (gatewayError?.code !== undefined) {
        await this.prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: PaymentStatus.FAILED,
            activeKey: null,
            failureCode: gatewayError.code,
          },
        });

        throw new BadRequestException({
          message: 'Payment verification failed',
          code: gatewayError.code,
        });
      }

      throw new BadGatewayException(
        'Could not verify payment with the gateway; retry is safe',
      );
    }

    const paidAt = new Date();
    const paidPayment = await this.prisma.$transaction(async (transaction) => {
      await transaction.payment.updateMany({
        where: {
          id: payment.id,
          status: { not: PaymentStatus.PAID },
        },
        data: {
          status: PaymentStatus.PAID,
          activeKey: null,
          refId: verification.refId,
          cardPan: verification.cardPan,
          cardHash: verification.cardHash,
          feeToman: verification.feeToman,
          failureCode: null,
          paidAt,
        },
      });

      await transaction.userBookPurchase.upsert({
        where: {
          userId_bookId: {
            userId: payment.userId,
            bookId: payment.bookId,
          },
        },
        create: {
          userId: payment.userId,
          bookId: payment.bookId,
          paidAt,
        },
        update: {},
      });

      return transaction.payment.findUnique({
        where: { id: payment.id },
      });
    });

    if (!paidPayment) {
      throw new NotFoundException('Payment not found');
    }

    return this.callbackResponse(paidPayment);
  }

  private async cancelPayment(payment: Payment) {
    return this.prisma.$transaction(async (transaction) => {
      await transaction.payment.updateMany({
        where: {
          id: payment.id,
          status: { not: PaymentStatus.PAID },
        },
        data: {
          status: PaymentStatus.CANCELED,
          activeKey: null,
        },
      });
      const updatedPayment = await transaction.payment.findUnique({
        where: { id: payment.id },
      });

      if (!updatedPayment) {
        throw new NotFoundException('Payment not found');
      }

      return this.callbackResponse(updatedPayment);
    });
  }

  private activePaymentResponse(payment: {
    id: number;
    authority: string | null;
    paymentUrl: string | null;
    amountToman: number;
    expiresAt: Date;
  }) {
    if (!payment.authority || !payment.paymentUrl) {
      throw new ConflictException(
        'A payment request is already being prepared; try again shortly',
      );
    }

    return {
      paymentId: payment.id,
      authority: payment.authority,
      paymentUrl: payment.paymentUrl,
      amount: payment.amountToman,
      currency: 'IRT' as const,
      expiresAt: payment.expiresAt,
    };
  }

  private callbackResponse(payment: {
    id: number;
    bookId: number;
    status: PaymentStatus;
    refId: string | null;
  }) {
    return {
      paymentId: payment.id,
      bookId: payment.bookId,
      status: payment.status,
      refId: payment.refId,
    };
  }

  private activePaymentKey(userId: number, bookId: number): string {
    return `${userId}:${bookId}`;
  }

  private isUniqueConstraintError(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'P2002'
    );
  }
}
