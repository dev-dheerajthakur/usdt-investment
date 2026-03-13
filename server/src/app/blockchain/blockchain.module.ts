import { Module } from '@nestjs/common';
import { BlockchainService } from './blockchain.service';
import { BullModule } from '@nestjs/bullmq';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BlockState } from './blocks.entity';
import { CacheModule } from '@nestjs/cache-manager';
import { UsersModule } from '../users/users.module';
import { TxFilterProcessor } from './filtertx.processor';
import { MonitorUsdtTx } from './usdtTx.monitor';
import { TX_FILTERING_QUEUE, TX_PROCESSING_QUEUE } from 'src/constants/queue';

@Module({
  imports: [
    BullModule.registerQueue({
      name: TX_FILTERING_QUEUE
    }),
    BullModule.registerQueue({
      name: TX_PROCESSING_QUEUE
    }),
    CacheModule.register(),
    TypeOrmModule.forFeature([BlockState]),
    UsersModule
  ],
  providers: [BlockchainService, TxFilterProcessor, MonitorUsdtTx],
  exports: [BlockchainService]
})
export class BlockchainModule {}
