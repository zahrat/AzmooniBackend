jest.mock('../prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

describe('PaymentsController', () => {
  let controller: PaymentsController;
  const paymentsService = {
    requestBookPayment: jest.fn(),
    handleZarinpalCallback: jest.fn(),
    retryVerification: jest.fn(),
    findOneForUser: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentsController],
      providers: [
        {
          provide: PaymentsService,
          useValue: paymentsService,
        },
      ],
    }).compile();

    controller = module.get(PaymentsController);
  });

  it('starts a book payment for the authenticated user', async () => {
    const request = {
      user: { id: 7, email: 'user@example.com' },
    };

    await controller.requestBookPayment(request as never, 3);

    expect(paymentsService.requestBookPayment).toHaveBeenCalledWith(
      7,
      'user@example.com',
      3,
    );
  });

  it('verifies the Zarinpal callback before rendering the result page', async () => {
    paymentsService.handleZarinpalCallback.mockResolvedValue({
      amountToman: 10000,
      paymentId: 21,
      bookId: 3,
      status: 'PAID',
      refId: '123456',
    });

    const page = await controller.callback('S-authority', 'OK');

    expect(page).toContain('پرداخت موفق بود');
    expect(page).toContain('۱۰٬۰۰۰ تومان');
    expect(page).toContain(
      'azmooni://payment?paymentId=21&amp;bookId=3&amp;status=PAID&amp;refId=123456',
    );

    expect(paymentsService.handleZarinpalCallback).toHaveBeenCalledWith(
      'S-authority',
      'OK',
    );
  });

  it('redirects a canceled payment without an empty refId', async () => {
    paymentsService.handleZarinpalCallback.mockResolvedValue({
      amountToman: 20000,
      paymentId: 22,
      bookId: 4,
      status: 'CANCELED',
      refId: null,
    });

    const page = await controller.callback('S-authority', 'NOK');

    expect(page).toContain('پرداخت لغو شد');
    expect(page).toContain(
      'azmooni://payment?paymentId=22&amp;bookId=4&amp;status=CANCELED',
    );
    expect(page).not.toContain('refId=');
  });

  it('retries verification for the authenticated payment owner', async () => {
    const request = {
      user: { id: 7, email: 'user@example.com' },
    };

    await controller.retryVerification(request as never, 21);

    expect(paymentsService.retryVerification).toHaveBeenCalledWith(7, 21);
  });
});
