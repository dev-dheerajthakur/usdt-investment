import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { INVESTMENT_REQ_REVIEW_QUEUE } from 'src/constants/queue';

type JobData = {
  userId: string;
  unit: number;
};

@Processor(INVESTMENT_REQ_REVIEW_QUEUE)
export class InvestmentReqReviewProcessor extends WorkerHost {
  async process(job: Job<JobData>): Promise<any> {
    // return await this.investmentService.create(job.data.userId, job.data.unit)
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job<JobData>, error: Error) {
    console.log(
      `Job ${job.id} failed for user ${job.data.userId} (attempt ${job.attemptsMade}): ${error.message}`,
      error.stack,
    );
  }
}
