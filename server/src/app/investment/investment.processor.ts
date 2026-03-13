import {
  InjectQueue,
  OnWorkerEvent,
  Processor,
  WorkerHost,
} from '@nestjs/bullmq';
import { Job, Queue } from 'bullmq';
import {
  Transactions,
  TransactionStatus,
  TransactionType,
} from 'src/app/transactions/transactions.entity';
import { User } from 'src/app/users/users.entity';
import { INVESTMENT_DEAD_QUEUE, INVESTMENT_QUEUE } from 'src/constants/queue';
import { DataSource } from 'typeorm';
import { Investment, InvestmentStatus } from './investment.entity';
import { InvestmentService } from './investment.service';

type JobData = {
  polygonAddress: string;
  unit: number;
};

@Processor(INVESTMENT_QUEUE)
export class InvestmentProcessor extends WorkerHost {
  constructor(
    private readonly investmentService: InvestmentService,
    @InjectQueue(INVESTMENT_DEAD_QUEUE)
    private readonly investmentDeadQueue: Queue,
  ) {
    super();
  }
  async process(job: Job<JobData>): Promise<any> {
    this.investmentService.processInvestment(
      job.data.polygonAddress,
      job.data.unit,
    );
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job<JobData>, error: Error) {
    this.investmentDeadQueue.add(
      'failed-investment',
      {
        polygonAddress: job.data.polygonAddress,
        unit: job.data.unit,
        errorMessage: error.message,
        stack: error.stack,
        attemptsMade: job.attemptsMade,
      },
      { removeOnComplete: true, removeOnFail: 24 * 3600 },
    );
  }
}
