import { Controller, Get, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { SERVICES, tcpClient } from '@app/common';
import { JwtAuthGuard, OptionalAuthGuard, RolesGuard } from './auth';
import {
  AdminProductsController,
  BrandsController,
  CategoriesController,
  ProductsController,
  WishlistController,
} from './catalog.controllers';
import {
  AdminOrdersController,
  AdminPaymentsController,
  CartController,
  CouponsController,
  OrdersController,
  PaymentsController,
} from './commerce.controllers';
import { AdminIdentityController, AuthController, SellersController, UsersController } from './identity.controllers';

@Controller('health')
class HealthController {
  @Get() ok() { return { status: 'ok', time: new Date().toISOString() }; }
}

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // the gateway only VERIFIES tokens (same secret as auth-service)
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (c: ConfigService) => ({ secret: c.getOrThrow<string>('JWT_SECRET') }),
    }),
    tcpClient(SERVICES.AUTH, 'AUTH', 8001),
    tcpClient(SERVICES.CATALOG, 'CATALOG', 8002),
    tcpClient(SERVICES.ORDER, 'ORDER', 8003),
    tcpClient(SERVICES.PAYMENT, 'PAYMENT', 8004),
  ],
  controllers: [
    HealthController,
    AuthController, SellersController, UsersController, AdminIdentityController,
    CategoriesController, BrandsController, ProductsController, WishlistController, AdminProductsController,
    CartController, OrdersController, CouponsController, AdminOrdersController,
    PaymentsController, AdminPaymentsController,
  ],
  providers: [JwtAuthGuard, OptionalAuthGuard, RolesGuard],
})
export class GatewayModule {}
