import { IsString, IsNumber, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';

export class GetCategoryProductsDto {
  /**
   * Slug của category (Required)
   */
  @IsString()
  category: string;

  /**
   * Số lượng sản phẩm muốn bỏ qua (cho phân trang)
   * Default: 0
   */
  @IsOptional()
  @Transform(({ value }) => (value !== undefined ? Number(value) : undefined))
  @IsNumber()
  skip?: number;

  /**
   * Lọc theo Brand (Optional)
   */
  @IsOptional()
  @IsString()
  brand?: string;

  /**
   * Sắp xếp theo thứ tự (Optional)
   * Vd: price_asc, price_desc, new
   */
  @IsOptional()
  @IsString()
  sortOrder?: string;
}
