import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { ChaintxsService } from './chaintxs.service';
import { BlockchainService } from '../blockchain/blockchain.service';
import { ContractEventPayload } from 'ethers';
import { Tx } from './chaintxs.entity';
import { TX_PROCESSING_QUEUE } from 'src/constants/queue';


@Processor(TX_PROCESSING_QUEUE)
export class ChainTxsProcessor extends WorkerHost {
  constructor(
    private readonly chainTxsService: ChaintxsService,
  ) {
    super();
  }
  async process(job: Job<Tx>) {
    console.log("new Transaction Found !!")
    const res = await this.chainTxsService.processTx(job.data);
  }
}
