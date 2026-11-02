import { Column, Entity, Index, ManyToOne, OneToMany, Unique } from 'typeorm';
import { AppBaseEntity, ApprovalStatus, PublishStatus, numericTransformer } from '@app/common';

const money = { type: 'numeric' as const, precision: 12, scale: 2, transformer: numericTransformer };

@Entity('categories')
export class Category extends AppBaseEntity {
  @Column() name: string;

  @Index({ unique: true })
  @Column()
  categoryId: string; // url friendly slug

  @Index()
  @Column({ type: 'uuid', nullable: true })
  parentId: string;

  @Column({ type: 'int' }) level: number; // 1..3

  @Column({ type: 'jsonb', default: () => `'[]'` })
  supportedAttributes: Record<string, any>[];
}

@Entity('brands')
export class Brand extends AppBaseEntity {
  @Index({ unique: true }) @Column() name: string;
  @Index({ unique: true }) @Column() slug: string;
  @Column({ type: 'text', default: '' }) description: string;
  @Column({ type: 'varchar', nullable: true }) logo: string;
  @Column({ default: true }) isActive: boolean;
  @Column({ default: false }) isFeatured: boolean;
  @Column({ default: false }) isDeleted: boolean;
  @Column({ type: 'int', default: 0 }) displayOrder: number;
  @Column({ type: 'uuid', array: true, default: () => `'{}'` }) categoryIds: string[];
  @Column({ type: 'uuid', nullable: true }) createdBy: string;
}

@Entity('products')
@Index(['sellerId', 'isDeleted'])
@Index(['categoryId', 'approvalStatus', 'publishStatus'])
export class Product extends AppBaseEntity {
  @Column() title: string;
  @Column({ type: 'text' }) description: string;
  @Column(money) mrpPrice: number;
  @Column(money) sellingPrice: number;
  @Column({ type: 'int', default: 0 }) discountPercent: number;
  @Column({ type: 'int', default: 0 }) quantity: number;
  @Column({ type: 'int', default: 0 }) reservedQuantity: number;
  @Column({ type: 'varchar', nullable: true }) color: string;
  @Column({ type: 'varchar', nullable: true }) sizes: string;
  @Column({ type: 'varchar', nullable: true }) brand: string;

  @Column({ type: 'jsonb', default: () => `'[]'` })
  images: { url: string; publicId?: string; isPrimary?: boolean }[];

  @Column({ type: 'uuid' }) categoryId: string;
  @Column({ type: 'uuid' }) sellerId: string;

  @Column({ type: 'enum', enum: ApprovalStatus, default: ApprovalStatus.PENDING })
  approvalStatus: ApprovalStatus;

  @Column({ type: 'enum', enum: PublishStatus, default: PublishStatus.DRAFT })
  publishStatus: PublishStatus;

  @Column({ default: false }) isFeatured: boolean;
  @Column({ default: false }) isDeleted: boolean;
  @Column({ type: 'timestamptz', nullable: true }) deletedAt: Date;

  @Column({ type: 'jsonb', default: () => `'[]'` })
  moderationHistory: { action: string; adminId: string; reason?: string; previousStatus: string; newStatus: string; timestamp: string }[];

  @OneToMany(() => ProductVariant, (v) => v.product, { cascade: ['insert'] })
  variants: ProductVariant[];
}

@Entity('product_variants')
@Unique(['sku'])
export class ProductVariant extends AppBaseEntity {
  @Index()
  @Column({ type: 'uuid' })
  productId: string;

  @ManyToOne(() => Product, (p) => p.variants, { onDelete: 'CASCADE' })
  product: Product;

  @Column() sku: string;
  @Column({ type: 'jsonb', default: () => `'{}'` }) attributes: Record<string, any>;
  @Column(money) price: number;
  @Column(money) mrpPrice: number;
  @Column({ type: 'int', default: 0 }) discountPercent: number;
  @Column({ type: 'int', default: 0 }) quantity: number;
  @Column({ type: 'int', default: 0 }) reservedQuantity: number;
  @Column({ type: 'jsonb', default: () => `'[]'` }) images: { url: string; publicId?: string; isPrimary?: boolean }[];
  @Column({ type: 'numeric', nullable: true, transformer: numericTransformer }) weight: number;
  @Column({ default: true }) isActive: boolean;
}

@Entity('reviews')
@Unique(['userId', 'productId'])
export class Review extends AppBaseEntity {
  @Index()
  @Column({ type: 'uuid' })
  productId: string;

  @Column({ type: 'uuid' }) userId: string;
  @Column({ type: 'varchar', nullable: true }) userName: string;
  @Column({ type: 'smallint' }) rating: number;
  @Column({ type: 'text' }) reviewText: string;
  @Column({ type: 'jsonb', default: () => `'[]'` }) images: string[];
}

@Entity('wishlist_items')
@Unique(['userId', 'productId'])
export class WishlistItem extends AppBaseEntity {
  @Index()
  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'uuid' }) productId: string;
}
