// File: brand.controller.ts
// Mô tả: Controller xử lý các HTTP request liên quan đến thương hiệu
// Chức năng: Định nghĩa các API endpoint cho CRUD thương hiệu

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

// Decorator @Controller: Định nghĩa prefix URL cho tất cả các route trong controller
// Tất cả các route sẽ bắt đầu với /brands
@Controller('brands')
export class BrandController {
  // Inject BrandService thông qua constructor
  constructor(private readonly brandService: BrandService) { }

  // ============================================================
  // API DÀNH CHO ADMIN
  // ============================================================

  // GET /brands/brands-admin - Lấy danh sách thương hiệu cho trang admin
  // Yêu cầu quyền Admin để truy cập
  // Hỗ trợ phân trang (page, limit) và tìm kiếm (key)
  @UseGuards(AdminGuard)
  @Get('brands-admin')
  async getBrandsAdmin(
    @Query('page') page: number,      // Số trang hiện tại
    @Query('limit') limit: number,    // Số lượng item mỗi trang
    @Query('key') key?: string,       // Từ khóa tìm kiếm (optional)
  ): Promise<any> {
    return await this.brandService.getBrandsAdmin(page, limit, key);
  }

  // POST /brands - Tạo mới thương hiệu
  // Yêu cầu quyền Admin
  // Hỗ trợ upload file hình ảnh
  @Post()
  @UseGuards(AdminGuard)
  @UseInterceptors(FileInterceptor('image')) // Xử lý file upload với field name là 'image'
  async createBrand(
    @Body() createBrandDto: CreateBrandDto,       // Dữ liệu thương hiệu từ body
    @UploadedFile() file: Express.Multer.File,    // File hình ảnh được upload
  ) {
    return this.brandService.create(createBrandDto, file);
  }

  // PUT /brands/:id - Cập nhật thông tin thương hiệu
  // Yêu cầu quyền Admin
  // Hỗ trợ upload file hình ảnh mới
  @Put(':id')
  @UseGuards(AdminGuard)
  @UseInterceptors(FileInterceptor('image'))
  async updateBrand(
    @Param('id') id: string,                      // ID thương hiệu từ URL
    @Body() updateBrandDto: UpdateBrandDto,       // Dữ liệu cập nhật từ body
    @UploadedFile() file: Express.Multer.File,    // File hình ảnh mới (optional)
  ) {
    return this.brandService.update(id, updateBrandDto, file);
  }

  // DELETE /brands/:id - Xóa thương hiệu (soft delete)
  // Yêu cầu quyền Admin
  @Delete(':id')
  @UseGuards(AdminGuard)
  async deleteBrand(@Param('id') id: string) {
    return this.brandService.delete(id);
  }

  // ============================================================
  // API CÔNG KHAI (PUBLIC)
  // ============================================================

  // GET /brands - Lấy tất cả thương hiệu đang hoạt động
  // Không yêu cầu đăng nhập (Public)
  @Public()
  @Get()
  async getAllBrands() {
    return this.brandService.findAll();
  }

  // GET /brands/:id - Lấy thông tin chi tiết thương hiệu theo ID
  // Không yêu cầu đăng nhập (Public)
  @Public()
  @Get(':id')
  async getBrandById(@Param('id') id: string) {
    return this.brandService.findById(id);
  }

  // GET /brands/slug/:slug - Lấy thông tin thương hiệu theo slug
  // Không yêu cầu đăng nhập (Public)
  // Dùng cho SEO-friendly URLs
  @Public()
  @Get('slug/:slug')
  async getBrandBySlug(@Param('slug') slug: string) {
    return this.brandService.findBySlug(slug);
  }
}
