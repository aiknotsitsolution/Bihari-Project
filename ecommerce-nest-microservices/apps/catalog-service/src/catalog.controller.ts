import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { MSG } from '@app/common';
import { ProductsService } from './products.service';
import { TaxonomyService } from './taxonomy.service';

@Controller()
export class CatalogController {
  constructor(private readonly products: ProductsService, private readonly taxonomy: TaxonomyService) {}

  // ---- categories
  @MessagePattern(MSG.CATEGORY_CREATE) catCreate(@Payload() d: any) { return this.taxonomy.createCategory(d.dto); }
  @MessagePattern(MSG.CATEGORY_TREE) catTree() { return this.taxonomy.categoryTree(); }
  @MessagePattern(MSG.CATEGORY_GET) catGet(@Payload() d: any) { return this.taxonomy.getCategory(d.id); }
  @MessagePattern(MSG.CATEGORY_UPDATE) catUpdate(@Payload() d: any) { return this.taxonomy.updateCategory(d.id, d.dto); }
  @MessagePattern(MSG.CATEGORY_DELETE) catDelete(@Payload() d: any) { return this.taxonomy.deleteCategory(d.id); }

  // ---- brands
  @MessagePattern(MSG.BRAND_CREATE) brandCreate(@Payload() d: any) { return this.taxonomy.createBrand(d.adminId, d.dto); }
  @MessagePattern(MSG.BRAND_LIST) brandList(@Payload() d: any) { return this.taxonomy.listBrands(d ?? {}); }
  @MessagePattern(MSG.BRAND_UPDATE) brandUpdate(@Payload() d: any) { return this.taxonomy.updateBrand(d.id, d.dto); }
  @MessagePattern(MSG.BRAND_DELETE) brandDelete(@Payload() d: any) { return this.taxonomy.deleteBrand(d.id); }

  // ---- products
  @MessagePattern(MSG.PRODUCT_CREATE) pCreate(@Payload() d: any) { return this.products.create(d.sellerId, d.dto); }
  @MessagePattern(MSG.PRODUCT_LIST) pList(@Payload() d: any) { return this.products.list(d.scope, d.query ?? {}, d.sellerId); }
  @MessagePattern(MSG.PRODUCT_GET) pGet(@Payload() d: any) { return this.products.get(d.id, d.actor); }
  @MessagePattern(MSG.PRODUCT_UPDATE) pUpdate(@Payload() d: any) { return this.products.update(d.id, d.actor, d.dto); }
  @MessagePattern(MSG.PRODUCT_DELETE) pDelete(@Payload() d: any) { return this.products.remove(d.id, d.actor); }
  @MessagePattern(MSG.PRODUCT_PUBLISH) pPublish(@Payload() d: any) { return this.products.publish(d.id, d.actor, d.status); }
  @MessagePattern(MSG.PRODUCT_MODERATE) pModerate(@Payload() d: any) { return this.products.moderate(d.id, d.adminId, d.dto); }
  @MessagePattern(MSG.PRODUCT_SNAPSHOT) pSnapshot(@Payload() d: any) { return this.products.snapshot(d.items); }
  @MessagePattern(MSG.VARIANT_ADD) vAdd(@Payload() d: any) { return this.products.addVariant(d.productId, d.actor, d.dto); }
  @MessagePattern(MSG.VARIANT_UPDATE) vUpdate(@Payload() d: any) { return this.products.updateVariant(d.variantId, d.actor, d.dto); }

  // ---- inventory (used by order-service)
  @MessagePattern(MSG.INVENTORY_RESERVE) reserve(@Payload() d: any) { return this.products.applyStock('reserve', d.items); }
  @MessagePattern(MSG.INVENTORY_RELEASE) release(@Payload() d: any) { return this.products.applyStock('release', d.items); }
  @MessagePattern(MSG.INVENTORY_COMMIT) commit(@Payload() d: any) { return this.products.applyStock('commit', d.items); }
  @MessagePattern(MSG.INVENTORY_RESTOCK) restock(@Payload() d: any) { return this.products.applyStock('restock', d.items); }

  // ---- reviews & wishlist
  @MessagePattern(MSG.REVIEW_CREATE) rCreate(@Payload() d: any) { return this.products.createReview(d.userId, d.userName, d.productId, d.dto); }
  @MessagePattern(MSG.REVIEW_LIST) rList(@Payload() d: any) { return this.products.listReviews(d.productId, d.page, d.limit); }
  @MessagePattern(MSG.WISHLIST_TOGGLE) wToggle(@Payload() d: any) { return this.products.toggleWishlist(d.userId, d.productId); }
  @MessagePattern(MSG.WISHLIST_LIST) wList(@Payload() d: any) { return this.products.listWishlist(d.userId); }
}
