import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  UseGuards,
  Req,
  Query,
  UseInterceptors,
  UploadedFiles,
} from '@nestjs/common';
import type { Request } from 'express';
import { OrderRatingService } from './order-rating.service';
import { CreateOrderRatingDto } from './dto/create-order-rating.dto';
import { UpdateOrderRatingDto } from './dto/update-order-rating.dto';
import { AdminResponseDto } from './dto/admin-response.dto';
import { AdminGuard } from 'src/common/guards/admin.guard';
import { UnauthorizedException } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';

@Controller('order-rating')
export class OrderRatingController {
  constructor(private readonly orderRatingService: OrderRatingService) {}

  @Post()
  @UseInterceptors(FilesInterceptor('images'))
  create(
    @Body() createOrderRatingDto: CreateOrderRatingDto,
    @Req() req: Request,
    @UploadedFiles() file: Express.Multer.File[],
  ) {
    const userId = req.user?.id as string;
    if (!userId) {
      throw new UnauthorizedException('User not found');
    }
    return this.orderRatingService.create(createOrderRatingDto, userId, file);
  }

  @UseGuards(AdminGuard)
  @Get()
  findAll(@Query('page') page?: string, @Query('limit') limit?: string) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return this.orderRatingService.findAll(pageNum, limitNum);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.orderRatingService.findOne(id);
  }

  @Get('order/:orderId')
  findByOrder(@Param('orderId') orderId: string) {
    return this.orderRatingService.findByOrder(orderId);
  }

  @Patch(':id')
  @UseInterceptors(FilesInterceptor('images'))
  update(
    @Param('id') id: string,
    @Body() updateOrderRatingDto: UpdateOrderRatingDto,
    @Req() req: Request,
    @UploadedFiles() file: Express.Multer.File[],
  ) {
    const userId = req.user?.id as string;
    if (!userId) {
      throw new UnauthorizedException('User not found');
    }
    return this.orderRatingService.update(
      id,
      updateOrderRatingDto,
      userId,
      file,
    );
  }

  @UseGuards(AdminGuard)
  @Patch(':id/admin-response')
  adminResponse(
    @Param('id') id: string,
    @Body() adminResponseDto: AdminResponseDto,
  ) {
    return this.orderRatingService.adminResponse(id, adminResponseDto);
  }
}
