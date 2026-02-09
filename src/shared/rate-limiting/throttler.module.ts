import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { FastifyThrottlerGuard } from './fastify-throttler.guard';

@Module({
  imports: [
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [
          {
            name: 'short',
            ttl: 60000, // 1분
            limit: config.get<number>('THROTTLE_LIMIT', 20), // 기본 20회
          },
          {
            name: 'long',
            ttl: 3600000, // 1시간
            limit: config.get<number>('THROTTLE_LIMIT_LONG', 200), // 기본 200회
          },
        ],
        errorMessage: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.',
      }),
    }),
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: FastifyThrottlerGuard,
    },
  ],
  exports: [ThrottlerModule],
})
export class RateLimitingModule {}
