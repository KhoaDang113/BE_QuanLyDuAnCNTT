import { IsNotEmpty, IsEnum } from "class-validator";

export class ShipperAssignDto {
    @IsNotEmpty()
    orderId: string;

    @IsNotEmpty()
    shipperId: string;

    @IsNotEmpty()
    @IsEnum(['assigned', 'cancel'])
    status: string;
}