import {
  Controller,
  Get,
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

interface AuthenticatedRequest extends Request {
  user: JwtUser;
}

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
  callback(
    @Query('Authority') authority: string,
    @Query('Status') status: string,
  ) {
    return this.paymentsService.handleZarinpalCallback(authority, status);
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
