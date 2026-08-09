import { Injectable, Logger } from '@nestjs/common';

export const SMS_SENDER = Symbol('SMS_SENDER');

export interface SmsSender {
  sendOtp(phone: string, code: string): Promise<void>;
}

@Injectable()
export class DevelopmentSmsSender implements SmsSender {
  private readonly logger = new Logger(DevelopmentSmsSender.name);

  sendOtp(phone: string, code: string): Promise<void> {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('A production SmsSender must be configured');
    }

    this.logger.log(`Development OTP for ${phone}: ${code}`);
    return Promise.resolve();
  }
}

@Injectable()
export class KavenegarSmsSender implements SmsSender {
  async sendOtp(phone: string, code: string): Promise<void> {
    const { apiKey, template } = this.getConfig();
    const body = new URLSearchParams({
      receptor: this.toLocalPhone(phone),
      token: code,
      template,
      type: 'sms',
    });

    let response: Response;
    try {
      response = await fetch(
        `https://api.kavenegar.com/v1/${encodeURIComponent(apiKey)}/verify/lookup.json`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/x-www-form-urlencoded' },
          body,
          signal: AbortSignal.timeout(10_000),
        },
      );
    } catch {
      throw new Error('Could not connect to Kavenegar');
    }

    const payload = await this.readPayload(response);
    const result = this.isRecord(payload.return) ? payload.return : {};
    if (!response.ok || result.status !== 200) {
      const message =
        typeof result.message === 'string'
          ? result.message
          : 'Kavenegar rejected the OTP request';
      throw new Error(message);
    }
  }

  private getConfig(): { apiKey: string; template: string } {
    const apiKey = process.env.KAVENEGAR_API_KEY?.trim();
    const template = process.env.KAVENEGAR_OTP_TEMPLATE?.trim();
    if (!apiKey || !template) {
      throw new Error(
        'KAVENEGAR_API_KEY and KAVENEGAR_OTP_TEMPLATE are required',
      );
    }
    if (!/^[A-Za-z0-9-]+$/.test(template)) {
      throw new Error('KAVENEGAR_OTP_TEMPLATE has an invalid format');
    }
    return { apiKey, template };
  }

  private toLocalPhone(phone: string): string {
    return phone.startsWith('+98') ? `0${phone.slice(3)}` : phone;
  }

  private async readPayload(
    response: Response,
  ): Promise<Record<string, unknown>> {
    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      throw new Error('Kavenegar returned an invalid response');
    }
    if (!this.isRecord(payload)) {
      throw new Error('Kavenegar returned an invalid response');
    }
    return payload;
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
  }
}
