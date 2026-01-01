/**
 * =====================================================================================
 * FILE: category.controller.ts
 * =====================================================================================
 * 
 * MÔ TẢ:
 * Controller xử lý tất cả các HTTP requests liên quan đến quản lý danh mục sản phẩm (Category).
 * Controller này là cầu nối giữa Client (Frontend) và Service layer (Business Logic).
 * 
 * CHỨC NĂNG CHÍNH:
 * - Cung cấp các API endpoints cho việc CRUD (Create, Read, Update, Delete) danh mục
 * - Phân quyền truy cập: Public (khách) và Admin (quản trị viên)
 * - Hỗ trợ upload ảnh danh mục lên Cloudinary
 * - Hỗ trợ phân trang và tìm kiếm cho trang quản trị
 * 
 * BASE URL: /categories
 * 
 * DECORATORS SỬ DỤNG:
 * - @Controller('categories'): Định nghĩa prefix URL cho tất cả routes trong controller
 * - @UseGuards(AdminGuard): Bảo vệ route chỉ cho Admin truy cập
 * - @Public(): Cho phép truy cập không cần xác thực (public API)
 * - @UseInterceptors(FileInterceptor): Xử lý upload file từ form-data
 * 
 * =====================================================================================
 */

// =====================================================================================
// IMPORT CÁC MODULES TỪ NESTJS
// =====================================================================================
import {
  Controller,       // Decorator đánh dấu class là một Controller
  Get,              // Decorator cho HTTP GET request
  Post,             // Decorator cho HTTP POST request
  Put,              // Decorator cho HTTP PUT request
  Delete,           // Decorator cho HTTP DELETE request
  Body,             // Decorator để lấy request body
  Param,            // Decorator để lấy route parameters (vd: :id)
  Query,            // Decorator để lấy query string parameters
  UseGuards,        // Decorator để áp dụng Guards (bảo vệ route)
  UseInterceptors,  // Decorator để áp dụng Interceptors (xử lý request/response)
  UploadedFile,     // Decorator để lấy file đã upload
} from '@nestjs/common';

// =====================================================================================
// IMPORT CÁC SERVICES VÀ MODULES NỘI BỘ
// =====================================================================================
import { CategoryService } from '../service/category.service';           // Service xử lý logic nghiệp vụ
import { Public } from '../../../common/decorators/public.decorator';    // Custom decorator cho public routes
import { AdminGuard } from '../../../common/guards/admin.guard';         // Guard kiểm tra quyền Admin
import { CreateCategoryDto } from '../dto/create-category.dto';          // DTO validate dữ liệu tạo mới
import { UpdateCategoryDto } from '../dto/update-category.dto';          // DTO validate dữ liệu cập nhật
import { FileInterceptor } from '@nestjs/platform-express';              // Interceptor xử lý upload file

// =====================================================================================
// CATEGORY CONTROLLER CLASS
// =====================================================================================
/**
 * CategoryController - Controller quản lý danh mục sản phẩm
 * 
 * Controller này cung cấp các API endpoints:
 * 
 * PUBLIC APIs (không cần đăng nhập):
 * - GET /categories                    : Lấy tất cả danh mục (kèm sub-categories)
 * - GET /categories/root               : Lấy các danh mục gốc (cấp 1)
 * - GET /categories/:id                : Lấy chi tiết danh mục theo ID
 * - GET /categories/:id/children       : Lấy các danh mục con của một danh mục
 * - GET /categories/slug/:slug         : Lấy danh mục theo slug URL
 * 
 * ADMIN APIs (cần quyền Admin):
 * - GET /categories/categories-admin   : Lấy danh sách có phân trang cho admin
 * - GET /categories/check-slug         : Kiểm tra slug có tồn tại không
 * - POST /categories                   : Tạo danh mục mới
 * - PUT /categories/:id                : Cập nhật danh mục
 * - DELETE /categories/:id             : Xóa danh mục (soft delete)
 * - GET /categories/:id/product-count  : Đếm số sản phẩm trong danh mục
 * - DELETE /categories/:id/with-products: Xóa danh mục kèm sản phẩm
 */
@Controller('categories')
export class CategoryController {
  /**
   * Constructor - Dependency Injection
   * 
   * NestJS tự động inject CategoryService vào controller thông qua constructor.
   * Đây là pattern Dependency Injection giúp:
   * - Tách biệt concerns (controller không cần biết cách service hoạt động)
   * - Dễ dàng testing (có thể mock service khi test)
   * - Quản lý dependencies tập trung
   * 
   * @param categoryService - Service chứa business logic xử lý danh mục
   */
  constructor(private readonly categoryService: CategoryService) { }

