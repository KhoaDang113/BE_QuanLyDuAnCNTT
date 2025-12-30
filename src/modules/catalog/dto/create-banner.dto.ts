import { Transform } from 'class-transformer';
import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class CreateBannerDto {
  @IsOptional()
  @IsString()
  image?: string;

  @IsString()
  link: string;

  @IsOptional()
  @IsString()
  category_id?: string;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value as boolean;
  })
  is_active?: boolean;
}
