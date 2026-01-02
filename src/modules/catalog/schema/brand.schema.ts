// File: brand.schema.ts
// Mô tả: Định nghĩa schema (cấu trúc dữ liệu) cho collection Brand trong MongoDB
// Chức năng: Quản lý thông tin thương hiệu sản phẩm

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { IsOptional } from 'class-validator';

// Định nghĩa kiểu document cho Brand, kết hợp class Brand với Document của MongoDB
export type BrandDocument = Brand & Document;

// Decorator @Schema: Đánh dấu class này là một MongoDB schema
// timestamps: true - Tự động thêm createdAt và updatedAt
@Schema({ timestamps: true })
export class Brand {
  // Tên thương hiệu - bắt buộc
  @Prop({ required: true })
  name: string;

  // Slug (URL-friendly) của thương hiệu - bắt buộc
  // Dùng để tạo URL thân thiện, ví dụ: /brands/samsung
  @Prop({ required: true })
  slug: string;

  // Mô tả thương hiệu - không bắt buộc
  @Prop()
  @IsOptional()
  description?: string;

  // Đường dẫn hình ảnh/logo thương hiệu - bắt buộc
  @Prop({ required: true })
  image: string;

  // Trạng thái hoạt động - mặc định là true (đang hoạt động)
  // true: hiển thị trên trang web, false: ẩn khỏi trang web
  @Prop({ default: true })
  is_active: boolean;

  // Trạng thái xóa mềm - mặc định là false (chưa xóa)
  // true: đã bị xóa (soft delete), false: chưa xóa
  @Prop({ default: false })
  is_deleted: boolean;
}

// Tạo schema từ class Brand để sử dụng với Mongoose
export const BrandSchema = SchemaFactory.createForClass(Brand);
