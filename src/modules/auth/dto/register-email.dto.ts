import { IsEmail, IsString, MinLength } from 'class-validator';

export class RegisterEmailDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  name: string;
}
