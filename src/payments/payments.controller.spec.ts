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

  it('passes Zarinpal callback parameters to the service', async () => {
    await controller.callback('S-authority', 'OK');

    expect(paymentsService.handleZarinpalCallback).toHaveBeenCalledWith(
      'S-authority',
      'OK',
    );
  });

  it('retries verification for the authenticated payment owner', async () => {
    const request = {
      user: { id: 7, email: 'user@example.com' },
    };

    await controller.retryVerification(request as never, 21);

    expect(paymentsService.retryVerification).toHaveBeenCalledWith(7, 21);
  });
});
