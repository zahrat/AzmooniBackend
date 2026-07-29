export const PAYMENT_GATEWAY = Symbol('PAYMENT_GATEWAY');

export interface PaymentGatewayRequest {
  amountToman: number;
  description: string;
  email: string;
  orderId: number;
}

export interface PaymentGatewayRequestResult {
  authority: string;
  feeToman: number | null;
  paymentUrl: string;
}

export interface PaymentGatewayVerifyRequest {
  amountToman: number;
  authority: string;
}

export interface PaymentGatewayVerifyResult {
  code: 100 | 101;
  refId: string;
  cardPan: string | null;
  cardHash: string | null;
  feeToman: number | null;
}

export interface PaymentGateway {
  requestPayment(
    input: PaymentGatewayRequest,
  ): Promise<PaymentGatewayRequestResult>;
  verifyPayment(
    input: PaymentGatewayVerifyRequest,
  ): Promise<PaymentGatewayVerifyResult>;
}

export class PaymentGatewayError extends Error {
  constructor(
    message: string,
    readonly code?: number,
  ) {
    super(message);
  }
}
