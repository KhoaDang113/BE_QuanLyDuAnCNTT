import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Message, MessageDocument } from './schema/message.schema';
@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') || [
      'http://localhost:5173',
      'http://localhost:5174',
    ],
    credentials: true,
  },
  namespace: '/',
})
export class ChatGateway {
  @WebSocketServer() server: Server;
  constructor(
    @InjectModel(Message.name)
    private readonly msgModel: Model<MessageDocument>,
  ) {}

  @SubscribeMessage('join_conversation')
  async join(socket: Socket, payload: { conversation_id: string }) {
    void socket.join(payload.conversation_id);
    console.log(
      `Socket ${socket.id} joined conversation ${payload.conversation_id}`,
    );
    const messages = await this.msgModel
      .find({ conversation_id: new Types.ObjectId(payload.conversation_id) })
      .populate('sender_id', 'name avatar')
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    const ordered = messages.toReversed();

    socket.emit('history.messages', ordered);
  }

  @SubscribeMessage('staff_online')
  joinStaff(socket: Socket, payload: { staff_id: string }) {
    void socket.join(`staff:${payload.staff_id}`);
    return { status: 'ok', message: 'Joined staff room' };
  }

  notifyAssigned(conversationId: string, agentId: string) {
    this.server.to(conversationId).emit('conversation.assigned', { agentId });
    this.server.to(`staff:${agentId}`).emit('new_conversation', {
      conversation_id: conversationId,
    });
  }

  emitToStaff(staffId: string, event: string, data: any) {
    this.server.to(`staff:${staffId}`).emit(event, data);
  }

  emitToConversation(conversationId: string, event: string, data: any) {
    this.server.to(conversationId).emit(event, data);
  }
}
