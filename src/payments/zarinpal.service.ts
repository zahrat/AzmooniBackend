import { Injectable, OnModuleInit } from '@nestjs/common';
import {
  PaymentGateway,
  PaymentGatewayError,
  PaymentGatewayRequest,
  PaymentGatewayRequestResult,
  PaymentGatewayVerifyRequest,
  PaymentGatewayVerifyResult,
} from './payment-gateway';

const DEFAULT_SANDBOX_MERCHANT_ID = '00000000-0000-0000-0000-000000000000';
const DEFAULT_CALLBACK_URL = 'http://localhost:3000/payments/zarinpal/callback';
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface ZarinpalConfig {
  baseUrl: string;
  callbackUrl: string;
  merchantId: string;
}

@Injectable()
export class ZarinpalService implements PaymentGateway, OnModuleInit {
  onModuleInit(): void {
    this.getConfig();
  }

  async requestPayment(
    input: PaymentGatewayRequest,
  ): Promise<PaymentGatewayRequestResult> {
    const config = this.getConfig();
    const response = await this.post(config, '/pg/v4/payment/request.json', {
      merchant_id: config.merchantId,
      amount: input.amountToman,
      currency: 'IRT',
      callback_url: config.callbackUrl,
      description: input.description,
      metadata: {
        email: input.email,
        order_id: String(input.orderId),
      },
    });
    const data = this.getData(response);
    const code = this.getNumber(data.code);
    const authority = this.getString(data.authority);

    if (code !== 100 || !authority) {
      throw this.gatewayError(response, 'Zarinpal rejected payment request');
    }

    return {
      authority,
      feeToman: this.getNumber(data.fee),
      paymentUrl: `${config.baseUrl}/pg/StartPay/${authority}`,
    };
  }

  async verifyPayment(
    input: PaymentGatewayVerifyRequest,
  ): Promise<PaymentGatewayVerifyResult> {
    const config = this.getConfig();
    const response = await this.post(config, '/pg/v4/payment/verify.json', {
      merchant_id: config.merchantId,
      amount: input.amountToman,
      authority: input.authority,
    });
    const data = this.getData(response);
    const code = this.getNumber(data.code);
    const refId = this.getNumber(data.ref_id);

    if ((code !== 100 && code !== 101) || refId === null) {
      throw this.gatewayError(response, 'Zarinpal could not verify payment');
    }

    return {
      code,
      refId: String(refId),
      cardPan: this.getString(data.card_pan),
      cardHash: this.getString(data.card_hash),
      feeToman: this.getNumber(data.fee),
    };
  }

  private async post(
    config: ZarinpalConfig,
    path: string,
    body: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    let response: Response;

    try {
      response = await fetch(`${config.baseUrl}${path}`, {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(10_000),
      });
    } catch {
      throw new PaymentGatewayError('Could not connect to Zarinpal');
    }

    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      throw new PaymentGatewayError('Zarinpal returned an invalid response');
    }

    if (!this.isRecord(payload)) {
      throw new PaymentGatewayError('Zarinpal returned an invalid response');
    }

    return payload;
  }

  private gatewayError(
    response: Record<string, unknown>,
    fallbackMessage: string,
  ): PaymentGatewayError {
    const data = this.getData(response);
    const errors = this.isRecord(response.errors) ? response.errors : {};
    const code = this.getNumber(data.code) ?? this.getNumber(errors.code);
    const message =
      this.getString(data.message) ??
      this.getString(errors.message) ??
      fallbackMessage;

    return new PaymentGatewayError(message, code ?? undefined);
  }

  private getData(response: Record<string, unknown>): Record<string, unknown> {
    return this.isRecord(response.data) ? response.data : {};
  }

  private getConfig(): ZarinpalConfig {
    const sandbox = this.isSandbox();
    const merchantId =
      process.env.ZARINPAL_MERCHANT_ID?.trim() ||
      (sandbox ? DEFAULT_SANDBOX_MERCHANT_ID : '');

    if (!merchantId) {
      throw new PaymentGatewayError('ZARINPAL_MERCHANT_ID is required');
    }
    if (!UUID_PATTERN.test(merchantId)) {
      throw new PaymentGatewayError(
        'ZARINPAL_MERCHANT_ID must be a valid UUID',
      );
    }
    const callbackUrl =
      process.env.ZARINPAL_CALLBACK_URL?.trim() ||
      (sandbox ? DEFAULT_CALLBACK_URL : '');

    if (!callbackUrl) {
      throw new PaymentGatewayError('ZARINPAL_CALLBACK_URL is required');
    }

    let parsedCallbackUrl: URL;
    try {
      parsedCallbackUrl = new URL(callbackUrl);
    } catch {
      throw new PaymentGatewayError('ZARINPAL_CALLBACK_URL is invalid');
    }

    if (!sandbox && parsedCallbackUrl.protocol !== 'https:') {
      throw new PaymentGatewayError(
        'ZARINPAL_CALLBACK_URL must use HTTPS in production',
      );
    }

    return {
      baseUrl: sandbox
        ? 'https://sandbox.zarinpal.com'
        : 'https://payment.zarinpal.com',
      callbackUrl,
      merchantId,
    };
  }

  private isSandbox(): boolean {
    const value = process.env.ZARINPAL_SANDBOX?.trim().toLowerCase() ?? 'true';
    if (value !== 'true' && value !== 'false') {
      throw new PaymentGatewayError(
        'ZARINPAL_SANDBOX must be either true or false',
      );
    }
    return value === 'true';
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
  }

  private getNumber(value: unknown): number | null {
    return typeof value === 'number' && Number.isFinite(value) ? value : null;
  }

  private getString(value: unknown): string | null {
    return typeof value === 'string' && value.length > 0 ? value : null;
  }
}
