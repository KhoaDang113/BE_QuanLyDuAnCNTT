import { Injectable, Logger, Inject } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Conversation,
  ConversationDocument,
} from './schema/conversation.schema';
import Redis from 'ioredis';
import { ChatGateway } from './chat.getway';

@Injectable()
export class ChatAutoCloseService {
  private readonly logger = new Logger(ChatAutoCloseService.name);

  constructor(
    @InjectModel(Conversation.name)
    private readonly convModel: Model<ConversationDocument>,
    @Inject('REDIS') private readonly redis: Redis,
    private readonly gateway: ChatGateway,
  ) {}

  @Cron(CronExpression.EVERY_10_MINUTES)
  async autoCloseInactiveConversations() {
    this.logger.log('Checking for inactive conversations...');

    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

    try {
      const inactiveConversations = await this.convModel.find({
        state: { $in: ['OPEN', 'PENDING'] },
        $or: [
          // Case 1: Có last_message_at và quá cũ
          { last_message_at: { $lt: tenMinutesAgo } },
          // Case 2: Không có last_message_at, dùng updatedAt
          {
            last_message_at: { $exists: false },
            updatedAt: { $lt: tenMinutesAgo },
          },
        ],
      });

      let closedCount = 0;

      for (const conv of inactiveConversations) {
        if (conv.current_agent_id) {
          const agentId = conv.current_agent_id.toString();
          const current = await this.redis.get(`agent:${agentId}:current`);

          if (current && Number.parseInt(current, 10) > 0) {
            await this.redis.decr(`agent:${agentId}:current`);
            this.logger.log(
              `Decreased agent ${agentId} count for conversation ${String(conv._id)}`,
            );
          }

          if (agentId) {
            this.gateway.emitToStaff(agentId, 'conversation.closed', {
              conversation_id: String(conv._id),
            });
          }
        }
        conv.state = 'CLOSED';
        conv.current_agent_id = undefined;
        await conv.save();

        closedCount++;
      }

      if (closedCount > 0) {
        this.logger.log(`Auto-closed ${closedCount} inactive conversation(s)`);
      } else {
        this.logger.debug('No inactive conversations found');
      }

      return { closed_count: closedCount };
    } catch (error) {
      this.logger.error('Error auto-closing conversations:', error);
      throw error;
    }
  }

  async triggerAutoClose() {
    return this.autoCloseInactiveConversations();
  }
}
