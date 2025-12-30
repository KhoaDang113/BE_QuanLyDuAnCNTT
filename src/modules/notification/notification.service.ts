import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Notification,
  NotificationDocument,
} from './schema/notification.schema';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { QueryNotificationDto } from './dto/query-notification.dto';

@Injectable()
export class NotificationService {
  constructor(
    @InjectModel(Notification.name)
    private readonly notificationModel: Model<NotificationDocument>,
  ) {}

  // Tạo thông báo mới
  async createNotification(
    dto: CreateNotificationDto,
  ): Promise<Notification | null> {
    if (dto.user_id && !Types.ObjectId.isValid(dto.user_id)) {
      throw new BadRequestException('Invalid user_id');
    }
    if (!Types.ObjectId.isValid(dto.actor_id)) {
      throw new BadRequestException('Invalid actor_id');
    }

    const notification = new this.notificationModel({
      user_id: new Types.ObjectId(dto.user_id),
      actor_id: new Types.ObjectId(dto.actor_id),
      type: dto.type,
      title: dto.title,
      message: dto.message,
      link: dto.link,
      reference_id: dto.reference_id
        ? new Types.ObjectId(dto.reference_id)
        : undefined,
      reference_type: dto.reference_type,
      metadata: dto.metadata,
    });

    await notification.save();

    return await this.notificationModel
      .findById(notification._id)
      .populate('actor_id', 'name avatar email role')
      .lean();
  }

  async createNotificationForStaff(
    dto: CreateNotificationDto,
  ): Promise<Notification | null> {
    if (!Types.ObjectId.isValid(dto.actor_id)) {
      throw new BadRequestException('Invalid actor_id');
    }

    const notification = new this.notificationModel({
      actor_id: new Types.ObjectId(dto.actor_id),
      type: dto.type,
      title: dto.title,
      message: dto.message,
      link: dto.link,
      reference_id: dto.reference_id
        ? new Types.ObjectId(dto.reference_id)
        : undefined,
      reference_type: dto.reference_type,
      is_staff: true,
      metadata: dto.metadata,
    });

    await notification.save();

    return await this.notificationModel
      .findById(notification._id)
      .populate('actor_id', 'name avatar email role')
      .lean();
  }

  // Lấy danh sách thông báo của user
  async getUserNotifications(userId: string, query: QueryNotificationDto) {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid userId');
    }

    const { page = 1, limit = 20, type, is_read, unread_only } = query;
    const skip = (page - 1) * limit;

    const userObjectId = new Types.ObjectId(userId);

    const filter: Record<string, any> = {
      user_id: userObjectId,
      is_deleted: false,
      is_hidden: false,
    };

    if (type) {
      filter.type = type;
    }

    if (unread_only) {
      filter.is_read = false;
    } else if (is_read !== undefined) {
      filter.is_read = is_read;
    }

    const [notifications, total, unreadCount] = await Promise.all([
      this.notificationModel
        .find(filter)
        .populate('actor_id', 'name avatar email role')
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.notificationModel.countDocuments(filter),
      this.notificationModel.countDocuments({
        user_id: userObjectId,
        is_deleted: false,
        is_hidden: false,
        is_read: false,
      }),
    ]);

