// verification.worker.ts
import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import { verificationQueue } from './user-verification.queue';

const connection = new IORedis();

new Worker(
  'user-verification',
  async (job) => {
    const { userId } = job.data;
    console.log(userId)

    // Step 1 — Email check
    // await verifyEmail(userId);

    // // Step 2 — KYC
    // await runKYC(userId);

    // // Step 3 — Fraud scan
    // await fraudCheck(userId);

    // // Finalize
    // await markVerified(userId);
  },
  { connection },
);

// async function add() {
//   await verificationQueue.add(
//     'verify-user',
//     {
//       userId: user.id,
//     },
//     {
//       attempts: 5,
//       backoff: 5000,
//     },
//   );
// }
