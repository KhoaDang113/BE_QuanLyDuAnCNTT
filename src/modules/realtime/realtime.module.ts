import { Module } from '@nestjs/common';
import { RealtimeGateway } from './realtime.gateway';
import { OrderRealtimeService } from './order-realtime.service';
import { NotificationRealtimeService } from './notification-realtime.service';
import { ShipperRealtimeService } from './shipper-realtime.service';
import { ConfigModule } from '@nestjs/config';
import { CustomJwtService } from '../auth/customJwt.service';

@Module({
  imports: [ConfigModule],
  providers: [
    RealtimeGateway,
    OrderRealtimeService,
    NotificationRealtimeService,
    ShipperRealtimeService,
    CustomJwtService,
  ],
  exports: [OrderRealtimeService, NotificationRealtimeService, ShipperRealtimeService, RealtimeGateway],
})
export class RealtimeModule {}
