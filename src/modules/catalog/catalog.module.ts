import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProductService } from './service/product.service';
import { CategoryService } from './service/category.service';
import { CategoryController } from './controller/category.controller';
import { ProductController } from './controller/product.controller';
import { CartController } from './controller/cart.controller';
import { BannerController } from './controller/banner.controller';
import { Category, CategorySchema } from './schema/category.schema';
import { Product, ProductSchema } from './schema/product.schema';
import {
  ProductSuggestion,
  ProductSuggestionSchema,
} from './schema/product-suggestion.schema';
import { Cart, CartSchema } from './schema/cart.schema';
import { CartService } from './service/cart.service';
import { Banner, BannerSchema } from './schema/banner.schema';
import { BannerService } from './service/banner.service';
import { CloudinaryService } from '../../shared/cloudinary/cloudinary.service';
import { Brand, BrandSchema } from './schema/brand.schema';
import { Rating, RatingSchema } from './schema/rating.schema';
import { RatingService } from './service/rating.service';
import { RatingController } from './controller/rating.controller';
import { BrandService } from './service/brand.service';
import { BrandController } from './controller/brand.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Category.name, schema: CategorySchema },
      { name: Product.name, schema: ProductSchema },
      { name: ProductSuggestion.name, schema: ProductSuggestionSchema },
      { name: Cart.name, schema: CartSchema },
      { name: Banner.name, schema: BannerSchema },
      { name: Brand.name, schema: BrandSchema },
      { name: Rating.name, schema: RatingSchema },
    ]),
  ],
  controllers: [
    CategoryController,
    ProductController,
    CartController,
    BannerController,
    RatingController,
    BrandController,
  ],
  providers: [
    ProductService,
    CategoryService,
    CloudinaryService,
    CartService,
    BannerService,
    RatingService,
    BrandService,
  ],
  exports: [
    ProductService,
    CategoryService,
    CartService,
    BannerService,
    RatingService,
    BrandService,
  ],
})
export class CatalogModule { }

