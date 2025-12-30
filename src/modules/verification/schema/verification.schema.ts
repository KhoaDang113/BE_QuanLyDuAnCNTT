import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';

export type VerificationDocument = Verification & Document;

@Schema({ timestamps: true })
export class Verification {
  id?: Types.ObjectId;

  @Prop({ required: true, index: true })
  target: string;

  @Prop({ required: true })
  type: string;

  @Prop({ required: true })
  codeHash: string;

  @Prop({ required: true })
  expiresAt: Date;

  @Prop({ default: 0 })
  attempts: number;

  createdAt?: Date;
  updatedAt?: Date;
}

export const VerificationSchema = SchemaFactory.createForClass(Verification);

VerificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
