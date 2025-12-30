import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';

export type BannerDocument = Banner & Document;

@Schema({ timestamps: true })
export class Banner {
  @Prop({ required: true })
  image: string;

  @Prop({ type: Types.ObjectId, ref: 'Category' })
  category_id: Types.ObjectId;

  @Prop({ required: true })
  link: string;

  @Prop({ default: true })
  is_active: boolean;

  @Prop({ default: false })
  is_deleted: boolean;
}

export const BannerSchema = SchemaFactory.createForClass(Banner);
