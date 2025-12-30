import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';

export type ConversationDocument = Conversation & Document;

@Schema({ timestamps: true })
export class Conversation {
  @Prop({ type: Types.ObjectId, ref: 'User', required: false })
  user_id?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: false })
  current_agent_id?: Types.ObjectId;

  @Prop({ default: 'PENDING', enum: ['PENDING', 'OPEN', 'CLOSED'] })
  state: string;

  @Prop({ default: 'default' }) queue: string; // 1 hàng chờ chung

  @Prop({ default: '' }) last_message?: string;

  @Prop() sender_type?: string;

  @Prop() last_message_at?: Date;
}

export const ConversationSchema = SchemaFactory.createForClass(Conversation);
