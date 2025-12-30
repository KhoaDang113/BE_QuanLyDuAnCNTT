import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ShipperController } from './shipper.controller';
import { ShipperService } from './shipper.service';
import { Shipper, ShipperSchema } from './schema/shipper.schema';
import { Order, OrderSchema } from '../order/schema/order.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { OrderModule } from '../order/order.module';
import { RealtimeModule } from '../realtime/realtime.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Shipper.name, schema: ShipperSchema },
      { name: Order.name, schema: OrderSchema },
      { name: User.name, schema: UserSchema },
    ]),
    OrderModule,
    RealtimeModule,
  ],
  controllers: [ShipperController],
  providers: [ShipperService],
  exports: [ShipperService],
})
export class ShipperModule {}
