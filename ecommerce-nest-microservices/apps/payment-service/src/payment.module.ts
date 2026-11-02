import { Controller, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MSG, SERVICES, postgresRoot, tcpClient } from '@app/common';
import { PaymentOrder, Refund, Transaction } from './entities';
import { PAYMENT_PROVIDER, PaymentsService } from './payments.service';
import { MockPaymentProvider } from './providers';

@Controller()
export class PaymentsController {
  constructor(private readonly svc: PaymentsService) {}

  @MessagePattern(MSG.PAYMENT_CREATE) create(@Payload() d: any) { return this.svc.create(d); }
  @MessagePattern(MSG.PAYMENT_CONFIRM) confirm(@Payload() d: any) { return this.svc.confirm(d); }
  @MessagePattern(MSG.PAYMENT_GET) get(@Payload() d: any) { return this.svc.get(d.id, d.actor); }
  @MessagePattern(MSG.PAYMENT_LIST_MINE) mine(@Payload() d: any) { return this.svc.listMine(d.userId, d.page, d.limit); }
  @MessagePattern(MSG.REFUND_CREATE) refund(@Payload() d: any) { return this.svc.refund(d); }
  @MessagePattern(MSG.REFUND_LIST) refunds(@Payload() d: any) { return this.svc.listRefunds(d?.page, d?.limit); }
  @MessagePattern(MSG.TRANSACTION_LIST) txns(@Payload() d: any) { return this.svc.listTransactions(d?.page, d?.limit, d?.userId); }
}

const entities = [PaymentOrder, Refund, Transaction];

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    postgresRoot('PAYMENT_DB', 'payment_db', entities),
    TypeOrmModule.forFeature(entities),
    tcpClient(SERVICES.ORDER, 'ORDER', 8003),
  ],
  controllers: [PaymentsController],
  providers: [
    PaymentsService,
    // swap for a Razorpay / Stripe implementation of PaymentProvider
    { provide: PAYMENT_PROVIDER, useClass: MockPaymentProvider },
  ],
})
export class PaymentModule {}
