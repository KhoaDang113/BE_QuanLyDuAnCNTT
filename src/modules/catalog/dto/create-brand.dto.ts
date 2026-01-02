// File: create-brand.dto.ts
// Mô tả: DTO (Data Transfer Object) dùng để validate dữ liệu khi tạo mới thương hiệu
// Chức năng: Định nghĩa cấu trúc và quy tắc validate cho dữ liệu tạo thương hiệu

import { IsString, IsOptional, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';

// DTO cho việc tạo mới thương hiệu
export class CreateBrandDto {
  // Tên thương hiệu - bắt buộc, phải là chuỗi
  @IsString()
  name: string;

  // Slug của thương hiệu - bắt buộc, phải là chuỗi
  // Dùng để tạo URL thân thiện
  @IsString()
  slug: string;

  // Mô tả thương hiệu - không bắt buộc
  @IsOptional()
  @IsString()
  description?: string;

  // Đường dẫn hình ảnh - không bắt buộc (có thể upload file)
  @IsOptional()
  @IsString()
  image?: string;

  // Trạng thái hoạt động - không bắt buộc, mặc định là true
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
