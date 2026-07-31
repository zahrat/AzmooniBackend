jest.mock('../prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import {
  BadGatewayException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PaymentStatus } from '../../generated/prisma/enums';
import { PrismaService } from '../prisma.service';
import { PaymentGatewayError } from './payment-gateway';
import { PaymentsService } from './payments.service';

describe('PaymentsService', () => {
  let service: PaymentsService;
  let prisma: {
    book: { findUnique: jest.Mock };
    payment: {
      create: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
      findUnique: jest.Mock;
      findFirst: jest.Mock;
    };
    userBookPurchase: { upsert: jest.Mock };
    $transaction: jest.Mock;
  };
  let gateway: {
    requestPayment: jest.Mock;
    verifyPayment: jest.Mock;
  };

  const expiresAt = new Date('2026-07-29T10:30:00Z');
  const pendingPayment = {
    id: 21,
    userId: 7,
    bookId: 3,
    amountToman: 10_000,
    status: PaymentStatus.PENDING,
    authority: 'S000000000000000000000000000000001',
    refId: null,
    paymentUrl:
      'https://sandbox.zarinpal.com/pg/StartPay/S000000000000000000000000000000001',
    activeKey: '7:3',
    cardPan: null,
    cardHash: null,
    feeToman: null,
    failureCode: null,
    verifyAttempts: 0,
    lastVerifiedAt: null,
    createdAt: new Date('2026-07-29T10:00:00Z'),
    updatedAt: new Date('2026-07-29T10:00:00Z'),
    expiresAt,
    paidAt: null,
  };

  beforeEach(() => {
    prisma = {
      book: {
        findUnique: jest.fn(),
      },
      payment: {
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
      },
      userBookPurchase: {
        upsert: jest.fn(),
      },
      $transaction: jest.fn(),
    };
    prisma.$transaction.mockImplementation(
      async (callback: (transaction: typeof prisma) => Promise<unknown>) =>
        callback(prisma),
    );
    gateway = {
      requestPayment: jest.fn(),
      verifyPayment: jest.fn(),
    };
    service = new PaymentsService(prisma as unknown as PrismaService, gateway);
  });

  function mockBook(purchases: { userId: number }[] = []) {
    prisma.book.findUnique.mockResolvedValue({
      id: 3,
      title: 'Clean Code',
      priceToman: 10_000,
      purchases,
    });
  }

  it('creates a pending payment with an expiry and returns its gateway URL', async () => {
    mockBook();
    prisma.payment.create.mockResolvedValue({ id: 21 });
    gateway.requestPayment.mockResolvedValue({
      authority: pendingPayment.authority,
      feeToman: 100,
      paymentUrl: pendingPayment.paymentUrl,
    });
    prisma.payment.update.mockResolvedValue(pendingPayment);

    await expect(
      service.requestBookPayment(7, 'user@example.com', 3),
    ).resolves.toEqual({
      paymentId: 21,
      authority: pendingPayment.authority,
      paymentUrl: pendingPayment.paymentUrl,
      amount: 10_000,
      currency: 'IRT',
      expiresAt,
    });

    expect(prisma.payment.create).toHaveBeenCalledWith({
      data: {
        userId: 7,
        bookId: 3,
        amountToman: 10_000,
        activeKey: '7:3',
        // Jest asymmetric matchers are intentionally typed as any.
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        expiresAt: expect.any(Date),
      },
      select: { id: true },
    });
  });

  it('reuses an active payment instead of contacting the gateway again', async () => {
    mockBook();
    prisma.payment.findUnique.mockResolvedValue(pendingPayment);

    await expect(
      service.requestBookPayment(7, 'user@example.com', 3),
    ).resolves.toMatchObject({
      paymentId: 21,
      authority: pendingPayment.authority,
    });

    expect(prisma.payment.create).not.toHaveBeenCalled();
    expect(gateway.requestPayment).not.toHaveBeenCalled();
  });

  it('expires a stale active payment before creating another one', async () => {
    mockBook();
    prisma.payment.create.mockResolvedValue({ id: 22 });
    gateway.requestPayment.mockResolvedValue({
      authority: 'S-new',
      feeToman: 0,
      paymentUrl: 'https://sandbox.zarinpal.com/pg/StartPay/S-new',
    });
    prisma.payment.update.mockResolvedValue({
      ...pendingPayment,
      id: 22,
      authority: 'S-new',
      paymentUrl: 'https://sandbox.zarinpal.com/pg/StartPay/S-new',
    });

    await service.requestBookPayment(7, 'user@example.com', 3);

    expect(prisma.payment.updateMany).toHaveBeenCalledWith({
      where: {
        activeKey: '7:3',
        status: PaymentStatus.PENDING,
        expiresAt: {
          // Jest asymmetric matchers are intentionally typed as any.
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          lte: expect.any(Date),
        },
      },
      data: {
        status: PaymentStatus.EXPIRED,
        activeKey: null,
      },
    });
  });

  it('rejects payment for a book without a valid price', async () => {
    prisma.book.findUnique.mockResolvedValue({
      id: 3,
      title: 'Invalid book',
      priceToman: null,
      purchases: [],
    });

    await expect(
      service.requestBookPayment(7, 'user@example.com', 3),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.payment.create).not.toHaveBeenCalled();
  });

  it('rejects a book the user already owns', async () => {
    mockBook([{ userId: 7 }]);

    await expect(
      service.requestBookPayment(7, 'user@example.com', 3),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('releases the active lock after a failed gateway request', async () => {
    mockBook();
    prisma.payment.create.mockResolvedValue({ id: 21 });
    gateway.requestPayment.mockRejectedValue(
      new PaymentGatewayError('Invalid terminal', -10),
    );
    prisma.payment.update.mockResolvedValue({
      ...pendingPayment,
      status: PaymentStatus.FAILED,
      activeKey: null,
      failureCode: -10,
    });

    await expect(
      service.requestBookPayment(7, 'user@example.com', 3),
    ).rejects.toBeInstanceOf(BadGatewayException);
    expect(prisma.payment.update).toHaveBeenCalledWith({
      where: { id: 21 },
      data: {
        status: PaymentStatus.FAILED,
        activeKey: null,
        failureCode: -10,
      },
    });
  });

  it('cancels a payment idempotently without gateway verification', async () => {
    const canceledPayment = {
      ...pendingPayment,
      status: PaymentStatus.CANCELED,
      activeKey: null,
    };
    prisma.payment.findUnique
      .mockResolvedValueOnce(pendingPayment)
      .mockResolvedValueOnce(canceledPayment);

    await expect(
      service.handleZarinpalCallback(pendingPayment.authority, 'NOK'),
    ).resolves.toEqual({
      paymentId: 21,
      bookId: 3,
      status: PaymentStatus.CANCELED,
      refId: null,
    });
    expect(gateway.verifyPayment).not.toHaveBeenCalled();
  });

  it('verifies payment and grants book access atomically', async () => {
    const paidPayment = {
      ...pendingPayment,
      status: PaymentStatus.PAID,
      activeKey: null,
      refId: '123456',
      paidAt: new Date(),
    };
    prisma.payment.findUnique
      .mockResolvedValueOnce(pendingPayment)
      .mockResolvedValueOnce(paidPayment);
    prisma.payment.update.mockResolvedValue(pendingPayment);
    gateway.verifyPayment.mockResolvedValue({
      code: 100,
      refId: '123456',
      cardPan: '502229******5995',
      cardHash: 'hash',
      feeToman: 0,
    });

    await expect(
      service.handleZarinpalCallback(pendingPayment.authority, 'OK'),
    ).resolves.toEqual({
      paymentId: 21,
      bookId: 3,
      status: PaymentStatus.PAID,
      refId: '123456',
    });

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.payment.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 21,
          status: { not: PaymentStatus.PAID },
        },
      }),
    );
    expect(prisma.userBookPurchase.upsert).toHaveBeenCalledTimes(1);
  });

  it('keeps a payment retryable after a transient verification failure', async () => {
    prisma.payment.findUnique.mockResolvedValue(pendingPayment);
    prisma.payment.update.mockResolvedValue(pendingPayment);
    gateway.verifyPayment.mockRejectedValue(
      new PaymentGatewayError('Network unavailable'),
    );

    await expect(
      service.handleZarinpalCallback(pendingPayment.authority, 'OK'),
    ).rejects.toBeInstanceOf(BadGatewayException);

    expect(prisma.payment.update).toHaveBeenCalledTimes(1);
    expect(prisma.payment.update).toHaveBeenCalledWith({
      where: { id: 21 },
      data: {
        verifyAttempts: { increment: 1 },
        // Jest asymmetric matchers are intentionally typed as any.
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        lastVerifiedAt: expect.any(Date),
      },
    });
  });

  it('returns an already paid callback without verifying again', async () => {
    prisma.payment.findUnique.mockResolvedValue({
      ...pendingPayment,
      status: PaymentStatus.PAID,
      refId: '123456',
    });

    await expect(
      service.handleZarinpalCallback(pendingPayment.authority, 'OK'),
    ).resolves.toMatchObject({
      paymentId: 21,
      status: PaymentStatus.PAID,
    });
    expect(gateway.verifyPayment).not.toHaveBeenCalled();
  });
});
