import {
  IsString,
  IsNotEmpty,
  IsNumber,
  Min,
  Max,
  IsArray,
  IsOptional,
  IsMongoId,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateRatingDto {
  @IsMongoId()
  @IsNotEmpty()
  product_id: string;

  @IsString()
  @IsNotEmpty()
  content: string;

  @Transform(({ value }) => Number(value))
  @IsNumber()
  @Min(1)
  @Max(5)
  @IsNotEmpty()
  rating: number;

  @IsArray()
  @IsOptional()
  images?: string[];
}
