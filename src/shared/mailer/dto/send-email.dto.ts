import { IsNotEmpty, IsString, IsEmail } from 'class-validator';
export class SendEmailDto {
  @IsNotEmpty()
  @IsEmail()
  to: string;

  @IsString()
  subject: string;

  @IsString()
  html: string;
}
