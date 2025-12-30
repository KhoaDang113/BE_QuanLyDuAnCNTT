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

@Controller('categories')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @UseGuards(AdminGuard)
  @Get('categories-admin')
  async getCategoriesAdmin(
    @Query('page') page: number,
    @Query('limit') limit: number,
    @Query('key') key?: string,
  ): Promise<any> {
    return await this.categoryService.getCategoriesAdmin(page, limit, key);
  }

  @Public()
  @Get()
  async getAllCategories() {
    return this.categoryService.findAll();
  }

  @Public()
  @Get('root')
  async getRootCategories() {
    return this.categoryService.findRootCategories();
  }

  @UseGuards(AdminGuard)
  @Get('check-slug')
  async checkSlug(
    @Query('slug') slug: string,
    @Query('excludeId') excludeId?: string,
  ) {
    const exists = await this.categoryService.checkSlugExists(slug, excludeId);
    return { exists };
  }

  @Public()
  @Get(':id')
  async getCategoryById(@Param('id') id: string) {
    return this.categoryService.findById(id);
  }

  @Public()
  @Get(':id/children')
  async getCategoryChildren(@Param('id') id: string) {
    return this.categoryService.findChildren(id);
  }

  @Public()
  @Get('slug/:slug')
  async getCategoryBySlug(@Param('slug') slug: string) {
    return this.categoryService.findBySlug(slug);
  }

  @Post()
  @UseGuards(AdminGuard)
  @UseInterceptors(FileInterceptor('image'))
  async createCategory(
    @Body() createCategoryDto: CreateCategoryDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.categoryService.create(createCategoryDto, file);
  }

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

  @Delete(':id')
  @UseGuards(AdminGuard)
  async deleteCategory(@Param('id') id: string) {
    return this.categoryService.delete(id);
  }

  @Get(':id/product-count')
  @UseGuards(AdminGuard)
  async getProductCount(@Param('id') id: string) {
    return this.categoryService.getProductCount(id);
  }

  @Delete(':id/with-products')
  @UseGuards(AdminGuard)
  async deleteCategoryWithProducts(@Param('id') id: string) {
    return this.categoryService.deleteWithProducts(id);
  }
}
