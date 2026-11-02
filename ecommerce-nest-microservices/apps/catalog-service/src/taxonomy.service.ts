import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateBrandDto, CreateCategoryDto, UpdateBrandDto, UpdateCategoryDto } from '@app/common';
import { Brand, Category, Product } from './entities';

@Injectable()
export class TaxonomyService {
  constructor(
    @InjectRepository(Category) private readonly categories: Repository<Category>,
    @InjectRepository(Brand) private readonly brands: Repository<Brand>,
    @InjectRepository(Product) private readonly products: Repository<Product>,
  ) {}

  // ---------------------------------------------------------------- categories
  async createCategory(dto: CreateCategoryDto) {
    const slug = dto.categoryId.toLowerCase().trim();
    if (await this.categories.findOne({ where: { categoryId: slug } })) {
      throw new ConflictException('categoryId already exists');
    }
    let level = 1;
    if (dto.parentId) {
      const parent = await this.categories.findOne({ where: { id: dto.parentId } });
      if (!parent) throw new NotFoundException('Parent category not found');
      level = parent.level + 1;
      if (level > 3) throw new BadRequestException('Category hierarchy cannot exceed 3 levels');
    }
    return this.categories.save(
      this.categories.create({
        name: dto.name.trim(),
        categoryId: slug,
        parentId: dto.parentId,
        level,
        supportedAttributes: dto.supportedAttributes ?? [],
      }),
    );
  }

  async categoryTree() {
    const all = await this.categories.find({ order: { level: 'ASC', name: 'ASC' } });
    const byParent = new Map<string | null, any[]>();
    for (const c of all) {
      const key = c.parentId ?? null;
      byParent.set(key, [...(byParent.get(key) ?? []), c]);
    }
    const build = (parentId: string | null): any[] =>
      (byParent.get(parentId) ?? []).map((c) => ({ ...c, children: build(c.id) }));
    return build(null);
  }

  async getCategory(id: string) {
    const c = await this.categories.findOne({ where: { id } });
    if (!c) throw new NotFoundException('Category not found');
    return c;
  }

  async updateCategory(id: string, dto: UpdateCategoryDto) {
    const c = await this.getCategory(id);
    if (dto.categoryId && dto.categoryId.toLowerCase() !== c.categoryId) {
      const dup = await this.categories.findOne({ where: { categoryId: dto.categoryId.toLowerCase() } });
      if (dup) throw new ConflictException('categoryId already exists');
      c.categoryId = dto.categoryId.toLowerCase();
    }
    if (dto.name) c.name = dto.name.trim();
    if (dto.supportedAttributes) c.supportedAttributes = dto.supportedAttributes;
    return this.categories.save(c);
  }

  async deleteCategory(id: string) {
    const c = await this.getCategory(id);
    if (await this.categories.count({ where: { parentId: id } })) {
      throw new BadRequestException('Category has child categories');
    }
    if (await this.products.count({ where: { categoryId: id, isDeleted: false } })) {
      throw new BadRequestException('Category still has products');
    }
    await this.categories.remove(c);
    return { success: true };
  }

  // ---------------------------------------------------------------- brands
  async createBrand(adminId: string, dto: CreateBrandDto) {
    const dup = await this.brands.findOne({ where: [{ name: dto.name }, { slug: dto.slug.toLowerCase() }] });
    if (dup) throw new ConflictException('Brand name or slug already exists');
    return this.brands.save(
      this.brands.create({ ...dto, slug: dto.slug.toLowerCase(), categoryIds: dto.categoryIds ?? [], createdBy: adminId }),
    );
  }

  listBrands(opts: { includeInactive?: boolean }) {
    const where: any = { isDeleted: false };
    if (!opts.includeInactive) where.isActive = true;
    return this.brands.find({ where, order: { isFeatured: 'DESC', displayOrder: 'ASC', name: 'ASC' } });
  }

  async updateBrand(id: string, dto: UpdateBrandDto) {
    const b = await this.brands.findOne({ where: { id, isDeleted: false } });
    if (!b) throw new NotFoundException('Brand not found');
    Object.assign(b, dto);
    return this.brands.save(b);
  }

  async deleteBrand(id: string) {
    const b = await this.brands.findOne({ where: { id, isDeleted: false } });
    if (!b) throw new NotFoundException('Brand not found');
    b.isDeleted = true; // soft delete
    b.isActive = false;
    await this.brands.save(b);
    return { success: true };
  }
}
