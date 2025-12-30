import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
  Inject,
} from '@nestjs/common';
import type { Request } from 'express';
import Redis from 'ioredis';
import { StaffGuard } from '../../common/guards/staff.guard';
import { AssignmentService } from '../chat/assignment.service';
import { ChatService } from '../chat/chat.service';

@Controller('staff')
@UseGuards(StaffGuard)
export class StaffController {
  constructor(
    @Inject('REDIS') private readonly redis: Redis,
    private readonly assignment: AssignmentService,
    private readonly chatService: ChatService,
  ) {}

  @Post('presence')
  async setPresence(
    @Req() req: Request,
    @Body() body: { status: 'ONLINE' | 'AWAY' | 'OFFLINE'; max?: number },
  ) {
    const userId = String(req.user?.id);

    if (body.max !== undefined)
      await this.redis.set(`agent:${userId}:max`, String(body.max));
    else if (!(await this.redis.get(`agent:${userId}:max`)))
      await this.redis.set(`agent:${userId}:max`, '3');

    await this.redis.set(`agent:${userId}:status`, body.status);
    if ((await this.redis.get(`agent:${userId}:current`)) === null) {
      await this.redis.set(`agent:${userId}:current`, '0');
    }

    if (body.status === 'ONLINE') {
      await this.assignment.drainQueue();
    } else if (body.status === 'OFFLINE') {
      await this.assignment.requeueAllByAgent(userId);
    }

    return { ok: true };
  }

  @Get('conversations')
  async getConversations(
    @Req() req: Request,
    @Query('state') state?: string,
    @Query('search') search?: string,
    @Query('limit') limit?: string,
    @Query('skip') skip?: string,
  ) {
    const staffId = String(req.user?.id);
    const limitNum = limit ? Number.parseInt(limit, 10) : 20;
    const skipNum = skip ? Number.parseInt(skip, 10) : 0;

    return this.chatService.getStaffConversations(
      staffId,
      state,
      search,
      limitNum,
      skipNum,
    );
  }

  @Get('conversations/:id')
  async getConversationDetail(
    @Param('id') conversationId: string,
  ): Promise<any> {
    return this.chatService.getConversationDetail(conversationId);
  }

  @Get('conversations/:id/messages')
  async getMessages(@Param('id') conversationId: string) {
    return await this.chatService.getMessages(conversationId);
  }

  @Patch('conversations/:id/read')
  async markAsRead(@Param('id') conversationId: string) {
    return this.chatService.markMessagesAsRead(conversationId);
  }

  @Get('stats')
  async getStats(@Req() req: Request) {
    const staffId = String(req.user?.id);
    return this.chatService.getStaffStats(staffId);
  }
}
