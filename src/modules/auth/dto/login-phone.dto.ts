import { IsString } from 'class-validator';

export class LoginPhoneDto {
  @IsString()
  phone: string;
}
