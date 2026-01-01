import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type CategoryDocument = Category & Document;

@Schema({ timestamps: true })
export class Category {
  /**
   * ID danh mục cha (nếu có)
   * Nếu null hoặc không có thì là danh mục gốc (cấp 1)
   */
  @Prop({ type: Types.ObjectId, ref: 'Category' })
  parent_id?: Types.ObjectId;

  /**
   * Tên danh mục
   */
  @Prop({ required: true })
  name: string;

  /**
   * Slug URL thân thiện (duy nhất)
   * Vd: dien-thoai, laptop
   */
  @Prop({ required: true, unique: true })
  slug: string;

  /**
   * Đường dẫn ảnh đại diện
   */
  @Prop()
  image?: string;

  /**
   * Mô tả danh mục
   */
  @Prop()
  description?: string;

  /**
   * Trạng thái hoạt động
   * true: Đang hiển thị, false: Ẩn
   */
  @Prop({ default: true })
  is_active: boolean;

  /**
   * Đánh dấu đã xóa (Soft Delete)
   */
  @Prop({ default: false })
  is_deleted: boolean;
}

export const CategorySchema = SchemaFactory.createForClass(Category);

// Index text search cho name và description
CategorySchema.index({ name: 'text', description: 'text' });

CategorySchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (_: any, ret: Record<string, any>) => {
    ret.id = ret._id as Types.ObjectId;
    delete ret._id;
  },
});
