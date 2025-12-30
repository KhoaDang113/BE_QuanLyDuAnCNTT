import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types,  Schema as MongooseSchema } from 'mongoose';

export type ComboDocument = Combo & Document;

@Schema({ timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } })
export class Combo {
  @Prop({ required: true })
  image: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  description: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'TypeCombo', default: null })
  type_combo_id: Types.ObjectId;

  @Prop({ type: Boolean, default: true })
  is_active: boolean;

  @Prop({ type: Boolean, default: false })
  is_deleted: boolean;
}

export const ComboSchema = SchemaFactory.createForClass(Combo);
