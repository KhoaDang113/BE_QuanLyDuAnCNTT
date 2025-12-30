import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DistanceCalculationService } from './distance-calculation.service';
import { ShippingController } from './shipping.controller';
import { Address, AddressSchema } from '../address/schema/address.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Address.name, schema: AddressSchema }]),
  ],
  controllers: [ShippingController],
  providers: [DistanceCalculationService],
  exports: [DistanceCalculationService],
})
export class DistanceModule {}
