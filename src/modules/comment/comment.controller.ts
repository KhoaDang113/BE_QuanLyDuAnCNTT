// ===================================================================
// COMMENT CONTROLLER - QUẢN LÝ BÌNH LUẬN SẢN PHẨM
// ===================================================================
// File: comment.controller.ts
// Mô tả: Controller xử lý các API endpoint liên quan đến bình luận sản phẩm
// Chức năng chính:
//   - Lấy danh sách bình luận theo sản phẩm
//   - Lấy bình luận của người dùng hiện tại
//   - Tạo, sửa, xóa bình luận
//   - Admin: quản lý và trả lời bình luận
// ===================================================================

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { CommentService } from './comment.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { GetCommentsDto } from './dto/get-comments.dto';
import { AdminGuard } from '../../common/guards/admin.guard';
import { Public } from '../../common/decorators/public.decorator';

// Controller quản lý bình luận - route prefix: /comments
@Controller('comments')
export class CommentController {
  // Inject CommentService để xử lý logic nghiệp vụ
  constructor(private readonly commentService: CommentService) { }

  // ===================================================================
  // API LẤY BÌNH LUẬN THEO SẢN PHẨM (PUBLIC)
  // ===================================================================
  // GET /comments/product?product_id=xxx&page=1&limit=10
  // Trả về danh sách bình luận của sản phẩm (không cần đăng nhập)
  @Public()
  @Get('product')
  async getCommentsByProduct(@Query() dto: GetCommentsDto) {
    return this.commentService.getCommentsByProduct(dto);
  }

  // ===================================================================
  // API LẤY BÌNH LUẬN CỦA NGƯỜI DÙNG HIỆN TẠI
  // ===================================================================
  // GET /comments/my-comments?page=1&limit=10
  // Trả về danh sách bình luận của chính người dùng đang đăng nhập
  @Get('my-comments')
  async getMyComments(
    @Req() req: Request,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    // Lấy userId từ token đã xác thực
    const userId = req.user?.id as string;
    // Nếu không có userId (chưa đăng nhập), trả về lỗi 401
    if (!userId) {
      throw new UnauthorizedException('User not found');
    }
    return this.commentService.getCommentsByUser(userId, page, limit);
  }

  // ===================================================================
  // API LẤY CHI TIẾT BÌNH LUẬN THEO ID (PUBLIC)
  // ===================================================================
  // GET /comments/:id
  // Trả về thông tin chi tiết của một bình luận theo ID
  @Public()
  @Get(':id')
  async getCommentById(@Param('id') id: string) {
    return this.commentService.getCommentById(id);
  }

  // ===================================================================
  // API LẤY DANH SÁCH PHẢN HỒI (REPLIES) CỦA BÌNH LUẬN
  // ===================================================================
  // GET /comments/:id/replies?page=1&limit=10
  // Trả về các phản hồi (reply) của một bình luận cha
  @Public()
  @Get(':id/replies')
  async getReplies(
    @Param('id') id: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.commentService.getReplies(id, page, limit);
  }

  // ===================================================================
  // API TẠO BÌNH LUẬN MỚI
  // ===================================================================
  // POST /comments
  // Body: { product_id, content, parent_id? }
  // Tạo bình luận mới hoặc phản hồi bình luận khác
  @Post()
  async createComment(@Req() req: Request, @Body() dto: CreateCommentDto) {
    // Lấy userId từ token xác thực
    const userId = req.user?.id as string;
    if (!userId) {
      throw new UnauthorizedException('User not found');
    }
    return this.commentService.createComment(userId, dto);
  }

  // ===================================================================
  // API CẬP NHẬT BÌNH LUẬN
  // ===================================================================
  // PUT /comments/:id
  // Body: { content }
  // Chỉ người tạo bình luận mới được phép sửa
  @Put(':id')
  async updateComment(
    @Param('id') id: string,
    @Req() req: Request,
    @Body() dto: UpdateCommentDto,
  ) {
    const userId = req.user?.id as string;
    if (!userId) {
      throw new UnauthorizedException('User not found');
    }
    return this.commentService.updateComment(id, userId, dto);
  }

  // ===================================================================
  // API XÓA BÌNH LUẬN (NGƯỜI DÙNG)
  // ===================================================================
  // DELETE /comments/:id
  // Soft delete - chỉ đánh dấu is_deleted = true
  // Chỉ người tạo mới được xóa bình luận của mình
  @Delete(':id')
  async deleteComment(@Param('id') id: string, @Req() req: Request) {
    const userId = req.user?.id as string;
    if (!userId) {
      throw new UnauthorizedException('User not found');
    }
    // isAdmin = false: phải kiểm tra quyền sở hữu
    return this.commentService.deleteComment(id, userId, false);
  }

  // ===================================================================
  // API XÓA BÌNH LUẬN (ADMIN)
  // ===================================================================
  // DELETE /comments/admin/:id
  // Admin có thể xóa bất kỳ bình luận nào
  @UseGuards(AdminGuard)
  @Delete('admin/:id')
  async adminDeleteComment(@Param('id') id: string, @Req() req: Request) {
    const userId = req.user?.id as string;
    if (!userId) {
      throw new UnauthorizedException('User not found');
    }
    // isAdmin = true: không cần kiểm tra quyền sở hữu
    return this.commentService.deleteComment(id, userId, true);
  }

  // ===================================================================
  // API LẤY TẤT CẢ BÌNH LUẬN (ADMIN)
  // ===================================================================
  // GET /comments/admin/all?page=1&limit=10&product_id=xxx&search=xxx
  // Lấy danh sách tất cả bình luận gốc (không phải reply) cho admin
  @UseGuards(AdminGuard)
  @Get('admin/all')
  async getAllCommentsAdmin(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('product_id') productId?: string,
    @Query('search') search?: string,
  ) {
    return this.commentService.getAllCommentsAdmin(page, limit, productId, search);
  }


  // ===================================================================
  // API LẤY BÌNH LUẬN NHÓM THEO SẢN PHẨM (ADMIN)
  // ===================================================================
  // GET /comments/admin/by-product
  // Trả về danh sách sản phẩm kèm số lượng bình luận
  @UseGuards(AdminGuard)
  @Get('admin/by-product')
  async getCommentsByProductAdmin() {
    return this.commentService.getCommentsByProductAdmin();
  }


  // ===================================================================
  // API LẤY SẢN PHẨM CÓ BÌNH LUẬN THEO DANH MỤC (ADMIN)
  // ===================================================================
  // GET /comments/admin/products-by-category/:categorySlug
  // Lọc sản phẩm có bình luận theo slug danh mục
  @UseGuards(AdminGuard)
  @Get('admin/products-by-category/:categorySlug')
  async getProductsWithCommentsByCategory(
    @Param('categorySlug') categorySlug: string,
  ) {
    return this.commentService.getProductsWithCommentsByCategory(categorySlug);
  }


  // ===================================================================
  // API ADMIN TRẢ LỜI BÌNH LUẬN
  // ===================================================================
  // POST /comments/admin/reply/:id
  // Admin trả lời một bình luận của khách hàng
  @UseGuards(AdminGuard)
  @Post('admin/reply/:id')
  async adminReplyComment(
    @Param('id') id: string,
    @Req() req: Request,
    @Body() dto: CreateCommentDto,
  ) {
    const userId = req.user?.id as string;
    if (!userId) {
      throw new UnauthorizedException('User not found');
    }
    return this.commentService.adminReplyComment(id, userId, dto);
  }
}
