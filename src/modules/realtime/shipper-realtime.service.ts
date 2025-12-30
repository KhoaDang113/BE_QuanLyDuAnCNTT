import { Injectable, Logger } from '@nestjs/common';
import { RealtimeGateway } from './realtime.gateway';

@Injectable()
export class ShipperRealtimeService {
  private readonly logger = new Logger(ShipperRealtimeService.name);

  constructor(private readonly realtimeGateway: RealtimeGateway) {}

  notifyNewOrderToShippers(payload: {
    orderId: string;
    message: string;
    order: any;
  }) {
    this.logger.log(
      `Notifying all online shippers about new order: ${payload.orderId}`,
    );
    this.realtimeGateway.emitToAllShippers('new-order', payload);
  }

  notifyOrderAssigned(shipperId: string, payload: {
    orderId: string;
    message: string;
    order: any;
  }) {
    this.logger.log(`Notifying shipper ${shipperId} about order assignment`);
    this.realtimeGateway.emitToUser(shipperId, 'order-assigned', payload);
  }

  notifyOrderStatusUpdate(payload: {
    orderId: string;
    previousStatus: string;
    newStatus: string;
    message: string;
    timestamp: Date;
  }) {
    this.logger.log(`Notifying about order ${payload.orderId} status update`);
    this.realtimeGateway.emitToAllShippers('order-status-updated', payload);
  }

  notifyShipperStatusChanged(shipperId: string, payload: {
    shipperId: string;
    isOnline: boolean;
    timestamp: Date;
  }) {
    this.logger.log(
      `Shipper ${shipperId} status changed to ${payload.isOnline ? 'online' : 'offline'}`,
    );
    // Notify staff about shipper status changes if needed
    this.realtimeGateway.emitToAllStaff('shipper-status-changed', payload);
  }
}
