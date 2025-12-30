import { Injectable, Inject } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Shipper, ShipperDocument } from '../../shipper/schema/shipper.schema';
import Redis from 'ioredis';
import { withLock } from 'src/shared/redis/redis-lock';
import { Order, OrderDocument } from '../schema/order.schema';
import { OrderRealtimeService } from '../../realtime/order-realtime.service';
import { NotificationRealtimeService } from '../../realtime/notification-realtime.service';

@Injectable()
export class AssignOrderService {
  constructor(
    @InjectModel(Shipper.name)
    private readonly shipperModel: Model<ShipperDocument>,
    @Inject('REDIS') private readonly redis: Redis,
    @InjectModel(Order.name) private readonly orderModel: Model<OrderDocument>,
    private readonly gateway: OrderRealtimeService,
    private readonly notificationRealtimeService: NotificationRealtimeService,
  ) {}

  async getOnlineAvailableShippers() {
    const shippers = await this.shipperModel
      .find({
        is_online: true,
        is_deleted: false,
      })
      .select('user_id _id')
      .lean();
      
    const list: { id: string; userId: string; current: number }[] = [];
    for (const s of shippers) {
      const id = String(s._id);
      const userId = String(s.user_id);
      
      const [cur] = await this.redis.mget(`shipper:${id}:current`);
      const current = Number.parseInt(cur || '0', 10);
      if (current < 1) list.push({ id, userId, current });
    }
    return list;
  }

  async pickShipper(excludeShipperId?: string) {
    const c = await this.getOnlineAvailableShippers();

    const candidates = excludeShipperId
      ? c.filter((s) => s.id !== excludeShipperId.toString())
      : c;

    if (!candidates.length) return null;

    const bucket = candidates.filter((a) => a.current === 0);

    if (bucket.length === 0) {
      return null;
    }

    const rr = (await this.redis.incr('rr_index1')) - 1;
    return bucket[rr % bucket.length];
  }

  async sendOrderToShipper(orderId: string, excludeShipperId?: string) {
    return withLock(this.redis, `lock:assign-order:${orderId}`, 5, async () => {
      const order = await this.orderModel
        .findById(orderId)
        .populate('address_id', 'full_name phone address ward district city')
        .populate('items.product_id', 'name slug image_primary unit_price');

      if (!order || order.status !== 'confirmed') return order;
      const shipper = await this.pickShipper(excludeShipperId);
      
      if (!shipper) {
        const key = `order-shipper:${orderId}:queued`;

        const added = await this.redis.setnx(key, '1');

        if (added === 1) {
          await this.redis.expire(key, 3600);
          await this.redis.rpush('queue-order:waiting', orderId);
        }
        return order;
      }

      this.gateway.newOrderToShipper({
        shipperId: shipper.userId,
        orderId: order._id.toString(),
        message: 'Có đơn hàng mới cần giao',
        order,
      });
      return order;
    });
  }

  async shipperAssignOrder(orderId: string, shipperId: string, status: string) {
    const order = await this.orderModel.findById(orderId);
    if (!order || order.status !== 'confirmed') return order;

    const shipper = await this.shipperModel.findOne({ user_id: shipperId });

    if (!shipper) return order;

    if (status === 'cancel') {
      this.sendOrderToShipper(orderId, shipper._id as string);
      return order;
    }

    // IMPORTANT: Use shipper document _id for Redis key consistency
    await this.redis.incr(`shipper:${shipper._id as string}:current`);

    const previousStatus = order.status;
    order.shipper_id = new Types.ObjectId(shipper._id as string);
    order.status = 'assigned';
    order.assigned_at = new Date();
    await order.save();

    const populatedOrder = await this.orderModel
      .findById(orderId)
      .populate('address_id', 'full_name phone address ward district city')
      .populate('items.product_id', 'name slug image_primary unit_price');

    this.gateway.newOrderToShipper({
      shipperId: shipperId,
      orderId: order._id.toString(),
      message: 'Đơn hàng đã được gán cho bạn',
      order: populatedOrder,
    });

    // Thông báo cho các staff khác
    this.notificationRealtimeService.notifyOrderStatusUpdatedByShipperToStaff({
      orderId,
      previousStatus,
      newStatus: 'assigned',
      message: 'Tài xế đã nhận hàng, đợi tài xế đi giao',
      timestamp: new Date(),
      updatedBy: shipperId,
      order: populatedOrder,
    });

    // Thông báo cho customer
    const userId = order.user_id.toString();
    this.notificationRealtimeService.notifyCustomerOrderUpdated(userId, {
      orderId,
      previousStatus,
      newStatus: 'assigned',
      message: 'Tài xế đã nhận hàng, đợi tài xế đi giao',
      timestamp: new Date(),
    });

    this.gateway.orderUpdated(userId, {
      orderId,
      previousStatus,
      newStatus: 'assigned',
      message: 'Tài xế đã nhận hàng, đợi tài xế đi giao',
      timestamp: new Date(),
      order: populatedOrder,
    });

    return populatedOrder;
  }

  async drainQueue() {
    while (true) {
      const orderId = await this.redis.lpop('queue-order:waiting');
      await this.redis.del(`order-shipper:${orderId}:queued`);
      if (!orderId) break;
      setTimeout(() => {
        this.sendOrderToShipper(orderId);
      }, 5000);
    }
  }
}
