import { IsBoolean, IsOptional, IsString, Min, Max, IsNumber } from 'class-validator';

export class UpdateAddressDto {
  @IsOptional()
  @IsString()
  full_name?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  ward?: string;

  @IsOptional()
  @IsString()
  district?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;


  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;


  @IsOptional()
  @IsString()
  zip_code?: string;

  @IsOptional()
  @IsBoolean()
  is_default?: boolean;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
