import { IsBoolean, IsOptional, IsNumber, IsString } from 'class-validator';

export class SetOnlineStatusDto {
  @IsBoolean()
  is_online: boolean;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;

  @IsOptional()
  @IsString()
  address?: string;
}
