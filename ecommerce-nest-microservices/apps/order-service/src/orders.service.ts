import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  OnApplicationBootstrap,
  OnModuleDestroy,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, LessThan, Repository } from 'typeorm';
import { randomBytes } from 'crypto';
import { inspect } from 'util';
import {
  CheckoutDto,
  MSG,
  OrderQueryDto,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  Role,
  SERVICES,
  ShipmentStatus,
  UpdateOrderStatusDto,
  call,
  pageParams,
  paged,
  round2,
} from '@app/common';
import { CartService } from './cart.service';
import { CouponsService } from './coupons.service';
import { Cart, CartItem, Coupon, Order, OrderItem, OrderStatusHistory } from './entities';

type Actor = { id: string; role: string } | null;

const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.PENDING]: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
  [OrderStatus.CONFIRMED]: [OrderStatus.SHIPPED, OrderStatus.CANCELLED],
  [OrderStatus.SHIPPED]: [OrderStatus.DELIVERED],
  [OrderStatus.DELIVERED]: [],
  [OrderStatus.CANCELLED]: [],
};

const RESERVATION_MINUTES = 15;
const DELIVERY_DAYS = 7;
const MAX_DNS_RETRIES = 3;

function getErrorCode(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null) return undefined;
  const details = error as { code?: unknown; cause?: unknown; driverError?: unknown };
  if (typeof details.code === 'string') return details.code;
  return getErrorCode(details.driverError) ?? getErrorCode(details.cause);
}

function formatError(error: unknown, seen = new Set<object>()): string {
  if (typeof error !== 'object' || error === null) return inspect(error);
  if (seen.has(error)) return '[Circular error]';
  seen.add(error);

  if (!(error instanceof Error)) return inspect(error, { depth: 5, colors: false });

  const details = error as Error & {
    code?: unknown;
    cause?: unknown;
    errors?: unknown;
    driverError?: unknown;
  };
  const parts = [`${error.name || 'Error'}: ${error.message || '(empty message)'}`];
  if (typeof details.code === 'string') parts.push(`code: ${details.code}`);
  if (error.stack) parts.push(error.stack);
  if (Array.isArray(details.errors)) {
    parts.push(`causes: ${details.errors.map((cause) => formatError(cause, seen)).join('; ')}`);
  }
  if (details.cause) parts.push(`cause: ${formatError(details.cause, seen)}`);
  if (details.driverError) parts.push(`driver error: ${formatError(details.driverError, seen)}`);
  return parts.join('\n');
}

