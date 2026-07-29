import { PaymentGatewayError } from './payment-gateway';
import { ZarinpalService } from './zarinpal.service';

describe('ZarinpalService', () => {
  let service: ZarinpalService;
  let fetchMock: jest.Mock;
  const originalFetch = global.fetch;
  const originalEnvironment = {
    sandbox: process.env.ZARINPAL_SANDBOX,
    merchantId: process.env.ZARINPAL_MERCHANT_ID,
    callbackUrl: process.env.ZARINPAL_CALLBACK_URL,
  };

  beforeEach(() => {
    service = new ZarinpalService();
    fetchMock = jest.fn();
    global.fetch = fetchMock;
    process.env.ZARINPAL_SANDBOX = 'true';
    process.env.ZARINPAL_MERCHANT_ID = '00000000-0000-0000-0000-000000000000';
    process.env.ZARINPAL_CALLBACK_URL =
      'http://localhost:3000/payments/zarinpal/callback';
  });

  afterAll(() => {
    global.fetch = originalFetch;
    process.env.ZARINPAL_SANDBOX = originalEnvironment.sandbox;
    process.env.ZARINPAL_MERCHANT_ID = originalEnvironment.merchantId;
    process.env.ZARINPAL_CALLBACK_URL = originalEnvironment.callbackUrl;
  });

  it('creates a Sandbox payment request in toman', async () => {
    fetchMock.mockResolvedValue({
      json: jest.fn().mockResolvedValue({
        data: {
          code: 100,
          authority: 'S000000000000000000000000000000001',
          fee: 100,
        },
        errors: [],
      }),
    });

    await expect(
      service.requestPayment({
        amountToman: 10_000,
        description: 'Purchase',
        email: 'user@example.com',
        orderId: 12,
      }),
    ).resolves.toEqual({
      authority: 'S000000000000000000000000000000001',
      feeToman: 100,
      paymentUrl:
        'https://sandbox.zarinpal.com/pg/StartPay/S000000000000000000000000000000001',
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://sandbox.zarinpal.com/pg/v4/payment/request.json',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          merchant_id: '00000000-0000-0000-0000-000000000000',
          amount: 10_000,
          currency: 'IRT',
          callback_url: 'http://localhost:3000/payments/zarinpal/callback',
          description: 'Purchase',
          metadata: {
            email: 'user@example.com',
            order_id: '12',
          },
        }),
      }),
    );
  });

  it('accepts an already verified transaction', async () => {
    fetchMock.mockResolvedValue({
      json: jest.fn().mockResolvedValue({
        data: {
          code: 101,
          ref_id: 123456,
          card_pan: '502229******5995',
          card_hash: 'hash',
          fee: 0,
        },
        errors: [],
      }),
    });

    await expect(
      service.verifyPayment({
        amountToman: 10_000,
        authority: 'S000000000000000000000000000000001',
      }),
    ).resolves.toEqual({
      code: 101,
      refId: '123456',
      cardPan: '502229******5995',
      cardHash: 'hash',
      feeToman: 0,
    });
  });

  it('preserves a Zarinpal error code', async () => {
    fetchMock.mockResolvedValue({
      json: jest.fn().mockResolvedValue({
        data: {},
        errors: {
          code: -54,
          message: 'Invalid authority',
        },
      }),
    });

    const promise = service.verifyPayment({
      amountToman: 10_000,
      authority: 'invalid',
    });

    await expect(promise).rejects.toBeInstanceOf(PaymentGatewayError);
    await expect(promise).rejects.toMatchObject({ code: -54 });
  });

  it('uses the production endpoint only when explicitly configured', async () => {
    process.env.ZARINPAL_SANDBOX = 'false';
    process.env.ZARINPAL_MERCHANT_ID = '11111111-1111-1111-1111-111111111111';
    process.env.ZARINPAL_CALLBACK_URL =
      'https://api.example.com/payments/zarinpal/callback';
    fetchMock.mockResolvedValue({
      json: jest.fn().mockResolvedValue({
        data: {
          code: 100,
          authority: 'A000000000000000000000000000000001',
          fee: 0,
        },
        errors: [],
      }),
    });

    await service.requestPayment({
      amountToman: 10_000,
      description: 'Purchase',
      email: 'user@example.com',
      orderId: 12,
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://payment.zarinpal.com/pg/v4/payment/request.json',
      expect.any(Object),
    );
  });

  it('rejects a non-HTTPS production callback during startup', () => {
    process.env.ZARINPAL_SANDBOX = 'false';
    process.env.ZARINPAL_MERCHANT_ID = '11111111-1111-1111-1111-111111111111';
    process.env.ZARINPAL_CALLBACK_URL =
      'http://api.example.com/payments/zarinpal/callback';

    expect(() => service.onModuleInit()).toThrow(PaymentGatewayError);
  });

  it('rejects invalid gateway configuration during startup', () => {
    process.env.ZARINPAL_SANDBOX = 'maybe';

    expect(() => service.onModuleInit()).toThrow(PaymentGatewayError);
  });
});
