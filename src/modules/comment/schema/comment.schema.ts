import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type CommentDocument = Comment & Document;

@Schema({ timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } })
export class Comment {
  _id?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Product', required: true })
  product_id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user_id: Types.ObjectId;

  @Prop({ required: true, trim: true })
  content: string;

  @Prop({ type: Types.ObjectId, ref: 'Comment', default: null })
  parent_id?: Types.ObjectId;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Comment' }], default: [] })
  replies: Types.ObjectId[];

  @Prop({ type: Number, default: 0 })
  reply_count: number;

  @Prop({ type: Boolean, default: false })
  is_deleted: boolean;

  created_at?: Date;
  updated_at?: Date;
}

export const CommentSchema = SchemaFactory.createForClass(Comment);

CommentSchema.index({ product_id: 1, created_at: -1 });
CommentSchema.index({ user_id: 1, created_at: -1 });
CommentSchema.index({ parent_id: 1, created_at: -1 });
