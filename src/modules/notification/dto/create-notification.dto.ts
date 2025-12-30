import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsBoolean,
} from 'class-validator';
import { Types } from 'mongoose';

export class CreateNotificationDto {
  @IsString()
  @IsOptional()
  user_id?: Types.ObjectId;

  @IsString()
  @IsNotEmpty()
  actor_id: Types.ObjectId;

  @IsEnum(['comment_reply', 'order_update', 'product_review', 'system'])
  @IsNotEmpty()
  type: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  message: string;

  @IsString()
  @IsOptional()
  link?: string;

  @IsString()
  @IsOptional()
  reference_id?: string;

  @IsString()
  @IsOptional()
  reference_type?: string;

  @IsBoolean()
  @IsOptional()
  is_staff?: boolean;

  @IsBoolean()
  @IsOptional()
  is_notify?: boolean;

  @IsOptional()
  metadata?: Record<string, any>;
}
