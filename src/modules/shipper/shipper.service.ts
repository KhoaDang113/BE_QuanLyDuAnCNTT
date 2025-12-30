import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/mongoose';
import { Model, Types, ClientSession, Connection } from 'mongoose';
import { Shipper, ShipperDocument } from './schema/shipper.schema';
import { Order, OrderDocument } from '../order/schema/order.schema';
import { SetOnlineStatusDto } from './dto/set-online-status.dto';
import { User, UserDocument } from '../users/schemas/user.schema';
import Redis from 'ioredis';
import { AssignOrderService } from '../order/service/assign-order.service';
import { NotificationRealtimeService } from '../realtime/notification-realtime.service';
import { OrderRealtimeService } from '../realtime/order-realtime.service';

@Injectable()
export class ShipperService {
  constructor(
    @Inject('REDIS') private readonly redis: Redis,
    @InjectModel(Shipper.name)
    private readonly shipperModel: Model<ShipperDocument>,
    @InjectModel(Order.name)
    private readonly orderModel: Model<OrderDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    @InjectConnection()
    private readonly connection: Connection,
    private readonly assignOrderService: AssignOrderService,
    private readonly notificationRealtimeService: NotificationRealtimeService,
    private readonly orderRealtimeService: OrderRealtimeService,
  ) {}