  // ===================================================================================
  // API CHO ADMIN - CÓ PHÂN TRANG VÀ TÌM KIẾM
  // ===================================================================================
  /**
   * GET /categories/categories-admin
   * 
   * MÔ TẢ:
   * Lấy danh sách danh mục cho trang quản trị admin với hỗ trợ:
   * - Phân trang (pagination)
   * - Tìm kiếm theo từ khóa (text search)
   * 
   * BẢO MẬT:
   * - Yêu cầu quyền Admin (AdminGuard)
   * - Token JWT phải chứa role = 'admin'
   * 
   * QUERY PARAMETERS:
   * @param page - Số trang hiện tại (bắt đầu từ 1)
   * @param limit - Số lượng item trên mỗi trang (vd: 10, 20, 50)
   * @param key - (Optional) Từ khóa tìm kiếm trong name và description
   * 
   * RESPONSE:
   * {
   *   total: number,        // Tổng số danh mục thỏa điều kiện
   *   page: number,         // Trang hiện tại
   *   limit: number,        // Số item/trang
   *   categories: Category[] // Mảng danh mục
   * }
   * 
   * VÍ DỤ:
   * GET /categories/categories-admin?page=1&limit=10&key=điện thoại
   */
  @UseGuards(AdminGuard)  // Chỉ Admin mới được truy cập
  @Get('categories-admin')
  async getCategoriesAdmin(
    @Query('page') page: number,
    @Query('limit') limit: number,
    @Query('key') key?: string,
  ): Promise<any> {
    return await this.categoryService.getCategoriesAdmin(page, limit, key);
  }

  // ===================================================================================
  // PUBLIC APIs - KHÔNG CẦN ĐĂNG NHẬP
  // ===================================================================================
  /**
   * GET /categories
   * 
   * MÔ TẢ:
   * Lấy tất cả danh mục đang hoạt động (is_active = true).
   * Kết quả trả về là danh sách danh mục cha kèm theo các danh mục con (subCategories).
   * 
   * USE CASE:
   * - Hiển thị menu navigation trên website
   * - Hiển thị sidebar danh mục
   * - Dropdown chọn danh mục
   * 
   * BẢO MẬT:
   * - Public API (không cần đăng nhập)
   * - @Public() decorator bypass JWT authentication
   * 
   * RESPONSE:
   * [
   *   {
   *     _id: "...",
   *     name: "Điện thoại",
   *     slug: "dien-thoai",
   *     image: "...",
   *     subCategories: [
   *       { _id: "...", name: "iPhone", slug: "iphone", ... },
   *       { _id: "...", name: "Samsung", slug: "samsung", ... }
   *     ]
   *   }
   * ]
   */
  @Public()  // Cho phép truy cập không cần authentication
  @Get()
  async getAllCategories() {
    return this.categoryService.findAll();
  }

  /**
   * GET /categories/root
   * 
   * MÔ TẢ:
   * Lấy các danh mục gốc (danh mục cấp 1 - không có parent_id).
   * 
   * USE CASE:
   * - Dropdown chọn danh mục cha khi tạo danh mục con
   * - Hiển thị danh mục chính trên trang chủ
   * 
   * ĐIỀU KIỆN LỌC:
   * - parent_id = null HOẶC parent_id không tồn tại
   * - is_deleted = false (chưa bị xóa)
   * 
   * RESPONSE: Category[] - Mảng các danh mục gốc
   */
  @Public()
  @Get('root')
  async getRootCategories() {
    return this.categoryService.findRootCategories();
  }

