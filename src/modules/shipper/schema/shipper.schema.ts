import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type ShipperDocument = Shipper & Document;

@Schema({
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
})
export class Shipper {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
  })
  user_id: MongooseSchema.Types.ObjectId;

  @Prop({ type: Boolean, default: false })
  is_online: boolean;

  @Prop({
    type: {
      latitude: { type: Number },
      longitude: { type: Number },
      address: { type: String },
    },
    required: false,
  })
  current_location?: {
    latitude: number;
    longitude: number;
    address?: string;
  };

  @Prop({ type: Date })
  last_online_at?: Date;

  @Prop({ type: Boolean, default: false })
  is_deleted: boolean;

  created_at?: Date;
  updated_at?: Date;
}

export const ShipperSchema = SchemaFactory.createForClass(Shipper);

// Index for faster queries
ShipperSchema.index({ user_id: 1 });
ShipperSchema.index({ is_online: 1, is_deleted: 1 });