  private ensureObjectId(id: string, label = 'id'): Types.ObjectId {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException(`Invalid ${label}`);
    }
    return new Types.ObjectId(id);
  }

  async createForUser(userId: string) {
    const session: ClientSession = await this.connection.startSession();

    try {
      const shipper = await session.withTransaction(async () => {
        const userObjectId = new Types.ObjectId(userId);

        const user = await this.userModel
          .findById(userObjectId)
          .session(session);
        if (!user) {
          throw new NotFoundException('User not found');
        }

        const existing = await this.shipperModel
          .findOne({ user_id: userObjectId })
          .session(session);
        if (existing) {
          throw new BadRequestException('User is already a shipper');
        }

        const [shipperDoc] = await this.shipperModel.create(
          [
            {
              user_id: userObjectId,
              is_online: false,
              is_deleted: false,
            },
          ],
          { session },
        );

        user.role = 'shipper';
        await user.save({ session });

        return shipperDoc;
      });
      return shipper;
    } catch (e) {
      console.error(`Create shipper failed: ${e.message}`, e.stack);
      throw e;
    } finally {
      await session.endSession();
    }
  }

  async deleteShipper(userId: string) {
    const userObjectId = this.ensureObjectId(userId, 'user id');
    const shipper = await this.shipperModel.findOne({ user_id: userObjectId });
    if (!shipper) {
      throw new NotFoundException('Shipper not found');
    }
    shipper.is_deleted = true;
    await shipper.save();
    return shipper;
  }

  async setOnlineStatus(
    userId: string,
    setOnlineStatusDto: SetOnlineStatusDto,
  ): Promise<Shipper> {
    const userObjectId = this.ensureObjectId(userId, 'user id');

    const shipperExist = await this.shipperModel.findOne({
      user_id: userObjectId,
    });
    if (!shipperExist) {
      throw new NotFoundException('Shipper not found');
    }

    const orderOfShipper = await this.orderModel.find({
      shipper_id: shipperExist._id,
      status: { $in: ['assigned', 'shipped'] },
    });
    if (orderOfShipper.length > 0) {
      throw new BadRequestException(
        'Shipper is already assigned to an order. Cannot change online status',
      );
    }

    const location =
      setOnlineStatusDto.latitude && setOnlineStatusDto.longitude
        ? {
            latitude: setOnlineStatusDto.latitude,
            longitude: setOnlineStatusDto.longitude,
            address: setOnlineStatusDto.address,
          }
        : undefined;

    const shipper = await this.shipperModel.findOneAndUpdate(
      { user_id: userObjectId },
      {
        is_online: setOnlineStatusDto.is_online,
        last_online_at: setOnlineStatusDto.is_online ? new Date() : undefined,
        ...(location && { current_location: location }),
      },
      { upsert: true, new: true },
    );

    if (
      (await this.redis.get(`shipper:${shipper._id as string}:current`)) ===
      null
    ) {
      await this.redis.set(`shipper:${shipper._id as string}:current`, '0');
    }

    if (setOnlineStatusDto.is_online) {
      this.assignOrderService.drainQueue();
    } else {
      // await this.assignOrderService.requeueAllByAgent(userId);
    }

    return shipper;
  }

  async getShipperStatus(userId: string): Promise<Shipper | null> {
    const userObjectId = this.ensureObjectId(userId, 'user id');
    return await this.shipperModel.findOne({
      user_id: userObjectId,
      is_deleted: false,
    });
  }

  async getOnlineShippers(): Promise<Shipper[]> {
    return await this.shipperModel
      .find({
        is_online: true,
        is_deleted: false,
      })
      .populate('user_id', 'name email phone avatar');
  }

  async getShipperOrders(userId: string, status?: string): Promise<Order[]> {
    const userObjectId = this.ensureObjectId(userId, 'user id');

    const shipper = await this.shipperModel.findOne({ user_id: userObjectId });
    if (!shipper) {
      throw new NotFoundException('Shipper not found');
    }

    const filter: Record<string, any> = {
      shipper_id: shipper._id,
      is_deleted: false,
    };

    if (status) {
      filter.status = status;
    } else {
      filter.status = {
        $in: ['assigned', 'shipped', 'delivered', 'completed'],
      };
    }

    const orders = await this.orderModel
      .find(filter)
      .populate('address_id', 'full_name phone address ward district city')
      .populate(
        'items.product_id',
        'name slug image_primary images unit_price unit',
      )
      .sort({ created_at: -1 });

    return orders;
  }

  async startDelivery(orderId: string, shipperId: string): Promise<Order> {
    const orderObjectId = this.ensureObjectId(orderId, 'order id');
    const shipperObjectId = this.ensureObjectId(shipperId, 'shipper id');

    const shipper = await this.shipperModel.findOne({
      user_id: shipperObjectId,
      is_deleted: false,
    });

    if (!shipper) {
      throw new NotFoundException('Shipper not found');
    }

    const order = await this.orderModel.findOne({
      _id: orderObjectId,
      shipper_id: shipper._id,
      is_deleted: false,
    });

    if (!order) {
      throw new NotFoundException('Order not found or not assigned to you');
    }

    if (order.status !== 'assigned') {
      throw new BadRequestException(
        `Cannot start delivery for order with status: ${order.status}`,
      );
    }

    const previousStatus = order.status;
    order.status = 'shipped';
    order.shipped_at = new Date();
    await order.save();

    const result = await this.orderModel
      .findById(orderId)
      .populate('address_id')
      .populate('items.product_id', 'name slug image_primary unit_price');

    if (!result) {
      throw new NotFoundException('Order not found after starting delivery');
    }

    this.notificationRealtimeService.notifyOrderStatusUpdatedByShipperToStaff({
      orderId,
      previousStatus,
      newStatus: 'shipped',
      message: 'Đơn hàng đang được giao',
      timestamp: new Date(),
      updatedBy: shipperId,
      order: result,
    });

    // Thông báo cho customer
    const userId = order.user_id.toString();
    this.notificationRealtimeService.notifyCustomerOrderUpdated(userId, {
      orderId,
      previousStatus,
      newStatus: 'shipped',
      message: 'Đơn hàng của bạn đang được giao',
      timestamp: new Date(),
    });

    this.orderRealtimeService.orderUpdated(userId, {
      orderId,
      previousStatus,
      newStatus: 'shipped',
      message: 'Đơn hàng của bạn đang được giao',
      timestamp: new Date(),
      order: result,
    });

    return result;
  }

  async completeDelivery(orderId: string, shipperId: string): Promise<Order> {
    const orderObjectId = this.ensureObjectId(orderId, 'order id');
    const shipperObjectId = this.ensureObjectId(shipperId, 'shipper id');

    const shipper = await this.shipperModel.findOne({
      user_id: shipperObjectId,
      is_deleted: false,
    });

    if (!shipper) {
      throw new NotFoundException('Shipper not found');
    }

    const order = await this.orderModel.findOne({
      _id: orderObjectId,
      shipper_id: shipper._id,
      is_deleted: false,
    });

    if (!order) {
      throw new NotFoundException('Order not found or not assigned to you');
    }

    if (order.status !== 'shipped') {
      throw new BadRequestException(
        `Cannot complete delivery for order with status: ${order.status}`,
      );
    }

    const previousStatus = order.status;
    order.status = 'delivered';
    order.delivered_at = new Date();
    order.payment_status = 'paid';
    order.paid_at = new Date();
    await order.save();

    const result = await this.orderModel
      .findById(orderId)
      .populate('address_id')
      .populate('items.product_id', 'name slug image_primary unit_price');

    if (
      (await this.redis.get(`shipper:${shipper._id as string}:current`)) !==
        null ||
      (await this.redis.get(`shipper:${shipper._id as string}:current`)) !== '0'
    ) {
      await this.redis.decr(`shipper:${shipper._id as string}:current`);
    }

    this.assignOrderService.drainQueue();

    if (!result) {
      throw new NotFoundException('Order not found after completion');
    }

    // Thông báo cho các staff khác
    this.notificationRealtimeService.notifyOrderStatusUpdatedByShipperToStaff({
      orderId,
      previousStatus,
      newStatus: 'delivered',
      message: 'Đơn hàng đã được giao thành công',
      timestamp: new Date(),
      updatedBy: shipperId,
      order: result,
    });

    // Thông báo cho customer
    const userId = order.user_id.toString();
    this.notificationRealtimeService.notifyCustomerOrderUpdated(userId, {
      orderId,
      previousStatus,
      newStatus: 'delivered',
      message: 'Đơn hàng của bạn đã được giao thành công',
      timestamp: new Date(),
    });

    this.orderRealtimeService.orderUpdated(userId, {
      orderId,
      previousStatus,
      newStatus: 'delivered',
      message: 'Đơn hàng của bạn đã được giao thành công',
      timestamp: new Date(),
      order: result,
    });

    return result;
  }
}
