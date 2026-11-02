import { Controller } from '@nestjs/common';
import { EventPattern, MessagePattern, Payload } from '@nestjs/microservices';
import { MSG } from '@app/common';
import { CartService } from './cart.service';
import { CouponsService } from './coupons.service';
import { OrdersService } from './orders.service';

@Controller()
export class OrdersController {
  constructor(
    private readonly cart: CartService,
    private readonly orders: OrdersService,
    private readonly coupons: CouponsService,
  ) {}

  // ---- cart
  @MessagePattern(MSG.CART_GET) cartGet(@Payload() d: any) { return this.cart.get(d.userId); }
  @MessagePattern(MSG.CART_ADD) cartAdd(@Payload() d: any) { return this.cart.add(d.userId, d.dto); }
  @MessagePattern(MSG.CART_UPDATE) cartUpdate(@Payload() d: any) { return this.cart.updateQuantity(d.userId, d.itemId, d.dto.quantity); }
  @MessagePattern(MSG.CART_REMOVE) cartRemove(@Payload() d: any) { return this.cart.remove(d.userId, d.itemId); }
  @MessagePattern(MSG.CART_CLEAR) cartClear(@Payload() d: any) { return this.cart.clear(d.userId); }
  @MessagePattern(MSG.CART_APPLY_COUPON) cartApply(@Payload() d: any) { return this.cart.applyCoupon(d.userId, d.dto.code); }
  @MessagePattern(MSG.CART_REMOVE_COUPON) cartUnapply(@Payload() d: any) { return this.cart.removeCoupon(d.userId); }

  // ---- orders
  @MessagePattern(MSG.ORDER_CHECKOUT) checkout(@Payload() d: any) { return this.orders.checkout(d.userId, d.dto); }
  @MessagePattern(MSG.ORDER_LIST_MINE) mine(@Payload() d: any) { return this.orders.mine(d.userId, d.query ?? {}); }
  @MessagePattern(MSG.ORDER_LIST_SELLER) seller(@Payload() d: any) { return this.orders.forSeller(d.sellerId, d.query ?? {}); }
  @MessagePattern(MSG.ORDER_LIST_ADMIN) admin(@Payload() d: any) { return this.orders.forAdmin(d.query ?? {}); }
  @MessagePattern(MSG.ORDER_GET) get(@Payload() d: any) { return this.orders.get(d.id, d.actor); }
  @MessagePattern(MSG.ORDER_CANCEL) cancel(@Payload() d: any) { return this.orders.cancel(d.id, d.actor, d.dto?.reason); }
  @MessagePattern(MSG.ORDER_UPDATE_STATUS) status(@Payload() d: any) { return this.orders.updateStatus(d.id, d.actor, d.dto); }

  // ---- coupons
  @MessagePattern(MSG.COUPON_CREATE) couponCreate(@Payload() d: any) { return this.coupons.create(d.actor, d.dto); }
  @MessagePattern(MSG.COUPON_UPDATE) couponUpdate(@Payload() d: any) { return this.coupons.update(d.actor, d.id, d.dto); }
  @MessagePattern(MSG.COUPON_LIST) couponList(@Payload() d: any) { return this.coupons.list(d.actor ?? null, d.page, d.limit); }

  // ---- events from payment-service
  @EventPattern(MSG.EVT_PAYMENT_SUCCEEDED) paid(@Payload() d: any) { return this.orders.onPaymentSucceeded(d); }
  @EventPattern(MSG.EVT_PAYMENT_FAILED) failed(@Payload() d: any) { return this.orders.onPaymentFailed(d); }
}
