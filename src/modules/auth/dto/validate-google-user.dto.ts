import { IsEmail, IsString } from 'class-validator';

export class ValidateGoogleUserDto {
  @IsString()
  providerId: string;
  @IsEmail()
  email: string;
  @IsString()
  name: string;
  @IsString()
  avatar: string;
  @IsString()
  authProvider: string;
}
