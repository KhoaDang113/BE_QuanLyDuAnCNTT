import { IsObject, IsString } from 'class-validator';
import { User } from '../../users/schemas/user.schema';
export class RegisterEmailResponseDto {
  @IsObject()
  user: User;

  @IsString()
  accessToken: string;

  @IsString()
  refreshToken: string;
}
