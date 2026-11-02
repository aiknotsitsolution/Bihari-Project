import { Body, Controller, Delete, Get, Inject, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import {
  AddressDto,
  AuthUser,
  LoginDto,
  MSG,
  PaginationDto,
  RefreshDto,
  RegisterDto,
  Role,
  SERVICES,
  SellerRegisterDto,
  SellerVerificationDto,
  UpdateAddressDto,
  UpdateProfileDto,
  UpdateSellerDto,
  call,
} from '@app/common';
import { Auth, CurrentUser } from './auth';

@Controller('auth')
export class AuthController {
  constructor(@Inject(SERVICES.AUTH) private readonly auth: ClientProxy) {}

  @Post('signup') signup(@Body() dto: RegisterDto) { return call(this.auth, MSG.AUTH_REGISTER, dto); }
  @Post('signin') signin(@Body() dto: LoginDto) { return call(this.auth, MSG.AUTH_LOGIN, dto); }
  @Post('refresh') refresh(@Body() dto: RefreshDto) { return call(this.auth, MSG.AUTH_REFRESH, dto); }
  @Auth() @Post('logout') logout(@CurrentUser() u: AuthUser) { return call(this.auth, MSG.AUTH_LOGOUT, { userId: u.id }); }
}

@Controller('sellers')
export class SellersController {
  constructor(@Inject(SERVICES.AUTH) private readonly auth: ClientProxy) {}

  @Post() register(@Body() dto: SellerRegisterDto) { return call(this.auth, MSG.AUTH_SELLER_REGISTER, dto); }
  @Post('login') login(@Body() dto: LoginDto) { return call(this.auth, MSG.AUTH_SELLER_LOGIN, dto); }

  @Auth(Role.SELLER) @Get('me')
  me(@CurrentUser() u: AuthUser) { return call(this.auth, MSG.SELLERS_ME, { sellerId: u.id }); }

  @Auth(Role.SELLER) @Patch('me')
  update(@CurrentUser() u: AuthUser, @Body() dto: UpdateSellerDto) {
    return call(this.auth, MSG.SELLERS_UPDATE, { sellerId: u.id, dto });
  }
}

@Controller('users')
@Auth(Role.CUSTOMER, Role.ADMIN)
export class UsersController {
  constructor(@Inject(SERVICES.AUTH) private readonly auth: ClientProxy) {}

  @Get('me') me(@CurrentUser() u: AuthUser) { return call(this.auth, MSG.USERS_ME, { userId: u.id }); }
  @Patch('me') update(@CurrentUser() u: AuthUser, @Body() dto: UpdateProfileDto) {
    return call(this.auth, MSG.USERS_UPDATE, { userId: u.id, dto });
  }

  @Get('addresses') addresses(@CurrentUser() u: AuthUser) { return call(this.auth, MSG.ADDRESS_LIST, { userId: u.id }); }
  @Post('addresses') addAddress(@CurrentUser() u: AuthUser, @Body() dto: AddressDto) {
    return call(this.auth, MSG.ADDRESS_ADD, { userId: u.id, dto });
  }
  @Patch('addresses/:id') updateAddress(
    @CurrentUser() u: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAddressDto,
  ) {
    return call(this.auth, MSG.ADDRESS_UPDATE, { userId: u.id, id, dto });
  }
  @Delete('addresses/:id') deleteAddress(@CurrentUser() u: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return call(this.auth, MSG.ADDRESS_DELETE, { userId: u.id, id });
  }
}

/** Admin-only endpoints that belong to the identity domain. */
@Controller('admin')
@Auth(Role.ADMIN)
export class AdminIdentityController {
  constructor(@Inject(SERVICES.AUTH) private readonly auth: ClientProxy) {}

  @Get('users') users(@Query() q: PaginationDto) { return call(this.auth, MSG.USERS_LIST, q); }

  @Get('sellers') sellers(@Query() q: PaginationDto & { status?: string }) {
    return call(this.auth, MSG.SELLERS_LIST, q);
  }

  @Patch('sellers/:id/verification')
  verify(@CurrentUser() admin: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: SellerVerificationDto) {
    return call(this.auth, MSG.SELLERS_VERIFY, { sellerId: id, adminId: admin.id, dto });
  }
}
