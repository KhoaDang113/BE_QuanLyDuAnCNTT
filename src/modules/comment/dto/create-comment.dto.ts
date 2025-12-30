import { IsString, IsNotEmpty, IsMongoId, IsOptional } from 'class-validator';

export class CreateCommentDto {
  @IsMongoId()
  @IsNotEmpty()
  product_id: string;

  @IsString()
  @IsNotEmpty()
  content: string;

  @IsMongoId()
  @IsOptional()
  parent_id?: string;
}
