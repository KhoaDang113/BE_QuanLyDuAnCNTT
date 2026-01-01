import { IsString, IsOptional, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateCategoryDto {
  /**
   * Tên danh mục (Optional)
   */
  @IsOptional()
  @IsString()
  name?: string;

  /**
   * Slug URL (Optional)
   */
  @IsOptional()
  @IsString()
  slug?: string;

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
   */
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return value as boolean;
  })
  is_active?: boolean;
}
