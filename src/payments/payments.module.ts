import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { ZarinpalService } from './zarinpal.service';
import { PAYMENT_GATEWAY } from './payment-gateway';

@Module({
  controllers: [PaymentsController],
  providers: [
    PaymentsService,
    ZarinpalService,
    {
      provide: PAYMENT_GATEWAY,
      useExisting: ZarinpalService,
    },
    PrismaService,
  ],
})
export class PaymentsModule {}
