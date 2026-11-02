import {
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { createHash, randomBytes, randomUUID } from 'crypto';
import { Repository } from 'typeorm';
import {
  AccountStatus,
  LoginDto,
  PrincipalType,
  RegisterDto,
  Role,
  SellerRegisterDto,
} from '@app/common';
import { RefreshToken, Seller, User } from './entities';

const sha256 = (v: string) => createHash('sha256').update(v).digest('hex');

export const publicUser = (u: User) => {
  if (!u) return u;
  const { passwordHash, ...rest } = u as any;
  return rest;
};
export const publicSeller = (s: Seller) => {
  if (!s) return s;
  const { passwordHash, bankDetails, ...rest } = s as any;
  // never leak the full account number
  return {
    ...rest,
    bankDetails: bankDetails && {
      ...bankDetails,
      accountNumber: `****${String(bankDetails.accountNumber).slice(-4)}`,
    },
  };
};

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Seller) private readonly sellers: Repository<Seller>,
    @InjectRepository(RefreshToken) private readonly tokens: Repository<RefreshToken>,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  // ------------------------------------------------------------------ customers
  async register(dto: RegisterDto) {
    const email = dto.email.toLowerCase().trim();
    if (await this.users.findOne({ where: { email } })) {
      throw new ConflictException('An account with this email already exists');
    }
    let referredBy: string | undefined;
    if (dto.referralCode) {
      const referrer = await this.users.findOne({ where: { referralCode: dto.referralCode } });
      referredBy = referrer?.id;
    }
    const user = await this.users.save(
      this.users.create({
        fullName: dto.fullName.trim(),
        email,
        mobile: dto.mobile,
        passwordHash: await bcrypt.hash(dto.password, 12),
        role: Role.CUSTOMER,
        referralCode: randomBytes(4).toString('hex').toUpperCase(),
        referredBy,
      }),
    );
    return this.issueTokens({ id: user.id, email: user.email, role: user.role }, PrincipalType.USER, publicUser(user));
  }

  async login(dto: LoginDto) {
    const user = await this.users.findOne({ where: { email: dto.email.toLowerCase().trim() } });
    if (!user?.passwordHash || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid email or password');
    }
    if (!user.isActive) throw new ForbiddenException('Account is disabled');
    return this.issueTokens({ id: user.id, email: user.email, role: user.role }, PrincipalType.USER, publicUser(user));
  }

  // ------------------------------------------------------------------ sellers
  async registerSeller(dto: SellerRegisterDto) {
    const email = dto.email.toLowerCase().trim();
    if (await this.sellers.findOne({ where: { email } })) {
      throw new ConflictException('A seller with this email already exists');
    }
    const seller = await this.sellers.save(
      this.sellers.create({
        sellerName: dto.sellerName.trim(),
        email,
        mobile: dto.mobile,
        passwordHash: await bcrypt.hash(dto.password, 12),
        businessDetails: { ...dto.businessDetails, GSTIN: dto.businessDetails.GSTIN.toUpperCase() },
        bankDetails: { ...dto.bankDetails, IFSC: dto.bankDetails.IFSC.toUpperCase() },
        pickupAddress: dto.pickupAddress,
      }),
    );
    return this.issueTokens({ id: seller.id, email: seller.email, role: Role.SELLER }, PrincipalType.SELLER, publicSeller(seller));
  }

  async loginSeller(dto: LoginDto) {
    const seller = await this.sellers.findOne({ where: { email: dto.email.toLowerCase().trim() } });
    if (!seller?.passwordHash || !(await bcrypt.compare(dto.password, seller.passwordHash))) {
      throw new UnauthorizedException('Invalid email or password');
    }
    if ([AccountStatus.SUSPENDED, AccountStatus.REJECTED].includes(seller.accountStatus)) {
      throw new ForbiddenException(`Seller account is ${seller.accountStatus.toLowerCase()}`);
    }
    return this.issueTokens({ id: seller.id, email: seller.email, role: Role.SELLER }, PrincipalType.SELLER, publicSeller(seller));
  }

  // ------------------------------------------------------------------ tokens
  /** Refresh-token rotation with re-use detection (whole family is revoked on replay). */
  async refresh(refreshToken: string) {
    const record = await this.tokens.findOne({ where: { tokenHash: sha256(refreshToken) } });
    if (!record || record.expiresAt < new Date()) throw new UnauthorizedException('Invalid refresh token');

    if (record.isUsed || record.isRevoked) {
      await this.tokens.update({ familyId: record.familyId }, { isRevoked: true });
      throw new UnauthorizedException('Refresh token reuse detected, please login again');
    }
    record.isUsed = true;
    await this.tokens.save(record);

    if (record.principalType === PrincipalType.SELLER) {
      const s = await this.sellers.findOne({ where: { id: record.principalId } });
      if (!s) throw new UnauthorizedException();
      return this.issueTokens({ id: s.id, email: s.email, role: Role.SELLER }, PrincipalType.SELLER, publicSeller(s), record.familyId);
    }
    const u = await this.users.findOne({ where: { id: record.principalId } });
    if (!u || !u.isActive) throw new UnauthorizedException();
    return this.issueTokens({ id: u.id, email: u.email, role: u.role }, PrincipalType.USER, publicUser(u), record.familyId);
  }

  async logout(principalId: string) {
    await this.tokens.update({ principalId, isRevoked: false }, { isRevoked: true });
    return { success: true };
  }

  private async issueTokens(
    p: { id: string; email: string; role: string },
    type: PrincipalType,
    profile: any,
    familyId: string = randomUUID(),
  ) {
    const accessToken = this.jwt.sign({ sub: p.id, email: p.email, role: p.role });
    const refreshToken = randomBytes(48).toString('hex');
    const days = Number(this.config.get('JWT_REFRESH_DAYS', 7));
    await this.tokens.save(
      this.tokens.create({
        principalId: p.id,
        principalType: type,
        tokenHash: sha256(refreshToken),
        familyId,
        expiresAt: new Date(Date.now() + days * 24 * 3600 * 1000),
      }),
    );
    return { accessToken, refreshToken, user: profile };
  }
}
