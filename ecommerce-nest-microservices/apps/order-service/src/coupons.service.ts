import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  CouponOwner,
  CreateCouponDto,
  DiscountType,
  Role,
  UpdateCouponDto,
  pageParams,
  paged,
  round2,
} from '@app/common';
import { Coupon, CouponUsage } from './entities';

export interface PricedLine {
  sellerId: string;
  unitSellingPrice: number;
  quantity: number;
}
export interface CouponResult {
  couponId: string;
  code: string;
  ownerType: CouponOwner;
  sellerId: string | null;
  discount: number;
  /** discount allocated per seller: sellerId -> { total, seller, platform } */
  perSeller: Record<string, { total: number; seller: number; platform: number }>;
}

@Injectable()
export class CouponsService {
  constructor(
    @InjectRepository(Coupon) private readonly coupons: Repository<Coupon>,
    @InjectRepository(CouponUsage) private readonly usages: Repository<CouponUsage>,
  ) {}

  async create(actor: { id: string; role: string }, dto: CreateCouponDto) {
    const code = dto.code.toUpperCase().trim();
    if (await this.coupons.findOne({ where: { code } })) throw new ConflictException('Coupon code already exists');
    this.validateShape(dto);
    const start = new Date(dto.validityStartDate);
    const end = new Date(dto.validityEndDate);
    if (end <= start) throw new BadRequestException('validityEndDate must be after validityStartDate');
    return this.coupons.save(
      this.coupons.create({
        ...dto,
        code,
        validityStartDate: start,
        validityEndDate: end,
        ownerType: actor.role === Role.SELLER ? CouponOwner.SELLER : CouponOwner.PLATFORM,
        sellerId: actor.role === Role.SELLER ? actor.id : null,
      }),
    );
  }

  async update(actor: { id: string; role: string }, id: string, dto: UpdateCouponDto) {
    const c = await this.coupons.findOne({ where: { id } });
    if (!c) throw new NotFoundException('Coupon not found');
    if (actor.role === Role.SELLER && c.sellerId !== actor.id) throw new ForbiddenException('Not your coupon');
    const { code, ...rest } = dto;
    Object.assign(c, rest);
    if (dto.validityStartDate) c.validityStartDate = new Date(dto.validityStartDate);
    if (dto.validityEndDate) c.validityEndDate = new Date(dto.validityEndDate);
    return this.coupons.save(c);
  }

  async list(actor: { id: string; role: string } | null, page?: number, limit?: number) {
    const p = pageParams(page, limit);
    const qb = this.coupons.createQueryBuilder('c').orderBy('c.createdAt', 'DESC').skip(p.skip).take(p.limit);
    if (!actor) {
      // public listing: only currently valid platform coupons
      qb.where('c.isActive = true AND c.ownerType = :o AND c.validityStartDate <= now() AND c.validityEndDate >= now()', {
        o: CouponOwner.PLATFORM,
      });
    } else if (actor.role === Role.SELLER) {
      qb.where('c.sellerId = :id', { id: actor.id });
    }
    const [items, total] = await qb.getManyAndCount();
    return paged(items, total, p.page, p.limit);
  }

  /** Validates a code against the cart lines and returns the discount + per-seller split. */
  async evaluate(code: string, userId: string, lines: PricedLine[]): Promise<CouponResult> {
    const coupon = await this.coupons.findOne({ where: { code: code.toUpperCase().trim() } });
    const now = new Date();
    if (!coupon || !coupon.isActive) throw new BadRequestException('Invalid coupon code');
    if (now < coupon.validityStartDate || now > coupon.validityEndDate) throw new BadRequestException('Coupon is not valid right now');
    if (coupon.usageLimit > 0 && coupon.usageCount >= coupon.usageLimit) throw new BadRequestException('Coupon usage limit reached');
    if (await this.usages.count({ where: { couponId: coupon.id, userId } })) {
      throw new BadRequestException('You have already used this coupon');
    }

    // seller coupons only discount that seller's items
    const eligible = lines.filter((l) => coupon.ownerType !== CouponOwner.SELLER || l.sellerId === coupon.sellerId);
    const subtotal = round2(eligible.reduce((s, l) => s + l.unitSellingPrice * l.quantity, 0));
    if (!eligible.length) throw new BadRequestException('Coupon is not applicable to items in your cart');
    if (subtotal < coupon.minimumOrderValue) {
      throw new BadRequestException(`Minimum order value for this coupon is ${coupon.minimumOrderValue}`);
    }

    let discount =
      coupon.discountType === DiscountType.PERCENTAGE
        ? (subtotal * (coupon.discountPercentage ?? 0)) / 100
        : coupon.discountValue ?? 0;
    if (coupon.maximumDiscount > 0) discount = Math.min(discount, coupon.maximumDiscount);
    discount = round2(Math.min(discount, subtotal));

    // allocate discount across sellers proportionally to their eligible subtotal
    const perSeller: CouponResult['perSeller'] = {};
    const sellerTotals = new Map<string, number>();
    for (const l of eligible) sellerTotals.set(l.sellerId, (sellerTotals.get(l.sellerId) ?? 0) + l.unitSellingPrice * l.quantity);
    let allocated = 0;
    const ids = [...sellerTotals.keys()];
    ids.forEach((sid, idx) => {
      const share = idx === ids.length - 1 ? round2(discount - allocated) : round2((discount * sellerTotals.get(sid)!) / subtotal);
      allocated += share;
      const sellerPays = coupon.ownerType === CouponOwner.SELLER;
      perSeller[sid] = { total: share, seller: sellerPays ? share : 0, platform: sellerPays ? 0 : share };
    });

    return { couponId: coupon.id, code: coupon.code, ownerType: coupon.ownerType, sellerId: coupon.sellerId, discount, perSeller };
  }

  async recordUsage(manager: any, couponId: string, userId: string, orderId: string) {
    await manager.insert(CouponUsage, { couponId, userId, firstOrderId: orderId });
    await manager.increment(Coupon, { id: couponId }, 'usageCount', 1);
  }

  async revertUsage(manager: any, couponId: string, userId: string) {
    const res = await manager.delete(CouponUsage, { couponId, userId });
    if (res.affected) await manager.decrement(Coupon, { id: couponId }, 'usageCount', 1);
  }

  private validateShape(dto: CreateCouponDto) {
    if (dto.discountType === DiscountType.PERCENTAGE) {
      if (dto.discountPercentage == null || dto.discountPercentage <= 0 || dto.discountPercentage > 100) {
        throw new BadRequestException('discountPercentage must be between 1 and 100');
      }
    } else if (dto.discountValue == null || dto.discountValue <= 0) {
      throw new BadRequestException('discountValue must be greater than 0');
    }
  }
}
