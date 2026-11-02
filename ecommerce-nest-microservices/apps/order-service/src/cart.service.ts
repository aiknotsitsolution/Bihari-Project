import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AddCartItemDto, MSG, SERVICES, call, percentOff, round2 } from '@app/common';
import { Cart, CartItem } from './entities';
import { CouponsService } from './coupons.service';

@Injectable()
export class CartService {
  constructor(
    @InjectRepository(Cart) private readonly carts: Repository<Cart>,
    @InjectRepository(CartItem) private readonly items: Repository<CartItem>,
    @Inject(SERVICES.CATALOG) private readonly catalog: ClientProxy,
    private readonly coupons: CouponsService,
  ) {}

  async getOrCreate(userId: string) {
    let cart = await this.carts.findOne({ where: { userId }, relations: { items: true } });
    if (!cart) cart = await this.carts.save(this.carts.create({ userId, items: [] }));
    cart.items = cart.items ?? [];
    return cart;
  }

  /** Cart with computed totals (and coupon re-evaluated on every read). */
  async get(userId: string) {
    const cart = await this.getOrCreate(userId);
    return this.withTotals(cart, userId);
  }

  async add(userId: string, dto: AddCartItemDto) {
    const cart = await this.getOrCreate(userId);
    const [snap] = await call<any[]>(this.catalog, MSG.PRODUCT_SNAPSHOT, {
      items: [{ productId: dto.productId, variantId: dto.variantId }],
    });
    const existing = cart.items.find((i) => i.productId === snap.productId && (i.variantId ?? null) === (snap.variantId ?? null));
    const newQty = (existing?.quantity ?? 0) + dto.quantity;
    if (newQty > snap.availableQuantity) {
      throw new BadRequestException(`Only ${snap.availableQuantity} unit(s) available`);
    }
    if (existing) {
      existing.quantity = newQty;
      existing.unitMrpPrice = snap.unitMrpPrice;
      existing.unitSellingPrice = snap.unitSellingPrice;
      await this.items.save(existing);
    } else {
      await this.items.save(
        this.items.create({
          cartId: cart.id,
          productId: snap.productId,
          variantId: snap.variantId,
          sellerId: snap.sellerId,
          title: snap.title,
          image: snap.image,
          size: snap.size,
          quantity: dto.quantity,
          unitMrpPrice: snap.unitMrpPrice,
          unitSellingPrice: snap.unitSellingPrice,
        }),
      );
    }
    return this.get(userId);
  }

  async updateQuantity(userId: string, itemId: string, quantity: number) {
    const cart = await this.getOrCreate(userId);
    const item = cart.items.find((i) => i.id === itemId);
    if (!item) throw new NotFoundException('Cart item not found');
    const [snap] = await call<any[]>(this.catalog, MSG.PRODUCT_SNAPSHOT, {
      items: [{ productId: item.productId, variantId: item.variantId ?? undefined }],
    });
    if (quantity > snap.availableQuantity) throw new BadRequestException(`Only ${snap.availableQuantity} unit(s) available`);
    item.quantity = quantity;
    item.unitMrpPrice = snap.unitMrpPrice;
    item.unitSellingPrice = snap.unitSellingPrice;
    await this.items.save(item);
    return this.get(userId);
  }

  async remove(userId: string, itemId: string) {
    const cart = await this.getOrCreate(userId);
    const item = cart.items.find((i) => i.id === itemId);
    if (!item) throw new NotFoundException('Cart item not found');
    await this.items.remove(item);
    return this.get(userId);
  }

  async clear(userId: string) {
    const cart = await this.getOrCreate(userId);
    await this.items.delete({ cartId: cart.id });
    await this.carts.update(cart.id, { couponCode: null });
    return this.get(userId);
  }

  async applyCoupon(userId: string, code: string) {
    const cart = await this.getOrCreate(userId);
    if (!cart.items.length) throw new BadRequestException('Cart is empty');
    await this.coupons.evaluate(code, userId, cart.items); // throws if not applicable
    await this.carts.update(cart.id, { couponCode: code.toUpperCase().trim() });
    return this.get(userId);
  }

  async removeCoupon(userId: string) {
    const cart = await this.getOrCreate(userId);
    await this.carts.update(cart.id, { couponCode: null });
    return this.get(userId);
  }

  private async withTotals(cart: Cart, userId: string) {
    const totalMrpPrice = round2(cart.items.reduce((s, i) => s + i.unitMrpPrice * i.quantity, 0));
    const totalSellingPrice = round2(cart.items.reduce((s, i) => s + i.unitSellingPrice * i.quantity, 0));
    let couponPrice = 0;
    let couponCode = cart.couponCode;
    if (couponCode && cart.items.length) {
      try {
        couponPrice = (await this.coupons.evaluate(couponCode, userId, cart.items)).discount;
      } catch {
        // coupon became invalid (expired, min value not met, ...) -> drop it silently
        await this.carts.update(cart.id, { couponCode: null });
        couponCode = null;
      }
    }
    return {
      id: cart.id,
      items: cart.items,
      totalItem: cart.items.reduce((s, i) => s + i.quantity, 0),
      totalMrpPrice,
      totalSellingPrice,
      discount: percentOff(totalMrpPrice, totalSellingPrice),
      couponCode,
      couponPrice,
      totalPayable: round2(totalSellingPrice - couponPrice),
    };
  }
}
