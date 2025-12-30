import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Conversation,
  ConversationDocument,
} from './schema/conversation.schema';
import { AssignmentService } from './assignment.service';
import { ChatService } from './chat.service';
import { ChatAutoCloseService } from './chat-auto-close.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { StaffGuard } from '../../common/guards/staff.guard';
import { AdminGuard } from '../../common/guards/admin.guard';
import { CloudinaryService } from '../../shared/cloudinary/cloudinary.service';
import type { Request } from 'express';

@Controller('conversations')
export class ChatController {
  constructor(
    @InjectModel(Conversation.name)
    private readonly convModel: Model<ConversationDocument>,
    private readonly assignment: AssignmentService,
    private readonly chatService: ChatService,
    private readonly autoCloseService: ChatAutoCloseService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  @Post()
  async create(@Req() req: Request): Promise<any> {
    const userId = req.user?.id as string | undefined;

    if (userId) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const existing = await this.chatService.getOrCreateConversation(userId);
      if (existing) {
        return existing;
      }
    }

    const conv = await this.convModel.create({
      user_id: userId ? new Types.ObjectId(userId) : undefined,
      state: 'PENDING',
      queue: 'default',
    });
    await this.chatService.sendWelcomeMessage(conv._id.toString());

    await this.assignment.assignConversation(conv._id.toString());

    return {
      conversation_id: conv._id,
      is_new: true,
      state: 'PENDING',
    };
  }

  @Get('current')
  async getCurrentConversation(@Req() req: Request): Promise<any> {
    const userId = req.user?.id as string | undefined;
    if (!userId) {
      return { conversation: null };
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const conversation =
      await this.chatService.getUserCurrentConversation(userId);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    return { conversation };
  }

  @Get()
  async getUserConversations(
    @Req() req: Request,
    @Query('limit') limit?: string,
    @Query('skip') skip?: string,
  ): Promise<{ conversations: any[]; total: number }> {
    const userId = req.user?.id as string | undefined;
    if (!userId) {
      return { conversations: [], total: 0 };
    }

    const limitNum = limit ? Number.parseInt(limit, 10) : 10;
    const skipNum = skip ? Number.parseInt(skip, 10) : 0;

    return this.chatService.getUserConversations(userId, limitNum, skipNum);
  }

  @Post(':id/close')
  async close(@Param('id') id: string) {
    await this.assignment.closeConversation(id);
    return { ok: true };
  }

  @Post(':id/messages')
  @UseInterceptors(FilesInterceptor('files', 5))
  async sendMessage(
    @Param('id') conversationId: string,
    @Body() dto: CreateMessageDto,
    @UploadedFiles() files: Express.Multer.File[],
    @Req() req: Request,
  ) {
    const userId = req.user?.id as string | undefined;

    const { should_reopen, old_agent_id } =
      await this.chatService.checkAndReopenConversation(conversationId);

    if (should_reopen) {
      if (old_agent_id) {
        await this.assignment.closeConversation(conversationId);
      }

      await this.assignment.assignConversation(conversationId);

      await this.chatService.sendMessage(
        conversationId,
        'Cuộc trò chuyện đang được kết nối với nhân viên.',
        'SYSTEM',
      );
    }

    // Upload files if any
    let attachments: Array<{
      url: string;
      type: 'image' | 'file';
      name?: string;
      size?: number;
      mimetype?: string;
    }> = [];

    if (files && files.length > 0) {
      const uploadPromises = files.map(async (file) => {
        const url = await this.cloudinaryService.uploadFile(file, 'chat');

        let decodedFilename = file.originalname;
        try {
          decodedFilename = Buffer.from(file.originalname, 'latin1').toString(
            'utf8',
          );
        } catch {
          decodedFilename = file.originalname;
        }

        return {
          url,
          type: file.mimetype.startsWith('image/')
            ? ('image' as const)
            : ('file' as const),
          name: decodedFilename,
          size: file.size,
          mimetype: file.mimetype,
        };
      });
      attachments = await Promise.all(uploadPromises);
    }

    const message = await this.chatService.sendMessage(
      conversationId,
      dto.text || '',
      'USER',
      userId,
      attachments,
    );
    return message;
  }

  @Post(':id/messages/staff')
  @UseGuards(StaffGuard)
  @UseInterceptors(FilesInterceptor('files', 5))
  async sendStaffMessage(
    @Param('id') conversationId: string,
    @Body() dto: CreateMessageDto,
    @UploadedFiles() files: Express.Multer.File[],
    @Req() req: Request,
  ) {
    const staffId = req.user?.id as string;

    // Upload files if any
    let attachments: Array<{
      url: string;
      type: 'image' | 'file';
      name?: string;
      size?: number;
      mimetype?: string;
    }> = [];

    if (files && files.length > 0) {
      const uploadPromises = files.map(async (file) => {
        const url = await this.cloudinaryService.uploadFile(file, 'chat');
        let decodedFilename = file.originalname;
        try {
          decodedFilename = Buffer.from(file.originalname, 'latin1').toString(
            'utf8',
          );
        } catch {
          decodedFilename = file.originalname;
        }

        return {
          url,
          type: file.mimetype.startsWith('image/')
            ? ('image' as const)
            : ('file' as const),
          name: decodedFilename,
          size: file.size,
          mimetype: file.mimetype,
        };
      });
      attachments = await Promise.all(uploadPromises);
    }

    const message = await this.chatService.sendMessage(
      conversationId,
      dto.text || '',
      'STAFF',
      staffId,
      attachments,
    );
    return message;
  }

  @Get(':id/messages')
  async getMessages(
    @Param('id') conversationId: string,
    @Query('limit') limit?: string,
    @Query('skip') skip?: string,
  ): Promise<{ messages: any[] }> {
    const limitNum = limit ? Number.parseInt(limit, 10) : 50;
    const skipNum = skip ? Number.parseInt(skip, 10) : 0;
    const messages = await this.chatService.getMessages(
      conversationId,
      limitNum,
      skipNum,
    );
    return { messages };
  }

  @Post('auto-close')
  @UseGuards(AdminGuard)
  async triggerAutoClose() {
    return this.autoCloseService.triggerAutoClose();
  }
}
