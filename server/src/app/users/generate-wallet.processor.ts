import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { GENERATE_WALLET_QUEUE } from 'src/constants/queue';
import { WalletService } from '../wallet/wallet.service';

interface JobData {
  userId: string;
}

@Processor(GENERATE_WALLET_QUEUE)
export class GenerateWalletProcessor extends WorkerHost {
  constructor(
    private readonly walletService: WalletService
  ) {
    super();
  }

  async process(job: Job<JobData>) {
    await this.generateWallet(job.data);
  }

  private async generateWallet(data: JobData) {
    await this.walletService.createWallet(data.userId)
  }
}
