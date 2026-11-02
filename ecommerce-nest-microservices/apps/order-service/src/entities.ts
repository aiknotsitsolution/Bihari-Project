import { Column, Entity, Index, ManyToOne, OneToMany, Unique } from 'typeorm';
import {
  AppBaseEntity,
  CouponOwner,
  DiscountType,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  ShipmentStatus,
  numericTransformer,
} from '@app/common';

const money = { type: 'numeric' as const, precision: 12, scale: 2, transformer: numericTransformer };
const moneyDefault0 = { ...money, default: 0 };

// ------------------------------------------------------------------ cart
@Entity('carts')
export class Cart extends AppBaseEntity {
  @Index({ unique: true })
  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'varchar', nullable: true }) couponCode: string;

  @OneToMany(() => CartItem, (i) => i.cart, { cascade: true })
  items: CartItem[];
}

@Entity('cart_items')
export class CartItem extends AppBaseEntity {
  @Index()
  @Column({ type: 'uuid' })
  cartId: string;

  @ManyToOne(() => Cart, (c) => c.items, { onDelete: 'CASCADE' })
  cart: Cart;

  @Column({ type: 'uuid' }) productId: string;
  @Column({ type: 'uuid', nullable: true }) variantId: string;
  @Column({ type: 'uuid' }) sellerId: string;
  @Column() title: string;
  @Column({ type: 'varchar', nullable: true }) image: string;
  @Column({ type: 'varchar', nullable: true }) size: string;
  @Column({ type: 'int' }) quantity: number;
  @Column(money) unitMrpPrice: number;
  @Column(money) unitSellingPrice: number;
}

// ------------------------------------------------------------------ coupons
@Entity('coupons')
export class Coupon extends AppBaseEntity {
  @Index({ unique: true })
  @Column()
  code: string;

  @Column({ type: 'varchar', default: '' }) name: string;
  @Column({ type: 'varchar', default: '' }) description: string;
  @Column({ type: 'enum', enum: DiscountType, default: DiscountType.PERCENTAGE }) discountType: DiscountType;
  @Column({ type: 'numeric', nullable: true, transformer: numericTransformer }) discountPercentage: number;
  @Column({ type: 'numeric', nullable: true, transformer: numericTransformer }) discountValue: number;
  @Column(moneyDefault0) maximumDiscount: number; // 0 = no cap
  @Column({ type: 'timestamptz' }) validityStartDate: Date;
  @Column({ type: 'timestamptz' }) validityEndDate: Date;
  @Column(moneyDefault0) minimumOrderValue: number;
  @Column({ type: 'int', default: 0 }) usageLimit: number; // 0 = unlimited
  @Column({ type: 'int', default: 0 }) usageCount: number;
  @Column({ type: 'enum', enum: CouponOwner, default: CouponOwner.PLATFORM }) ownerType: CouponOwner;
  @Column({ type: 'uuid', nullable: true }) sellerId: string;
  @Column({ default: true }) isActive: boolean;
}

@Entity('coupon_usages')
@Unique(['couponId', 'userId'])
export class CouponUsage extends AppBaseEntity {
  @Column({ type: 'uuid' }) couponId: string;
  @Column({ type: 'uuid' }) userId: string;
  @Column({ type: 'uuid', nullable: true }) firstOrderId: string;
}

// ------------------------------------------------------------------ orders
@Entity('orders')
@Index(['userId', 'orderDate'])
@Index(['sellerId', 'orderDate'])
@Index(['orderStatus', 'reservationExpiresAt'])
export class Order extends AppBaseEntity {
  @Index({ unique: true })
  @Column()
  orderNumber: string;

  @Column({ type: 'uuid' }) userId: string;
  @Column({ type: 'uuid' }) sellerId: string;

  @Column({ type: 'jsonb' })
  shippingAddress: {
    name: string; mobile: string; streetAddress: string; locality: string; city: string; state: string; pinCode: string;
  };

  @Column(money) totalMrpPrice: number;
  @Column(money) totalSellingPrice: number;
  @Column(moneyDefault0) couponPrice: number;
  @Column({ type: 'varchar', nullable: true }) couponCode: string;
  @Column({ type: 'enum', enum: CouponOwner, nullable: true }) couponOwnerType: CouponOwner;
  @Column(moneyDefault0) platformContribution: number;
  @Column(moneyDefault0) sellerContribution: number;
  /** what the customer pays = totalSellingPrice - couponPrice */
  @Column(money) totalPayable: number;
  @Column({ type: 'int' }) totalItem: number;

  @Column({ type: 'enum', enum: OrderStatus, default: OrderStatus.PENDING }) orderStatus: OrderStatus;
  @Column({ type: 'enum', enum: PaymentStatus, default: PaymentStatus.PENDING }) paymentStatus: PaymentStatus;
  @Column({ type: 'enum', enum: PaymentMethod }) paymentMethod: PaymentMethod;
  @Column({ type: 'uuid', nullable: true }) paymentOrderId: string;
  @Column({ type: 'enum', enum: ShipmentStatus, default: ShipmentStatus.UNFULFILLED }) shipmentStatus: ShipmentStatus;

  @Column({ type: 'timestamptz', default: () => 'now()' }) orderDate: Date;
  @Column({ type: 'timestamptz' }) deliverDate: Date;
  @Column({ type: 'timestamptz', nullable: true }) reservationExpiresAt: Date;
  @Column({ type: 'varchar', nullable: true }) trackingNumber: string;
  @Column({ type: 'varchar', nullable: true }) carrier: string;
  @Column({ type: 'timestamptz', nullable: true }) shippedAt: Date;
  @Column({ type: 'timestamptz', nullable: true }) deliveredAt: Date;

  @OneToMany(() => OrderItem, (i) => i.order, { cascade: true })
  items: OrderItem[];

  @OneToMany(() => OrderStatusHistory, (h) => h.order, { cascade: true })
  history: OrderStatusHistory[];
}

@Entity('order_items')
export class OrderItem extends AppBaseEntity {
  @Index()
  @Column({ type: 'uuid' })
  orderId: string;

  @ManyToOne(() => Order, (o) => o.items, { onDelete: 'CASCADE' })
  order: Order;

  @Column({ type: 'uuid' }) productId: string;
  @Column({ type: 'uuid', nullable: true }) variantId: string;
  @Column() title: string;
  @Column({ type: 'varchar', nullable: true }) image: string;
  @Column({ type: 'varchar', nullable: true }) size: string;
  @Column({ type: 'int' }) quantity: number;
  @Column(money) unitMrpPrice: number;
  @Column(money) unitSellingPrice: number;
}

@Entity('order_status_history')
export class OrderStatusHistory extends AppBaseEntity {
  @Index()
  @Column({ type: 'uuid' })
  orderId: string;

  @ManyToOne(() => Order, (o) => o.history, { onDelete: 'CASCADE' })
  order: Order;

  @Column({ type: 'varchar', nullable: true }) fromStatus: string;
  @Column() toStatus: string;
  @Column({ type: 'uuid', nullable: true }) changedBy: string; // null = system
  @Column({ default: 'SYSTEM' }) changedByRole: string;
  @Column({ type: 'varchar', nullable: true }) note: string;
}
