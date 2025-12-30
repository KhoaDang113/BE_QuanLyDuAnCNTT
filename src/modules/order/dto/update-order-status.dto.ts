import { IsEnum, IsOptional, IsString } from 'class-validator';

export class UpdateOrderStatusDto {
  @IsEnum(['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'])
  status: string;

  @IsOptional()
  @IsString()
  cancel_reason?: string;
}
