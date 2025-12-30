import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthModule } from './modules/auth/auth.module';
import { CatalogModule } from './modules/catalog/catalog.module';
import { CloudinaryModule } from './shared/cloudinary/cloudinary.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { APP_GUARD } from '@nestjs/core';
import { UserModule } from './modules/users/user.module';
import { AddressModule } from './modules/address/address.module';
import { CommentModule } from './modules/comment/comment.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { OrderModule } from './modules/order/order.module';
import { BullModule } from '@nestjs/bullmq';
import { RealtimeModule } from './modules/realtime/realtime.module';
import { PaymentModule } from './modules/payment/payment.module';
import { ChatModule } from './modules/chat/chat.module';
import { StaffModule } from './modules/staff/staff.module';
import { RedisModule } from './shared/redis/redis.module';
import { MailerModule } from './shared/mailer/mailer.module';
import { NotificationModule } from './modules/notification/notification.module';
import { OrderRatingModule } from './modules/order-rating/order-rating.module';
import { ShipperModule } from './modules/shipper/shipper.module';
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [`.env.${process.env.NODE_ENV}`, '.env'],
    }),
    ScheduleModule.forRoot(),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const uri = configService.get<string>('MONGODB_URI');
        return {
          uri: uri,
          useNewUrlParser: true,
          useUnifiedTopology: true,
          retryAttempts: 3,
          retryDelay: 1000,
        };
      },
      inject: [ConfigService],
    }),

    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get<string>('REDIS_HOST') || 'localhost',
          port: config.get<number>('REDIS_PORT') || 6379,
          password: config.get<string>('REDIS_PASSWORD'),
        },
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 1000,
          },
          removeOnComplete: 100,
          removeOnFail: 500,
        },
      }),
      inject: [ConfigService],
    }),
    AuthModule,
    CatalogModule,
    CloudinaryModule,
    UserModule,
    AddressModule,
    CommentModule,
    NotificationModule,
    InventoryModule,
    OrderModule,
    PaymentModule,
    RealtimeModule,
    ChatModule,
    StaffModule,
    RedisModule,
    MailerModule,
    OrderRatingModule,
    ShipperModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
