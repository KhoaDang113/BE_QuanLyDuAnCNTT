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

@Controller('comments')
export class CommentController {
  constructor(private readonly commentService: CommentService) {}

  @Public()
  @Get('product')
  async getCommentsByProduct(@Query() dto: GetCommentsDto) {
    return this.commentService.getCommentsByProduct(dto);
  }

  @Get('my-comments')
  async getMyComments(
    @Req() req: Request,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    const userId = req.user?.id as string;
    if (!userId) {
      throw new UnauthorizedException('User not found');
    }
    return this.commentService.getCommentsByUser(userId, page, limit);
  }

  @Public()
  @Get(':id')
  async getCommentById(@Param('id') id: string) {
    return this.commentService.getCommentById(id);
  }

  @Public()
  @Get(':id/replies')
  async getReplies(
    @Param('id') id: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.commentService.getReplies(id, page, limit);
  }

  @Post()
  async createComment(@Req() req: Request, @Body() dto: CreateCommentDto) {
    const userId = req.user?.id as string;
    if (!userId) {
      throw new UnauthorizedException('User not found');
    }
    return this.commentService.createComment(userId, dto);
  }

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

  @Delete(':id')
  async deleteComment(@Param('id') id: string, @Req() req: Request) {
    const userId = req.user?.id as string;
    if (!userId) {
      throw new UnauthorizedException('User not found');
    }
    return this.commentService.deleteComment(id, userId, false);
  }

  @UseGuards(AdminGuard)
  @Delete('admin/:id')
  async adminDeleteComment(@Param('id') id: string, @Req() req: Request) {
    const userId = req.user?.id as string;
    if (!userId) {
      throw new UnauthorizedException('User not found');
    }
    return this.commentService.deleteComment(id, userId, true);
  }

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


  @UseGuards(AdminGuard)
  @Get('admin/by-product')
  async getCommentsByProductAdmin() {
    return this.commentService.getCommentsByProductAdmin();
  }


  @UseGuards(AdminGuard)
  @Get('admin/products-by-category/:categorySlug')
  async getProductsWithCommentsByCategory(
    @Param('categorySlug') categorySlug: string,
  ) {
    return this.commentService.getProductsWithCommentsByCategory(categorySlug);
  }


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
