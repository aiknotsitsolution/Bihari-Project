import { Body, Controller, Delete, Get, Inject, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import {
  AuthUser,
  CreateBrandDto,
  CreateCategoryDto,
  CreateProductDto,
  CreateReviewDto,
  MSG,
  ModerateProductDto,
  PaginationDto,
  ProductQueryDto,
  PublishProductDto,
  Role,
  SERVICES,
  UpdateBrandDto,
  UpdateCategoryDto,
  UpdateProductDto,
  UpdateVariantDto,
  VariantDto,
  call,
} from '@app/common';
import { Auth, CurrentUser, OptionalAuth } from './auth';

@Controller('categories')
export class CategoriesController {
  constructor(@Inject(SERVICES.CATALOG) private readonly catalog: ClientProxy) {}

  @Get() tree() { return call(this.catalog, MSG.CATEGORY_TREE); }
  @Get(':id') get(@Param('id', ParseUUIDPipe) id: string) { return call(this.catalog, MSG.CATEGORY_GET, { id }); }

  @Auth(Role.ADMIN) @Post() create(@Body() dto: CreateCategoryDto) { return call(this.catalog, MSG.CATEGORY_CREATE, { dto }); }
  @Auth(Role.ADMIN) @Patch(':id') update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateCategoryDto) {
    return call(this.catalog, MSG.CATEGORY_UPDATE, { id, dto });
  }
  @Auth(Role.ADMIN) @Delete(':id') remove(@Param('id', ParseUUIDPipe) id: string) {
    return call(this.catalog, MSG.CATEGORY_DELETE, { id });
  }
}

@Controller('brands')
export class BrandsController {
  constructor(@Inject(SERVICES.CATALOG) private readonly catalog: ClientProxy) {}

  @Get() list() { return call(this.catalog, MSG.BRAND_LIST, {}); }

  @Auth(Role.ADMIN) @Get('admin/all') listAll() { return call(this.catalog, MSG.BRAND_LIST, { includeInactive: true }); }
  @Auth(Role.ADMIN) @Post() create(@CurrentUser() u: AuthUser, @Body() dto: CreateBrandDto) {
    return call(this.catalog, MSG.BRAND_CREATE, { adminId: u.id, dto });
  }
  @Auth(Role.ADMIN) @Patch(':id') update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateBrandDto) {
    return call(this.catalog, MSG.BRAND_UPDATE, { id, dto });
  }
  @Auth(Role.ADMIN) @Delete(':id') remove(@Param('id', ParseUUIDPipe) id: string) {
    return call(this.catalog, MSG.BRAND_DELETE, { id });
  }
}

@Controller('products')
export class ProductsController {
  constructor(
    @Inject(SERVICES.CATALOG) private readonly catalog: ClientProxy,
    @Inject(SERVICES.AUTH) private readonly auth: ClientProxy,
  ) {}

  // NOTE: static routes first, they must be declared before ':id'
  @Get() list(@Query() query: ProductQueryDto) { return call(this.catalog, MSG.PRODUCT_LIST, { scope: 'public', query }); }

  @Auth(Role.SELLER) @Get('mine')
  mine(@CurrentUser() u: AuthUser, @Query() query: ProductQueryDto) {
    return call(this.catalog, MSG.PRODUCT_LIST, { scope: 'seller', sellerId: u.id, query });
  }

  @Auth(Role.SELLER) @Post()
  create(@CurrentUser() u: AuthUser, @Body() dto: CreateProductDto) {
    return call(this.catalog, MSG.PRODUCT_CREATE, { sellerId: u.id, dto });
  }

  @Auth(Role.SELLER, Role.ADMIN) @Patch('variants/:variantId')
  updateVariant(@CurrentUser() u: AuthUser, @Param('variantId', ParseUUIDPipe) variantId: string, @Body() dto: UpdateVariantDto) {
    return call(this.catalog, MSG.VARIANT_UPDATE, { variantId, actor: u, dto });
  }

  @OptionalAuth() @Get(':id')
  get(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() u?: AuthUser) {
    return call(this.catalog, MSG.PRODUCT_GET, { id, actor: u });
  }

  @Auth(Role.SELLER, Role.ADMIN) @Patch(':id')
  update(@CurrentUser() u: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateProductDto) {
    return call(this.catalog, MSG.PRODUCT_UPDATE, { id, actor: u, dto });
  }

  @Auth(Role.SELLER, Role.ADMIN) @Delete(':id')
  remove(@CurrentUser() u: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return call(this.catalog, MSG.PRODUCT_DELETE, { id, actor: u });
  }

  @Auth(Role.SELLER, Role.ADMIN) @Patch(':id/publish')
  publish(@CurrentUser() u: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: PublishProductDto) {
    return call(this.catalog, MSG.PRODUCT_PUBLISH, { id, actor: u, status: dto.status });
  }

  @Auth(Role.SELLER, Role.ADMIN) @Post(':id/variants')
  addVariant(@CurrentUser() u: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: VariantDto) {
    return call(this.catalog, MSG.VARIANT_ADD, { productId: id, actor: u, dto });
  }

  // ---- reviews
  @Get(':id/reviews')
  reviews(@Param('id', ParseUUIDPipe) id: string, @Query() q: PaginationDto) {
    return call(this.catalog, MSG.REVIEW_LIST, { productId: id, ...q });
  }

  @Auth(Role.CUSTOMER) @Post(':id/reviews')
  async review(@CurrentUser() u: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: CreateReviewDto) {
    const me = await call<any>(this.auth, MSG.USERS_ME, { userId: u.id });
    return call(this.catalog, MSG.REVIEW_CREATE, { userId: u.id, userName: me.fullName, productId: id, dto });
  }
}

@Controller('wishlist')
@Auth(Role.CUSTOMER)
export class WishlistController {
  constructor(@Inject(SERVICES.CATALOG) private readonly catalog: ClientProxy) {}

  @Get() list(@CurrentUser() u: AuthUser) { return call(this.catalog, MSG.WISHLIST_LIST, { userId: u.id }); }
  @Post(':productId') toggle(@CurrentUser() u: AuthUser, @Param('productId', ParseUUIDPipe) productId: string) {
    return call(this.catalog, MSG.WISHLIST_TOGGLE, { userId: u.id, productId });
  }
}

@Controller('admin/products')
@Auth(Role.ADMIN)
export class AdminProductsController {
  constructor(@Inject(SERVICES.CATALOG) private readonly catalog: ClientProxy) {}

  @Get() list(@Query() query: ProductQueryDto) { return call(this.catalog, MSG.PRODUCT_LIST, { scope: 'admin', query }); }

  @Patch(':id/moderation')
  moderate(@CurrentUser() u: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: ModerateProductDto) {
    return call(this.catalog, MSG.PRODUCT_MODERATE, { id, adminId: u.id, dto });
  }
}
