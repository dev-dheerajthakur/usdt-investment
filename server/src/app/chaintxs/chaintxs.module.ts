import { Module } from '@nestjs/common';
import { ChaintxsService } from './chaintxs.service';
import { ChainTxsProcessor } from './chaintxs.processor';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChainTxs } from './chaintxs.entity';
import { UsersModule } from '../users/users.module';
import { BlockchainModule } from '../blockchain/blockchain.module';
import { BullModule } from '@nestjs/bullmq';
import { TX_PROCESSING_QUEUE } from 'src/constants/queue';
import { ChaintxsController } from './chaintxs.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([ChainTxs]),
    BullModule.registerQueue({ name: TX_PROCESSING_QUEUE }),
    UsersModule,
    BlockchainModule,
  ],
  providers: [ChaintxsService, ChainTxsProcessor],
  controllers: [ChaintxsController],
  exports: [ChaintxsService]
})
export class ChaintxsModule {}
