import { Column, Entity, Index, ManyToOne, OneToMany } from 'typeorm';
import { AccountStatus, AppBaseEntity, PrincipalType, Role, VerificationStatus } from '@app/common';

@Entity('users')
export class User extends AppBaseEntity {
  @Column() fullName: string;

  @Index({ unique: true })
  @Column()
  email: string;

  @Column({ type: 'varchar', nullable: true }) passwordHash: string;
  @Column({ type: 'varchar', nullable: true }) mobile: string;
  @Column({ type: 'enum', enum: Role, default: Role.CUSTOMER }) role: Role;
  @Column({ type: 'varchar', nullable: true }) profileImage: string;
  @Column({ type: 'date', nullable: true }) birthDate: string;
  @Column({ type: 'varchar', nullable: true, unique: true }) referralCode: string;
  @Column({ type: 'uuid', nullable: true }) referredBy: string;
  @Column({ default: true }) isActive: boolean;

  @OneToMany(() => Address, (a) => a.user)
  addresses: Address[];
}

@Entity('addresses')
export class Address extends AppBaseEntity {
  @Index()
  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, (u) => u.addresses, { onDelete: 'CASCADE' })
  user: User;

  @Column() name: string;
  @Column() mobile: string;
  @Column() streetAddress: string;
  @Column() locality: string;
  @Column() city: string;
  @Column() state: string;
  @Column() pinCode: string;
  @Column({ default: false }) isDefault: boolean;
}

@Entity('sellers')
export class Seller extends AppBaseEntity {
  @Column() sellerName: string;

  @Index({ unique: true })
  @Column()
  email: string;

  @Column() mobile: string;
  @Column({ type: 'varchar', nullable: true }) avatar: string;
  @Column({ type: 'varchar', nullable: true }) passwordHash: string;
  @Column({ default: false }) isEmailVerified: boolean;

  @Column({ type: 'enum', enum: AccountStatus, default: AccountStatus.PENDING_VERIFICATION })
  accountStatus: AccountStatus;

  @Column({ type: 'enum', enum: VerificationStatus, default: VerificationStatus.PENDING })
  verificationStatus: VerificationStatus;

  @Column({ type: 'jsonb' }) businessDetails: { businessName: string; GSTIN: string; businessAddress: string };
  @Column({ type: 'jsonb' }) bankDetails: { accountNumber: string; accountHolderName: string; IFSC: string };
  @Column({ type: 'jsonb' }) pickupAddress: {
    streetAddress: string;
    city: string;
    state: string;
    pinCode: string;
    mobile?: string;
  };

  @Column({ type: 'jsonb', default: () => `'[]'` })
  verificationHistory: { action: string; adminId: string; reason?: string; timestamp: string }[];
}

@Entity('refresh_tokens')
export class RefreshToken extends AppBaseEntity {
  @Index()
  @Column({ type: 'uuid' })
  principalId: string;

  @Column({ type: 'enum', enum: PrincipalType }) principalType: PrincipalType;

  @Index({ unique: true })
  @Column()
  tokenHash: string;

  @Index()
  @Column()
  familyId: string;

  @Column({ default: false }) isUsed: boolean;
  @Column({ default: false }) isRevoked: boolean;
  @Column({ type: 'timestamptz' }) expiresAt: Date;
}
