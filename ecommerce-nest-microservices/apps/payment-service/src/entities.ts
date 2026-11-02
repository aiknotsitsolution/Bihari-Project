import { Column, Entity, Index } from 'typeorm';
import { AppBaseEntity, PaymentMethod, PaymentStatus, numericTransformer } from '@app/common';

const money = { type: 'numeric' as const, precision: 12, scale: 2, transformer: numericTransformer };

@Entity('payment_orders')
@Index(['userId', 'createdAt'])
export class PaymentOrder extends AppBaseEntity {
  @Column({ type: 'uuid' }) userId: string;
  @Column(money) amount: number;
  @Column({ type: 'varchar', default: 'INR' }) currency: string;
  @Column({ type: 'enum', enum: PaymentStatus, default: PaymentStatus.PENDING }) status: PaymentStatus;
  @Column({ type: 'enum', enum: PaymentMethod }) method: PaymentMethod;
  @Column({ type: 'varchar', default: 'mock' }) provider: string;

  @Index({ unique: true, where: '"paymentLinkId" IS NOT NULL' })
  @Column({ type: 'varchar', nullable: true })
  paymentLinkId: string;

  @Column({ type: 'varchar', nullable: true }) checkoutUrl: string;
  @Column({ type: 'varchar', nullable: true }) providerPaymentId: string;
  @Column({ type: 'uuid', array: true }) orderIds: string[];
}

@Entity('refunds')
export class Refund extends AppBaseEntity {
  @Index()
  @Column({ type: 'uuid' })
  paymentOrderId: string;

  @Index()
  @Column({ type: 'uuid' })
  orderId: string;

  @Column(money) amount: number;
  @Column({ type: 'varchar', default: 'COMPLETED' }) status: string; // PENDING | COMPLETED | FAILED
  @Column({ type: 'varchar', nullable: true }) reason: string;
  @Column({ type: 'varchar', nullable: true }) providerRefundId: string;
  @Column({ type: 'uuid', nullable: true }) requestedBy: string;
  @Column({ type: 'timestamptz', nullable: true }) processedAt: Date;
}

@Entity('transactions')
export class Transaction extends AppBaseEntity {
  @Index()
  @Column({ type: 'uuid' })
  paymentOrderId: string;

  @Column({ type: 'uuid' }) userId: string;
  @Column({ type: 'varchar' }) type: string; // PAYMENT | REFUND
  @Column(money) amount: number;
  @Column({ type: 'varchar' }) status: string;
  @Column({ type: 'varchar', nullable: true }) providerRef: string;
}
