import { IsEnum, IsNotEmpty, IsString } from 'class-validator';

export class CreatePaymentDto {
  @IsNotEmpty()
  @IsString()
  orderId: string;

  @IsNotEmpty()
  @IsEnum(['momo', 'vnpay'])
  payment_method: 'momo' | 'vnpay';
}
