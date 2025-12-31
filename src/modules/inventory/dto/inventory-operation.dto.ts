import {
  IsNotEmpty,
  IsString,
  IsNumber,
  Min,
  IsOptional,
} from 'class-validator';
//Đây là DTO để thay đổi số lượng tồn kho
//đây class InventoryOperationDto
export class InventoryOperationDto {
  @IsNotEmpty()
  @IsString()
  product_id: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  quantity: number;

  @IsOptional()
  @IsString()
  note?: string;
}

export class AdjustInventoryDto {
  @IsNotEmpty()
  @IsString()
  product_id: string;

  @IsNotEmpty()
  @IsNumber()
  new_quantity: number;

  @IsOptional()
  @IsString()
  note?: string;
}
