import { IsOptional, IsNumber, Min, IsEnum, IsString } from 'class-validator';
import { Transform } from 'class-transformer';

export class GetUsersDto {
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

  @IsOptional()
  @IsEnum(['user','staff', 'shipper', 'admin'])
  role?: string;

  @IsOptional()
  @IsString()
  search?: string;
}
