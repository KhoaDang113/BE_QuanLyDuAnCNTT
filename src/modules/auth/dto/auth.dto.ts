import { IsEmail, IsString, IsNumber, IsNotEmpty } from 'class-validator';

export class RegisterPhoneDto {
  @IsString()
  phone: string;

  @IsString()
  name: string;
}

export class VerifyCodeDto {
  @IsString()
  userId: string;

  @IsNumber()
  code: number;
}

export class LoginEmailDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}
