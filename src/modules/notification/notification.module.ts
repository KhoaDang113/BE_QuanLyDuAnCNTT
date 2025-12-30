import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';
import { Notification, NotificationSchema } from './schema/notification.schema';
import { RealtimeModule } from '../realtime/realtime.module';
import { NotificationRealtimeService } from '../realtime/notification-realtime.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Notification.name, schema: NotificationSchema },
    ]),
    RealtimeModule,
  ],
  controllers: [NotificationController],
  providers: [NotificationService, NotificationRealtimeService],
  exports: [NotificationService, NotificationRealtimeService],
})
export class NotificationModule {}
