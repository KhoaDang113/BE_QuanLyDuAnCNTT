import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type CategoryDocument = Category & Document;

@Schema({ timestamps: true })
export class Category {
  @Prop({ type: Types.ObjectId, ref: 'Category' })
  parent_id?: Types.ObjectId;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true, unique: true })
  slug: string;

  @Prop()
  image?: string;

  @Prop()
  description?: string;

  @Prop({ default: true })
  is_active: boolean;

  @Prop({ default: false })
  is_deleted: boolean;
}

export const CategorySchema = SchemaFactory.createForClass(Category);

CategorySchema.index({ name: 'text', description: 'text' });

CategorySchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (_: any, ret: Record<string, any>) => {
    ret.id = ret._id as Types.ObjectId;
    delete ret._id;
  },
});
