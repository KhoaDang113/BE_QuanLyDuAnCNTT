import { IsOptional, IsMongoId, IsNumber, Min } from 'class-validator';
import { Transform } from 'class-transformer';

export class GetRatingsDto {
  @IsMongoId()
  @IsOptional()
  product_id?: string;

  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  @Min(1)
  @IsOptional()
  limit?: number = 10;
}

