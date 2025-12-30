import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Message, MessageDocument } from './schema/message.schema';
import {
  Conversation,
  ConversationDocument,
} from './schema/conversation.schema';
import { ChatGateway } from './chat.getway';
import { User, UserDocument } from '../users/schemas/user.schema';
import {
  BaseConversation,
  EnrichedConversation,
} from 'src/types/conversationStaff';

@Injectable()
export class ChatService {
  constructor(
    @InjectModel(Message.name)
    private readonly msgModel: Model<MessageDocument>,
    @InjectModel(Conversation.name)
    private readonly convModel: Model<ConversationDocument>,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    private readonly gateway: ChatGateway,
  ) {}

  async sendWelcomeMessage(conversationId: string) {
    const welcomeText = 'Xin chào! web siêu thị rất vui được hỗ trợ bạn.';

    const message = await this.msgModel.create({
      conversation_id: new Types.ObjectId(conversationId),
      sender_type: 'SYSTEM',
      text: welcomeText,
      is_read: false,
    });

    this.gateway.emitToConversation(
      conversationId,
      'message.new',
      message.toObject(),
    );

    return message;
  }

  async sendAgentIntroductionMessage(conversationId: string, agentId: string) {
    const agent = await this.userModel.findById(agentId).select('name').lean();

    if (!agent) {
      return null;
    }

    const agentName = agent.name || 'Nhân viên';
    const introductionText = `Cảm ơn anh/chị đã liên hệ Bách Hóa Không Xanh, Em là ${agentName} xin phép được hỗ trợ. Dạ để tiện trao đổi em xin lại tên của mình nhé`;
    const followUpText = 'Dạ mình cần hỗ trợ gì ạ?';

    const introMessage = await this.msgModel.create({
      conversation_id: new Types.ObjectId(conversationId),
      sender_type: 'STAFF',
      sender_id: new Types.ObjectId(agentId),
      text: introductionText,
      is_read: false,
    });

    const followUpMessage = await this.msgModel.create({
      conversation_id: new Types.ObjectId(conversationId),
      sender_type: 'STAFF',
      sender_id: new Types.ObjectId(agentId),
      text: followUpText,
      is_read: false,
    });

    this.gateway.emitToConversation(
      conversationId,
      'message.new',
      introMessage.toObject(),
    );

    setTimeout(() => {
      this.gateway.emitToConversation(
        conversationId,
        'message.new',
        followUpMessage.toObject(),
      );
    }, 500);

    return { introMessage, followUpMessage };
  }

  async sendMessage(
    conversationId: string,
    text: string,
    senderType: 'USER' | 'STAFF' | 'SYSTEM',
    senderId?: string,
    attachments?: Array<{
      url: string;
      type: 'image' | 'file';
      name?: string;
      size?: number;
      mimetype?: string;
    }>,
  ) {
    const conversation = await this.convModel.findById(conversationId);
    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    const message = await this.msgModel.create({
      conversation_id: new Types.ObjectId(conversationId),
      sender_type: senderType,
      sender_id: senderId ? new Types.ObjectId(senderId) : undefined,
      text,
      attachments: attachments || [],
      is_read: false,
    });

    conversation.last_message_at = new Date();
    conversation.last_message = text || '[File đính kèm]';
    conversation.sender_type = senderType;
    await conversation.save();
    const populated = await message.populate('sender_id', 'name avatar');
    this.gateway.emitToConversation(
      conversationId,
      'message.new',
      populated.toObject(),
    );

    return message;
  }

  async getMessages(
    conversationId: string,
    limit = 50,
    skip = 0,
  ): Promise<MessageDocument[]> {
    const messages = await this.msgModel
      .find({
        conversation_id: new Types.ObjectId(conversationId),
      })
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .lean();

    return messages.toReversed() as MessageDocument[];
  }

  async getStaffConversations(
    staffId: string,
    state?: string,
    search?: string,
    limit = 20,
    skip = 0,
  ): Promise<{
    conversations: any[];
    total: number;
    page: number;
    pages: number;
  }> {
    const filter: Record<string, any> = {
      current_agent_id: new Types.ObjectId(staffId),
    };

    if (state) {
      filter.state = state;
    }

    const conversations = await this.convModel
      .find(filter)
      .populate('user_id', 'name avatar phone email')
      .populate('current_agent_id', 'name')
      .sort({ last_message_at: -1, updatedAt: -1 })
      .lean<BaseConversation[]>();

    let enriched: EnrichedConversation[] = await Promise.all(
      conversations.map(async (conv): Promise<EnrichedConversation> => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        const convId = (conv as any)._id as Types.ObjectId;

        const unreadCount = await this.msgModel.countDocuments({
          conversation_id: convId,
          sender_type: 'USER',
          is_read: false,
        });

        return {
          ...conv,
          last_message: conv.last_message || '',
          sender_type: conv.sender_type || '',
          unread_count: unreadCount,
        };
      }),
    );

    if (search && search.trim().length > 0) {
      const keyword = search.toLowerCase();

      enriched = enriched.filter((conv) => {
        const user = conv.user_id;

        const name = user?.name?.toLowerCase?.() ?? '';
        const phone = user?.phone?.toLowerCase?.() ?? '';
        const email = user?.email?.toLowerCase?.() ?? '';
        const lastMsg = conv?.last_message?.toLowerCase?.() ?? '';

        return (
          name.includes(keyword) ||
          phone.includes(keyword) ||
          email.includes(keyword) ||
          lastMsg.includes(keyword) ||
          String(conv._id).toLowerCase().includes(keyword)
        );
      });
    }

