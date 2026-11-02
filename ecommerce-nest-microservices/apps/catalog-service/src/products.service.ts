import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import {
  ApprovalStatus,
  CreateProductDto,
  CreateReviewDto,
  ModerateProductDto,
  ProductQueryDto,
  PublishStatus,
  Role,
  UpdateProductDto,
  UpdateVariantDto,
  VariantDto,
  pageParams,
  paged,
  percentOff,
} from '@app/common';
import { Category, Product, ProductVariant, Review, WishlistItem } from './entities';

export type StockOp = 'reserve' | 'release' | 'commit' | 'restock';
export interface StockItem {
  productId: string;
  variantId?: string;
  quantity: number;
}
type Actor = { id: string; role: string };

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product) private readonly products: Repository<Product>,
    @InjectRepository(ProductVariant) private readonly variants: Repository<ProductVariant>,
    @InjectRepository(Category) private readonly categories: Repository<Category>,
    @InjectRepository(Review) private readonly reviews: Repository<Review>,
    @InjectRepository(WishlistItem) private readonly wishlist: Repository<WishlistItem>,
    @InjectDataSource() private readonly ds: DataSource,
  ) {}

  // ================================================================ products
  async create(sellerId: string, dto: CreateProductDto) {
    const category = await this.categories.findOne({ where: { id: dto.categoryId } });
    if (!category) throw new NotFoundException('Category not found');
    if (await this.categories.count({ where: { parentId: category.id } })) {
      throw new BadRequestException('Please choose a leaf category');
    }
    if (dto.sellingPrice > dto.mrpPrice) throw new BadRequestException('sellingPrice cannot exceed mrpPrice');

    const variantDtos = dto.variants ?? [];
    await this.assertSkusFree(variantDtos.map((v) => v.sku));

    const { variants: _ignored, ...rest } = dto as any;
    const product = this.products.create({
      ...rest,
      sellerId,
      discountPercent: percentOff(dto.mrpPrice, dto.sellingPrice),
      quantity: variantDtos.length ? variantDtos.reduce((s, v) => s + v.quantity, 0) : dto.quantity ?? 0,
      variants: variantDtos.map((v) => this.buildVariant(v)),
    });
    return this.products.save(product);
  }

  async list(scope: 'public' | 'seller' | 'admin', q: ProductQueryDto, sellerId?: string) {
    const p = pageParams(q.page, q.limit);
    const qb = this.products
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.variants', 'v', 'v.isActive = true')
      .where('p.isDeleted = false');

    if (scope === 'public') {
      qb.andWhere('p.approvalStatus = :ap AND p.publishStatus = :pub', {
        ap: ApprovalStatus.APPROVED,
        pub: PublishStatus.PUBLISHED,
      });
    }
    if (scope === 'seller') qb.andWhere('p.sellerId = :sellerId', { sellerId });
    if (scope !== 'public' && q.approvalStatus) qb.andWhere('p.approvalStatus = :as', { as: q.approvalStatus });
    if (scope !== 'seller' && q.sellerId) qb.andWhere('p.sellerId = :qs', { qs: q.sellerId });
    if (q.categoryId) qb.andWhere('p.categoryId = :cat', { cat: q.categoryId });
    if (q.brand) qb.andWhere('LOWER(p.brand) = LOWER(:brand)', { brand: q.brand });
    if (q.minPrice != null) qb.andWhere('p.sellingPrice >= :min', { min: q.minPrice });
    if (q.maxPrice != null) qb.andWhere('p.sellingPrice <= :max', { max: q.maxPrice });
    if (q.q) qb.andWhere('(p.title ILIKE :s OR p.description ILIKE :s OR p.brand ILIKE :s)', { s: `%${q.q}%` });

    switch (q.sort) {
      case 'price_asc': qb.orderBy('p.sellingPrice', 'ASC'); break;
      case 'price_desc': qb.orderBy('p.sellingPrice', 'DESC'); break;
      case 'discount': qb.orderBy('p.discountPercent', 'DESC'); break;
      default: qb.orderBy('p.createdAt', 'DESC');
    }
    qb.skip(p.skip).take(p.limit);
    const [items, total] = await qb.getManyAndCount();
    return paged(items, total, p.page, p.limit);
  }

  async get(id: string, actor?: Actor) {
    const product = await this.products.findOne({ where: { id, isDeleted: false }, relations: { variants: true } });
    if (!product) throw new NotFoundException('Product not found');
    const visible = product.approvalStatus === ApprovalStatus.APPROVED && product.publishStatus === PublishStatus.PUBLISHED;
    const privileged = actor && (actor.role === Role.ADMIN || actor.id === product.sellerId);
    if (!visible && !privileged) throw new NotFoundException('Product not found');

    const stats = await this.reviews
      .createQueryBuilder('r')
      .select('COALESCE(AVG(r.rating),0)', 'avg')
      .addSelect('COUNT(*)', 'count')
      .where('r.productId = :id', { id })
      .getRawOne();
    return {
      ...product,
      variants: product.variants.filter((v) => v.isActive),
      rating: { average: Math.round(Number(stats.avg) * 10) / 10, count: Number(stats.count) },
    };
  }

  async update(id: string, actor: Actor, dto: UpdateProductDto) {
    const product = await this.ownedProduct(id, actor);
    if (dto.categoryId && dto.categoryId !== product.categoryId) {
      const cat = await this.categories.findOne({ where: { id: dto.categoryId } });
      if (!cat) throw new NotFoundException('Category not found');
    }
    Object.assign(product, dto);
    if (product.sellingPrice > product.mrpPrice) throw new BadRequestException('sellingPrice cannot exceed mrpPrice');
    product.discountPercent = percentOff(product.mrpPrice, product.sellingPrice);
    // seller edits must be re-approved
    if (actor.role === Role.SELLER) product.approvalStatus = ApprovalStatus.PENDING;
    return this.products.save(product);
  }

  async remove(id: string, actor: Actor) {
    const product = await this.ownedProduct(id, actor);
    product.isDeleted = true;
    product.deletedAt = new Date();
    product.publishStatus = PublishStatus.UNPUBLISHED;
    await this.products.save(product);
    return { success: true };
  }

  async publish(id: string, actor: Actor, status: 'PUBLISHED' | 'UNPUBLISHED') {
    const product = await this.ownedProduct(id, actor);
    if (status === 'PUBLISHED' && product.approvalStatus !== ApprovalStatus.APPROVED) {
      throw new BadRequestException('Product must be approved by admin before publishing');
    }
    product.publishStatus = status as PublishStatus;
    return this.products.save(product);
  }

  async moderate(id: string, adminId: string, dto: ModerateProductDto) {
    const product = await this.products.findOne({ where: { id, isDeleted: false } });
    if (!product) throw new NotFoundException('Product not found');
    const previous = product.approvalStatus;
    product.approvalStatus = dto.action === 'APPROVE' ? ApprovalStatus.APPROVED : ApprovalStatus.REJECTED;
    if (dto.action === 'REJECT') product.publishStatus = PublishStatus.UNPUBLISHED;
    product.moderationHistory = [
      ...(product.moderationHistory ?? []),
      {
        action: dto.action,
        adminId,
        reason: dto.reason,
        previousStatus: previous,
        newStatus: product.approvalStatus,
        timestamp: new Date().toISOString(),
      },
    ];
    return this.products.save(product);
  }

  // ---------------------------------------------------------------- variants
  async addVariant(productId: string, actor: Actor, dto: VariantDto) {
    const product = await this.ownedProduct(productId, actor);
    await this.assertSkusFree([dto.sku]);
    const variant = await this.variants.save(this.variants.create({ ...this.buildVariant(dto), productId: product.id }));
    await this.recalcProductStock(product.id);
    return variant;
  }

  async updateVariant(variantId: string, actor: Actor, dto: UpdateVariantDto) {
    const variant = await this.variants.findOne({ where: { id: variantId } });
    if (!variant) throw new NotFoundException('Variant not found');
    await this.ownedProduct(variant.productId, actor);
    if (dto.quantity != null && dto.quantity < variant.reservedQuantity) {
      throw new BadRequestException('Quantity cannot be lower than currently reserved stock');
    }
    Object.assign(variant, dto);
    variant.discountPercent = percentOff(variant.mrpPrice, variant.price);
    const saved = await this.variants.save(variant);
    await this.recalcProductStock(variant.productId);
    return saved;
  }

  // ---------------------------------------------------------------- cart / order support
  /** Fresh price + availability for cart & checkout (called by order-service). */
  async snapshot(items: { productId: string; variantId?: string }[]) {
    const ids = [...new Set(items.map((i) => i.productId))];
    const found = await this.products.find({ where: { id: In(ids) }, relations: { variants: true } });
    return items.map((i) => {
      const p = found.find((x) => x.id === i.productId);
      if (
        !p || p.isDeleted ||
        p.approvalStatus !== ApprovalStatus.APPROVED ||
        p.publishStatus !== PublishStatus.PUBLISHED
      ) {
        throw new NotFoundException(`Product ${i.productId} is not available`);
      }
      const activeVariants = p.variants.filter((v) => v.isActive);
      let v: ProductVariant | undefined;
      if (activeVariants.length) {
        if (!i.variantId) throw new BadRequestException(`Please choose a variant for "${p.title}"`);
        v = activeVariants.find((x) => x.id === i.variantId);
        if (!v) throw new NotFoundException(`Variant ${i.variantId} is not available`);
      }
      const src = v ?? p;
      const image = (v?.images?.[0] ?? p.images.find((x) => x.isPrimary) ?? p.images[0])?.url ?? null;
      return {
        productId: p.id,
        variantId: v?.id ?? null,
        title: p.title,
        sellerId: p.sellerId,
        image,
        size: v?.attributes?.size ?? null,
        unitMrpPrice: v ? v.mrpPrice : p.mrpPrice,
        unitSellingPrice: v ? v.price : p.sellingPrice,
        availableQuantity: Math.max(0, src.quantity - src.reservedQuantity),
      };
    });
  }

  /**
   * Atomic stock movement. Rows are locked in a deterministic order to avoid deadlocks.
   * reserve: hold stock for an unpaid order   release: give a hold back
   * commit : hold becomes a sale              restock: put sold units back (cancel after payment)
   */
  async applyStock(op: StockOp, items: StockItem[]) {
    const sorted = [...items].sort((a, b) =>
      `${a.productId}${a.variantId ?? ''}`.localeCompare(`${b.productId}${b.variantId ?? ''}`),
    );
    await this.ds.transaction(async (m) => {
      for (const it of sorted) {
        const product = await m.findOne(Product, { where: { id: it.productId }, lock: { mode: 'pessimistic_write' } });
        if (!product) throw new NotFoundException(`Product ${it.productId} not found`);
        const targets: { quantity: number; reservedQuantity: number }[] = [product];
        let variant: ProductVariant | null = null;
        if (it.variantId) {
          variant = await m.findOne(ProductVariant, {
            where: { id: it.variantId, productId: it.productId },
            lock: { mode: 'pessimistic_write' },
          });
          if (!variant) throw new NotFoundException(`Variant ${it.variantId} not found`);
          targets.push(variant);
        }
        for (const t of targets) this.mutate(op, t, it.quantity, product.title);
        await m.save(product);
        if (variant) await m.save(variant);
      }
    });
    return { success: true };
  }

  private mutate(op: StockOp, t: { quantity: number; reservedQuantity: number }, qty: number, title: string) {
    switch (op) {
      case 'reserve':
        if (t.quantity - t.reservedQuantity < qty) throw new ConflictException(`Insufficient stock for "${title}"`);
        t.reservedQuantity += qty;
        break;
      case 'release':
        t.reservedQuantity = Math.max(0, t.reservedQuantity - qty);
        break;
      case 'commit':
        t.reservedQuantity = Math.max(0, t.reservedQuantity - qty);
        t.quantity = Math.max(0, t.quantity - qty);
        break;
      case 'restock':
        t.quantity += qty;
        break;
    }
  }

  // ---------------------------------------------------------------- reviews & wishlist
  async createReview(userId: string, userName: string, productId: string, dto: CreateReviewDto) {
    if (!(await this.products.count({ where: { id: productId, isDeleted: false } }))) {
      throw new NotFoundException('Product not found');
    }
    if (await this.reviews.count({ where: { userId, productId } })) {
      throw new ConflictException('You have already reviewed this product');
    }
    return this.reviews.save(
      this.reviews.create({ userId, userName, productId, rating: dto.rating, reviewText: dto.reviewText, images: dto.images ?? [] }),
    );
  }

  async listReviews(productId: string, page?: number, limit?: number) {
    const p = pageParams(page, limit);
    const [items, total] = await this.reviews.findAndCount({
      where: { productId },
      order: { createdAt: 'DESC' },
      skip: p.skip,
      take: p.limit,
    });
    return paged(items, total, p.page, p.limit);
  }

  async toggleWishlist(userId: string, productId: string) {
    const existing = await this.wishlist.findOne({ where: { userId, productId } });
    if (existing) {
      await this.wishlist.remove(existing);
      return { wishlisted: false };
    }
    if (!(await this.products.count({ where: { id: productId, isDeleted: false } }))) {
      throw new NotFoundException('Product not found');
    }
    await this.wishlist.save(this.wishlist.create({ userId, productId }));
    return { wishlisted: true };
  }

  async listWishlist(userId: string) {
    const rows = await this.wishlist.find({ where: { userId }, order: { createdAt: 'DESC' } });
    if (!rows.length) return [];
    return this.products.find({ where: { id: In(rows.map((r) => r.productId)), isDeleted: false } });
  }

  // ---------------------------------------------------------------- helpers
  private buildVariant(v: VariantDto) {
    return this.variants.create({
      sku: v.sku,
      attributes: v.attributes ?? {},
      price: v.price,
      mrpPrice: v.mrpPrice,
      discountPercent: percentOff(v.mrpPrice, v.price),
      quantity: v.quantity,
      weight: v.weight,
      images: v.images ?? [],
    });
  }

  private async assertSkusFree(skus: string[]) {
    if (!skus.length) return;
    if (new Set(skus).size !== skus.length) throw new BadRequestException('Duplicate SKU in request');
    if (await this.variants.count({ where: { sku: In(skus) } })) throw new ConflictException('SKU already exists');
  }

  private async ownedProduct(id: string, actor: Actor) {
    const product = await this.products.findOne({ where: { id, isDeleted: false } });
    if (!product) throw new NotFoundException('Product not found');
    if (actor.role !== Role.ADMIN && product.sellerId !== actor.id) {
      throw new ForbiddenException('You do not own this product');
    }
    return product;
  }

  private async recalcProductStock(productId: string) {
    const vs = await this.variants.find({ where: { productId, isActive: true } });
    if (!vs.length) return;
    await this.products.update(productId, {
      quantity: vs.reduce((s, v) => s + v.quantity, 0),
      reservedQuantity: vs.reduce((s, v) => s + v.reservedQuantity, 0),
    });
  }
}
