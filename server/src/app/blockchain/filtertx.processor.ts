import {
  InjectQueue,
  OnWorkerEvent,
  Processor,
  WorkerHost,
} from '@nestjs/bullmq';
import { Inject, Logger } from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import { UserService } from '../users/users.service';
import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';
import { BlockchainService } from './blockchain.service';
import { Tx } from '../chaintxs/chaintxs.entity';
import { TX_FILTERING_QUEUE, TX_PROCESSING_QUEUE } from 'src/constants/queue';

@Processor(TX_FILTERING_QUEUE)
export class TxFilterProcessor extends WorkerHost {
  private readonly logger = new Logger(TxFilterProcessor.name);
  private polygonAddresses: Set<string>;

  constructor(
    private readonly userSerivce: UserService,
    private readonly blockChainService: BlockchainService,
    @InjectQueue(TX_PROCESSING_QUEUE)
    private readonly txProcessingQueue: Queue,
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
  ) {
    super();
  }

  async process(job: Job<Tx>) {
    const currentBlock = Number(job.data.blockNumber);
    const currentProcessingBlock = await this.cacheManager.get<number>(
      'current-processing-block',
    );
    if (!currentProcessingBlock) {
      this.cacheManager.set('current-processing-block', currentBlock);
    } else if (currentBlock !== currentProcessingBlock) {
      //set current processing block as processed in dbf
      this.blockChainService.addBlock({
        blockHash: job.data.blockHash,
        blockNumber: job.data.blockNumber,
      });
      this.cacheManager.set('current-processing-block', currentBlock);
    }

    if (!this.polygonAddresses) {
      this.polygonAddresses = await this.userSerivce.getAllUsersAddress();
    }
    const isUsersTransaction =
      this.polygonAddresses.has(job.data.fromAddress) ||
      this.polygonAddresses.has(job.data.toAddress);
    if (isUsersTransaction) {
      this.logger.debug(
        `new transaction found: block - ${job.data.blockNumber} | Tx - ${job.data.transactionHash}`,
      );
      this.enqueuTx(job.data);
    }
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job<Tx>, error: Error) {
    this.logger.error(
      `Job ${job.id} failed for block #${job.data.blockNumber} (attempt ${job.attemptsMade}): ${error.message}`,
      error.stack,
    );
  }

  @OnWorkerEvent('stalled')
  onStalled(jobId: string) {
    this.logger.warn(`Job ${jobId} stalled`);
  }

  async enqueuTx(tx: Tx) {
    const jobId = `process-tx|${tx.blockNumber}`;
    this.logger.log(`Enqueueing txs job [jobId=${jobId}]`);

    try {
      await this.txProcessingQueue.add('process-tx', tx, {
        jobId,
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: true,
        removeOnFail: { age: 86400 },
      });
      this.logger.log(`Txs job enqueued [jobId=${jobId}]`);
    } catch (error) {
      this.logger.error(
        `Failed to enqueue txs job [jobId=${jobId}]: ${error.message}`,
        error.stack,
      );
    }
  }
}
