import { PartialType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class RegisterDto {
  @IsString() @IsNotEmpty() fullName: string;
  @IsEmail() email: string;
  @IsString() @MinLength(8) password: string;
  @IsOptional() @IsString() mobile?: string;
  @IsOptional() @IsString() referralCode?: string;
}

export class LoginDto {
  @IsEmail() email: string;
  @IsString() @IsNotEmpty() password: string;
}

export class RefreshDto {
  @IsString() @IsNotEmpty() refreshToken: string;
}

export class BusinessDetailsDto {
  @IsString() @IsNotEmpty() businessName: string;
  @IsString() @IsNotEmpty() GSTIN: string;
  @IsString() @IsNotEmpty() businessAddress: string;
}

export class BankDetailsDto {
  @IsString() @IsNotEmpty() accountNumber: string;
  @IsString() @IsNotEmpty() accountHolderName: string;
  @IsString() @IsNotEmpty() IFSC: string;
}

export class PickupAddressDto {
  @IsString() @IsNotEmpty() streetAddress: string;
  @IsString() @IsNotEmpty() city: string;
  @IsString() @IsNotEmpty() state: string;
  @IsString() @IsNotEmpty() pinCode: string;
  @IsOptional() @IsString() mobile?: string;
}

export class SellerRegisterDto {
  @IsString() @IsNotEmpty() sellerName: string;
  @IsEmail() email: string;
  @IsString() @IsNotEmpty() mobile: string;
  @IsString() @MinLength(8) password: string;
  @ValidateNested() @Type(() => BusinessDetailsDto) businessDetails: BusinessDetailsDto;
  @ValidateNested() @Type(() => BankDetailsDto) bankDetails: BankDetailsDto;
  @ValidateNested() @Type(() => PickupAddressDto) pickupAddress: PickupAddressDto;
}

export class UpdateSellerDto {
  @IsOptional() @IsString() sellerName?: string;
  @IsOptional() @IsString() mobile?: string;
  @IsOptional() @IsString() avatar?: string;
  @IsOptional() @ValidateNested() @Type(() => PickupAddressDto) pickupAddress?: PickupAddressDto;
  @IsOptional() @ValidateNested() @Type(() => BankDetailsDto) bankDetails?: BankDetailsDto;
}

export class UpdateProfileDto {
  @IsOptional() @IsString() @IsNotEmpty() fullName?: string;
  @IsOptional() @IsString() mobile?: string;
  @IsOptional() @IsString() profileImage?: string;
  @IsOptional() @IsDateString() birthDate?: string;
}

export class AddressDto {
  @IsString() @IsNotEmpty() name: string;
  @IsString() @IsNotEmpty() mobile: string;
  @IsString() @IsNotEmpty() streetAddress: string;
  @IsString() @IsNotEmpty() locality: string;
  @IsString() @IsNotEmpty() city: string;
  @IsString() @IsNotEmpty() state: string;
  @IsString() @IsNotEmpty() pinCode: string;
  @IsOptional() isDefault?: boolean;
}

export class UpdateAddressDto extends PartialType(AddressDto) {}

export class SellerVerificationDto {
  @IsIn(['APPROVE', 'REJECT', 'SUSPEND']) action: 'APPROVE' | 'REJECT' | 'SUSPEND';
  @IsOptional() @IsString() reason?: string;
}
