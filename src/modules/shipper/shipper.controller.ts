import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ShipperService } from './shipper.service';
import { SetOnlineStatusDto } from './dto/set-online-status.dto';
import { ShipperGuard } from '../../common/guards/shipper.guard';
import { AdminGuard } from 'src/common/guards/admin.guard';
import { CreateShipperDto } from './dto/create-shipper-dto.dto';
import { SkipShipperGuard } from '../../common/decorators/skip-shipper-guard.decorator';
import type { Request } from 'express';

@Controller('shipper')
@UseGuards(ShipperGuard)
export class ShipperController {
  constructor(private readonly shipperService: ShipperService) {}

  @Post()
  @SkipShipperGuard()
  @UseGuards(AdminGuard)
  async createForUser(@Req() req: Request, @Body() dto: CreateShipperDto) {
    return await this.shipperService.createForUser(dto?.user_id);
  }

  @Post('status')
  async setOnlineStatus(
    @Req() req: Request,
    @Body() setOnlineStatusDto: SetOnlineStatusDto,
  ) {
    const userId = req.user?.id as string;
    return await this.shipperService.setOnlineStatus(
      userId,
      setOnlineStatusDto,
    );
  }

  @Get('status')
  async getStatus(@Req() req: Request) {
    const userId = req.user?.id as string;
    return await this.shipperService.getShipperStatus(userId);
  }

  @Get('orders')
  async getOrders(@Req() req: Request, @Query('status') status?: string) {
    const userId = req.user?.id as string;
    return await this.shipperService.getShipperOrders(userId, status);
  }

  @Patch('orders/:id/start-delivery')
  async startDelivery(@Req() req: Request, @Param('id') orderId: string) {
    const userId = req.user?.id as string;
    return await this.shipperService.startDelivery(orderId, userId);
  }

  @Patch('orders/:id/complete')
  async completeDelivery(@Req() req: Request, @Param('id') orderId: string) {
    const userId = req.user?.id as string;
    return await this.shipperService.completeDelivery(orderId, userId);
  }
}
