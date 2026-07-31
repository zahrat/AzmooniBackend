import {
  Controller,
  Get,
  Header,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../users/jwt-auth.guard';
import type { JwtUser } from '../users/user';
import { PaymentsService } from './payments.service';
import { renderPaymentCallbackPage } from './payment-callback-page';

interface AuthenticatedRequest extends Request {
  user: JwtUser;
}

const DEFAULT_PAYMENT_APP_RETURN_URL = 'azmooni://payment';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @UseGuards(JwtAuthGuard)
  @Post('books/:bookId/request')
  requestBookPayment(
    @Req() request: AuthenticatedRequest,
    @Param('bookId', ParseIntPipe) bookId: number,
  ) {
    return this.paymentsService.requestBookPayment(
      request.user.id,
      request.user.email,
      bookId,
    );
  }

  @Get('zarinpal/callback')
  @Header('Content-Type', 'text/html; charset=utf-8')
  @Header('Cache-Control', 'no-store')
  @Header('X-Content-Type-Options', 'nosniff')
  @Header('Referrer-Policy', 'no-referrer')
  @Header(
    'Content-Security-Policy',
    "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'",
  )
  async callback(
    @Query('Authority') authority: string,
    @Query('Status') status: string,
  ) {
    const result = await this.paymentsService.handleZarinpalCallback(
      authority,
      status,
    );
    return renderPaymentCallbackPage({
      ...result,
      appReturnUrl:
        process.env.PAYMENT_APP_RETURN_URL?.trim() ||
        DEFAULT_PAYMENT_APP_RETURN_URL,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/verify')
  retryVerification(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseIntPipe) paymentId: number,
  ) {
    return this.paymentsService.retryVerification(request.user.id, paymentId);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findOne(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseIntPipe) paymentId: number,
  ) {
    return this.paymentsService.findOneForUser(request.user.id, paymentId);
  }
}
