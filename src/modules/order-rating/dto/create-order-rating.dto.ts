import { IsArray, IsNotEmpty, IsNumber, IsOptional, IsString, Max, Min } from "class-validator";
import { Type } from 'class-transformer';

export class CreateOrderRatingDto { 

    @IsNotEmpty()
    order_id: string;

    @IsNotEmpty()
    @IsNumber()
    @Min(1)
    @Max(5)
    @Type(() => Number)
    rating_overall: number;

    @IsOptional()
    @IsNumber() 
    @Min(1)
    @Max(5)
    @Type(() => Number)
    rating_product_quality?: number;

    @IsOptional()
    @IsNumber() 
    @Min(1)
    @Max(5)
    @Type(() => Number)
    rating_packaging?: number;

    @IsOptional()
    @IsNumber() 
    @Min(1)
    @Max(5)
    @Type(() => Number)
    rating_delivery_time?: number;

    @IsOptional()
    @IsNumber() 
    @Min(1)
    @Max(5)
    @Type(() => Number)
    rating_shipper?: number;

    @IsOptional()
    @IsString()
    comment?: string;

    @IsOptional()
    @IsArray()
    images?: string[];
}
