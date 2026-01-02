// ===================================================================
// COMMENT SERVICE - LOGIC XỬ LÝ BÌNH LUẬN SẢN PHẨM
// ===================================================================
// File: comment.service.ts
// Mô tả: Service chứa toàn bộ logic nghiệp vụ cho module bình luận
// Chức năng chính:
//   - CRUD bình luận (tạo, đọc, sửa, xóa)
//   - Hỗ trợ reply 2 cấp (bình luận cha - con)
//   - Tích hợp thông báo realtime khi có reply
//   - Admin: quản lý, thống kê bình luận
// ===================================================================

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Comment, CommentDocument } from './schema/comment.schema';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { GetCommentsDto } from './dto/get-comments.dto';
import { NotificationService } from '../notification/notification.service';
import { NotificationRealtimeService } from '../realtime/notification-realtime.service';

// ===================================================================
// COMMENT SERVICE CLASS
// ===================================================================
@Injectable()
export class CommentService {
  constructor(
    // Inject Comment Model từ Mongoose
    @InjectModel(Comment.name)
    private readonly commentModel: Model<CommentDocument>,
    // Service gửi thông báo (lưu vào database)
    private readonly notificationService: NotificationService,
    // Service gửi thông báo realtime (WebSocket)
    private readonly notificationRealtimeService: NotificationRealtimeService,
  ) { }

