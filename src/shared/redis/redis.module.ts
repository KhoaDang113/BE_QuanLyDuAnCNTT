import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: 'REDIS',
      useFactory: (config: ConfigService) => {
        const host = config.get<string>('REDIS_HOST') || '127.0.0.1';
        const port = Number(config.get<number>('REDIS_PORT') || 6379);
        const password = config.get<string>('REDIS_PASSWORD') || undefined;
        return new Redis({ host, port, password });
      },
      inject: [ConfigService],
    },
  ],
  exports: ['REDIS'],
})
export class RedisModule {}
