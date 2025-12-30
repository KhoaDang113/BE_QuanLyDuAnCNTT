import { IsNotEmpty, IsString } from "class-validator";

export class AdminResponseDto {
  @IsNotEmpty()
  @IsString()
  admin_response: string;
}
