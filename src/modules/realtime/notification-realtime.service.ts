import { RealtimeGateway } from './realtime.gateway';
import { Injectable } from '@nestjs/common';
import { NotificationPayload } from './interfaces/notification-realtime.interface';
import {
  NewOrderNotificationPayload,
  OrderStatusUpdatedPayload,
} from './interfaces/order-realtime.interface';

@Injectable()
export class NotificationRealtimeService {
  constructor(private readonly rt: RealtimeGateway) {}

  // Gửi thông báo realtime cho 1 user cụ thể
  notifyUser(userId: string, data: NotificationPayload) {
    this.rt.emitToUser(userId, 'notification:new', data);
  }

  // Gửi thông báo cho nhiều users
  notifyMultipleUsers(userIds: string[], data: NotificationPayload) {
    for (const userId of userIds) {
      this.rt.emitToUser(userId, 'notification:new', data);
    }
  }

  // Thông báo khi có reply comment (gửi cho user được reply)
  notifyCommentReply(userId: string, data: NotificationPayload) {
    this.rt.emitToUser(userId, 'notification:comment-reply', data);
  }

  // Thông báo cập nhật số lượng unread
  notifyUnreadCountUpdate(userId: string, count: number) {
    this.rt.emitToUser(userId, 'notification:unread-count', { count });
  }

  // Notifications for staff
  // Thông báo cho tất cả staff khi có đơn hàng mới
  notifyNewOrderToStaff(data: NewOrderNotificationPayload) {
    this.rt.emitToAllStaff('staff:new-order', data);
  }

  // Thông báo cho tất cả staff (trừ staff đã thực hiện) khi có cập nhật trạng thái
  async notifyOrderStatusUpdated(
    excludeStaffId: string | undefined,
    data: OrderStatusUpdatedPayload,
  ) {
    if (excludeStaffId) {
      await this.rt.emitToAllStaffExcept(
        excludeStaffId,
        'staff:order-updated',
        data,
      );
    } else {
      this.rt.emitToAllStaff('staff:order-updated', data);
    }
  }

  // Thông báo cho tất cả shipper khi có cập nhật trạng thái
  notifyOrderStatusUpdatedByShipperToStaff(data: OrderStatusUpdatedPayload) {
    this.rt.emitToAllStaff('shipper:order-updated', data);
  }

  // Thông báo cho customer khi staff cập nhật đơn hàng
  notifyCustomerOrderUpdated(userId: string, data: OrderStatusUpdatedPayload) {
    this.rt.emitToUser(userId, 'order:status-updated', data);
  }
}
