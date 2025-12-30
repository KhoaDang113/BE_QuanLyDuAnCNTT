import { IsNotEmpty, IsString } from "class-validator";

export class CreateShipperDto {
    @IsString()
    @IsNotEmpty()
    user_id: string;
}