import { IsString, IsOptional, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateCategoryDto {
  /**
   * Tên danh mục (Required)
   */
  @IsString()
  name: string;

  /**
   * Slug URL (Required)
   */
  @IsString()
  slug: string;

  /**
   * ID danh mục cha (Optional)
   */
  @IsOptional()
  @IsString()
  parent_id?: string;

  /**
   * URL ảnh (Optional)
   */
  @IsOptional()
  @IsString()
  image?: string;

  /**
   * Mô tả (Optional)
   */
  @IsOptional()
  @IsString()
  description?: string;

  /**
   * Trạng thái hoạt động (Optional)
   * Transform từ string sang boolean nếu gửi từ form-data
   */
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return value as boolean;
  })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
