import { MongooseModule } from '@nestjs/mongoose';
import { RealtimeModule } from '../realtime/realtime.module';
import { Product, ProductSchema } from '../catalog/schema/product.schema';
import {
  InventoryTransaction,
  InventoryTransactionSchema,
} from './schema/inventory-transaction.schema';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { Module } from '@nestjs/common';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Product.name, schema: ProductSchema },
      { name: InventoryTransaction.name, schema: InventoryTransactionSchema },
    ]),
    RealtimeModule,
  ],
  controllers: [InventoryController],
  providers: [InventoryService],
  exports: [InventoryService],
})
export class InventoryModule { }


// @Module({
//   imports: [
//     MongooseModule.forFeature([
//       { name: Product.name, schema: ProductSchema },
//       { name: InventoryTransaction.name, schema: InventoryTransactionSchema },
//     ]),
//     RealtimeModule,
//   ],
//   controllers: [InventoryController],
//   providers: [InventoryService],
//   exports: [InventoryService],
// })
// export class InventoryModule {}
