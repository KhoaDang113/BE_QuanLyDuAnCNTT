import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { NotificationService } from './notification.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { QueryNotificationDto } from './dto/query-notification.dto';

@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  // Lấy danh sách thông báo của user hiện tại
  @Get()
  async getMyNotifications(
    @Req() req: Request,
    @Query() query: QueryNotificationDto,
  ) {
    const userId = req.user?.id as string;
    if (!userId) {
      throw new UnauthorizedException('User not found');
    }
    return this.notificationService.getUserNotifications(userId, query);
  }

  // Lấy danh sách thông báo của staff
  @Get('staff')
  async getNotificationForStaff(@Query() query: QueryNotificationDto) {
    return await this.notificationService.getNotificationsForStaff(query);
  }

  // Lấy số lượng thông báo chưa đọc
  @Get('unread-count')
  async getUnreadCount(@Req() req: Request) {
    const userId = req.user?.id as string;
    if (!userId) {
      throw new UnauthorizedException('User not found');
    }
    return this.notificationService.getUnreadCount(userId);
  }

  @Get('staff/unread-count')
  async getUnreadCountForStaff() {
    return this.notificationService.getUnreadCountForStaff();
  }

  // Lấy chi tiết 1 thông báo
  @Get(':id')
  async getNotificationById(@Param('id') id: string, @Req() req: Request) {
    const userId = req.user?.id as string;
    if (!userId) {
      throw new UnauthorizedException('User not found');
    }
    return this.notificationService.getNotificationById(id, userId);
  }

  // Tạo thông báo mới (internal use, hoặc admin)
  @Post()
  async createNotification(@Body() dto: CreateNotificationDto) {
    return this.notificationService.createNotification(dto);
  }

  // Tạo thông báo mới cho staff
  @Post('staff')
  async createNotificationForStaff(@Body() dto: CreateNotificationDto) {
    return await this.notificationService.createNotificationForStaff(dto);
  }

  // Đánh dấu 1 thông báo là đã đọc
  @Patch(':id/read')
  async markAsRead(@Param('id') id: string, @Req() req: Request) {
    const userId = req.user?.id as string;
    if (!userId) {
      throw new UnauthorizedException('User not found');
    }
    return this.notificationService.markAsRead(id, userId);
  }

  @Patch('staff/:id/read')
  async markAsReadForStaff(@Param('id') id: string) {
    return this.notificationService.markAsReadForStaff(id);
  }

  // Đánh dấu tất cả thông báo là đã đọc
  @Patch('read-all')
  async markAllAsRead(@Req() req: Request) {
    const userId = req.user?.id as string;
    if (!userId) {
      throw new UnauthorizedException('User not found');
    }
    return this.notificationService.markAllAsRead(userId);
  }

  // Ẩn thông báo
  @Patch(':id/hide')
  async hideNotification(@Param('id') id: string, @Req() req: Request) {
    const userId = req.user?.id as string;
    if (!userId) {
      throw new UnauthorizedException('User not found');
    }
    return this.notificationService.hideNotification(id, userId);
  }

  // Xóa 1 thông báo
  @Delete(':id')
  async deleteNotification(@Param('id') id: string, @Req() req: Request) {
    const userId = req.user?.id as string;
    if (!userId) {
      throw new UnauthorizedException('User not found');
    }
    return this.notificationService.deleteNotification(id, userId);
  }

  // Xóa tất cả thông báo
  @Delete()
  async deleteAllNotifications(@Req() req: Request) {
    const userId = req.user?.id as string;
    if (!userId) {
      throw new UnauthorizedException('User not found');
    }
    return this.notificationService.deleteAllNotifications(userId);
  }
}
