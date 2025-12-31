import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
  Query,
  Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { PaymentService } from './payment.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { type QueryDrResponseFromVNPay } from 'vnpay/types-only';

@Controller('payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) { }
  // Tạo giao dịch thanh toán
  // @Post('create-payment')
  // async createPaymentTransaction(
  //   @Body() body: CreatePaymentDto,
  //   @Req() req: Request,
  // ) {
  //   const userId = req.user?.id as string;
  //   if (!userId) {
  //     throw new UnauthorizedException('User not found');
  //   }
  //   return await this.paymentService.createPaymentTransaction(body, userId);
  // }
  @Post('create-payment')
  async createPaymentTransaction(
    @Body() body: CreatePaymentDto,
    @Req() req: Request,
  ) {
    const userId = req.user?.id as string;
    if (!userId) {
      throw new UnauthorizedException('User not found');
    }
    return await this.paymentService.createPaymentTransaction(body, userId);
  }

  @Get('get-info')
  async getPaymentInfo(
    @Query() query: QueryDrResponseFromVNPay,
    @Res() res: Response,
  ) {
    const result = await this.paymentService.verifyPaymentCallback(query);

    if (!result.isValid) {
      throw new BadRequestException('Invalid signature');
    }

    if (!result.payment) {
      throw new NotFoundException('Transaction not found');
    }

    if (result.redirectUrl) {
      return res.redirect(result.redirectUrl);
    }

    return res.json({
      success: result.payment.status === 'completed',
      payment: result.payment,
    });
  }
}
