import { IsString, IsOptional } from 'class-validator';

export class CreateMessageDto {
  @IsString()
  @IsOptional()
  text?: string;
}
