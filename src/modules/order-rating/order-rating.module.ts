import { Module } from '@nestjs/common';
import { OrderRatingService } from './order-rating.service';
import { OrderRatingController } from './order-rating.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { OrderRating, OrderRatingSchema } from './schema/order-rating.schema';
import { Order, OrderSchema } from '../order/schema/order.schema';
import { CloudinaryModule } from 'src/shared/cloudinary/cloudinary.module';
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: OrderRating.name, schema: OrderRatingSchema },
      { name: Order.name, schema: OrderSchema },
    ]),
    CloudinaryModule,
  ],
  controllers: [OrderRatingController],
  providers: [OrderRatingService],
  exports: [OrderRatingService],
})
export class OrderRatingModule {}