  // ===================================================================
  // LẤY DANH SÁCH BÌNH LUẬN THEO SẢN PHẨM
  // ===================================================================
  // Hỗ trợ phân trang và lọc theo parent_id
  // Nếu không có parent_id -> lấy bình luận gốc (cấp 1)
  // Nếu có parent_id -> lấy các reply của bình luận đó
  async getCommentsByProduct(dto: GetCommentsDto) {
    const { product_id, parent_id, page = 1, limit = 10 } = dto;

    // Validate: product_id là bắt buộc
    if (!product_id) {
      throw new BadRequestException('product_id is required');
    }

    // Validate: kiểm tra định dạng ObjectId hợp lệ
    if (!Types.ObjectId.isValid(product_id)) {
      throw new BadRequestException('product_id is invalid');
    }

    // Tính toán skip cho phân trang
    const skip = (page - 1) * limit;

    // Xây dựng query object
    const query: Record<string, any> = {
      product_id: new Types.ObjectId(product_id),
      is_deleted: false, // Chỉ lấy bình luận chưa bị xóa
    };

    // Nếu không có parent_id -> lấy bình luận gốc (parent_id = null)
    if (!parent_id) {
      query.parent_id = null;
    } else {
      // Validate parent_id nếu có
      if (!Types.ObjectId.isValid(parent_id)) {
        throw new BadRequestException('parent_id is invalid');
      }
      query.parent_id = new Types.ObjectId(parent_id);
    }

    // Thực hiện query song song: lấy data + đếm tổng
    const [comments, total] = await Promise.all([
      this.commentModel
        .find(query)
        .populate('user_id', 'name avatar email role') // Populate thông tin user
        .sort({ created_at: -1 }) // Sắp xếp mới nhất trước
        .skip(skip)
        .limit(limit)
        .select(
          '_id product_id user_id content parent_id reply_count created_at updated_at',
        )
        .lean(), // Chuyển về plain object để tối ưu performance
      this.commentModel.countDocuments(query),
    ]);

    // Trả về kết quả với thông tin phân trang
    return {
      comments,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ===================================================================
  // LẤY DANH SÁCH BÌNH LUẬN CỦA MỘT USER
  // ===================================================================
  // Dùng cho trang "Bình luận của tôi"
  async getCommentsByUser(userId: string, page = 1, limit = 10) {
    // Validate userId
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('userId is invalid');
    }

    const skip = (page - 1) * limit;

    // Query bình luận của user, populate thông tin sản phẩm và bình luận cha (nếu có)
    const [comments, total] = await Promise.all([
      this.commentModel
        .find({
          user_id: new Types.ObjectId(userId),
          is_deleted: false,
        })
        .populate('product_id', 'name slug image_primary') // Thông tin sản phẩm
        .populate({
          path: 'parent_id', // Nếu là reply, lấy thông tin bình luận cha
          select: 'content user_id',
          populate: {
            path: 'user_id',
            select: 'name avatar',
          },
        })
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit)
        .select(
          '_id product_id user_id content parent_id reply_count created_at',
        )
        .lean(),
      this.commentModel.countDocuments({
        user_id: new Types.ObjectId(userId),
        is_deleted: false,
      }),
    ]);

    return {
      comments,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ===================================================================
  // TẠO BÌNH LUẬN MỚI
  // ===================================================================
  // Hỗ trợ tạo bình luận gốc hoặc reply (tối đa 2 cấp)
  // Tự động gửi thông báo realtime khi có reply
  async createComment(userId: string, dto: CreateCommentDto) {
    // Validate product_id
    if (!Types.ObjectId.isValid(dto.product_id)) {
      throw new BadRequestException('product_id is invalid');
    }

    let parentComment;

    // Nếu là reply (có parent_id)
    if (dto.parent_id) {
      // Validate parent_id
      if (!Types.ObjectId.isValid(dto.parent_id)) {
        throw new BadRequestException('parent_id is invalid');
      }

      // Tìm bình luận cha
      parentComment = await this.commentModel
        .findOne({
          _id: new Types.ObjectId(dto.parent_id),
          is_deleted: false,
        })
        .populate('user_id', 'name avatar email role')
        .lean();

      // Kiểm tra bình luận cha có tồn tại không
      if (!parentComment) {
        throw new NotFoundException('Parent comment not found');
      }

      // Giới hạn 2 cấp: không cho phép reply vào reply
      if ((parentComment as CommentDocument).parent_id) {
        throw new BadRequestException(
          'Cannot reply to a reply. Maximum 2 levels allowed',
        );
      }
    }

    // Tạo document bình luận mới
    const comment = new this.commentModel({
      product_id: new Types.ObjectId(dto.product_id),
      user_id: new Types.ObjectId(userId),
      content: dto.content,
      parent_id: dto.parent_id ? new Types.ObjectId(dto.parent_id) : null,
    });

    // Lưu vào database
    await comment.save();

    // Nếu là reply, cập nhật thông tin cho bình luận cha
    if (dto.parent_id) {
      await this.commentModel.findByIdAndUpdate(dto.parent_id, {
        $push: { replies: comment._id }, // Thêm ID vào mảng replies
        $inc: { reply_count: 1 }, // Tăng reply_count lên 1
      });
    }

    // Lấy lại bình luận vừa tạo với đầy đủ thông tin
    const createdComment = await this.commentModel
      .findById(comment._id)
      .populate('user_id', 'name avatar email role')
      .populate('product_id', 'name slug')
      .select(
        '_id product_id user_id content parent_id reply_count created_at updated_at',
      )
      .lean();

    // ===================================================================
    // GỬI THÔNG BÁO REALTIME KHI CÓ REPLY
    // ===================================================================
    if (dto.parent_id && parentComment && createdComment) {
      // Lấy thông tin user từ bình luận cha
      const parentUser = (parentComment as CommentDocument)
        .user_id as unknown as {
          _id: Types.ObjectId;
          name: string;
          avatar?: string;
          role?: string;
        };

      const parentCommentUserId = parentUser._id.toString();

      // Không gửi thông báo nếu user tự reply comment của mình
      if (parentCommentUserId !== userId) {
        const actor = createdComment.user_id as unknown as {
          _id: string;
          name: string;
          avatar?: string;
          role?: string;
        };
        const product = createdComment.product_id as unknown as {
          _id: string;
          name: string;
          slug: string;
        };

        // Tạo thông báo trong database để lưu trữ
        const notification = await this.notificationService.createNotification({
          user_id: parentUser._id,
          actor_id: new Types.ObjectId(userId),
          type: 'comment_reply',
          title: 'Có người trả lời bình luận của bạn',
          message: `${actor.name} đã trả lời bình luận của bạn về sản phẩm "${product.name}"`,
          link: `/products-detail/${product._id.toString()}?comment=${dto.parent_id}`,
          reference_id: comment._id?.toString(),
          reference_type: 'comment',
          metadata: {
            comment_content: dto.content,
            product_id: product._id,
            product_name: product.name,
            parent_comment_id: dto.parent_id,
          },
          is_notify: false,
        });

        // Gửi thông báo realtime qua WebSocket
        this.notificationRealtimeService.notifyCommentReply(
          parentCommentUserId,
          {
            notificationId: (notification as unknown as { _id: string })._id,
            type: 'comment_reply',
            title: 'Có người trả lời bình luận của bạn',
            message: `${actor.name} đã trả lời: "${dto.content.substring(0, 50)}${dto.content.length > 50 ? '...' : ''}"`,
            link: `/products-detail/${product._id.toString()}?comment=${dto.parent_id}`,
            actor: {
              id: actor._id,
              name: actor.name,
              avatar: actor.avatar,
            },
            timestamp: new Date(),
            metadata: {
              product_name: product.name,
            },
          },
        );
      }
    }

    return createdComment;
  }

  // ===================================================================
  // CẬP NHẬT BÌNH LUẬN
  // ===================================================================
  // Chỉ cho phép người tạo bình luận được sửa
  async updateComment(
    commentId: string,
    userId: string,
    dto: UpdateCommentDto,
  ) {
    // Validate commentId
    if (!Types.ObjectId.isValid(commentId)) {
      throw new BadRequestException('commentId is invalid');
    }

    // Tìm bình luận theo ID
    const comment = await this.commentModel.findOne({
      _id: new Types.ObjectId(commentId),
      is_deleted: false,
    });

    // Kiểm tra bình luận có tồn tại không
    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    // Kiểm tra quyền sở hữu: chỉ người tạo mới được sửa
    if (comment.user_id.toString() !== userId) {
      throw new ForbiddenException(
        'You are not allowed to update this comment',
      );
    }

    // Cập nhật nội dung nếu có
    if (dto.content) {
      comment.content = dto.content;
    }

    // Lưu thay đổi
    await comment.save();

    // Trả về bình luận đã cập nhật với đầy đủ thông tin
    return await this.commentModel
      .findById(comment._id)
      .populate('user_id', 'name avatar email role')
      .select(
        '_id product_id user_id content parent_id reply_count created_at updated_at',
      )
      .lean();
  }

  // ===================================================================
  // XÓA BÌNH LUẬN (SOFT DELETE)
  // ===================================================================
  // Soft delete: chỉ đánh dấu is_deleted = true
  // Admin có thể xóa bất kỳ bình luận nào
  // User thường chỉ xóa được bình luận của mình
  async deleteComment(commentId: string, userId: string, isAdmin = false) {
    // Validate commentId
    if (!Types.ObjectId.isValid(commentId)) {
      throw new BadRequestException('commentId is invalid');
    }

    // Tìm bình luận theo ID
    const comment = await this.commentModel.findOne({
      _id: new Types.ObjectId(commentId),
      is_deleted: false,
    });

    // Kiểm tra bình luận có tồn tại không
    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    // Kiểm tra quyền xóa (nếu không phải admin)
    if (!isAdmin && comment.user_id.toString() !== userId) {
      throw new ForbiddenException(
        'You are not allowed to delete this comment',
      );
    }

    // Soft delete: đánh dấu is_deleted = true
    comment.is_deleted = true;
    await comment.save();

    // Nếu bình luận bị xóa là reply, cập nhật lại bình luận cha
    if (comment.parent_id) {
      const parentComment = await this.commentModel.findById(comment.parent_id);
      if (parentComment) {
        // Xóa ID khỏi mảng replies của bình luận cha
        parentComment.replies = parentComment.replies.filter(
          (id) => id.toString() !== commentId,
        );
        // Cập nhật lại reply_count
        parentComment.reply_count = parentComment.replies.length;
        await parentComment.save();
      }
    }

    return {
      message: 'Comment deleted successfully',
    };
  }

  // ===================================================================
  // LẤY CHI TIẾT BÌNH LUẬN THEO ID
  // ===================================================================
  async getCommentById(commentId: string) {
    // Validate commentId
    if (!Types.ObjectId.isValid(commentId)) {
      throw new BadRequestException('commentId is invalid');
    }

    // Query bình luận với đầy đủ thông tin populate
    const comment = await this.commentModel
      .findOne({
        _id: new Types.ObjectId(commentId),
        is_deleted: false,
      })
      .populate('user_id', 'name avatar email role')
      .populate('product_id', 'name slug image_primary')
      .populate({
        path: 'parent_id',
        select: 'content user_id',
        populate: {
          path: 'user_id',
          select: 'name avatar',
        },
      })
      .select(
        '_id product_id user_id content parent_id reply_count created_at updated_at',
      )
      .lean();

    // Kiểm tra bình luận có tồn tại không
    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    return comment;
  }

  // ===================================================================
  // LẤY DANH SÁCH REPLY CỦA BÌNH LUẬN
  // ===================================================================
  // Dùng để load thêm reply khi user click "Xem thêm phản hồi"
  async getReplies(commentId: string, page = 1, limit = 10) {
    // Validate commentId
    if (!Types.ObjectId.isValid(commentId)) {
      throw new BadRequestException('commentId is invalid');
    }

    const skip = (page - 1) * limit;

    // Query các reply của bình luận cha
    const [replies, total] = await Promise.all([
      this.commentModel
        .find({
          parent_id: new Types.ObjectId(commentId),
          is_deleted: false,
        })
        .populate('user_id', 'name avatar email role')
        .sort({ created_at: 1 }) // Sắp xếp theo thời gian tạo (cũ nhất trước)
        .skip(skip)
        .limit(limit)
        .select(
          '_id product_id user_id content parent_id reply_count created_at updated_at',
        )
        .lean(),
      this.commentModel.countDocuments({
        parent_id: new Types.ObjectId(commentId),
        is_deleted: false,
      }),
    ]);

    return {
      comments: replies,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ===================================================================
  // LẤY TẤT CẢ BÌNH LUẬN (ADMIN)
  // ===================================================================
  // Hỗ trợ lọc theo product_id và tìm kiếm theo content
  async getAllCommentsAdmin(page = 1, limit = 10, productId?: string, search?: string) {
    const skip = (page - 1) * limit;

    // Chỉ lấy bình luận gốc (không phải reply)
    const query: Record<string, any> = {
      is_deleted: false,
      parent_id: null,
    };

    // Lọc theo product_id nếu có
    if (productId && Types.ObjectId.isValid(productId)) {
      query.product_id = new Types.ObjectId(productId);
    }

    // Tìm kiếm theo nội dung (case insensitive)
    if (search) {
      query.content = { $regex: search, $options: 'i' };
    }

    // Thực hiện query
    const [comments, total] = await Promise.all([
      this.commentModel
        .find(query)
        .populate('user_id', 'name avatar email role')
        .populate('product_id', 'name slug image_primary')
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit)
        .select(
          '_id product_id user_id content parent_id reply_count created_at updated_at',
        )
        .lean(),
      this.commentModel.countDocuments(query),
    ]);


    return {
      comments,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }


  // ===================================================================
  // LẤY BÌNH LUẬN NHÓM THEO SẢN PHẨM (ADMIN)
  // ===================================================================
  // Sử dụng aggregation để nhóm bình luận theo sản phẩm
  // Trả về danh sách sản phẩm kèm số lượng bình luận
  async getCommentsByProductAdmin() {
    const productsWithComments = await this.commentModel.aggregate([
      // Bước 1: Lọc bình luận gốc chưa bị xóa
      {
        $match: {
          is_deleted: false,
          parent_id: null,
        },
      },
      // Bước 2: Nhóm theo product_id và tính toán thống kê
      {
        $group: {
          _id: '$product_id',
          commentCount: { $sum: 1 }, // Đếm số bình luận
          latestComment: { $max: '$created_at' }, // Lấy thời gian bình luận mới nhất
        },
      },
      // Bước 3: Join với collection products
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'product',
        },
      },
      // Bước 4: Giải nén mảng product
      {
        $unwind: '$product',
      },
      // Bước 5: Chọn các field cần thiết
      {
        $project: {
          _id: 1,
          commentCount: 1,
          latestComment: 1,
          'product._id': 1,
          'product.name': 1,
          'product.slug': 1,
          'product.image_primary': 1,
        },
      },
      // Bước 6: Sắp xếp theo thời gian bình luận mới nhất
      {
        $sort: { latestComment: -1 },
      },
    ]);


    return {
      products: productsWithComments,
      total: productsWithComments.length,
    };
  }


  // ===================================================================
  // ADMIN TRẢ LỜI BÌNH LUẬN
  // ===================================================================
  // Tự động tạo reply với product_id lấy từ bình luận gốc
  async adminReplyComment(commentId: string, userId: string, dto: CreateCommentDto) {
    // Validate commentId
    if (!Types.ObjectId.isValid(commentId)) {
      throw new BadRequestException('commentId is invalid');
    }

    // Tìm bình luận cần reply
    const parentComment = await this.commentModel
      .findOne({
        _id: new Types.ObjectId(commentId),
        is_deleted: false,
      })
      .populate('user_id', 'name avatar email role')
      .populate('product_id', 'name slug')
      .lean();

    if (!parentComment) {
      throw new NotFoundException('Comment not found');
    }

    // Tạo DTO cho reply với product_id từ bình luận cha
    const replyDto: CreateCommentDto = {
      product_id: (parentComment.product_id as any)._id.toString(),
      content: dto.content,
      parent_id: commentId,
    };

    // Sử dụng lại hàm createComment để tạo reply
    return this.createComment(userId, replyDto);
  }


  // ===================================================================
  // LẤY SẢN PHẨM CÓ BÌNH LUẬN THEO DANH MỤC (ADMIN)
  // ===================================================================
  // Lọc danh sách sản phẩm có bình luận theo slug danh mục
  async getProductsWithCommentsByCategory(categorySlug: string) {
    const productsWithComments = await this.commentModel.aggregate([
      // Bước 1: Lọc bình luận gốc chưa bị xóa
      {
        $match: {
          is_deleted: false,
          parent_id: null,
        },
      },
      // Bước 2: Nhóm theo product_id
      {
        $group: {
          _id: '$product_id',
          commentCount: { $sum: 1 },
          latestComment: { $max: '$created_at' },
        },
      },
      // Bước 3: Join với collection products
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'product',
        },
      },
      {
        $unwind: '$product',
      },
      // Bước 4: Join với collection categories để lọc theo slug
      {
        $lookup: {
          from: 'categories',
          localField: 'product.category_id',
          foreignField: '_id',
          as: 'category',
        },
      },
      {
        $unwind: '$category',
      },
      // Bước 5: Lọc theo category slug
      {
        $match: {
          'category.slug': categorySlug,
        },
      },
      // Bước 6: Chọn các field cần thiết
      {
        $project: {
          _id: 1,
          commentCount: 1,
          latestComment: 1,
          'product._id': 1,
          'product.name': 1,
          'product.slug': 1,
          'product.image_primary': 1,
        },
      },
      // Bước 7: Sắp xếp theo thời gian mới nhất
      {
        $sort: { latestComment: -1 },
      },
    ]);


    return {
      products: productsWithComments,
      total: productsWithComments.length,
    };
  }

}
