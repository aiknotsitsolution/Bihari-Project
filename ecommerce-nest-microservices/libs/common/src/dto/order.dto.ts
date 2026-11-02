import { PartialType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { DiscountType, OrderStatus, PaymentMethod } from '../constants';

export class AddCartItemDto {
  @IsUUID() productId: string;
  @IsOptional() @IsUUID() variantId?: string;
  @IsInt() @Min(1) quantity: number;
}

export class UpdateCartItemDto {
  @IsInt() @Min(1) quantity: number;
}

export class ApplyCouponDto {
  @IsString() @IsNotEmpty() code: string;
}

export class CheckoutDto {
  @IsUUID() addressId: string;
  @IsEnum(PaymentMethod) paymentMethod: PaymentMethod;
}

export class UpdateOrderStatusDto {
  @IsEnum(OrderStatus) status: OrderStatus;
  @IsOptional() @IsString() note?: string;
  @IsOptional() @IsString() trackingNumber?: string;
  @IsOptional() @IsString() carrier?: string;
}

export class CancelOrderDto {
  @IsOptional() @IsString() reason?: string;
}

export class CreateCouponDto {
  @IsString() @IsNotEmpty() code: string;
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() description?: string;
  @IsEnum(DiscountType) discountType: DiscountType;
  @IsOptional() @IsNumber() @Min(0) discountPercentage?: number;
  @IsOptional() @IsNumber() @Min(0) discountValue?: number;
  @IsOptional() @IsNumber() @Min(0) maximumDiscount?: number;
  @IsDateString() validityStartDate: string;
  @IsDateString() validityEndDate: string;
  @IsOptional() @IsNumber() @Min(0) minimumOrderValue?: number;
  @IsOptional() @IsInt() @Min(0) usageLimit?: number;
  @IsOptional() @IsBoolean() isActive?: boolean;
}
export class UpdateCouponDto extends PartialType(CreateCouponDto) {}

export class ConfirmPaymentDto {
  @IsString() @IsNotEmpty() paymentLinkId: string;
  @IsOptional() @IsString() providerPaymentId?: string;
  @IsBoolean() success: boolean;
}

export class RefundDto {
  @IsUUID() orderId: string;
  @IsNumber() @Min(0.01) amount: number;
  @IsOptional() @IsString() reason?: string;
}

export class OrderQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) limit?: number;
  @IsOptional() @IsEnum(OrderStatus) status?: OrderStatus;
}

