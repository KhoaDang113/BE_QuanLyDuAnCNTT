import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class ResetPasswordWithTokenDto {
  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  resetToken: string;

  @IsString()
  @MinLength(6)
  newPassword: string;
}
