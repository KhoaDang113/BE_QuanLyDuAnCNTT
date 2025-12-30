import { Controller, Post, Body } from '@nestjs/common';
import { DistanceCalculationService } from './distance-calculation.service';
import { CalculateShippingFeeDto } from './dto/calculate-shipping-fee';

@Controller('shipping')
export class ShippingController {
  constructor(
    private readonly distanceCalculationService: DistanceCalculationService,
  ) {}

  // @Post('calculate-fee')
  // async calculateShippingFee(@Body() dto: CalculateShippingFeeDto) {
  //   return await this.distanceCalculationService.calculateDistanceAndFeeFromAddressId(
  //     dto.addressId,
  //     dto.orderTotal,
  //   );
  // }
  
  @Post('calculate-fee')
  async calculateShippingFee(@Body() dto: CalculateShippingFeeDto) {
    return await this.distanceCalculationService.calculateDistanceAndFeeByAPINextbillion(
      dto.userAddress,
      dto.orderTotal,
    );
  }

  @Post('calculate-fee-by-address')
  async testchoi() {
    return await this.distanceCalculationService.getDistanceAndDuration(
     "10.847007540739863, 106.72896152040121",
    );
  }
}
