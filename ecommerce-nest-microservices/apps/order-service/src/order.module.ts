import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SERVICES, postgresRoot, tcpClient } from '@app/common';
import { CartService } from './cart.service';
import { CouponsService } from './coupons.service';
import { Cart, CartItem, Coupon, CouponUsage, Order, OrderItem, OrderStatusHistory } from './entities';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

const entities = [Cart, CartItem, Coupon, CouponUsage, Order, OrderItem, OrderStatusHistory];

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    postgresRoot('ORDER_DB', 'order_db', entities),
    TypeOrmModule.forFeature(entities),
    tcpClient(SERVICES.AUTH, 'AUTH', 8001),
    tcpClient(SERVICES.CATALOG, 'CATALOG', 8002),
    tcpClient(SERVICES.PAYMENT, 'PAYMENT', 8004),
  ],
  controllers: [OrdersController],
  providers: [CartService, CouponsService, OrdersService],
})
export class OrderModule {}
