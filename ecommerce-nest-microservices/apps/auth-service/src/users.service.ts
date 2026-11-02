import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  AccountStatus,
  AddressDto,
  SellerVerificationDto,
  UpdateProfileDto,
  UpdateSellerDto,
  VerificationStatus,
  pageParams,
  paged,
} from '@app/common';
import { Address, Seller, User } from './entities';
import { publicSeller, publicUser } from './auth.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Address) private readonly addresses: Repository<Address>,
    @InjectRepository(Seller) private readonly sellers: Repository<Seller>,
  ) {}

  // ------------------------------------------------------------- profile
  async me(userId: string) {
    const u = await this.users.findOne({ where: { id: userId }, relations: { addresses: true } });
    if (!u) throw new NotFoundException('User not found');
    return publicUser(u);
  }

  async update(userId: string, dto: UpdateProfileDto) {
    const u = await this.users.findOne({ where: { id: userId } });
    if (!u) throw new NotFoundException('User not found');
    Object.assign(u, dto);
    return publicUser(await this.users.save(u));
  }

  async list(page?: number, limit?: number) {
    const p = pageParams(page, limit);
    const [rows, total] = await this.users.findAndCount({
      order: { createdAt: 'DESC' },
      skip: p.skip,
      take: p.limit,
    });
    return paged(rows.map(publicUser), total, p.page, p.limit);
  }

  // ------------------------------------------------------------- addresses
  listAddresses(userId: string) {
    return this.addresses.find({ where: { userId }, order: { isDefault: 'DESC', createdAt: 'DESC' } });
  }

  async getAddress(userId: string, id: string) {
    const a = await this.addresses.findOne({ where: { id, userId } });
    if (!a) throw new NotFoundException('Address not found');
    return a;
  }

  async addAddress(userId: string, dto: AddressDto) {
    const count = await this.addresses.count({ where: { userId } });
    const isDefault = dto.isDefault || count === 0;
    if (isDefault) await this.addresses.update({ userId }, { isDefault: false });
    return this.addresses.save(this.addresses.create({ ...dto, userId, isDefault }));
  }

  async updateAddress(userId: string, id: string, dto: Partial<AddressDto>) {
    const a = await this.getAddress(userId, id);
    if (dto.isDefault) await this.addresses.update({ userId }, { isDefault: false });
    Object.assign(a, dto);
    return this.addresses.save(a);
  }

  async deleteAddress(userId: string, id: string) {
    const a = await this.getAddress(userId, id);
    await this.addresses.remove(a);
    return { success: true };
  }

  // ------------------------------------------------------------- sellers
  async sellerMe(id: string) {
    const s = await this.sellers.findOne({ where: { id } });
    if (!s) throw new NotFoundException('Seller not found');
    return publicSeller(s);
  }

  async sellerUpdate(id: string, dto: UpdateSellerDto) {
    const s = await this.sellers.findOne({ where: { id } });
    if (!s) throw new NotFoundException('Seller not found');
    const { pickupAddress, bankDetails, ...rest } = dto;
    Object.assign(s, rest);
    if (pickupAddress) s.pickupAddress = pickupAddress;
    if (bankDetails) s.bankDetails = { ...bankDetails, IFSC: bankDetails.IFSC.toUpperCase() };
    return publicSeller(await this.sellers.save(s));
  }

  async sellerList(filter: { status?: string; page?: number; limit?: number }) {
    const p = pageParams(filter.page, filter.limit);
    const where: any = {};
    if (filter.status) where.verificationStatus = filter.status;
    const [rows, total] = await this.sellers.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: p.skip,
      take: p.limit,
    });
    return paged(rows.map(publicSeller), total, p.page, p.limit);
  }

  async sellerVerify(sellerId: string, adminId: string, dto: SellerVerificationDto) {
    const s = await this.sellers.findOne({ where: { id: sellerId } });
    if (!s) throw new NotFoundException('Seller not found');
    switch (dto.action) {
      case 'APPROVE':
        s.verificationStatus = VerificationStatus.APPROVED;
        s.accountStatus = AccountStatus.ACTIVE;
        break;
      case 'REJECT':
        s.verificationStatus = VerificationStatus.REJECTED;
        s.accountStatus = AccountStatus.REJECTED;
        break;
      case 'SUSPEND':
        if (s.accountStatus !== AccountStatus.ACTIVE) throw new BadRequestException('Only active sellers can be suspended');
        s.accountStatus = AccountStatus.SUSPENDED;
        break;
      default:
        throw new ForbiddenException('Unknown action');
    }
    s.verificationHistory = [
      ...(s.verificationHistory ?? []),
      { action: dto.action, adminId, reason: dto.reason, timestamp: new Date().toISOString() },
    ];
    return publicSeller(await this.sellers.save(s));
  }
}
