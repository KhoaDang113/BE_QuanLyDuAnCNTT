import { IsOptional, IsString, IsBoolean, IsEnum } from 'class-validator';

export class UpdateUserByAdminDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  avatar?: string;

  @IsOptional()
  @IsEnum(['male', 'female', 'other'])
  gender?: string;

  @IsOptional()
  @IsEnum(['user','staff', 'shipper', 'admin'])
  role?: string;

  @IsOptional()
  @IsBoolean()
  isLocked?: boolean;
}
