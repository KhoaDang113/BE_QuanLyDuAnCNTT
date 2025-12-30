import { Module } from '@nestjs/common';
import { MailerService } from './mailer.service';
import { MongooseModule } from '@nestjs/mongoose';
import {
  Product,
  ProductSchema,
} from 'src/modules/catalog/schema/product.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Product.name, schema: ProductSchema }]),
  ],
  providers: [MailerService],
  exports: [MailerService],
})
export class MailerModule {}
