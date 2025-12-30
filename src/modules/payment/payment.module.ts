import { Module } from '@nestjs/common';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import {
  PaymentTransaction,
  PaymentTransactionSchema,
} from './schema/payment-transaction.schema';
import { MongooseModule } from '@nestjs/mongoose';
import { Order, OrderSchema } from '../order/schema/order.schema';
import { MailerModule } from 'src/shared/mailer/mailer.module';
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PaymentTransaction.name, schema: PaymentTransactionSchema },
      { name: Order.name, schema: OrderSchema },
    ]),
    MailerModule,
  ],
  controllers: [PaymentController],
  providers: [PaymentService],
  exports: [PaymentService],
})
export class PaymentModule {}
