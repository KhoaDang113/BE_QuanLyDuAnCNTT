import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { InventoryService } from './inventory.service';
import {
  InventoryOperationDto,
  AdjustInventoryDto,
} from './dto/inventory-operation.dto';
import { AdminGuard } from '../../common/guards/admin.guard';

@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Post('import')
  @UseGuards(AdminGuard)
  async importInventory(
    @Body() dto: InventoryOperationDto,
    @Req() req: Request,
  ) {
    const userId = req.user?.id as string;
    const transaction = await this.inventoryService.importInventory(
      dto.product_id,
      dto.quantity,
      userId,
      dto.note,
    );
    return {
      success: true,
      message: 'Inventory imported successfully',
      transaction,
    };
  }

  @Post('export')
  @UseGuards(AdminGuard)
  async exportInventory(
    @Body() dto: InventoryOperationDto,
    @Req() req: Request,
  ) {
    const userId = req.user?.id as string;
    const transaction = await this.inventoryService.exportInventory(
      dto.product_id,
      dto.quantity,
      undefined,
      userId,
      dto.note,
    );
    return {
      success: true,
      message: 'Inventory exported successfully',
      transaction,
    };
  }

  @Post('adjust')
  @UseGuards(AdminGuard)
  async adjustInventory(@Body() dto: AdjustInventoryDto, @Req() req: Request) {
    const userId = req.user?.id as string;
    const transaction = await this.inventoryService.adjustInventory(
      dto.product_id,
      dto.new_quantity,
      userId,
      dto.note,
    );
    return {
      success: true,
      message: 'Inventory adjusted successfully',
      transaction,
    };
  }

  @Get('product/:productId')
  @UseGuards(AdminGuard)
  async getProductInventory(@Param('productId') productId: string) {
    const product = await this.inventoryService.getProductInventory(productId);
    return {
      success: true,
      product,
    };
  }

  @Get('history/:productId')
  @UseGuards(AdminGuard)
  async getInventoryHistory(@Param('productId') productId: string) {
    const history = await this.inventoryService.getInventoryHistory(productId);
    return {
      success: true,
      history,
    };
  }
}
