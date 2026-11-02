import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Inject,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientProxy } from '@nestjs/microservices';
import { timingSafeEqual } from 'crypto';
import {
  AddCartItemDto,
  ApplyCouponDto,
  AuthUser,
  CancelOrderDto,
  CheckoutDto,
  ConfirmPaymentDto,
  CreateCouponDto,
  MSG,
  OrderQueryDto,
  PaginationDto,
  RefundDto,
  Role,
  SERVICES,
  UpdateCartItemDto,
  UpdateCouponDto,
  UpdateOrderStatusDto,
  call,
} from '@app/common';
import { Auth, CurrentUser } from './auth';

@Controller('cart')
@Auth(Role.CUSTOMER)
export class CartController {
  constructor(@Inject(SERVICES.ORDER) private readonly order: ClientProxy) {}

  @Get() get(@CurrentUser() u: AuthUser) { return call(this.order, MSG.CART_GET, { userId: u.id }); }
  @Post('items') add(@CurrentUser() u: AuthUser, @Body() dto: AddCartItemDto) {
    return call(this.order, MSG.CART_ADD, { userId: u.id, dto });
  }
  @Patch('items/:itemId') update(@CurrentUser() u: AuthUser, @Param('itemId', ParseUUIDPipe) itemId: string, @Body() dto: UpdateCartItemDto) {
    return call(this.order, MSG.CART_UPDATE, { userId: u.id, itemId, dto });
  }
  @Delete('items/:itemId') remove(@CurrentUser() u: AuthUser, @Param('itemId', ParseUUIDPipe) itemId: string) {
    return call(this.order, MSG.CART_REMOVE, { userId: u.id, itemId });
  }
  @Delete() clear(@CurrentUser() u: AuthUser) { return call(this.order, MSG.CART_CLEAR, { userId: u.id }); }

  @Post('coupon') apply(@CurrentUser() u: AuthUser, @Body() dto: ApplyCouponDto) {
    return call(this.order, MSG.CART_APPLY_COUPON, { userId: u.id, dto });
  }
  @Delete('coupon') removeCoupon(@CurrentUser() u: AuthUser) { return call(this.order, MSG.CART_REMOVE_COUPON, { userId: u.id }); }
}

@Controller('orders')
export class OrdersController {
  constructor(@Inject(SERVICES.ORDER) private readonly order: ClientProxy) {}

  @Auth(Role.CUSTOMER) @Post('checkout')
  checkout(@CurrentUser() u: AuthUser, @Body() dto: CheckoutDto) {
    return call(this.order, MSG.ORDER_CHECKOUT, { userId: u.id, dto }, 30000);
  }

  @Auth(Role.CUSTOMER) @Get()
  mine(@CurrentUser() u: AuthUser, @Query() query: OrderQueryDto) {
    return call(this.order, MSG.ORDER_LIST_MINE, { userId: u.id, query });
  }

  @Auth(Role.SELLER) @Get('seller')
  seller(@CurrentUser() u: AuthUser, @Query() query: OrderQueryDto) {
    return call(this.order, MSG.ORDER_LIST_SELLER, { sellerId: u.id, query });
  }

  @Auth() @Get(':id')
  get(@CurrentUser() u: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return call(this.order, MSG.ORDER_GET, { id, actor: u });
  }

  @Auth() @Post(':id/cancel')
  cancel(@CurrentUser() u: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: CancelOrderDto) {
    return call(this.order, MSG.ORDER_CANCEL, { id, actor: u, dto }, 30000);
  }

  @Auth(Role.SELLER, Role.ADMIN) @Patch(':id/status')
  status(@CurrentUser() u: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateOrderStatusDto) {
    return call(this.order, MSG.ORDER_UPDATE_STATUS, { id, actor: u, dto }, 30000);
  }
}

@Controller('coupons')
export class CouponsController {
  constructor(@Inject(SERVICES.ORDER) private readonly order: ClientProxy) {}

  @Get() publicList(@Query() q: PaginationDto) { return call(this.order, MSG.COUPON_LIST, { actor: null, ...q }); }

  @Auth(Role.ADMIN, Role.SELLER) @Get('manage')
  manage(@CurrentUser() u: AuthUser, @Query() q: PaginationDto) { return call(this.order, MSG.COUPON_LIST, { actor: u, ...q }); }

  @Auth(Role.ADMIN, Role.SELLER) @Post()
  create(@CurrentUser() u: AuthUser, @Body() dto: CreateCouponDto) { return call(this.order, MSG.COUPON_CREATE, { actor: u, dto }); }

  @Auth(Role.ADMIN, Role.SELLER) @Patch(':id')
  update(@CurrentUser() u: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateCouponDto) {
    return call(this.order, MSG.COUPON_UPDATE, { actor: u, id, dto });
  }
}

@Controller('admin/orders')
@Auth(Role.ADMIN)
export class AdminOrdersController {
  constructor(@Inject(SERVICES.ORDER) private readonly order: ClientProxy) {}
  @Get() list(@Query() query: OrderQueryDto) { return call(this.order, MSG.ORDER_LIST_ADMIN, { query }); }
}

@Controller('payments')
export class PaymentsController {
  constructor(
    @Inject(SERVICES.PAYMENT) private readonly payment: ClientProxy,
    private readonly config: ConfigService,
  ) {}

  @Auth(Role.CUSTOMER) @Get()
  mine(@CurrentUser() u: AuthUser, @Query() q: PaginationDto) { return call(this.payment, MSG.PAYMENT_LIST_MINE, { userId: u.id, ...q }); }

  /**
   * Gateway callback. With the mock provider this is how a payment is "completed" in dev.
   * Protected by a shared secret header; replace with provider signature verification
   * (Razorpay X-Razorpay-Signature / Stripe-Signature) when real gateways are plugged in.
   */
  @Post('confirm')
  confirm(@Headers('x-webhook-secret') secret: string, @Body() dto: ConfirmPaymentDto) {
    const expected = this.config.get<string>('PAYMENT_WEBHOOK_SECRET');
    if (!expected) throw new ServiceUnavailableException('Payment webhook is not configured');
    const a = Buffer.from(secret ?? '');
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) throw new UnauthorizedException('Invalid webhook secret');
    return call(this.payment, MSG.PAYMENT_CONFIRM, dto);
  }

  @Auth() @Get(':id')
  get(@CurrentUser() u: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return call(this.payment, MSG.PAYMENT_GET, { id, actor: u });
  }
}

@Controller('admin')
@Auth(Role.ADMIN)
export class AdminPaymentsController {
  constructor(@Inject(SERVICES.PAYMENT) private readonly payment: ClientProxy) {}

  @Get('refunds') refunds(@Query() q: PaginationDto) { return call(this.payment, MSG.REFUND_LIST, q); }
  @Post('refunds') refund(@CurrentUser() u: AuthUser, @Body() dto: RefundDto) {
    return call(this.payment, MSG.REFUND_CREATE, { ...dto, requestedBy: u.id });
  }
  @Get('transactions') txns(@Query() q: PaginationDto) { return call(this.payment, MSG.TRANSACTION_LIST, q); }
}
