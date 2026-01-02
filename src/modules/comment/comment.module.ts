// ===================================================================
// COMMENT MODULE - MODULE QUẢN LÝ BÌNH LUẬN SẢN PHẨM
// ===================================================================
// File: comment.module.ts
// Mô tả: Module NestJS đăng ký các thành phần cho tính năng bình luận
// Bao gồm:
//   - CommentController: xử lý các API endpoint
//   - CommentService: logic nghiệp vụ
//   - Comment Schema: định nghĩa cấu trúc dữ liệu MongoDB
// Dependencies:
//   - NotificationModule: gửi thông báo khi có reply
// ===================================================================

import { MongooseModule } from '@nestjs/mongoose';
import { Comment, CommentSchema } from './schema/comment.schema';
import { CommentController } from './comment.controller';
import { CommentService } from './comment.service';
import { Module } from '@nestjs/common';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [
    // Đăng ký Comment Schema với Mongoose
    MongooseModule.forFeature([{ name: Comment.name, schema: CommentSchema }]),
    // Import NotificationModule để sử dụng NotificationService và NotificationRealtimeService
    NotificationModule,
  ],
  // Đăng ký controller xử lý các request HTTP
  controllers: [CommentController],
  // Đăng ký các service provider
  providers: [CommentService],
  // Export CommentService để các module khác có thể sử dụng
  exports: [CommentService],
})
export class CommentModule { }
