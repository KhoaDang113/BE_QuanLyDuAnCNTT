import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Conversation, ConversationSchema } from './schema/conversation.schema';
import { Message, MessageSchema } from './schema/message.schema';
import { ChatController } from './chat.controller';
import { AssignmentService } from './assignment.service';
import { ChatGateway } from './chat.getway';
import { ChatService } from './chat.service';
import { ChatAutoCloseService } from './chat-auto-close.service';
import { User, UserSchema } from '../users/schemas/user.schema';
import { AuthModule } from '../auth/auth.module';
import { CloudinaryModule } from '../../shared/cloudinary/cloudinary.module';
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Conversation.name, schema: ConversationSchema },
      { name: Message.name, schema: MessageSchema },
      { name: User.name, schema: UserSchema },
    ]),
    forwardRef(() => AuthModule),
    CloudinaryModule,
  ],
  controllers: [ChatController],
  providers: [
    AssignmentService,
    ChatGateway,
    ChatService,
    ChatAutoCloseService,
  ],
  exports: [AssignmentService, ChatService],
})
export class ChatModule {}
