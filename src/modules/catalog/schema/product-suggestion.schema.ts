import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ProductSuggestionDocument = ProductSuggestion & Document;

@Schema({ timestamps: true, collection: 'product_suggestions' })
export class ProductSuggestion {
  product_id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Product', required: true })
  suggested_product_id: Types.ObjectId;

  @Prop()
  starts_at?: Date;

  @Prop()
  ends_at?: Date;

  @Prop({ default: true })
  is_active: boolean;
}

export const ProductSuggestionSchema =
  SchemaFactory.createForClass(ProductSuggestion);

ProductSuggestionSchema.index(
  { product_id: 1, suggested_product_id: 1 },
  { unique: true },
);
