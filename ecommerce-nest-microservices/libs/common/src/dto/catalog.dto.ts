import { PartialType, OmitType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class CreateCategoryDto {
  @IsString() @IsNotEmpty() name: string;
  /** URL friendly unique id, e.g. "men-tshirts" */
  @IsString() @IsNotEmpty() categoryId: string;
  @IsOptional() @IsUUID() parentId?: string;
  @IsOptional() @IsArray() supportedAttributes?: Record<string, any>[];
}
export class UpdateCategoryDto extends PartialType(OmitType(CreateCategoryDto, ['parentId'] as const)) {}

export class CreateBrandDto {
  @IsString() @IsNotEmpty() name: string;
  @IsString() @IsNotEmpty() slug: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() logo?: string;
  @IsOptional() @IsBoolean() isFeatured?: boolean;
  @IsOptional() @IsInt() @Min(0) displayOrder?: number;
  @IsOptional() @IsArray() @IsUUID('all', { each: true }) categoryIds?: string[];
}
export class UpdateBrandDto extends PartialType(CreateBrandDto) {
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class ProductImageDto {
  @IsString() @IsNotEmpty() url: string;
  @IsOptional() @IsString() publicId?: string;
  @IsOptional() @IsBoolean() isPrimary?: boolean;
}

export class VariantDto {
  @IsString() @IsNotEmpty() sku: string;
  @IsOptional() attributes?: Record<string, any>;
  @IsNumber() @Min(0) price: number;
  @IsNumber() @Min(0) mrpPrice: number;
  @IsInt() @Min(0) quantity: number;
  @IsOptional() @IsNumber() @Min(0) weight?: number;
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => ProductImageDto) images?: ProductImageDto[];
}

export class UpdateVariantDto {
  @IsOptional() @IsNumber() @Min(0) price?: number;
  @IsOptional() @IsNumber() @Min(0) mrpPrice?: number;
  @IsOptional() @IsInt() @Min(0) quantity?: number;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class CreateProductDto {
  @IsString() @IsNotEmpty() title: string;
  @IsString() @IsNotEmpty() description: string;
  @IsNumber() @Min(0) mrpPrice: number;
  @IsNumber() @Min(0) sellingPrice: number;
  @IsOptional() @IsInt() @Min(0) quantity?: number;
  @IsOptional() @IsString() color?: string;
  @IsOptional() @IsString() sizes?: string;
  @IsOptional() @IsString() brand?: string;
  @IsUUID() categoryId: string;
  @IsArray() @ArrayMinSize(1) @ValidateNested({ each: true }) @Type(() => ProductImageDto) images: ProductImageDto[];
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => VariantDto) variants?: VariantDto[];
}

export class UpdateProductDto extends PartialType(OmitType(CreateProductDto, ['variants'] as const)) {}

export class ProductQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit?: number;
  @IsOptional() @IsString() q?: string;
  @IsOptional() @IsUUID() categoryId?: string;
  @IsOptional() @IsString() brand?: string;
  @IsOptional() @IsUUID() sellerId?: string;
  @IsOptional() @Type(() => Number) @IsNumber() minPrice?: number;
  @IsOptional() @Type(() => Number) @IsNumber() maxPrice?: number;
  @IsOptional() @IsIn(['newest', 'price_asc', 'price_desc', 'discount']) sort?: string;
  @IsOptional() @IsIn(['PENDING', 'APPROVED', 'REJECTED']) approvalStatus?: string;
}

export class ModerateProductDto {
  @IsIn(['APPROVE', 'REJECT']) action: 'APPROVE' | 'REJECT';
  @IsOptional() @IsString() reason?: string;
}

export class PublishProductDto {
  @IsIn(['PUBLISHED', 'UNPUBLISHED']) status: 'PUBLISHED' | 'UNPUBLISHED';
}

export class CreateReviewDto {
  @IsInt() @Min(1) @Max(5) rating: number;
  @IsString() @IsNotEmpty() reviewText: string;
  @IsOptional() @IsArray() @IsString({ each: true }) images?: string[];
}

export class PaginationDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit?: number;
}