@Injectable()
export class OrdersService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(OrdersService.name);
  private timer?: NodeJS.Timeout;

  constructor(
    @InjectRepository(Order) private readonly orders: Repository<Order>,
    @InjectRepository(OrderStatusHistory) private readonly history: Repository<OrderStatusHistory>,
    @InjectDataSource() private readonly ds: DataSource,
    @Inject(SERVICES.AUTH) private readonly auth: ClientProxy,
    @Inject(SERVICES.CATALOG) private readonly catalog: ClientProxy,
    @Inject(SERVICES.PAYMENT) private readonly payment: ClientProxy,
    private readonly carts: CartService,
    private readonly coupons: CouponsService,
  ) {}

  // ----------------------------------------------------------- reservation expiry job
  onApplicationBootstrap() {
    this.timer = setInterval(
      () => this.expireReservations().catch((error) =>
        this.logger.error(`Reservation expiry job failed:\n${formatError(error)}`),
      ),
      60_000,
    );
  }
  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async expireReservations() {
    const stale = await this.findExpiredReservations();
    for (const o of stale) {
      await this.cancelUnpaid(o, 'Payment window expired', PaymentStatus.FAILED);
    }
    if (stale.length) this.logger.log(`Expired ${stale.length} unpaid order(s)`);
  }

  private async findExpiredReservations(): Promise<Order[]> {
    for (let attempt = 1; ; attempt++) {
      try {
        return await this.orders.find({
          where: {
            orderStatus: OrderStatus.PENDING,
            paymentMethod: PaymentMethod.ONLINE,
            reservationExpiresAt: LessThan(new Date()),
          },
          relations: { items: true },
          take: 100,
        });
      } catch (error) {
        const code = getErrorCode(error);
        if (!['ENOTFOUND', 'EAI_AGAIN'].includes(code ?? '') || attempt >= MAX_DNS_RETRIES) {
          throw error;
        }

        const delayMs = 500 * 2 ** (attempt - 1);
        this.logger.warn(
          `Temporary database DNS error (${code}); retrying expired-order lookup in ${delayMs}ms (${attempt}/${MAX_DNS_RETRIES - 1})`,
        );
        await new Promise<void>((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  // ----------------------------------------------------------- checkout
  async checkout(userId: string, dto: CheckoutDto) {
    const cart = await this.carts.getOrCreate(userId);
    if (!cart.items.length) throw new BadRequestException('Cart is empty');

    const address = await call<any>(this.auth, MSG.ADDRESS_GET, { userId, id: dto.addressId });
    const snaps = await call<any[]>(this.catalog, MSG.PRODUCT_SNAPSHOT, {
      items: cart.items.map((i) => ({ productId: i.productId, variantId: i.variantId ?? undefined })),
    });
    // always trust fresh catalog prices, never the stored cart prices
    const lines = cart.items.map((ci, idx) => ({ ...snaps[idx], quantity: ci.quantity }));
    for (const l of lines) {
      if (l.quantity > l.availableQuantity) {
        throw new BadRequestException(`Only ${l.availableQuantity} unit(s) of "${l.title}" available`);
      }
    }

    const couponResult = cart.couponCode ? await this.coupons.evaluate(cart.couponCode, userId, lines) : null;

    // group by seller -> one order per seller
    const bySeller = new Map<string, typeof lines>();
    for (const l of lines) bySeller.set(l.sellerId, [...(bySeller.get(l.sellerId) ?? []), l]);

    const stock = lines.map((l) => ({ productId: l.productId, variantId: l.variantId ?? undefined, quantity: l.quantity }));
    await call(this.catalog, MSG.INVENTORY_RESERVE, { items: stock }); // throws 409 if not enough stock

    const now = new Date();
    let created: Order[];
    try {
      created = await this.ds.transaction(async (m) => {
        const out: Order[] = [];
        for (const [sellerId, group] of bySeller) {
          const mrp = round2(group.reduce((s, l) => s + l.unitMrpPrice * l.quantity, 0));
          const selling = round2(group.reduce((s, l) => s + l.unitSellingPrice * l.quantity, 0));
          const split = couponResult?.perSeller[sellerId];
          const couponPrice = split?.total ?? 0;
          const order = m.create(Order, {
            orderNumber: `ORD-${now.getTime().toString(36).toUpperCase()}-${randomBytes(3).toString('hex').toUpperCase()}`,
            userId,
            sellerId,
            shippingAddress: {
              name: address.name, mobile: address.mobile, streetAddress: address.streetAddress,
              locality: address.locality, city: address.city, state: address.state, pinCode: address.pinCode,
            },
            totalMrpPrice: mrp,
            totalSellingPrice: selling,
            couponPrice,
            couponCode: couponPrice > 0 ? couponResult!.code : null,
            couponOwnerType: couponPrice > 0 ? couponResult!.ownerType : null,
            platformContribution: split?.platform ?? 0,
            sellerContribution: split?.seller ?? 0,
            totalPayable: round2(selling - couponPrice),
            totalItem: group.reduce((s, l) => s + l.quantity, 0),
            paymentMethod: dto.paymentMethod,
            orderDate: now,
            deliverDate: new Date(now.getTime() + DELIVERY_DAYS * 86400_000),
            reservationExpiresAt: new Date(now.getTime() + RESERVATION_MINUTES * 60_000),
            items: group.map((l) =>
              m.create(OrderItem, {
                productId: l.productId, variantId: l.variantId, title: l.title, image: l.image, size: l.size,
                quantity: l.quantity, unitMrpPrice: l.unitMrpPrice, unitSellingPrice: l.unitSellingPrice,
              }),
            ),
            history: [m.create(OrderStatusHistory, { fromStatus: null, toStatus: OrderStatus.PENDING, changedBy: userId, changedByRole: Role.CUSTOMER, note: 'Order placed' })],
          });
          out.push(await m.save(order));
        }
        if (couponResult) await this.coupons.recordUsage(m, couponResult.couponId, userId, out[0].id);
        await m.delete(CartItem, { cartId: cart.id });
        await m.update(Cart, { id: cart.id }, { couponCode: null });
        return out;
      });
    } catch (e) {
      await call(this.catalog, MSG.INVENTORY_RELEASE, { items: stock }).catch(() => undefined);
      throw e;
    }

    const totalPayable = round2(created.reduce((s, o) => s + o.totalPayable, 0));

    // ---- COD, or fully discounted: no gateway needed
    if (dto.paymentMethod === PaymentMethod.COD || totalPayable === 0) {
      const paid = dto.paymentMethod !== PaymentMethod.COD;
      for (const o of created) {
        await this.confirm(o.id, paid ? PaymentStatus.COMPLETED : PaymentStatus.PENDING, null);
      }
      return { orders: await this.byIds(created.map((o) => o.id)), payment: null };
    }

    // ---- online payment
    let payment: any;
    try {
      payment = await call(this.payment, MSG.PAYMENT_CREATE, {
        userId,
        amount: totalPayable,
        method: PaymentMethod.ONLINE,
        orderIds: created.map((o) => o.id),
      });
    } catch (e) {
      for (const o of created) {
        const full = await this.orders.findOne({ where: { id: o.id }, relations: { items: true } });
        await this.cancelUnpaid(full, 'Could not start payment', PaymentStatus.FAILED);
      }
      throw e;
    }
    await this.orders.update(created.map((o) => o.id), { paymentOrderId: payment.id });
    return { orders: await this.byIds(created.map((o) => o.id)), payment };
  }

  // ----------------------------------------------------------- payment events
  async onPaymentSucceeded(evt: { paymentOrderId: string; orderIds: string[] }) {
    for (const id of evt.orderIds) {
      const order = await this.orders.findOne({ where: { id }, relations: { items: true } });
      if (!order || order.paymentStatus === PaymentStatus.COMPLETED) continue; // idempotent
      if (order.orderStatus === OrderStatus.PENDING) {
        await this.confirm(id, PaymentStatus.COMPLETED, null);
      } else if (order.orderStatus === OrderStatus.CANCELLED) {
        // customer paid after we already expired / cancelled the order -> refund
        await this.orders.update(id, { paymentStatus: PaymentStatus.COMPLETED });
        await this.refund(order, 'Order was cancelled before payment arrived', null).catch((e) =>
          this.logger.error(`Auto-refund failed for ${order.orderNumber}:\n${formatError(e)}`),
        );
      }
    }
  }

  async onPaymentFailed(evt: { paymentOrderId: string; orderIds: string[] }) {
    for (const id of evt.orderIds) {
      const order = await this.orders.findOne({ where: { id }, relations: { items: true } });
      if (order) await this.cancelUnpaid(order, 'Payment failed', PaymentStatus.FAILED);
    }
  }

  // ----------------------------------------------------------- queries
  async mine(userId: string, q: OrderQueryDto) {
    return this.page({ userId, ...(q.status ? { orderStatus: q.status } : {}) }, q);
  }
  async forSeller(sellerId: string, q: OrderQueryDto) {
    return this.page({ sellerId, ...(q.status ? { orderStatus: q.status } : {}) }, q);
  }
  async forAdmin(q: OrderQueryDto) {
    return this.page(q.status ? { orderStatus: q.status } : {}, q);
  }

  async get(orderId: string, actor: { id: string; role: string }) {
    const order = await this.orders.findOne({ where: { id: orderId }, relations: { items: true, history: true } });
    if (!order) throw new NotFoundException('Order not found');
    this.assertAccess(order, actor);
    order.history?.sort((a, b) => +a.createdAt - +b.createdAt);
    return order;
  }

  // ----------------------------------------------------------- status changes
  async updateStatus(orderId: string, actor: { id: string; role: string }, dto: UpdateOrderStatusDto) {
    const order = await this.orders.findOne({ where: { id: orderId }, relations: { items: true } });
    if (!order) throw new NotFoundException('Order not found');
    if (actor.role === Role.CUSTOMER) throw new ForbiddenException();
    this.assertAccess(order, actor);

    if (dto.status === OrderStatus.CANCELLED) return this.cancel(orderId, actor, dto.note);
    if (!TRANSITIONS[order.orderStatus].includes(dto.status)) {
      throw new BadRequestException(`Cannot move order from ${order.orderStatus} to ${dto.status}`);
    }

    const patch: Record<string, any> = {};
    if (dto.status === OrderStatus.SHIPPED) {
      Object.assign(patch, {
        shipmentStatus: ShipmentStatus.SHIPPED,
        shippedAt: new Date(),
        trackingNumber: dto.trackingNumber ?? order.trackingNumber,
        carrier: dto.carrier ?? order.carrier,
      });
    }
    if (dto.status === OrderStatus.DELIVERED) {
      Object.assign(patch, { shipmentStatus: ShipmentStatus.DELIVERED, deliveredAt: new Date() });
      if (order.paymentMethod === PaymentMethod.COD) patch.paymentStatus = PaymentStatus.COMPLETED; // cash collected
    }
    const ok = await this.setStatus(order.id, order.orderStatus, dto.status, patch, actor, dto.note);
    if (!ok) throw new BadRequestException('Order was modified concurrently, please retry');
    return this.get(orderId, actor);
  }

  async cancel(orderId: string, actor: { id: string; role: string }, reason?: string) {
    const order = await this.orders.findOne({ where: { id: orderId }, relations: { items: true } });
    if (!order) throw new NotFoundException('Order not found');
    this.assertAccess(order, actor);
    if (![OrderStatus.PENDING, OrderStatus.CONFIRMED].includes(order.orderStatus)) {
      throw new BadRequestException(`Order in ${order.orderStatus} status cannot be cancelled`);
    }

    // paid online order -> refund first so we never cancel without returning the money
    if (order.paymentStatus === PaymentStatus.COMPLETED && order.paymentMethod === PaymentMethod.ONLINE) {
      await this.refund(order, reason ?? 'Order cancelled', actor);
    }
    const wasPending = order.orderStatus === OrderStatus.PENDING;
    const patch: Record<string, any> = { reservationExpiresAt: null };
    if (order.paymentStatus === PaymentStatus.COMPLETED && order.paymentMethod === PaymentMethod.ONLINE) {
      patch.paymentStatus = PaymentStatus.REFUNDED;
    }
    const ok = await this.setStatus(order.id, order.orderStatus, OrderStatus.CANCELLED, patch, actor, reason);
    if (!ok) throw new BadRequestException('Order was modified concurrently, please retry');

    // PENDING held a reservation, CONFIRMED already sold the units
    await call(this.catalog, wasPending ? MSG.INVENTORY_RELEASE : MSG.INVENTORY_RESTOCK, { items: this.stockOf(order) });
    if (wasPending) await this.revertCouponIfUnused(order);
    return this.get(orderId, actor);
  }

  // ----------------------------------------------------------- internals
  /** PENDING -> CONFIRMED, commits reserved stock. Safe against double delivery of the same event. */
  private async confirm(orderId: string, paymentStatus: PaymentStatus, actor: Actor) {
    const ok = await this.setStatus(
      orderId, OrderStatus.PENDING, OrderStatus.CONFIRMED,
      { paymentStatus, reservationExpiresAt: null }, actor,
      paymentStatus === PaymentStatus.COMPLETED ? 'Payment received' : 'Order confirmed (pay on delivery)',
    );
    if (!ok) return;
    const order = await this.orders.findOne({ where: { id: orderId }, relations: { items: true } });
    await call(this.catalog, MSG.INVENTORY_COMMIT, { items: this.stockOf(order) });
  }

  /** Cancels a never-paid PENDING order and releases its stock hold. */
  private async cancelUnpaid(order: Order, note: string, paymentStatus: PaymentStatus) {
    const ok = await this.setStatus(
      order.id, OrderStatus.PENDING, OrderStatus.CANCELLED,
      { paymentStatus, reservationExpiresAt: null }, null, note,
    );
    if (!ok) return; // already paid / cancelled by someone else
    await call(this.catalog, MSG.INVENTORY_RELEASE, { items: this.stockOf(order) }).catch((e) =>
      this.logger.error(`Release failed for ${order.orderNumber}:\n${formatError(e)}`),
    );
    await this.revertCouponIfUnused(order);
  }

  private async refund(order: Order, reason: string, actor: Actor) {
    await call(this.payment, MSG.REFUND_CREATE, {
      orderId: order.id,
      amount: order.totalPayable,
      reason,
      requestedBy: actor?.id ?? null,
    });
    await this.orders.update(order.id, { paymentStatus: PaymentStatus.REFUNDED });
  }

  /** Atomic status change: only succeeds if the order is still in `from`. Writes the audit trail. */
  private async setStatus(orderId: string, from: OrderStatus, to: OrderStatus, patch: Record<string, any>, actor: Actor, note?: string) {
    const res = await this.orders.update({ id: orderId, orderStatus: from }, { ...(patch as any), orderStatus: to });
    if (!res.affected) return false;
    await this.history.save(
      this.history.create({
        orderId, fromStatus: from, toStatus: to,
        changedBy: actor?.id ?? null, changedByRole: actor?.role ?? 'SYSTEM', note,
      }),
    );
    return true;
  }

  private async revertCouponIfUnused(order: Order) {
    if (!order.couponCode) return;
    const stillActive = await this.orders
      .createQueryBuilder('o')
      .where('o.userId = :u AND o.couponCode = :c AND o.orderStatus <> :x', { u: order.userId, c: order.couponCode, x: OrderStatus.CANCELLED })
      .getCount();
    if (stillActive) return;
    const coupon = await this.ds.manager.findOne(Coupon, { where: { code: order.couponCode } });
    if (coupon) await this.coupons.revertUsage(this.ds.manager, coupon.id, order.userId);
  }

  private assertAccess(order: Order, actor: { id: string; role: string }) {
    if (actor.role === Role.ADMIN) return;
    if (actor.role === Role.SELLER && order.sellerId === actor.id) return;
    if (actor.role === Role.CUSTOMER && order.userId === actor.id) return;
    throw new NotFoundException('Order not found'); // do not reveal existence
  }

  private stockOf(order: Order) {
    return order.items.map((i) => ({ productId: i.productId, variantId: i.variantId ?? undefined, quantity: i.quantity }));
  }

  private byIds(ids: string[]) {
    return this.orders.find({ where: ids.map((id) => ({ id })), relations: { items: true }, order: { createdAt: 'ASC' } });
  }

  private async page(where: any, q: OrderQueryDto) {
    const p = pageParams(q.page, q.limit);
    const [items, total] = await this.orders.findAndCount({
      where,
      relations: { items: true },
      order: { orderDate: 'DESC' },
      skip: p.skip,
      take: p.limit,
    });
    return paged(items, total, p.page, p.limit);
  }
}
