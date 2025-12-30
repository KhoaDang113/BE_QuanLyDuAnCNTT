import { IsString } from 'class-validator';

export class GetProductDetailDto {
  @IsString()
  id: string;
}
