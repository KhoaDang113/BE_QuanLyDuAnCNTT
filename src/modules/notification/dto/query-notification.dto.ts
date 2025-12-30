import { IsOptional, IsEnum, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';

export class QueryNotificationDto {
  @IsOptional()
  @Transform(({ value }) => Number(value))
  page?: number = 1;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  limit?: number = 20;

  @IsOptional()
  @IsEnum(['comment_reply', 'order_update', 'product_review', 'system'])
  type?: string;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  is_read?: boolean;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  unread_only?: boolean;
}
