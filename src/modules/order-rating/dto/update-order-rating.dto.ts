import { PartialType } from '@nestjs/mapped-types';
import { CreateOrderRatingDto } from './create-order-rating.dto';

export class UpdateOrderRatingDto extends PartialType(CreateOrderRatingDto) {}
