import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type RatingDocument = Rating & Document;

@Schema({ timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } })
export class Rating {
  _id?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Product', required: true })
  product_id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user_id: Types.ObjectId;

  @Prop({ required: true, trim: true })
  content: string;

  @Prop({ type: Number, min: 1, max: 5, required: true })
  rating: number;

  @Prop({ type: [String], default: [] })
  images: string[];

  @Prop({ type: Boolean, default: false })
  is_deleted: boolean;

  created_at?: Date;
  updated_at?: Date;
}

export const RatingSchema = SchemaFactory.createForClass(Rating);

RatingSchema.index({ product_id: 1, created_at: -1 });
RatingSchema.index({ user_id: 1, created_at: -1 });
