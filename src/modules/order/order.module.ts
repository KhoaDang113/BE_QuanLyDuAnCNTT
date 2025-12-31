import { MongooseModule } from '@nestjs/mongoose';
import { Order, OrderSchema } from './schema/order.schema';
import { OrderController } from './order.controller';
import { OrderService } from './service/order.service';
import { Module } from '@nestjs/common';
import { Product, ProductSchema } from '../catalog/schema/product.schema';
import { Address, AddressSchema } from '../address/schema/address.schema';
import { InventoryModule } from '../inventory/inventory.module';
import { BullModule } from '@nestjs/bullmq';
import { OrderProcessor } from './queue/order.processor';
import { RealtimeModule } from '../realtime/realtime.module';
import { NotificationModule } from '../notification/notification.module';
import { User, UserSchema } from '../users/schemas/user.schema';
import { DistanceModule } from '../distance/distance.module';
import { StatsService } from './service/stats.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Order.name, schema: OrderSchema },
      { name: Product.name, schema: ProductSchema },
      { name: Address.name, schema: AddressSchema },
      { name: User.name, schema: UserSchema },
    ]),
    BullModule.registerQueue({
      name: 'order-queue',
    }),
    InventoryModule,
    RealtimeModule,
    NotificationModule,
    DistanceModule,
    // NotificationModule,
    // DistanceModule,
  ],
  controllers: [OrderController],
  providers: [OrderService, OrderProcessor, StatsService],
  exports: [OrderService, StatsService],
})
export class OrderModule { }