  /**
   * GET /categories/check-slug
   * 
   * MÔ TẢ:
   * Kiểm tra xem một slug đã tồn tại trong database chưa.
   * Dùng để validate unique slug trước khi tạo/cập nhật danh mục.
   * 
   * USE CASE:
   * - Validate real-time khi admin nhập slug
   * - Hiển thị lỗi nếu slug đã tồn tại
   * 
   * BẢO MẬT:
   * - Yêu cầu quyền Admin
   * 
   * QUERY PARAMETERS:
   * @param slug - Slug cần kiểm tra (vd: "dien-thoai")
   * @param excludeId - (Optional) ID danh mục cần loại trừ (dùng khi update)
   * 
   * RESPONSE: { exists: boolean }
   * - exists = true: Slug đã tồn tại
   * - exists = false: Slug chưa tồn tại, có thể sử dụng
   * 
   * VÍ DỤ:
   * GET /categories/check-slug?slug=dien-thoai
   * GET /categories/check-slug?slug=dien-thoai&excludeId=64abc123...
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
   * GET /categories/:id
   * 
   * MÔ TẢ:
   * Lấy chi tiết một danh mục theo MongoDB ObjectId.
   * 
   * USE CASE:
   * - Xem chi tiết danh mục
   * - Load dữ liệu để edit danh mục
   * 
   * PATH PARAMETER:
   * @param id - MongoDB ObjectId của danh mục (24 ký tự hex)
   * 
   * RESPONSE:
   * - 200 OK: Trả về object Category với thông tin parent_id được populate
   * - 400 Bad Request: ID không hợp lệ
   * - 404 Not Found: Không tìm thấy danh mục
   * 
   * VÍ DỤ: GET /categories/64abc123def456789012abcd
   */
  @Public()
  @Get(':id')
  async getCategoryById(@Param('id') id: string) {
    return this.categoryService.findById(id);
  }

  /**
   * GET /categories/:id/children
   * 
   * MÔ TẢ:
   * Lấy tất cả các danh mục con (sub-categories) của một danh mục cha.
   * 
   * USE CASE:
   * - Hiển thị danh mục con khi click vào danh mục cha
   * - Lazy loading danh mục theo cấp
   * 
   * PATH PARAMETER:
   * @param id - ID của danh mục cha
   * 
   * RESPONSE: Category[] - Mảng các danh mục có parent_id = id
   */
  @Public()
  @Get(':id/children')
  async getCategoryChildren(@Param('id') id: string) {
    return this.categoryService.findChildren(id);
  }

  /**
   * GET /categories/slug/:slug
   * 
   * MÔ TẢ:
   * Lấy chi tiết danh mục theo slug URL thân thiện.
   * Slug là chuỗi không dấu, viết thường, dùng dấu gạch ngang.
   * 
   * USE CASE:
   * - SEO-friendly URL: /danh-muc/dien-thoai thay vì /danh-muc/64abc123...
   * - Routing phía frontend
   * 
   * PATH PARAMETER:
   * @param slug - Slug của danh mục (vd: "dien-thoai", "laptop-may-tinh")
   * 
   * VÍ DỤ: GET /categories/slug/dien-thoai
   */
  @Public()
  @Get('slug/:slug')
  async getCategoryBySlug(@Param('slug') slug: string) {
    return this.categoryService.findBySlug(slug);
  }

  // ===================================================================================
  // ADMIN APIs - TẠO MỚI DANH MỤC
  // ===================================================================================
  /**
   * POST /categories
   * 
   * MÔ TẢ:
   * Tạo một danh mục mới với hỗ trợ upload ảnh.
   * 
   * BẢO MẬT:
   * - Yêu cầu quyền Admin
   * 
   * DECORATORS:
   * - @UseInterceptors(FileInterceptor('image')): Xử lý file upload
   *   + 'image' là tên field trong form-data
   *   + File được lưu tạm trong memory trước khi upload lên Cloudinary
   * 
   * REQUEST BODY (CreateCategoryDto):
   * - name: string (required) - Tên danh mục
   * - slug: string (required) - Slug URL (unique)
   * - parent_id: string (optional) - ID danh mục cha
   * - image: string (optional) - URL ảnh hoặc file upload
   * - description: string (optional) - Mô tả
   * - is_active: boolean (optional) - Trạng thái, default: true
   * 
   * FILE UPLOAD:
   * - Chấp nhận: image/jpeg, image/png, image/gif, image/webp
   * - Upload lên Cloudinary folder: WebSieuThi/categories
   * 
   * RESPONSE:
   * - 201 Created: Trả về object Category vừa tạo
   * - 400 Bad Request: Dữ liệu không hợp lệ hoặc slug đã tồn tại
   * - 404 Not Found: Parent category không tồn tại
   * 
   * @param createCategoryDto - DTO chứa dữ liệu tạo mới (đã validate)
   * @param file - File ảnh upload (nếu có)
   */
  @Post()
  @UseGuards(AdminGuard)
  @UseInterceptors(FileInterceptor('image'))  // Xử lý field 'image' từ form-data
  async createCategory(
    @Body() createCategoryDto: CreateCategoryDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.categoryService.create(createCategoryDto, file);
  }

