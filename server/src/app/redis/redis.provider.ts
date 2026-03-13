// redis.provider.ts
import { createClient, RedisClientType } from 'redis';
import { OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';

export class RedisService implements OnModuleInit, OnModuleDestroy {
  public client: RedisClientType;
  logger = new Logger(RedisService.name);


  async onModuleInit() {
    this.client = createClient({
      url: 'redis://localhost:6379',
    });

    await this.client.connect();
    this.logger.log('Redis connected');
  }

  async onModuleDestroy() {
    await this.client.quit();
  }
}