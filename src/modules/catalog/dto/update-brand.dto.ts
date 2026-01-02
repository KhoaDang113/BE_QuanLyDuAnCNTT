// File: update-brand.dto.ts
// Mô tả: DTO (Data Transfer Object) dùng để validate dữ liệu khi cập nhật thương hiệu
// Chức năng: Định nghĩa cấu trúc và quy tắc validate cho dữ liệu cập nhật thương hiệu

import { IsString, IsOptional, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';

// DTO cho việc cập nhật thương hiệu
// Tất cả các trường đều optional vì chỉ cập nhật những trường được gửi lên
export class UpdateBrandDto {
  // Tên thương hiệu - không bắt buộc
  @IsOptional()
  @IsString()
  name?: string;

  // Slug của thương hiệu - không bắt buộc
  @IsOptional()
  @IsString()
  slug?: string;

  // Mô tả thương hiệu - không bắt buộc
  @IsOptional()
  @IsString()
  description?: string;

  // Đường dẫn hình ảnh - không bắt buộc
  @IsOptional()
  @IsString()
  image?: string;

  // Trạng thái hoạt động - không bắt buộc
  // Transform: Chuyển đổi chuỗi 'true'/'false' thành boolean
  // (do form-data gửi dưới dạng string)
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value as boolean;
  })
  @IsBoolean()
  is_active?: boolean;
}
