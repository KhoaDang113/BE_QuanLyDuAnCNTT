import { IsBoolean, IsNotEmpty, IsOptional, IsString, IsNumber, Min, Max } from 'class-validator';

export class CreateAddressDto {
  @IsNotEmpty()
  @IsString()
  full_name: string;

  @IsNotEmpty()
  @IsString()
  phone: string;

  @IsNotEmpty()
  @IsString()
  address: string;

  @IsNotEmpty()
  @IsString()
  ward: string;

  @IsOptional()
  @IsString()
  district?: string;

  @IsNotEmpty()
  @IsString()
  city: string;

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
