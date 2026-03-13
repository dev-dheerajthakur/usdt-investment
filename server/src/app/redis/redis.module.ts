// redis.module.ts
import { Module } from '@nestjs/common';
import { RedisService } from './redis.provider';

@Module({
  providers: [RedisService],
  exports: [RedisService],
})
export class RedisModule {}