import {
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { CartService } from '../service/cart.service';
import type { Request } from 'express';

@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  async getCart(@Req() req: Request) {
    const userId = req.user?.id as string;
    if (!userId) {
      throw new UnauthorizedException('User not found');
    }
    return this.cartService.getCarts(userId);
  }

  @Post(':productId')
  async addToCart(@Param('productId') productId: string, @Req() req: Request) {
    const userId = req.user?.id as string;
    if (!userId) {
      throw new UnauthorizedException('User not found');
    }
    return this.cartService.addItem(userId, productId);
  }

  @Delete(':productId')
  async removeFromCart(
    @Param('productId') productId: string,
    @Req() req: Request,
  ) {
    const userId = req.user?.id as string;
    if (!userId) {
      throw new UnauthorizedException('User not found');
    }
    return await this.cartService.removeItem(userId, productId);
  }
}
