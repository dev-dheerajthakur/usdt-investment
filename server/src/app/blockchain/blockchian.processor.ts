// import {
//   InjectQueue,
//   OnWorkerEvent,
//   Processor,
//   WorkerHost,
// } from '@nestjs/bullmq';
// import { Logger } from '@nestjs/common';
// import { Job, Queue } from 'bullmq';
// import {
//   BLOCK_PROCESSING_QUEUE,
//   TXS_PROCESSING_QUEUE,
// } from 'src/constants/queue';
// import { UserService } from '../users/users.service';
// import { ethers } from 'ethers';

// interface JobData {
//   blockNumber: number;
//   isCached: boolean;
// }

// interface Config {
//   rpcUrl: string;
//   usdtAddress: string;
//   usdtABI: string[];
// }

// interface CompleteEventResult {
//   transactions?: ParsedTransaction[];
//   message?: string;
// }

// const USDT_ABI = [
//   'event Transfer(address indexed from, address indexed to, uint256 value)',
//   'function balanceOf(address account) view returns (uint256)',
// ];
// const USDT_ADDRESS = '0xc2132D05D31c914a87C6611C10748AEb04B58e8F';

// @Processor(BLOCK_PROCESSING_QUEUE)
// export class BlockProcessor extends WorkerHost {
//   private readonly logger = new Logger(BlockProcessor.name);

//   provider: ethers.Provider;
//   usdtContract: ethers.Contract;
//   config: Config;

//   constructor(
//     private readonly userSerivce: UserService,
//     @InjectQueue(TXS_PROCESSING_QUEUE)
//     private readonly txsQueue: Queue,
//   ) {
//     super();
//     this.config = {
//       rpcUrl: process.env.POLYGON_RPC_URL || 'https://polygon-rpc.com',
//       usdtAddress: USDT_ADDRESS,
//       usdtABI: USDT_ABI,
//     };
//     this.provider = new ethers.JsonRpcProvider(this.config.rpcUrl);
//     this.usdtContract = new ethers.Contract(
//       this.config.usdtAddress,
//       USDT_ABI,
//       this.provider,
//     );
//     this.logger.log(`Initialized with RPC: ${this.config.rpcUrl}`);
//   }

//   async process(job: Job<JobData>): Promise<CompleteEventResult> {
//     const { blockNumber } = job.data;
//     this.logger.log(`Processing block #${blockNumber}`);

//     const block = await this.provider.getBlock(blockNumber, false);
//     this.logger.debug(
//       `block data found: block - ${blockNumber}; hash - ${block?.hash}`,
//     );
//     return { message: 'hukalula '}

//     // const [allAddresses, block] = await Promise.all([
//     //   this.userSerivce.getAllUsersAddress(),
//     //   this.provider.getBlock(blockNumber, true),
//     // ]);

//     // if (!block) {
//     //   this.logger.warn(`Block #${blockNumber} not found on chain`);
//     //   return { message: 'block not found' };
//     // }

//     // const txs = block.prefetchedTransactions;

//     // if (!txs?.length) {
//     //   this.logger.warn(`Block #${blockNumber} has no transactions`);
//     //   return { message: 'no txs found' };
//     // }

//     // if (!allAddresses?.size) {
//     //   this.logger.warn(
//     //     `No registered user addresses found, skipping block #${blockNumber}`,
//     //   );
//     //   return { message: 'no addresses found' };
//     // }

//     // this.logger.log(
//     //   `Block #${blockNumber} — ${txs.length} total txs, ${allAddresses.size} watched addresses`,
//     // );

//     // const [polTxs, usdtTxs] = await Promise.all([
//     //   this.filterPolTransactions(txs, allAddresses),
//     //   this.filterUsdtTransactions(blockNumber, allAddresses),
//     // ]);

//     // this.logger.log(
//     //   `Block #${blockNumber} filtered — POL txs: ${polTxs.length}, USDT txs: ${usdtTxs.length}`,
//     // );

//     // return { transactions: [...polTxs, ...usdtTxs] };
//   }

//   @OnWorkerEvent('completed')
//   onComplete(job: Job<JobData>, result: CompleteEventResult) {
//     if (result.transactions) {
//       this.logger.log(
//         `Job ${job.id} completed for block #${job.data.blockNumber} — enqueueing ${result.transactions.length} TXS`,
//       );
//       this.enqueuTxs(result.transactions);
//     } else {
//       this.logger.debug(
//         `Job ${job.id} completed with no data: "${result.message}"`,
//       );
//     }
//   }

