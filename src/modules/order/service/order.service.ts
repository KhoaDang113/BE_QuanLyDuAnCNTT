import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Model, Types, Connection } from 'mongoose';
import { Order, OrderDocument } from '../schema/order.schema';
import { Product, ProductDocument } from '../../catalog/schema/product.schema';
import { Address, AddressDocument } from '../../address/schema/address.schema';
import { CreateOrderDto } from '../dto/create-order.dto';
import { InventoryService } from '../../inventory/inventory.service';
import { OrderRealtimeService } from '../../realtime/order-realtime.service';
import { NotificationRealtimeService } from '../../realtime/notification-realtime.service';
import { DistanceCalculationService } from '../../distance/distance-calculation.service';

@Injectable()
export class OrderService {
  constructor(
    @InjectModel(Order.name)
    private readonly orderModel: Model<OrderDocument>,
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
    @InjectModel(Address.name)
    private readonly addressModel: Model<AddressDocument>,
    @InjectConnection() private readonly connection: Connection,
    private readonly inventoryService: InventoryService,
    private readonly orderRealtimeService: OrderRealtimeService,
    private readonly notificationRealtimeService: NotificationRealtimeService,
    private readonly distanceCalculationService: DistanceCalculationService,
  ) { }

  private ensureObjectId(id: string, label = 'id'): Types.ObjectId {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException(`Invalid ${label}`);
    }
    return new Types.ObjectId(id);
  }

  async createOrder(
    userId: string,
    createOrderDto: CreateOrderDto,
  ): Promise<Order> {
    const userObjectId = this.ensureObjectId(userId, 'user id');
    const addressObjectId = this.ensureObjectId(
      createOrderDto.address_id,
      'address id',
    );

    const address = await this.addressModel.findOne({
      _id: addressObjectId,
      user_id: userObjectId,
      is_deleted: false,
      is_active: true,
    });

    if (!address) {
      throw new NotFoundException('Address not found or not accessible');
    }

    const productIds = createOrderDto.items.map((item) =>
      this.ensureObjectId(item.product_id, 'product id'),
    );

    const products = await this.productModel.find({
      _id: { $in: productIds },
      is_deleted: false,
      is_active: true,
    });

    if (products.length !== productIds.length) {
      throw new NotFoundException('Some products not found or unavailable');
    }

    const insufficientStockItems: Array<{
      name: string;
      available: number;
      requested: number;
    }> = [];

    for (const item of createOrderDto.items) {
      const product = products.find(
        (p) => p._id.toString() === item.product_id,
      );

      if (!product) {
        throw new NotFoundException(`Product ${item.product_id} not found`);
      }

      const availableQuantity = product.quantity || 0;

      if (availableQuantity < item.quantity) {
        insufficientStockItems.push({
          name: product.name,
          available: availableQuantity,
          requested: item.quantity,
        });
      }
    }

    if (insufficientStockItems.length > 0) {
      const errorMessage = insufficientStockItems
        .map(
          (item) =>
            `${item.name}: Có sẵn ${item.available}, Yêu cầu ${item.requested}`,
        )
        .join('; ');
      throw new ConflictException(`Số lượng tồn kho không đủ: ${errorMessage}`);
    }

    const orderItems = createOrderDto.items.map((item) => {
      const product = products.find(
        (p) => p._id.toString() === item.product_id,
      );

      if (!product) {
        throw new NotFoundException(`Product ${item.product_id} not found`);
      }

      const unitPrice = product.unit_price;
      const discountPercent = product.discount_percent || 0;
      const totalPrice =
        unitPrice * item.quantity * (1 - discountPercent / 100);

      return {
        product_id: product._id,
        quantity: item.quantity,
        unit_price: unitPrice,
        discount_percent: discountPercent,
        total_price: Math.round(totalPrice),
      };
    });

    const subtotal = orderItems.reduce(
      (sum, item) => sum + item.total_price,
      0,
    );
    const discount = createOrderDto.discount || 0;

    const fullAddress = `${address.latitude},${address.longitude}`;
    const distanceResult =
      await this.distanceCalculationService.calculateDistanceAndFeeByAPINextbillion(
        fullAddress,
        subtotal - discount,
      );

    const shippingFee = distanceResult.shippingFee;
    const total = subtotal - discount + shippingFee;

    if (total < 0) {
      throw new BadRequestException('Total amount cannot be negative');
    }
    const isCompanyInvoice = !!createOrderDto.is_company_invoice;

    if (isCompanyInvoice && !createOrderDto.invoice_info) {
      throw new BadRequestException(
        'Invoice info is required when requesting company invoice',
      );
    }

    const session = await this.connection.startSession();
    session.startTransaction();

    try {
      const order = new this.orderModel({
        user_id: userObjectId,
        address_id: addressObjectId,
        items: orderItems,
        subtotal: Math.round(subtotal),
        discount: Math.round(discount),
        shipping_fee: Math.round(shippingFee),
        delivery_distance: distanceResult.distance,
        estimated_delivery_time: distanceResult.estimatedDeliveryTime,
        total: Math.round(total),
        status: 'pending',
        payment_status: 'pending',
        is_company_invoice: isCompanyInvoice,
        invoice_info: isCompanyInvoice ? createOrderDto.invoice_info : null,
      });

      const savedOrder = await order.save({ session });

      const orderId = savedOrder._id.toString();
      await this.inventoryService.exportInventoryForOrder(
        createOrderDto.items,
        orderId,
        session,
      );

      await session.commitTransaction();

      const result = await this.orderModel
        .findById(orderId)
        .populate('address_id')
        .populate(
          'items.product_id',
          'name slug image_primary images unit_price unit',
        );

      if (!result) {
        throw new NotFoundException('Order not found after creation');
      }

      return result;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      void session.endSession();
    }
  }

  async getOrdersByUser(userId: string): Promise<Order[]> {
    const userObjectId = this.ensureObjectId(userId, 'user id');
    return await this.orderModel
      .find({
        user_id: userObjectId,
        is_deleted: false,
      })
      .populate(
        'address_id',
        'full_name phone address ward district city zip_code',
      )
      .populate(
        'items.product_id',
        'name slug image_primary images unit_price final_price discount_percent stock_status unit',
      )
      .select(
        'user_id address_id items subtotal discount shipping_fee total status payment_status created_at updated_at is_rating',
      )
      .sort({ created_at: -1 });
  }

  async getOrderById(orderId: string, userId: string): Promise<Order> {
    const orderObjectId = this.ensureObjectId(orderId, 'order id');
    const userObjectId = this.ensureObjectId(userId, 'user id');

    const order = await this.orderModel
      .findOne({
        _id: orderObjectId,
        user_id: userObjectId,
        is_deleted: false,
      })
      .populate(
        'address_id',
        'full_name phone address ward district city zip_code',
      )
      .populate(
        'items.product_id',
        'name slug image_primary unit_price final_price discount_percent stock_status',
      );

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return order;
  }

  async getOrderByOrderId(orderId: string): Promise<Order> {
    const orderObjectId = this.ensureObjectId(orderId, 'order id');
    const order = await this.orderModel
      .findOne({
        _id: orderObjectId,
        is_deleted: false,
      })
      .populate(
        'address_id',
        'full_name phone address ward district city zip_code',
      )
      .populate(
        'items.product_id',
        'name slug image_primary unit_price final_price discount_percent stock_status',
      );

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return order;
  }

  // User hủy đơn hàng (chỉ khi pending)
  async cancelOrderByUser(
    orderId: string,
    userId: string,
    cancelReason?: string,
  ): Promise<Order> {
    const orderObjectId = this.ensureObjectId(orderId, 'order id');
    const userObjectId = this.ensureObjectId(userId, 'user id');

    const order = await this.orderModel.findOne({
      _id: orderObjectId,
      user_id: userObjectId,
      is_deleted: false,
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.status !== 'pending') {
      throw new BadRequestException(
        `Cannot cancel order with status: ${order.status}`,
      );
    }

    const session = await this.connection.startSession();
    session.startTransaction();

    try {
      const items = order.items.map((item) => ({
        product_id: item.product_id.toString(),
        quantity: item.quantity,
      }));

      await this.inventoryService.returnInventoryForOrder(
        items,
        orderId,
        session,
      );

      order.status = 'cancelled';
      order.cancelled_at = new Date();
      order.cancel_reason = cancelReason || 'Cancelled by user';

      await order.save({ session });

      await session.commitTransaction();

      const result = await this.orderModel
        .findById(orderId)
        .populate('address_id')
        .populate(
          'items.product_id',
          'name slug image_primary images unit_price unit',
        );

      if (!result) {
        throw new NotFoundException('Order not found after cancellation');
      }
      // Thông báo cho các staff khác
      await this.notificationRealtimeService.notifyOrderStatusUpdated(
        undefined,
        {
          orderId,
          previousStatus: 'pending',
          newStatus: 'cancelled',
          message: `Đơn hàng đã bị hủy vì ${cancelReason}. Bởi người dùng: ${userId.toString()}`,
          timestamp: new Date(),
          updatedBy: userId.toString(),
          order: result,
        },
      );

      return result;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      void session.endSession();
    }
  }

  // Staff xác nhận đơn hàng
  async confirmOrder(orderId: string, staffId?: string): Promise<Order> {
    const orderObjectId = this.ensureObjectId(orderId, 'order id');

    const order = await this.orderModel.findOne({
      _id: orderObjectId,
      is_deleted: false,
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.status !== 'pending') {
      throw new BadRequestException(
        `Cannot confirm order with status: ${order.status}`,
      );
    }

    const previousStatus = order.status;
    order.status = 'confirmed';
    await order.save();

    const result = await this.orderModel
      .findById(orderId)
      .populate('address_id')
      .populate('items.product_id', 'name slug image_primary unit_price');

    if (!result) {
      throw new NotFoundException('Order not found after confirmation');
    }

    // Thông báo cho các staff khác (trừ staff vừa xác nhận)
    await this.notificationRealtimeService.notifyOrderStatusUpdated(staffId, {
      orderId,
      previousStatus,
      newStatus: 'confirmed',
      message: 'Đơn hàng đã được xác nhận',
      timestamp: new Date(),
      updatedBy: staffId,
      order: result,
    });

    // Thông báo cho customer
    const userId = order.user_id.toString();
    this.notificationRealtimeService.notifyCustomerOrderUpdated(userId, {
      orderId,
      previousStatus,
      newStatus: 'confirmed',
      message: 'Đơn hàng của bạn đã được xác nhận',
      timestamp: new Date(),
    });

    return result;
  }

  // Staff cập nhật đơn hàng đang giao
  async shipOrder(orderId: string, staffId?: string): Promise<Order> {
    const orderObjectId = this.ensureObjectId(orderId, 'order id');

    const order = await this.orderModel.findOne({
      _id: orderObjectId,
      is_deleted: false,
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.status !== 'confirmed') {
      throw new BadRequestException(
        `Cannot ship order with status: ${order.status}`,
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
      throw new NotFoundException('Order not found after shipping');
    }

    // Thông báo cho các staff khác
    await this.notificationRealtimeService.notifyOrderStatusUpdated(staffId, {
      orderId,
      previousStatus,
      newStatus: 'shipped',
      message: 'Đơn hàng đang được giao',
      timestamp: new Date(),
      updatedBy: staffId,
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

    return result;
  }

  // Staff xác nhận giao hàng thành công
  async deliverOrder(orderId: string, staffId?: string): Promise<Order> {
    const orderObjectId = this.ensureObjectId(orderId, 'order id');

    const order = await this.orderModel.findOne({
      _id: orderObjectId,
      is_deleted: false,
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.status !== 'shipped') {
      throw new BadRequestException(
        `Cannot deliver order with status: ${order.status}`,
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

    if (!result) {
      throw new NotFoundException('Order not found after delivery');
    }

    // Thông báo cho các staff khác
    await this.notificationRealtimeService.notifyOrderStatusUpdated(staffId, {
      orderId,
      previousStatus,
      newStatus: 'delivered',
      message: 'Đơn hàng đã được giao thành công',
      timestamp: new Date(),
      updatedBy: staffId,
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

    return result;
  }

  // Staff hủy đơn hàng
  async cancelOrderByStaff(
    orderId: string,
    cancelReason: string,
    staffId?: string,
  ): Promise<Order> {
    const orderObjectId = this.ensureObjectId(orderId, 'order id');

    const order = await this.orderModel.findOne({
      _id: orderObjectId,
      is_deleted: false,
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (['delivered', 'cancelled'].includes(order.status)) {
      throw new BadRequestException(
        `Cannot cancel order with status: ${order.status}`,
      );
    }

    const session = await this.connection.startSession();
    session.startTransaction();

    try {
      const previousStatus = order.status;

      if (order.status !== 'cancelled') {
        const items = order.items.map((item) => ({
          product_id: item.product_id.toString(),
          quantity: item.quantity,
        }));

        await this.inventoryService.returnInventoryForOrder(
          items,
          orderId,
          session,
        );
      }

      order.status = 'cancelled';
      order.cancelled_at = new Date();
      order.cancel_reason = cancelReason || 'Cancelled by staff';

      await order.save({ session });

      await session.commitTransaction();

      const result = await this.orderModel
        .findById(orderId)
        .populate('address_id')
        .populate(
          'items.product_id',
          'name slug image_primary images unit_price unit',
        );

      if (!result) {
        throw new NotFoundException('Order not found after cancellation');
      }

      // Thông báo cho các staff khác
      await this.notificationRealtimeService.notifyOrderStatusUpdated(staffId, {
        orderId,
        previousStatus,
        newStatus: 'cancelled',
        message: `Đơn hàng đã bị hủy: ${cancelReason}`,
        timestamp: new Date(),
        updatedBy: staffId,
        order: result,
      });

      // Thông báo cho customer
      const userId = order.user_id.toString();
      this.notificationRealtimeService.notifyCustomerOrderUpdated(userId, {
        orderId,
        previousStatus,
        newStatus: 'cancelled',
        message: `Đơn hàng của bạn đã bị hủy: ${cancelReason}`,
        timestamp: new Date(),
      });

      return result;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      void session.endSession();
    }
  }

  // Staff lấy tất cả đơn hàng (có phân trang)
  async getAllOrders(
    page = 1,
    limit = 20,
    status?: string,
  ): Promise<{
    orders: Order[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const skip = (page - 1) * limit;

    const filter: { is_deleted: boolean; status?: string } = {
      is_deleted: false,
    };
    if (status) {
      filter.status = status;
    }

    const [orders, total] = await Promise.all([
      this.orderModel
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        .find(filter)
        .populate('user_id', 'name email phone')
        .populate('address_id')
        .populate(
          'items.product_id',
          'name slug image_primary images unit_price unit',
        )
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit),
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      this.orderModel.countDocuments(filter),
    ]);

    return {
      orders,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }
}
