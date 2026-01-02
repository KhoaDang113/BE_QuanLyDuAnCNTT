// ===================================================================
// CREATE COMMENT DTO - ĐỐI TƯỢNG TRUYỀN DỮ LIỆU TẠO BÌNH LUẬN
// ===================================================================
// File: create-comment.dto.ts
// Mô tả: DTO định nghĩa dữ liệu cần thiết khi tạo bình luận mới
// Validation:
//   - product_id: bắt buộc, phải là MongoDB ObjectId hợp lệ
//   - content: bắt buộc, không được rỗng
//   - parent_id: tùy chọn (chỉ có khi tạo reply)
// ===================================================================

import { IsString, IsNotEmpty, IsMongoId, IsOptional } from 'class-validator';

export class CreateCommentDto {
  // ===================================================================
  // PRODUCT_ID - ID SẢN PHẨM ĐƯỢC BÌNH LUẬN
  // ===================================================================
  // Validator: là MongoDB ObjectId hợp lệ và không được rỗng
  @IsMongoId()
  @IsNotEmpty()
  product_id: string;

  // ===================================================================
  // CONTENT - NỘI DUNG BÌNH LUẬN
  // ===================================================================
  // Validator: là string và không được rỗng
  @IsString()
  @IsNotEmpty()
  content: string;

  // ===================================================================
  // PARENT_ID - ID BÌNH LUẬN CHA (TÙY CHỌN)
  // ===================================================================
  // Chỉ cần khi tạo reply cho một bình luận khác
  // Validator: nếu có, phải là MongoDB ObjectId hợp lệ
  @IsMongoId()
  @IsOptional()
  parent_id?: string;
}
