import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { AddressService } from './address.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';

@Controller('addresses')
export class AddressController {
  constructor(private readonly addressService: AddressService) {}

  @Get()
  async getMyAddresses(@Req() req: Request) {
    const userId = req.user?.id as string;
    if (!userId) {
      throw new UnauthorizedException('User not found');
    }
    return await this.addressService.findAllByUser(userId);
  }

  @Get(':id')
  async getAddressById(@Param('id') id: string, @Req() req: Request) {
    const userId = req.user?.id as string;
    if (!userId) {
      throw new UnauthorizedException('User not found');
    }
    return await this.addressService.findOneByUser(userId, id);
  }

  @Post()
  async createAddress(@Body() dto: CreateAddressDto, @Req() req: Request) {
    const userId = req.user?.id as string;
    if (!userId) {
      throw new UnauthorizedException('User not found');
    }
    return await this.addressService.create(userId, dto);
  }

  @Put(':id')
  async updateAddress(
    @Param('id') id: string,
    @Body() dto: UpdateAddressDto,
    @Req() req: Request,
  ) {
    const userId = req.user?.id as string;
    if (!userId) {
      throw new UnauthorizedException('User not found');
    }
    return await this.addressService.update(userId, id, dto);
  }

  @Delete(':id')
  async deleteAddress(@Param('id') id: string, @Req() req: Request) {
    const userId = req.user?.id as string;
    if (!userId) {
      throw new UnauthorizedException('User not found');
    }
    return await this.addressService.remove(userId, id);
  }
}