  // ===================================================================================
  // ADMIN APIs - CẬP NHẬT DANH MỤC
  // ===================================================================================
  /**
   * PUT /categories/:id
   * 
   * MÔ TẢ:
   * Cập nhật thông tin một danh mục đã tồn tại.
   * Chỉ cập nhật các field được gửi lên, các field không gửi giữ nguyên.
   * 
   * BẢO MẬT:
   * - Yêu cầu quyền Admin
   * 
   * VALIDATION:
   * - ID phải hợp lệ (MongoDB ObjectId)
   * - Không thể set parent_id bằng chính ID của category (tránh vòng lặp)
   * - Slug mới phải unique (trừ slug hiện tại của category này)
   * 
   * PATH PARAMETER:
   * @param id - ID của danh mục cần update
   * 
   * REQUEST BODY (UpdateCategoryDto):
   * - Tất cả các field đều optional
   * - Chỉ gửi các field cần thay đổi
   * 
   * FILE UPLOAD:
   * - Nếu có file mới, upload lên Cloudinary và cập nhật URL
   * - Nếu không có file, giữ nguyên ảnh cũ
   * 
   * @param updateCategoryDto - DTO chứa dữ liệu cập nhật
   * @param file - File ảnh mới (nếu có)
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

  // ===================================================================================
  // ADMIN APIs - XÓA DANH MỤC
  // ===================================================================================
  /**
   * DELETE /categories/:id
   * 
   * MÔ TẢ:
   * Xóa mềm (soft delete) một danh mục.
   * - Set is_deleted = true
   * - Set is_active = false
   * - Dữ liệu vẫn còn trong database, chỉ bị ẩn đi
   * 
   * RÀNG BUỘC:
   * - Không thể xóa danh mục có danh mục con (sub-categories)
   * - Phải xóa hoặc chuyển danh mục con trước
   * 
   * BẢO MẬT:
   * - Yêu cầu quyền Admin
   * 
   * PATH PARAMETER:
   * @param id - ID của danh mục cần xóa
   * 
   * RESPONSE:
   * - 200 OK: { message: "Category deleted successfully" }
   * - 400 Bad Request: Có danh mục con hoặc ID không hợp lệ
   * - 404 Not Found: Không tìm thấy danh mục
   */
  @Delete(':id')
  @UseGuards(AdminGuard)
  async deleteCategory(@Param('id') id: string) {
    return this.categoryService.delete(id);
  }

  /**
   * GET /categories/:id/product-count
   * 
   * MÔ TẢ:
   * Đếm số lượng sản phẩm thuộc một danh mục.
   * Dùng để hiển thị cảnh báo trước khi xóa danh mục.
   * 
   * USE CASE:
   * - Hiển thị: "Danh mục này có 15 sản phẩm. Bạn có chắc muốn xóa?"
   * 
   * PATH PARAMETER:
   * @param id - ID của danh mục
   * 
   * RESPONSE: { count: number }
   */
  @Get(':id/product-count')
  @UseGuards(AdminGuard)
  async getProductCount(@Param('id') id: string) {
    return this.categoryService.getProductCount(id);
  }

  /**
   * DELETE /categories/:id/with-products
   * 
   * MÔ TẢ:
   * Xóa mềm danh mục VÀ tất cả sản phẩm trong danh mục đó.
   * Đây là thao tác nguy hiểm, cần confirm kỹ trước khi thực hiện.
   * 
   * QUY TRÌNH:
   * 1. Kiểm tra có danh mục con không -> Nếu có thì reject
   * 2. Soft delete tất cả products có category_id = id
   * 3. Soft delete category
   * 
   * RÀNG BUỘC:
   * - Vẫn không thể xóa nếu có danh mục con
   * - Phải xử lý danh mục con trước
   * 
   * PATH PARAMETER:
   * @param id - ID của danh mục cần xóa
   * 
   * RESPONSE:
   * {
   *   message: "Xóa danh mục và sản phẩm thành công",
   *   deletedProductsCount: number  // Số sản phẩm đã xóa
   * }
   */
  @Delete(':id/with-products')
  @UseGuards(AdminGuard)
  async deleteCategoryWithProducts(@Param('id') id: string) {
    return this.categoryService.deleteWithProducts(id);
  }
}
