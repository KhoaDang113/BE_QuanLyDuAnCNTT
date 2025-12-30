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

@Injectable()
export class CommentService {
  constructor(
    @InjectModel(Comment.name)
    private readonly commentModel: Model<CommentDocument>,
    private readonly notificationService: NotificationService,
    private readonly notificationRealtimeService: NotificationRealtimeService,
  ) {}

  async getCommentsByProduct(dto: GetCommentsDto) {
    const { product_id, parent_id, page = 1, limit = 10 } = dto;

    if (!product_id) {
      throw new BadRequestException('product_id is required');
    }

    if (!Types.ObjectId.isValid(product_id)) {
      throw new BadRequestException('product_id is invalid');
    }

    const skip = (page - 1) * limit;

    const query: Record<string, any> = {
      product_id: new Types.ObjectId(product_id),
      is_deleted: false,
    };

    if (!parent_id) {
      query.parent_id = null;
    } else {
      if (!Types.ObjectId.isValid(parent_id)) {
        throw new BadRequestException('parent_id is invalid');
      }
      query.parent_id = new Types.ObjectId(parent_id);
    }

    const [comments, total] = await Promise.all([
      this.commentModel
        .find(query)
        .populate('user_id', 'name avatar email role')
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

  async getCommentsByUser(userId: string, page = 1, limit = 10) {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('userId is invalid');
    }

    const skip = (page - 1) * limit;

    const [comments, total] = await Promise.all([
      this.commentModel
        .find({
          user_id: new Types.ObjectId(userId),
          is_deleted: false,
        })
        .populate('product_id', 'name slug image_primary')
        .populate({
          path: 'parent_id',
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

  async createComment(userId: string, dto: CreateCommentDto) {
    if (!Types.ObjectId.isValid(dto.product_id)) {
      throw new BadRequestException('product_id is invalid');
    }

    let parentComment;

    if (dto.parent_id) {
      if (!Types.ObjectId.isValid(dto.parent_id)) {
        throw new BadRequestException('parent_id is invalid');
      }

      parentComment = await this.commentModel
        .findOne({
          _id: new Types.ObjectId(dto.parent_id),
          is_deleted: false,
        })
        .populate('user_id', 'name avatar email role')
        .lean();

      if (!parentComment) {
        throw new NotFoundException('Parent comment not found');
      }
      if ((parentComment as CommentDocument).parent_id) {
        throw new BadRequestException(
          'Cannot reply to a reply. Maximum 2 levels allowed',
        );
      }
    }

    const comment = new this.commentModel({
      product_id: new Types.ObjectId(dto.product_id),
      user_id: new Types.ObjectId(userId),
      content: dto.content,
      parent_id: dto.parent_id ? new Types.ObjectId(dto.parent_id) : null,
    });

    await comment.save();

    if (dto.parent_id) {
      await this.commentModel.findByIdAndUpdate(dto.parent_id, {
        $push: { replies: comment._id },
        $inc: { reply_count: 1 },
      });
    }

    const createdComment = await this.commentModel
      .findById(comment._id)
      .populate('user_id', 'name avatar email role')
      .populate('product_id', 'name slug')
      .select(
        '_id product_id user_id content parent_id reply_count created_at updated_at',
      )
      .lean();

    // Tạo thông báo nếu đây là reply
    if (dto.parent_id && parentComment && createdComment) {
      // Lấy user_id từ parentComment
      const parentUser = (parentComment as CommentDocument)
        .user_id as unknown as {
        _id: Types.ObjectId;
        name: string;
        avatar?: string;
        role?: string;
      };

      const parentCommentUserId = parentUser._id.toString();

      // Không tạo thông báo nếu user reply chính comment của mình
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
        // Tạo thông báo trong database
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

        // Gửi thông báo realtime
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

  async updateComment(
    commentId: string,
    userId: string,
    dto: UpdateCommentDto,
  ) {
    if (!Types.ObjectId.isValid(commentId)) {
      throw new BadRequestException('commentId is invalid');
    }

    const comment = await this.commentModel.findOne({
      _id: new Types.ObjectId(commentId),
      is_deleted: false,
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    if (comment.user_id.toString() !== userId) {
      throw new ForbiddenException(
        'You are not allowed to update this comment',
      );
    }

    if (dto.content) {
      comment.content = dto.content;
    }

    await comment.save();

    return await this.commentModel
      .findById(comment._id)
      .populate('user_id', 'name avatar email role')
      .select(
        '_id product_id user_id content parent_id reply_count created_at updated_at',
      )
      .lean();
  }

  async deleteComment(commentId: string, userId: string, isAdmin = false) {
    if (!Types.ObjectId.isValid(commentId)) {
      throw new BadRequestException('commentId is invalid');
    }

    const comment = await this.commentModel.findOne({
      _id: new Types.ObjectId(commentId),
      is_deleted: false,
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    if (!isAdmin && comment.user_id.toString() !== userId) {
      throw new ForbiddenException(
        'You are not allowed to delete this comment',
      );
    }

    comment.is_deleted = true;
    await comment.save();

    if (comment.parent_id) {
      const parentComment = await this.commentModel.findById(comment.parent_id);
      if (parentComment) {
        parentComment.replies = parentComment.replies.filter(
          (id) => id.toString() !== commentId,
        );
        parentComment.reply_count = parentComment.replies.length;
        await parentComment.save();
      }
    }

    return {
      message: 'Comment deleted successfully',
    };
  }

  async getCommentById(commentId: string) {
    if (!Types.ObjectId.isValid(commentId)) {
      throw new BadRequestException('commentId is invalid');
    }

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

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    return comment;
  }

  async getReplies(commentId: string, page = 1, limit = 10) {
    if (!Types.ObjectId.isValid(commentId)) {
      throw new BadRequestException('commentId is invalid');
    }

    const skip = (page - 1) * limit;

    const [replies, total] = await Promise.all([
      this.commentModel
        .find({
          parent_id: new Types.ObjectId(commentId),
          is_deleted: false,
        })
        .populate('user_id', 'name avatar email role')
        .sort({ created_at: 1 })
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

  async getAllCommentsAdmin(page = 1, limit = 10, productId?: string, search?: string) {
    const skip = (page - 1) * limit;


    const query: Record<string, any> = {
      is_deleted: false,
      parent_id: null, 
    };


    if (productId && Types.ObjectId.isValid(productId)) {
      query.product_id = new Types.ObjectId(productId);
    }


    if (search) {
      query.content = { $regex: search, $options: 'i' };
    }


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


  async getCommentsByProductAdmin() {
    const productsWithComments = await this.commentModel.aggregate([
      {
        $match: {
          is_deleted: false,
          parent_id: null,
        },
      },
      {
        $group: {
          _id: '$product_id',
          commentCount: { $sum: 1 },
          latestComment: { $max: '$created_at' },
        },
      },
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
      {
        $sort: { latestComment: -1 },
      },
    ]);


    return {
      products: productsWithComments,
      total: productsWithComments.length,
    };
  }


  async adminReplyComment(commentId: string, userId: string, dto: CreateCommentDto) {
    if (!Types.ObjectId.isValid(commentId)) {
      throw new BadRequestException('commentId is invalid');
    }

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

    const replyDto: CreateCommentDto = {
      product_id: (parentComment.product_id as any)._id.toString(),
      content: dto.content,
      parent_id: commentId,
    };


    return this.createComment(userId, replyDto);
  }


  async getProductsWithCommentsByCategory(categorySlug: string) {
    const productsWithComments = await this.commentModel.aggregate([
      {
        $match: {
          is_deleted: false,
          parent_id: null,
        },
      },
      {
        $group: {
          _id: '$product_id',
          commentCount: { $sum: 1 },
          latestComment: { $max: '$created_at' },
        },
      },
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
      {
        $match: {
          'category.slug': categorySlug,
        },
      },
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
