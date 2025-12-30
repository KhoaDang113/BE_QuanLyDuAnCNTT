import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';


export type TypeComboDocument = TypeCombo & Document;


@Schema({ timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' } })
export class TypeCombo {
  @Prop({ required: true })
  name: string;


  @Prop({ required: true, unique: true })
  slug: string;


  @Prop({ type: Number, default: 0 })
  order_index: number;


  @Prop({ default: '' })
  description: string;


  @Prop({ type: Boolean, default: true })
  is_active: boolean;


  @Prop({ type: Boolean, default: false })
  is_deleted: boolean;
}


export const TypeComboSchema = SchemaFactory.createForClass(TypeCombo);
