import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { MSG } from '@app/common';
import { AuthService } from './auth.service';
import { UsersService } from './users.service';

@Controller()
export class AuthController {
  constructor(private readonly auth: AuthService, private readonly users: UsersService) {}

  // ---- auth
  @MessagePattern(MSG.AUTH_REGISTER) register(@Payload() dto: any) { return this.auth.register(dto); }
  @MessagePattern(MSG.AUTH_LOGIN) login(@Payload() dto: any) { return this.auth.login(dto); }
  @MessagePattern(MSG.AUTH_SELLER_REGISTER) sellerRegister(@Payload() dto: any) { return this.auth.registerSeller(dto); }
  @MessagePattern(MSG.AUTH_SELLER_LOGIN) sellerLogin(@Payload() dto: any) { return this.auth.loginSeller(dto); }
  @MessagePattern(MSG.AUTH_REFRESH) refresh(@Payload() d: { refreshToken: string }) { return this.auth.refresh(d.refreshToken); }
  @MessagePattern(MSG.AUTH_LOGOUT) logout(@Payload() d: { userId: string }) { return this.auth.logout(d.userId); }

  // ---- users
  @MessagePattern(MSG.USERS_ME) me(@Payload() d: { userId: string }) { return this.users.me(d.userId); }
  @MessagePattern(MSG.USERS_UPDATE) update(@Payload() d: { userId: string; dto: any }) { return this.users.update(d.userId, d.dto); }
  @MessagePattern(MSG.USERS_LIST) list(@Payload() d: { page?: number; limit?: number }) { return this.users.list(d.page, d.limit); }

  @MessagePattern(MSG.ADDRESS_LIST) addrList(@Payload() d: { userId: string }) { return this.users.listAddresses(d.userId); }
  @MessagePattern(MSG.ADDRESS_GET) addrGet(@Payload() d: { userId: string; id: string }) { return this.users.getAddress(d.userId, d.id); }
  @MessagePattern(MSG.ADDRESS_ADD) addrAdd(@Payload() d: { userId: string; dto: any }) { return this.users.addAddress(d.userId, d.dto); }
  @MessagePattern(MSG.ADDRESS_UPDATE) addrUpdate(@Payload() d: { userId: string; id: string; dto: any }) { return this.users.updateAddress(d.userId, d.id, d.dto); }
  @MessagePattern(MSG.ADDRESS_DELETE) addrDelete(@Payload() d: { userId: string; id: string }) { return this.users.deleteAddress(d.userId, d.id); }

  // ---- sellers
  @MessagePattern(MSG.SELLERS_ME) sellerMe(@Payload() d: { sellerId: string }) { return this.users.sellerMe(d.sellerId); }
  @MessagePattern(MSG.SELLERS_UPDATE) sellerUpdate(@Payload() d: { sellerId: string; dto: any }) { return this.users.sellerUpdate(d.sellerId, d.dto); }
  @MessagePattern(MSG.SELLERS_LIST) sellerList(@Payload() d: any) { return this.users.sellerList(d); }
  @MessagePattern(MSG.SELLERS_VERIFY) sellerVerify(@Payload() d: { sellerId: string; adminId: string; dto: any }) { return this.users.sellerVerify(d.sellerId, d.adminId, d.dto); }
}
