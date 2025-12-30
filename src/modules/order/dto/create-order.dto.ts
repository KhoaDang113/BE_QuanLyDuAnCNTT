import {
  IsNotEmpty,
  IsString,
  IsArray,
  ValidateNested,
  IsNumber,
  Min,
  IsOptional,
  IsBoolean,
  IsEmail,
} from 'class-validator';
import { Type } from 'class-transformer';

export class OrderItemDto {
  @IsNotEmpty()
  @IsString()
  product_id: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  quantity: number;
}

export class InvoiceInfoDto {
  @IsNotEmpty()
  @IsString()
  company_name: string;

  @IsNotEmpty()
  @IsString()
  company_address: string;

  @IsNotEmpty()
  @IsString()
  tax_code: string;

  @IsNotEmpty()
  @IsEmail()
  email: string;
}

export class CreateOrderDto {
  @IsNotEmpty()
  @IsString()
  address_id: string;

  @IsNotEmpty()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  discount?: number;

  @IsOptional()
  @IsBoolean()
  is_company_invoice?: boolean;

  @IsOptional()
  @ValidateNested()
  @Type(() => InvoiceInfoDto)
  invoice_info?: InvoiceInfoDto;
}
