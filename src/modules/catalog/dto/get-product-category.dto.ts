import { IsString } from 'class-validator';

export class getProductByCategoryDto {
  @IsString()
  categoryId: string;
}
