import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type NotificationDocument = Notification & Document;

@Schema({ timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } })
export class Notification {
  _id: Types.ObjectId;

  // User nhận thông báo
  @Prop({ type: Types.ObjectId, ref: 'User', required: false, index: true })
  user_id?: Types.ObjectId;

  // User tạo hành động (người reply, staff, admin)
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  actor_id: Types.ObjectId;

  // Loại thông báo
  @Prop({
    type: String,
    enum: ['comment_reply', 'order_update', 'product_review', 'system'],
    required: true,
    index: true,
  })
  type: string;

  // Tiêu đề thông báo
  @Prop({ type: String, required: true })
  title: string;

  // Nội dung thông báo
  @Prop({ type: String, required: true })
  message: string;

  // Link đến resource liên quan
  @Prop({ type: String })
  link: string;

  // Reference đến resource (comment_id, order_id, etc.)
  @Prop({ type: Types.ObjectId })
  reference_id: Types.ObjectId;

  @Prop({ type: String })
  reference_type: string; // 'comment', 'order', 'product', etc.

  // Metadata bổ sung (có thể chứa thông tin thêm)
  @Prop({ type: Object })
  metadata: Record<string, any>;

  // Đã đọc chưa
  @Prop({ type: Boolean, default: false, index: true })
  is_read: boolean;

  // Đã ẩn chưa
  @Prop({ type: Boolean, default: false, index: true })
  is_hidden: boolean;

  // Đã xóa chưa
  @Prop({ type: Boolean, default: false, index: true })
  is_deleted: boolean;

  // Thời gian đọc
  @Prop({ type: Date })
  read_at: Date;

  // Là staff
  @Prop({ type: Boolean, default: false, required: false, index: true })
  is_staff?: boolean;

  @Prop({ type: Boolean, default: false, required: true })
  is_notify?: boolean;

  created_at: Date;
  updated_at: Date;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);

// Index để query nhanh
NotificationSchema.index({ user_id: 1, is_deleted: 1, created_at: -1 });
NotificationSchema.index({ user_id: 1, is_read: 1, is_deleted: 1 });
