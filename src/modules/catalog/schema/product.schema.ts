import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ProductDocument = Product & Document;

@Schema({ timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } })
export class Product {
  _id?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Category', required: true })
  category_id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Brand' })
  brand_id?: Types.ObjectId;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  slug: string;

  @Prop({ type: String, default: null, note: 'e.g. pack, bottle, kg' })
  unit?: string;

  @Prop({ type: Number, required: true })
  unit_price: number;

  @Prop({ type: Number, default: 0 })
  discount_percent: number;

  @Prop({ type: Number })
  final_price?: number;

  @Prop({ type: [String] })
  image_primary: string;

  @Prop({ type: [String] })
  images: string[];

  @Prop({ type: Number, default: 0, min: 0 })
  quantity: number;

  @Prop({
    type: String,
    enum: ['in_stock', 'out_of_stock', 'preorder'],
    default: 'in_stock',
  })
  stock_status: 'in_stock' | 'out_of_stock' | 'preorder';

  @Prop({ type: Boolean, default: true })
  is_active: boolean;

  @Prop({ type: Boolean, default: false })
  is_deleted: boolean;
}

export const ProductSchema = SchemaFactory.createForClass(Product);

ProductSchema.index({ name: 'text' });
