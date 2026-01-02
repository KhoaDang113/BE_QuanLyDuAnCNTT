// Import các decorator validation từ class-validator để kiểm tra dữ liệu đầu vào
import { IsString, IsNumber, IsOptional } from 'class-validator';
// Import Transform để chuyển đổi kiểu dữ liệu của các tham số
import { Transform } from 'class-transformer';

// DTO (Data Transfer Object) cho API tìm kiếm sản phẩm
// Định nghĩa các tham số query được phép khi gọi API GET /products/search
export class SearchProductsDto {
  // Từ khóa tìm kiếm (bắt buộc) - Dùng để tìm kiếm sản phẩm theo tên
  @IsString()
  key: string;

  // Số lượng sản phẩm bỏ qua (không bắt buộc) - Dùng cho phân trang
  // Transform chuyển đổi giá trị từ string sang number
  @IsOptional()
  @Transform(({ value }) => (value !== undefined ? Number(value) : undefined))
  @IsNumber()
  skip?: number;

  // Lọc theo danh mục (không bắt buộc) - Slug của danh mục cần lọc
  @IsOptional()
  @IsString()
  category?: string;

  // Lọc theo thương hiệu (không bắt buộc) - Slug của thương hiệu cần lọc
  @IsOptional()
  @IsString()
  brand?: string;

  // Thứ tự sắp xếp (không bắt buộc)
  // Có thể là: 'price-asc' (giá tăng), 'price-desc' (giá giảm), 'hot' (khuyến mãi), 'new' (mới nhất)
  @IsOptional()
  @IsString()
  sortOrder?: string;
}
