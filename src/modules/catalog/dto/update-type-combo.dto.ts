import { CreateTypeComboDto } from './create-type-combo.dto';
import { IsString, IsOptional, IsBoolean, IsNumber } from 'class-validator';


export class UpdateTypeComboDto {
  @IsOptional()
  @IsString()
  name?: string;


  @IsOptional()
  @IsString()
  slug?: string;


  @IsOptional()
  @IsNumber()
  order_index?: number;


  @IsOptional()
  @IsString()
  description?: string;


  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
