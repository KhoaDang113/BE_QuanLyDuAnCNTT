// ===================================================================
// UPDATE COMMENT DTO - ĐỐI TƯỢNG TRUYỀN DỮ LIỆU CẬP NHẬT BÌNH LUẬN
// ===================================================================
// File: update-comment.dto.ts
// Mô tả: DTO định nghĩa dữ liệu có thể cập nhật khi sửa bình luận
// Chỉ có thể sửa nội dung (content) của bình luận
// ===================================================================

import { IsString, IsOptional } from 'class-validator';

export class UpdateCommentDto {
  // ===================================================================
  // CONTENT - NỘI DUNG BÌNH LUẬN MỚI (TÙY CHỌN)
  // ===================================================================
  // Validator: nếu có, phải là string
  // Không bắt buộc vì đây là API cập nhật
  @IsString()
  @IsOptional()
  content?: string;
}
