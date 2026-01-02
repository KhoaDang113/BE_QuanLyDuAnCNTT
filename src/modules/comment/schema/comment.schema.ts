// ===================================================================
// COMMENT SCHEMA - ĐỊNH NGHĨA CẤU TRÚC DỮ LIỆU BÌNH LUẬN
// ===================================================================
// File: comment.schema.ts
// Mô tả: Schema Mongoose định nghĩa cấu trúc collection "comments"
// Đặc điểm:
//   - Hỗ trợ reply 2 cấp (parent_id tham chiếu đến bình luận cha)
//   - Soft delete (is_deleted flag)
//   - Tự động tạo created_at và updated_at
// ===================================================================

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

// Định nghĩa type cho document Comment
export type CommentDocument = Comment & Document;

// Schema với option timestamps tự động tạo created_at và updated_at
@Schema({ timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } })
export class Comment {
  // ID của document (tự động tạo bởi MongoDB)
  _id?: Types.ObjectId;

  // ===================================================================
  // PRODUCT_ID - ID SẢN PHẨM ĐƯỢC BÌNH LUẬN
  // ===================================================================
  // Reference đến collection "products"
  // Bắt buộc phải có khi tạo bình luận
  @Prop({ type: Types.ObjectId, ref: 'Product', required: true })
  product_id: Types.ObjectId;

  // ===================================================================
  // USER_ID - ID NGƯỜI DÙNG TẠO BÌNH LUẬN
  // ===================================================================
  // Reference đến collection "users"
  // Bắt buộc phải có khi tạo bình luận
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user_id: Types.ObjectId;

  // ===================================================================
  // CONTENT - NỘI DUNG BÌNH LUẬN
  // ===================================================================
  // Trim tự động loại bỏ khoảng trắng đầu/cuối
  @Prop({ required: true, trim: true })
  content: string;

  // ===================================================================
  // PARENT_ID - ID BÌNH LUẬN CHA (NẾU LÀ REPLY)
  // ===================================================================
  // Null nếu là bình luận gốc (cấp 1)
  // Reference đến bình luận cha nếu là reply (cấp 2)
  // Hệ thống giới hạn tối đa 2 cấp
  @Prop({ type: Types.ObjectId, ref: 'Comment', default: null })
  parent_id?: Types.ObjectId;

  // ===================================================================
  // REPLIES - MẢNG ID CÁC BÌNH LUẬN CON
  // ===================================================================
  // Lưu trữ danh sách ID các reply để tối ưu query
  @Prop({ type: [{ type: Types.ObjectId, ref: 'Comment' }], default: [] })
  replies: Types.ObjectId[];

  // ===================================================================
  // REPLY_COUNT - SỐ LƯỢNG REPLY
  // ===================================================================
  // Đếm nhanh số reply mà không cần query
  @Prop({ type: Number, default: 0 })
  reply_count: number;

  // ===================================================================
  // IS_DELETED - CỜ ĐÁNH DẤU ĐÃ XÓA (SOFT DELETE)
  // ===================================================================
  // true: bình luận đã bị xóa (không hiển thị)
  // false: bình luận bình thường
  @Prop({ type: Boolean, default: false })
  is_deleted: boolean;

  // Timestamps tự động tạo bởi Mongoose
  created_at?: Date; // Thời gian tạo
  updated_at?: Date; // Thời gian cập nhật cuối
}

// Tạo schema từ class Comment
export const CommentSchema = SchemaFactory.createForClass(Comment);

// ===================================================================
// INDEXES - TẠO INDEX ĐỂ TỐI ƯU QUERY
// ===================================================================
// Index cho query theo product_id, sắp xếp theo created_at giảm dần
CommentSchema.index({ product_id: 1, created_at: -1 });
// Index cho query theo user_id (lấy bình luận của user)
CommentSchema.index({ user_id: 1, created_at: -1 });
// Index cho query replies của một bình luận cha
CommentSchema.index({ parent_id: 1, created_at: -1 });
