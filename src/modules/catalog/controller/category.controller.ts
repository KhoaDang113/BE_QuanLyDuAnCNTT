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
import { CategoryService } from '../service/category.service';
import { Public } from '../../../common/decorators/public.decorator';
import { AdminGuard } from '../../../common/guards/admin.guard';
import { CreateCategoryDto } from '../dto/create-category.dto';
import { UpdateCategoryDto } from '../dto/update-category.dto';
import { FileInterceptor } from '@nestjs/platform-express';

/**
 * Controller quản lý danh mục sản phẩm (Category)
 */
@Controller('categories')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) { }

  /**
   * Lấy danh sách category cho admin (có phân trang và tìm kiếm)
   * @param page Trang hiện tại
   * @param limit Số lượng item trên mỗi trang
   * @param key Từ khóa tìm kiếm
   */
  @UseGuards(AdminGuard)
  @Get('categories-admin')
  async getCategoriesAdmin(
    @Query('page') page: number,
    @Query('limit') limit: number,
    @Query('key') key?: string,
  ): Promise<any> {
    return await this.categoryService.getCategoriesAdmin(page, limit, key);
  }

  /**
   * Lấy tất cả category (public API, thường dùng cho menu/sidebar phía client)
   */
  @Public()
  @Get()
  async getAllCategories() {
    return this.categoryService.findAll();
  }

  /**
   * Lấy các category gốc (Category cha - cấp 1)
   */
  @Public()
  @Get('root')
  async getRootCategories() {
    return this.categoryService.findRootCategories();
  }

  /**
   * Kiểm tra slug có tồn tại không (dùng khi nhập liệu để validate unique slug)
   * @param slug Slug cần kiểm tra
   * @param excludeId ID cần loại trừ (dùng khi update)
   */
  @UseGuards(AdminGuard)
  @Get('check-slug')
  async checkSlug(
    @Query('slug') slug: string,
    @Query('excludeId') excludeId?: string,
  ) {
    const exists = await this.categoryService.checkSlugExists(slug, excludeId);
    return { exists };
  }

  /**
   * Lấy chi tiết category theo ID
   * @param id ID của category
   */
  @Public()
  @Get(':id')
  async getCategoryById(@Param('id') id: string) {
    return this.categoryService.findById(id);
  }

  /**
   * Lấy các category con của một category cha
   * @param id ID của category cha
   */
  @Public()
  @Get(':id/children')
  async getCategoryChildren(@Param('id') id: string) {
    return this.categoryService.findChildren(id);
  }

  /**
   * Lấy chi tiết category theo slug (dùng cho routing phía client)
   * @param slug Slug của category
   */
  @Public()
  @Get('slug/:slug')
  async getCategoryBySlug(@Param('slug') slug: string) {
    return this.categoryService.findBySlug(slug);
  }

  /**
   * Tạo mới category (chỉ Admin)
   * @param createCategoryDto Dữ liệu tạo mới
   * @param file File ảnh (nếu có)
   */
  @Post()
  @UseGuards(AdminGuard)
  @UseInterceptors(FileInterceptor('image'))
  async createCategory(
    @Body() createCategoryDto: CreateCategoryDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.categoryService.create(createCategoryDto, file);
  }

  /**
   * Cập nhật category (chỉ Admin)
   * @param id ID category cần update
   * @param updateCategoryDto Dữ liệu cập nhật
   * @param file File ảnh mới (nếu có)
   */
  @Put(':id')
  @UseGuards(AdminGuard)
  @UseInterceptors(FileInterceptor('image'))
  async updateCategory(
    @Param('id') id: string,
    @Body() updateCategoryDto: UpdateCategoryDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.categoryService.update(id, updateCategoryDto, file);
  }

  /**
   * Xóa category (Soft delete - chỉ Admin)
   * @param id ID category cần xóa
   */
  @Delete(':id')
  @UseGuards(AdminGuard)
  async deleteCategory(@Param('id') id: string) {
    return this.categoryService.delete(id);
  }

  /**
   * Đếm số sản phẩm trong category
   * @param id ID category
   */
  @Get(':id/product-count')
  @UseGuards(AdminGuard)
  async getProductCount(@Param('id') id: string) {
    return this.categoryService.getProductCount(id);
  }

  /**
   * Xóa category và tất cả các sản phẩm bên trong (Soft delete - chỉ Admin)
   * @param id ID category
   */
  @Delete(':id/with-products')
  @UseGuards(AdminGuard)
  async deleteCategoryWithProducts(@Param('id') id: string) {
    return this.categoryService.deleteWithProducts(id);
  }
}