//   @OnWorkerEvent('failed')
//   onFailed(job: Job<JobData>, error: Error) {
//     this.logger.error(
//       `Job ${job.id} failed for block #${job.data.blockNumber} (attempt ${job.attemptsMade}): ${error.message}`,
//       error.stack,
//     );
//   }

//   @OnWorkerEvent('stalled')
//   onStalled(jobId: string) {
//     this.logger.warn(`Job ${jobId} stalled`);
//   }

//   async enqueuTxs(txs: CompleteEventResult['transactions']) {
//     if (!txs?.length) {
//       this.logger.warn('No transactions to enqueue.');
//       return;
//     }
//     const jobId = `block-txs|${txs[0].blockNumber}|${Date.now()}`;
//     this.logger.log(`Enqueueing txs job [jobId=${jobId}]`);

//     try {
//       await this.txsQueue.add('process-txs', txs, {
//         jobId,
//         attempts: 3,
//         backoff: { type: 'exponential', delay: 2000 },
//         removeOnComplete: { age: 3600, count: 1000 },
//         removeOnFail: { age: 86400 },
//       });
//       this.logger.log(`Txs job enqueued [jobId=${jobId}]`);
//     } catch (error) {
//       this.logger.error(
//         `Failed to enqueue txs job [jobId=${jobId}]: ${error.message}`,
//         error.stack,
//       );
//     }
//   }

//   filterPolTransactions(
//     txs: ethers.TransactionResponse[],
//     addresses: Set<string>,
//   ): ParsedTransaction[] {
//     const simpleTransfers = txs.filter((tx) => {
//       const isSimpleTransfer = !tx.data || tx.data === '0x';
//       const hasValue = tx.value > BigInt(0);
//       return isSimpleTransfer && hasValue;
//     });

//     const filtered: ParsedTransaction[] = simpleTransfers
//       .filter((tx) => {
//         return addresses.has(tx.from) || addresses.has(tx.to ?? '');
//       })
//       .map((tx) => ({
//         token: Token.POL,
//         blockNumber: tx.blockNumber ?? 0,
//         blockHash: tx.blockHash ?? '',
//         transactionHash: tx.hash,
//         transactionIndex: tx.index,
//         from: tx.from,
//         to: tx.to ?? '',
//         value: tx.value.toString(), // bigint → string
//         data: tx.data,
//       }));

//     this.logger.debug(
//       `POL filter — ${txs.length} total → ${simpleTransfers.length} simple transfers → ${filtered.length} matched`,
//     );

//     return filtered;
//   }

//   async filterUsdtTransactions(
//     blockNumber: number,
//     addresses: Set<string>,
//   ): Promise<ParsedTransaction[]> {
//     this.logger.debug(
//       `Querying USDT Transfer events for block #${blockNumber}`,
//     );

//     try {
//       const filter = this.usdtContract.filters.Transfer();
//       const events = await this.usdtContract.queryFilter(
//         filter,
//         blockNumber,
//         blockNumber,
//       );
//       const parsed: ParsedTransaction[] = events
//         .filter((e): e is ethers.EventLog => 'args' in e)
//         .map((e) => {
//           const from = e.args[0] as string;
//           const to = e.args[1] as string;
//           const value = (e.args[2] as bigint).toString();

//           return {
//             token: Token.USDT,
//             blockNumber: e.blockNumber ?? 0,
//             blockHash: e.blockHash ?? '',
//             transactionHash: e.transactionHash,
//             transactionIndex: e.transactionIndex,
//             from: from,
//             to: to ?? '',
//             value: value.toString(), // bigint → string
//             data: e.data,
//           };
//         })
//         .filter((e) => addresses.has(e.to) || addresses.has(e.from));

//       this.logger.debug(
//         `USDT filter — ${events.length} total → ${parsed.length} matched`,
//       );

//       return parsed;
//     } catch (error) {
//       this.logger.error(
//         `Failed to query USDT events for block #${blockNumber}: ${error.message}`,
//         error.stack,
//       );
//       return [];
//     }
//   }
// }
