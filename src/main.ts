import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import cookieParser from 'cookie-parser';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Cấu hình cookie parser middleware
  app.use(cookieParser());

  // Cấu hình CORS để hỗ trợ cookies
  app.enableCors({
    origin: true, // Hoặc chỉ định domain cụ thể
    credentials: true, // Quan trọng để hỗ trợ cookies
  });

  // Bật validation tự động cho tất cả DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Loại bỏ các field không có trong DTO
      forbidNonWhitelisted: true, // Throw error nếu có field không hợp lệ
      transform: true, // Tự động transform types (string -> number, etc)
    }),
  );

  // Thiết lập global prefix cho API
  app.setGlobalPrefix('api');

  await app.listen(process.env.PORT ?? 3000);
  console.log(`Server is running on port ${process.env.PORT ?? 3000}`);
}
void bootstrap();
