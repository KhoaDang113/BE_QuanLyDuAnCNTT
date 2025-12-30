import { IsString, IsOptional, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';
export class CreateComboDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  image: string;

  @IsString()
  description: string;

  @IsOptional()
  @IsString()
  type_combo_id?: string;


  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  is_active?: boolean;
}