    return {
      notifications,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      unreadCount,
    };
  }

  // Lấy danh sách thông báo của user
  async getNotificationsForStaff(query: QueryNotificationDto) {
    const { page = 1, limit = 20, type, is_read, unread_only } = query;
    const skip = (page - 1) * limit;

    const filter: Record<string, any> = {
      is_staff: true,
      is_deleted: false,
      is_hidden: false,
    };

    if (type) {
      filter.type = type;
    }

    if (unread_only) {
      filter.is_read = false;
    } else if (is_read !== undefined) {
      filter.is_read = is_read;
    }

    const [notifications, total, unreadCount] = await Promise.all([
      this.notificationModel
        .find(filter)
        .populate('actor_id', 'name avatar email role')
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.notificationModel.countDocuments(filter),
      this.notificationModel.countDocuments({
        is_staff: true,
        is_deleted: false,
        is_hidden: false,
        is_read: false,
      }),
    ]);

    return {
      notifications,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      unreadCount,
    };
  }

  // Đánh dấu đã đọc
  async markAsRead(notificationId: string, userId: string) {
    if (!Types.ObjectId.isValid(notificationId)) {
      throw new BadRequestException('Invalid notificationId');
    }

    const notification = await this.notificationModel.findOne({
      _id: new Types.ObjectId(notificationId),
      user_id: new Types.ObjectId(userId),
      is_deleted: false,
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    notification.is_read = true;
    notification.read_at = new Date();
    await notification.save();

    return notification;
  }

  async markAsReadForStaff(notificationId: string) {
    if (!Types.ObjectId.isValid(notificationId)) {
      throw new BadRequestException('Invalid notificationId');
    }

    const notification = await this.notificationModel.findOne({
      _id: new Types.ObjectId(notificationId),
      is_deleted: false,
    });

    if (!notification) {
      throw new NotFoundException('Notification not found 123');
    }

    notification.is_read = true;
    notification.read_at = new Date();
    await notification.save();

    return notification;
  }

  // Đánh dấu tất cả là đã đọc
  async markAllAsRead(userId: string) {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid userId');
    }

    const result = await this.notificationModel.updateMany(
      {
        user_id: new Types.ObjectId(userId),
        is_deleted: false,
        is_read: false,
      },
      {
        $set: {
          is_read: true,
          read_at: new Date(),
        },
      },
    );

    return {
      message: 'All notifications marked as read',
      modifiedCount: result.modifiedCount,
    };
  }

  // Ẩn thông báo
  async hideNotification(notificationId: string, userId: string) {
    if (!Types.ObjectId.isValid(notificationId)) {
      throw new BadRequestException('Invalid notificationId');
    }

    const notification = await this.notificationModel.findOne({
      _id: new Types.ObjectId(notificationId),
      user_id: new Types.ObjectId(userId),
      is_deleted: false,
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    notification.is_hidden = true;
    await notification.save();

    return {
      message: 'Notification hidden successfully',
    };
  }

  // Xóa thông báo (soft delete)
  async deleteNotification(notificationId: string, userId: string) {
    if (!Types.ObjectId.isValid(notificationId)) {
      throw new BadRequestException('Invalid notificationId');
    }

    const notification = await this.notificationModel.findOne({
      _id: new Types.ObjectId(notificationId),
      user_id: new Types.ObjectId(userId),
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    notification.is_deleted = true;
    await notification.save();

    return {
      message: 'Notification deleted successfully',
    };
  }

  // Xóa tất cả thông báo
  async deleteAllNotifications(userId: string) {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid userId');
    }

    const result = await this.notificationModel.updateMany(
      {
        user_id: new Types.ObjectId(userId),
        is_deleted: false,
      },
      {
        $set: {
          is_deleted: true,
        },
      },
    );

    return {
      message: 'All notifications deleted successfully',
      deletedCount: result.modifiedCount,
    };
  }

  // Lấy số lượng thông báo chưa đọc
  async getUnreadCount(userId: string) {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid userId');
    }

    const count = await this.notificationModel.countDocuments({
      user_id: new Types.ObjectId(userId),
      is_deleted: false,
      is_hidden: false,
      is_read: false,
    });

    return {
      unreadCount: count,
    };
  }

  async getUnreadCountForStaff() {
    const count = await this.notificationModel.countDocuments({
      is_staff: true,
      is_deleted: false,
      is_hidden: false,
      is_read: false,
    });

    return {
      unreadCount: count,
    };
  }

  // Lấy chi tiết 1 thông báo
  async getNotificationById(notificationId: string, userId: string) {
    if (!Types.ObjectId.isValid(notificationId)) {
      throw new BadRequestException('Invalid notificationId');
    }

    const notification = await this.notificationModel
      .findOne({
        _id: new Types.ObjectId(notificationId),
        user_id: new Types.ObjectId(userId),
        is_deleted: false,
      })
      .populate('actor_id', 'name avatar email role')
      .lean();

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    return notification;
  }
}
