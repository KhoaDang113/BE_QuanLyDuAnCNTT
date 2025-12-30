import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type InventoryTransactionDocument = InventoryTransaction & Document;

@Schema({ timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } })
export class InventoryTransaction {
  @Prop({ type: Types.ObjectId, ref: 'Product', required: true })
  product_id: Types.ObjectId;

  @Prop({
    enum: ['import', 'export', 'adjustment'],
    required: true,
  })
  type: 'import' | 'export' | 'adjustment';

  @Prop({ type: Number, required: true, min: 1 })
  quantity: number;

  @Prop({ type: Number, required: true })
  quantity_before: number;

  @Prop({ type: Number, required: true })
  quantity_after: number;

  @Prop({ type: Types.ObjectId, ref: 'Order' })
  order_id?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  created_by?: Types.ObjectId;

  @Prop()
  note?: string;
}

export const InventoryTransactionSchema =
  SchemaFactory.createForClass(InventoryTransaction);

InventoryTransactionSchema.index({ product_id: 1, created_at: -1 });
InventoryTransactionSchema.index({ order_id: 1 });
