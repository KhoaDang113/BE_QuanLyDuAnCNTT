import { IsString, IsNumber } from 'class-validator';

export class VerifyLoginSmsDto {
  @IsString()
  userId: string;
  @IsNumber()
  code: number;
}
