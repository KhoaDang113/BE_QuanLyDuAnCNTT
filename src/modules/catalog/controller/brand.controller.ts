import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { BrandService } from '../service/brand.service';
import { Public } from '../../../common/decorators/public.decorator';
import { AdminGuard } from '../../../common/guards/admin.guard';
import { CreateBrandDto } from '../dto/create-brand.dto';
import { UpdateBrandDto } from '../dto/update-brand.dto';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('brands')
export class BrandController {
  constructor(private readonly brandService: BrandService) {}

  @UseGuards(AdminGuard)
  @Get('brands-admin')
  async getBrandsAdmin(
    @Query('page') page: number,
    @Query('limit') limit: number,
    @Query('key') key?: string,
  ): Promise<any> {
    return await this.brandService.getBrandsAdmin(page, limit, key);
  }

  @Public()
  @Get()
  async getAllBrands() {
    return this.brandService.findAll();
  }

  @Public()
  @Get(':id')
  async getBrandById(@Param('id') id: string) {
    return this.brandService.findById(id);
  }

  @Public()
  @Get('slug/:slug')
  async getBrandBySlug(@Param('slug') slug: string) {
    return this.brandService.findBySlug(slug);
  }

  @Post()
  @UseGuards(AdminGuard)
  @UseInterceptors(FileInterceptor('image'))
  async createBrand(
    @Body() createBrandDto: CreateBrandDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.brandService.create(createBrandDto, file);
  }

  @Put(':id')
  @UseGuards(AdminGuard)
  @UseInterceptors(FileInterceptor('image'))
  async updateBrand(
    @Param('id') id: string,
    @Body() updateBrandDto: UpdateBrandDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.brandService.update(id, updateBrandDto, file);
  }

  @Delete(':id')
  @UseGuards(AdminGuard)
  async deleteBrand(@Param('id') id: string) {
    return this.brandService.delete(id);
  }
}
