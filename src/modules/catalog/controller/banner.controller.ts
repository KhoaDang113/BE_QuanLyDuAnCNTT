import { Public } from 'src/common/decorators/public.decorator';
import { BannerService } from '../service/banner.service';
import {
  Controller,
  Get,
  Query,
  Post,
  Body,
  Put,
  Param,
  Delete,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { CreateBannerDto } from '../dto/create-banner.dto';
import { UpdateBannerDto } from '../dto/update-banner.dto';
import { AdminGuard } from 'src/common/guards/admin.guard';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('banners')
export class BannerController {
  constructor(private readonly bannerService: BannerService) {}

  @Public()
  @Get()
  async getBanners(@Query('category') categorySlug?: string) {
    return this.bannerService.getBannersByCategorySlugOrAll(categorySlug);
  }

  @Post()
  @UseGuards(AdminGuard)
  @UseInterceptors(FileInterceptor('image'))
  async create(
    @Body() createBannerDto: CreateBannerDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.bannerService.create(createBannerDto, file);
  }

  @Put(':id')
  @UseGuards(AdminGuard)
  @UseInterceptors(FileInterceptor('image'))
  async update(
    @Param('id') id: string,
    @Body() updateBannerDto: UpdateBannerDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.bannerService.update(id, updateBannerDto, file);
  }

  @Delete(':id')
  @UseGuards(AdminGuard)
  async delete(@Param('id') id: string) {
    return this.bannerService.delete(id);
  }
}