    const total = enriched.length;

    const result = enriched.slice(skip, skip + limit);

    return {
      conversations: result,
      total,
      page: Math.floor(skip / limit) + 1,
      pages: Math.ceil(total / limit),
    };
  }

  async getConversationDetail(conversationId: string): Promise<any> {
    const conversation = await this.convModel
      .findById(conversationId)
      .populate('user_id', 'name avatar phone email')
      .populate('current_agent_id', 'name avatar')
      .lean();

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    const unreadCount = await this.msgModel.countDocuments({
      conversation_id: new Types.ObjectId(conversationId),
      sender_type: 'USER',
      is_read: false,
    });

    return {
      ...conversation,
      unread_count: unreadCount,
    };
  }

  async markMessagesAsRead(conversationId: string) {
    const filter: Record<string, any> = {
      conversation_id: new Types.ObjectId(conversationId),
      sender_type: 'USER',
      is_read: false,
    };

    const result = await this.msgModel.updateMany(filter, {
      $set: { is_read: true },
    });

    return { modified_count: result.modifiedCount };
  }

  async getStaffStats(staffId: string) {
    const staffObjectId = new Types.ObjectId(staffId);

    const [totalOpen, totalClosed, totalToday] = await Promise.all([
      this.convModel.countDocuments({
        current_agent_id: staffObjectId,
        state: 'OPEN',
      }),
      this.convModel.countDocuments({
        current_agent_id: staffObjectId,
        state: 'CLOSED',
      }),
      this.convModel.countDocuments({
        current_agent_id: staffObjectId,
        createdAt: {
          $gte: new Date(new Date().setHours(0, 0, 0, 0)),
        },
      }),
    ]);

    return {
      open: totalOpen,
      closed: totalClosed,
      today: totalToday,
      total: totalOpen + totalClosed,
    };
  }

  /**
   * Lấy conversation hiện tại của user (OPEN hoặc PENDING)
   */
  async getUserCurrentConversation(userId: string): Promise<any> {
    const conversation = await this.convModel
      .findOne({
        user_id: new Types.ObjectId(userId),
      })
      .populate('current_agent_id', 'name avatar')
      .sort({ updatedAt: -1 })
      .lean();

    if (!conversation) {
      return null;
    }

    // Lấy tin nhắn cuối
    const lastMessage = await this.msgModel
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      .findOne({ conversation_id: (conversation as any)._id })
      .sort({ createdAt: -1 })
      .lean();

    return {
      ...conversation,
      last_message: lastMessage,
    };
  }

  async getOrCreateConversation(userId?: string): Promise<any> {
    if (userId) {
      const existing = await this.convModel.findOne({
        user_id: new Types.ObjectId(userId),
      });

      if (existing) {
        return {
          conversation_id: existing._id,
          is_new: false,
          state: existing.state,
        };
      }
    }
    return null;
  }

  async checkAndReopenConversation(conversationId: string): Promise<{
    should_reopen: boolean;
    conversation?: any;
    old_agent_id?: string;
  }> {
    const conversation = await this.convModel.findById(conversationId);

    if (!conversation) {
      return { should_reopen: false };
    }

    if (conversation.state === 'CLOSED') {
      // Set lại state = PENDING để assign staff mới
      conversation.state = 'PENDING';
      conversation.current_agent_id = undefined; // Xóa agent cũ
      await conversation.save();

      return {
        should_reopen: true,
        conversation: conversation.toObject(),
      };
    }

    // Nếu OPEN/PENDING → Kiểm tra inactive quá 10 phút
    if (conversation.state === 'OPEN' || conversation.state === 'PENDING') {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const convDoc = conversation as any;
      const lastActivity =
        conversation.last_message_at ||
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        (convDoc.updatedAt as Date) ||
        new Date();
      const now = new Date();
      const diffMinutes =
        (now.getTime() - new Date(lastActivity).getTime()) / 1000 / 60;

      // Nếu quá 10 phút không hoạt động → Close và reopen với staff mới
      if (diffMinutes > 10) {
        conversation.state = 'PENDING';
        const oldAgentId = conversation.current_agent_id;
        conversation.current_agent_id = undefined;
        await conversation.save();

        return {
          should_reopen: true,
          conversation: conversation.toObject(),
          old_agent_id: oldAgentId?.toString(),
        };
      }
    }

    return { should_reopen: false };
  }

  async getUserConversations(
    userId: string,
    limit = 10,
    skip = 0,
  ): Promise<{ conversations: any[]; total: number }> {
    const conversations = await this.convModel
      .find({
        user_id: new Types.ObjectId(userId),
      })
      .populate('current_agent_id', 'name avatar')
      .sort({ updatedAt: -1 })
      .limit(limit)
      .skip(skip)
      .lean();

    // Lấy tin nhắn cuối của mỗi conversation
    const conversationsWithLastMessage = await Promise.all(
      conversations.map(async (conv) => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        const convId = (conv as any)._id as Types.ObjectId;
        const lastMessage = await this.msgModel
          .findOne({ conversation_id: convId })
          .sort({ createdAt: -1 })
          .lean();

        const unreadCount = await this.msgModel.countDocuments({
          conversation_id: convId,
          sender_type: 'STAFF',
          is_read: false,
        });

        return {
          ...conv,
          last_message: lastMessage,
          unread_count: unreadCount,
        };
      }),
    );

    const total = await this.convModel.countDocuments({
      user_id: new Types.ObjectId(userId),
    });

    return {
      conversations: conversationsWithLastMessage,
      total,
    };
  }
}
