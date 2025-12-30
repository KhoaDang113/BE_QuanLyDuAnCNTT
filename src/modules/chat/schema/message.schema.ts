import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
export type MessageDocument = Message & Document;

export class Attachment {
  @Prop() url: string;
  @Prop() type: 'image' | 'file';
  @Prop() name?: string;
  @Prop() size?: number;
  @Prop() mimetype?: string;
}

@Schema({ timestamps: true })
export class Message {
  @Prop({ type: Types.ObjectId, ref: 'Conversation', index: true })
  conversation_id: Types.ObjectId;
  @Prop({ enum: ['USER', 'STAFF', 'SYSTEM'] }) sender_type:
    | 'USER'
    | 'STAFF'
    | 'SYSTEM';
  @Prop({ type: Types.ObjectId, ref: 'User', required: false })
  sender_id?: Types.ObjectId;
  @Prop() text?: string;
  @Prop({ type: [Attachment], default: [] }) attachments?: Attachment[];
  @Prop({ default: false }) is_read: boolean;
}

export const MessageSchema = SchemaFactory.createForClass(Message);
