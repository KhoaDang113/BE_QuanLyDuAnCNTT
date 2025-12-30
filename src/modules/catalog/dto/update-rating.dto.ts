import {
  IsString,
  IsNumber,
  Min,
  Max,
  IsArray,
  IsOptional,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateRatingDto {
  @IsString()
  @IsOptional()
  content?: string;

  @Transform(({ value }) => Number(value))
  @IsNumber()
  @Min(1)
  @Max(5)
  @IsOptional()
  rating?: number;

  @IsArray()
  @IsOptional()
  images?: string[];
}
