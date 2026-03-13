import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BlockState, BlockStatus } from './blocks.entity';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { TX_FILTERING_QUEUE } from 'src/constants/queue';

enum Environment {
  DEV = 'DEVELOPMENT',
  PROD = 'PRODUCTION',
}
const environment: Environment = Environment.DEV;

interface ProcessedBlock {
  blockNumber: string,
  blockHash: string
}

@Injectable()
export class BlockchainService {
  private readonly logger = new Logger(BlockchainService.name);

  constructor(
    @InjectRepository(BlockState)
    private readonly blockStateRepository: Repository<BlockState>,
    @InjectQueue(TX_FILTERING_QUEUE)
    private readonly txFilteringQueue: Queue,
  ) {}

  async addBlock(processedBlock: ProcessedBlock) {
    const lastProcessedBlock = await this.getLastProcessedBlock();
    const difference = Number(processedBlock.blockNumber) - lastProcessedBlock;
    const hasPreviousBlock = lastProcessedBlock > 0;

    if (hasPreviousBlock) {
      if (difference <= 0) {
        this.logger.warn(
          `Block #${processedBlock} is duplicate or out of order`,
        );
        return null;
      }

      if (environment === 'PRODUCTION' && difference > 1) {
        for (let i = 1; i < difference; i++) {
          this.enqueueBlock(lastProcessedBlock + i, true);
        }
      }
    }

    const status =
      hasPreviousBlock && difference > 1
        ? BlockStatus.WAITING
        : BlockStatus.SUCCESS;

    const entity = this.blockStateRepository.create({
      status,
      blockNumber: Number(processedBlock.blockNumber),
    });
    this.logger.log(`Block #${processedBlock.blockNumber} is stored.`);
    return this.blockStateRepository.save(entity);
  }

  async getLastProcessedBlock(): Promise<number> {
    const row = await this.blockStateRepository.find({
      where: { status: BlockStatus.SUCCESS },
      select: ['blockNumber'],
      order: { blockNumber: 'DESC' },
      take: 1,
    });

    return row[0] ? row[0].blockNumber : 0;
  }

  async enqueueBlock(blockNumber: number, isCatchUp: boolean) {
    try {
      // await this.txFilteringQueue.add(
      //   'filter-tx',
      //   {
      //     blockNumber,
      //     isCatchUp,
      //   },
      //   {
      //     jobId: `block|${blockNumber}|${Date.now()}`,
      //     attempts: 3,
      //     backoff: { type: 'exponential', delay: 2000 },
      //     removeOnComplete: { age: 3600, count: 1000 },
      //     removeOnFail: { age: 86400 },
      //   },
      // );

      const logPrefix = isCatchUp ? '🔄' : '📥';
      this.logger.log(`${logPrefix} Enqueued block ${blockNumber}`);
    } catch (error) {
      this.logger.error(`Failed to enqueue block ${blockNumber}:`, error);
      throw error;
    }
  }
}
