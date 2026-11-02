import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { postgresRoot } from '@app/common';
import { CatalogController } from './catalog.controller';
import { Brand, Category, Product, ProductVariant, Review, WishlistItem } from './entities';
import { ProductsService } from './products.service';
import { TaxonomyService } from './taxonomy.service';

const entities = [Category, Brand, Product, ProductVariant, Review, WishlistItem];

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    postgresRoot('CATALOG_DB', 'catalog_db', entities),
    TypeOrmModule.forFeature(entities),
  ],
  controllers: [CatalogController],
  providers: [ProductsService, TaxonomyService],
})
export class CatalogModule {}
