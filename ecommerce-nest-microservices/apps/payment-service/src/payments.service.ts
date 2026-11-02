import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  MSG,
  PaymentMethod,
  PaymentStatus,
  Role,
  SERVICES,
  emitEvent,
  pageParams,
  paged,
  round2,
} from '@app/common';
import { PaymentOrder, Refund, Transaction } from './entities';
import { PaymentProvider } from './providers';

export const PAYMENT_PROVIDER = 'PAYMENT_PROVIDER';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(PaymentOrder) private readonly payments: Repository<PaymentOrder>,
    @InjectRepository(Refund) private readonly refunds: Repository<Refund>,
    @InjectRepository(Transaction) private readonly txns: Repository<Transaction>,
    @Inject(PAYMENT_PROVIDER) private readonly provider: PaymentProvider,
    @Inject(SERVICES.ORDER) private readonly orders: ClientProxy,
  ) {}

  async create(d: { userId: string; amount: number; method: PaymentMethod; orderIds: string[] }) {
    if (!(d.amount > 0)) throw new BadRequestException('Amount must be greater than 0');
    if (!d.orderIds?.length) throw new BadRequestException('orderIds required');

    const po = await this.payments.save(
      this.payments.create({
        userId: d.userId,
        amount: round2(d.amount),
        method: d.method,
        provider: this.provider.name,
        orderIds: d.orderIds,
      }),
    );
    const link = await this.provider.createPayment({ amount: po.amount, currency: po.currency, referenceId: po.id });
    po.paymentLinkId = link.paymentLinkId;
    po.checkoutUrl = link.checkoutUrl;
    return this.payments.save(po);
  }

  /** Called by the gateway webhook / mock confirm endpoint. Idempotent. */
  async confirm(d: { paymentLinkId: string; providerPaymentId?: string; success: boolean }) {
    const po = await this.payments.findOne({ where: { paymentLinkId: d.paymentLinkId } });
    if (!po) throw new NotFoundException('Payment not found');
    if (po.status !== PaymentStatus.PENDING) return po; // already processed

    // compare-and-set so two concurrent webhooks cannot both emit the event
    const next = d.success ? PaymentStatus.COMPLETED : PaymentStatus.FAILED;
    const res = await this.payments.update(
      { id: po.id, status: PaymentStatus.PENDING },
      { status: next, providerPaymentId: d.providerPaymentId ?? `mock_pay_${Date.now()}` },
    );
    if (!res.affected) return this.payments.findOneBy({ id: po.id });

    await this.txns.save(
      this.txns.create({
        paymentOrderId: po.id, userId: po.userId, type: 'PAYMENT', amount: po.amount,
        status: next, providerRef: d.providerPaymentId ?? null,
      }),
    );
    const updated = await this.payments.findOneBy({ id: po.id });
    emitEvent(this.orders, d.success ? MSG.EVT_PAYMENT_SUCCEEDED : MSG.EVT_PAYMENT_FAILED, {
      paymentOrderId: po.id,
      orderIds: po.orderIds,
    });
    return updated;
  }

  async get(id: string, actor: { id: string; role: string }) {
    const po = await this.payments.findOne({ where: { id } });
    if (!po || (actor.role !== Role.ADMIN && po.userId !== actor.id)) throw new NotFoundException('Payment not found');
    return po;
  }

  async listMine(userId: string, page?: number, limit?: number) {
    const p = pageParams(page, limit);
    const [items, total] = await this.payments.findAndCount({
      where: { userId }, order: { createdAt: 'DESC' }, skip: p.skip, take: p.limit,
    });
    return paged(items, total, p.page, p.limit);
  }

  // ------------------------------------------------------------------ refunds
  async refund(d: { orderId: string; amount: number; reason?: string; requestedBy?: string }) {
    const po = await this.payments
      .createQueryBuilder('p')
      .where(':oid = ANY(p.orderIds)', { oid: d.orderId })
      .andWhere('p.status IN (:...st)', { st: [PaymentStatus.COMPLETED, PaymentStatus.REFUNDED] })
      .getOne();
    if (!po) throw new NotFoundException('No completed payment found for this order');

    const existing = await this.refunds.find({ where: { orderId: d.orderId } });
    if (existing.some((r) => r.status === 'COMPLETED' && r.amount >= d.amount)) {
      return existing.find((r) => r.status === 'COMPLETED'); // already refunded – idempotent
    }
    const alreadyRefundedTotal = (await this.refunds.find({ where: { paymentOrderId: po.id, status: 'COMPLETED' } }))
      .reduce((s, r) => s + r.amount, 0);
    if (round2(alreadyRefundedTotal + d.amount) > po.amount) {
      throw new BadRequestException('Refund exceeds the paid amount');
    }

    const { providerRefundId } = await this.provider.refund({
      providerPaymentId: po.providerPaymentId, amount: d.amount, reason: d.reason,
    });
    const refund = await this.refunds.save(
      this.refunds.create({
        paymentOrderId: po.id, orderId: d.orderId, amount: round2(d.amount), reason: d.reason,
        providerRefundId, requestedBy: d.requestedBy ?? null, status: 'COMPLETED', processedAt: new Date(),
      }),
    );
    await this.txns.save(
      this.txns.create({
        paymentOrderId: po.id, userId: po.userId, type: 'REFUND', amount: refund.amount,
        status: 'COMPLETED', providerRef: providerRefundId,
      }),
    );
    if (round2(alreadyRefundedTotal + d.amount) >= po.amount) {
      await this.payments.update(po.id, { status: PaymentStatus.REFUNDED });
    }
    return refund;
  }

  async listRefunds(page?: number, limit?: number) {
    const p = pageParams(page, limit);
    const [items, total] = await this.refunds.findAndCount({ order: { createdAt: 'DESC' }, skip: p.skip, take: p.limit });
    return paged(items, total, p.page, p.limit);
  }

  async listTransactions(page?: number, limit?: number, userId?: string) {
    const p = pageParams(page, limit);
    const [items, total] = await this.txns.findAndCount({
      where: userId ? { userId } : {}, order: { createdAt: 'DESC' }, skip: p.skip, take: p.limit,
    });
    return paged(items, total, p.page, p.limit);
  }
}
