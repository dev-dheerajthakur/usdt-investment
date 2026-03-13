// verification.queue.ts
import { Queue } from 'bullmq';
import IORedis from 'ioredis';

const connection = new IORedis();

export const verificationQueue = new Queue('user-verification', {
  connection,
});
