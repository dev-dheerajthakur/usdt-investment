// import { InjectQueue } from '@nestjs/bullmq';
// import { Injectable } from '@nestjs/common';
// import { Queue } from 'bullmq';
// import { ethers, EventLog, TransactionResponse } from 'ethers';
// import { BLOCK_PROCESSING_QUEUE } from 'src/constants/queue';
// import { BlockchainService } from '../blockchain.service';

// interface Config {
//   rpcUrl: string;
//   usdtAddress: string; // USDT on Polygon
//   pollingInterval: number; // 30 seconds
//   maxRetries: number;
//   cacheTimeout: number; // 60 seconds
//   batchSize: number; // For processing large address lists
// }

// // USDT ABI - only need Transfer event and balanceOf
// const USDT_ABI = [
//   'event Transfer(address indexed from, address indexed to, uint256 value)',
//   'function balanceOf(address account) view returns (uint256)',
// ];

// // @Injectable()
// export class BlockChainMonitor {
//   config: Config;
//   provider: ethers.JsonRpcProvider;
//   usdtContract: ethers.Contract;
//   lastProcessedBlock: number;
//   cachedAddresses: string[];
//   cacheTime: number;
//   pollingTimer: number | null;
//   constructor(
//     private readonly blockchainService: BlockchainService,
//     @InjectQueue(BLOCK_PROCESSING_QUEUE)
//     private readonly blockQueue: Queue,
//   ) {
//     // Configuration
//     this.config = {
//       rpcUrl: process.env.POLYGON_RPC_URL || 'https://polygon-rpc.com',
//       usdtAddress: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F', // USDT on Polygon
//       pollingInterval: 30000, // 30 seconds
//       maxRetries: 3,
//       cacheTimeout: 60000, // 60 seconds
//       batchSize: 100, // For processing large address lists
//     };

//     // Initialize provider with fallback
//     // Initialize USDT contract
//     this.provider = new ethers.JsonRpcProvider(this.config.rpcUrl);
//     this.usdtContract = new ethers.Contract(
//       this.config.usdtAddress,
//       USDT_ABI,
//       this.provider,
//     );

//     // State
//     this.lastProcessedBlock = 0;
//     this.cachedAddresses = [];
//     this.cacheTime = 0;
//     // this.isProcessing = false;
//     // this.pollingTimer = null;
//   }

//   async start() {
//     try {
//       console.log('🔍 Starting Transactions monitor...');

//       // Verify connection
//       await this.verifyConnection();

//       // Load last processed block from database
//       this.lastProcessedBlock =
//         await this.blockchainService.getLastProcessedBlock();
//       console.log(`📍 Starting from block: ${this.lastProcessedBlock}`);

//       // Pre-load address cache
//       await this.getDepositAddresses();
//       console.log(`✅ Cached ${this.cachedAddresses.length} deposit addresses`);

//       // Start real-time block listener
//       this.startBlockListener();

//       // Start backup polling
//       this.startBackupPolling();

//       console.log('✅ Deposit monitor started successfully');
//     } catch (error) {
//       console.error('❌ Failed to start deposit monitor:', error);
//       throw error;
//     }
//   }

//   async verifyConnection() {
//     try {
//       const network = await this.provider.getNetwork();
//       console.log(
//         `🔗 Connected to network: ${network.name} (chainId: ${network.chainId})`,
//       );

//       // Verify it's Polygon
//       if (network.chainId !== BigInt(137)) {
//         throw new Error(
//           `Wrong network! Expected Polygon (137), got ${network.chainId}`,
//         );
//       }

//       return true;
//     } catch (error) {
//       console.error('Connection verification failed:', error);
//       throw error;
//     }
//   }

//   startBlockListener() {
//     console.log('👂 Starting real-time block listener...');

//     this.provider.on('block', async (blockNumber: number) => {
//       try {
//         await this.processBlock(blockNumber);

//         await this.blockQueue.add(
//           'process-block',
//           { blockNumber },
//           {
//             jobId: `block-${blockNumber}`, // prevents duplicates
//           },
//         );

//         console.log(`📥 Enqueued block ${blockNumber}`);
//       } catch (error) {
//         console.error(
//           `Error in block listener for block ${blockNumber}:`,
//           error,
//         );
//       }
//     });

//     // Handle connection errors
//     this.provider.on('error', (error) => {
//       console.error('Provider error:', error);
//       // Implement reconnection logic here
//       this.reconnect();
//     });
//   }

//   startBackupPolling() {
//     console.log('🔄 Starting backup polling (every 30s)...');

//     // this.pollingTimer = setInterval(async () => {
//     //   try {
//     //     await this.catchUpMissedBlocks();
//     //   } catch (error) {
//     //     console.error('Error in backup polling:', error);
//     //   }
//     // }, this.config.pollingInterval);
//   }

//   async processBlock(blockNumber: number) {
//     // Prevent concurrent execution
//     // if (this.isProcessing) return;

//     // this.isProcessing = true;
//     const startTime = Date.now();

//     try {
//       console.log(`\n🔍 Processing block ${blockNumber}...`);

//       // Get all user deposit addresses (cached)
//       const depositAddresses = await this.getDepositAddresses();

//       if (!depositAddresses || depositAddresses.size === 0) {
//         console.log('⚠️  No deposit addresses found');
//         return;
//       }

//       // Check for USDT transfers TO any deposit address
//       // Note: queryFilter has limitations, so we process in batches
//       const usdtTransactions = await this.getUSDTTransactions(
//         blockNumber,
//         depositAddresses,
//       );

//       // setup transaction not only deposites....

//       // Process each deposit
//       if (usdtTransactions.length > 0) {
//         console.log(
//           `💰 Found ${usdtTransactions.length} USDT deposit(s) in block ${blockNumber}`,
//         );

//         for (const event of usdtTransactions) {
//           await this.handleUSDTTransactions(event);
//         }
//       }

//       // Check for POL (native token) deposits
//       const polTransactions = await this.getPOLTransactions(
//         blockNumber,
//         depositAddresses,
//       );

//       if (polTransactions.length > 0) {
//         console.log(
//           `💎 Found ${polTransactions.length} POL deposit(s) in block ${blockNumber}`,
//         );

//         for (const transaction of polTransactions) {
//           await this.handlePOLTransactions(transaction);
//         }
//       }

//       // Update last processed block
//       await this.blockchainService.createBlockState(blockNumber, true);
//       this.lastProcessedBlock = blockNumber;

//       const duration = Date.now() - startTime;
//       console.log(`✅ Block ${blockNumber} processed in ${duration}ms`);
//     } catch (error) {
//       console.error(`❌ Error processing block ${blockNumber}:`, error);

//       // Retry logic
//       await this.retryProcessBlock(blockNumber);
//     } finally {
//       // this.isProcessing = false;
//     }
//   }

//   async getUSDTTransactions(
//     blockNumber: number,
//     depositAddresses: Set<string>,
//   ): Promise<EventLog[]> {
//     try {
//       const filter = this.usdtContract.filters.Transfer();
//       const events = await this.usdtContract.queryFilter(
//         filter,
//         blockNumber,
//         blockNumber,
//       );

//       const filteredEvents = events
//         .filter((e): e is EventLog => {
//           return 'args' in e;
//         })
//         .filter((e) => {
//           return (
//             depositAddresses.has(e.args.to) || depositAddresses.has(e.args.from)
//           );
//         });

//       return filteredEvents;
//     } catch (error) {
//       console.error('Error querying USDT deposits:', error);

//       // Fallback: Get all Transfer events in block and filter manually
//       return [];
//     }
//   }

//   // async fallbackFindDeposits(blockNumber, depositAddresses) {
//   //   try {
//   //     // Get all Transfer events in this block
//   //     const filter = this.usdtContract.filters.Transfer();
//   //     const allEvents = await this.usdtContract.queryFilter(
//   //       filter,
//   //       blockNumber,
//   //       blockNumber,
//   //     );

//   //     // Convert addresses to lowercase for comparison
//   //     const addressSet = new Set(depositAddresses.map((a) => a.toLowerCase()));

//   //     // Filter events where 'to' is one of our addresses
//   //     return allEvents.filter((event) =>
//   //       addressSet.has(event.args.to.toLowerCase()),
//   //     );
//   //   } catch (error) {
//   //     console.error('Fallback deposit search failed:', error);
//   //     return [];
//   //   }
//   // }

//   async getPOLTransactions(
//     blockNumber: number,
//     depositAddresses: Set<string>,
//   ): Promise<TransactionResponse[]> {
//     try {
//       // Get the full block with transactions
//       const block = await this.provider.getBlock(blockNumber);
//       const txs = block?.prefetchedTransactions;

//       if (!txs) return [];

//       const polTXS = txs?.filter((tx) => {
//         const isSimpleTransfer = !tx.data || tx.data === '0x';
//         const hasValue = tx.value > BigInt(0);
//         return isSimpleTransfer && hasValue;
//       });

//       // Convert addresses to lowercase for comparison
//       const addressSet = new Set(
//         Array.from(depositAddresses).map((a) => a.toLowerCase()),
//       );

//       // Filter transactions that are POL transfers to our addresses
//       const filteredPolTXS = polTXS?.filter((tx) => {
//         const txfFrom = tx.from.toLowerCase();
//         const txTO = tx.to?.toLowerCase() || 'null';
//         return addressSet.has(txfFrom) || addressSet.has(txTO);
//       });

//       return filteredPolTXS;
//     } catch (error) {
//       console.error('Error checking POL deposits:', error);
//       return [];
//     }
//   }

//   async handleUSDTTransactions(event: EventLog) {
//     // try {
//     //   const { to, value, from } = event.args;
//     //   const amount = ethers.formatUnits(value, 6); // USDT has 6 decimals
//     //   const txHash = event.transactionHash;
//     //   console.log(
//     //     `💰 Transaction detected: ${amount} USDT to ${to} from ${from}`,
//     //   );
//     //   console.log(`   From: ${from}, To: ${to} Tx: ${txHash}`);
//     //   // Find user by deposit address
//     //   const user = await db.query(
//     //     'SELECT id, deposit_address FROM users WHERE LOWER(deposit_address) = LOWER($1)',
//     //     [to],
//     //   );
//     //   if (!user || user.rows.length === 0) {
//     //     console.warn(`⚠️  Unknown deposit address: ${to}`);
//     //     // Log to a separate table for investigation
//     //     await db.logUnknownDeposit(to, amount, txHash);
//     //     return;
//     //   }
//     //   const userId = user.rows[0].id;
//     //   // Check if already processed (prevent duplicates)
//     //   const existing = await db.query(
//     //     'SELECT id FROM transactions WHERE tx_hash = $1',
//     //     [txHash],
//     //   );
//     //   if (existing && existing.rows.length > 0) {
//     //     console.log(`⏭️  Transaction already processed: ${txHash}`);
//     //     return;
//     //   }
//     //   // Start database transaction for atomicity
//     //   await db.beginTransaction();
//     //   try {
//     //     // Record transaction
//     //     await db.query(
//     //       `
//     //                 INSERT INTO transactions (
//     //                     user_id,
//     //                     tx_hash,
//     //                     type,
//     //                     amount,
//     //                     token,
//     //                     status,
//     //                     from_address,
//     //                     to_address,
//     //                     created_at
//     //                 )
//     //                 VALUES ($1, $2, 'deposit', $3, 'USDT', 'confirmed', $4, $5, NOW())
//     //             `,
//     //       [userId, txHash, amount, from, to],
//     //     );
//     //     // Update user's investment
//     //     await this.createOrUpdateInvestment(userId, parseFloat(amount));
//     //     // Commit transaction
//     //     await db.commitTransaction();
//     //     console.log(`✅ Deposit processed for user ${userId}`);
//     //     // Post-processing (non-critical, can fail without rollback)
//     //     try {
//     //       // Queue consolidation (async, non-blocking)
//     //       await this.queueConsolidation(userId, to, amount);
//     //       // Send notification to user
//     //       await this.notifyUser(userId, 'deposit', amount, txHash);
//     //     } catch (error) {
//     //       console.error('Error in post-processing:', error);
//     //       // Don't throw - deposit is already recorded
//     //     }
//     //   } catch (error) {
//     //     await db.rollbackTransaction();
//     //     throw error;
//     //   }
//     // } catch (error) {
//     //   console.error('Error handling deposit:', error);
//     //   throw error;
//     // }
//   }

//   async handlePOLTransactions(deposit) {
//     // try {
//     //   const { to, from, value, hash } = deposit;
//     //   const amount = ethers.utils.formatEther(value);
//     //   console.log(`💎 POL deposit detected: ${amount} POL to ${to}`);
//     //   // Find user
//     //   const user = await db.query(
//     //     'SELECT id FROM users WHERE LOWER(deposit_address) = LOWER($1)',
//     //     [to],
//     //   );
//     //   if (!user || user.rows.length === 0) {
//     //     console.warn(`⚠️  Unknown POL deposit address: ${to}`);
//     //     return;
//     //   }
//     //   const userId = user.rows[0].id;
//     //   // Check duplicate
//     //   const existing = await db.query(
//     //     'SELECT id FROM transactions WHERE tx_hash = $1',
//     //     [hash],
//     //   );
//     //   if (existing && existing.rows.length > 0) {
//     //     return;
//     //   }
//     //   // Record POL deposit
//     //   await db.query(
//     //     `
//     //             INSERT INTO transactions (
//     //                 user_id,
//     //                 tx_hash,
//     //                 type,
//     //                 amount,
//     //                 token,
//     //                 status,
//     //                 from_address,
//     //                 to_address,
//     //                 created_at
//     //             )
//     //             VALUES ($1, $2, 'deposit', $3, 'POL', 'confirmed', $4, $5, NOW())
//     //         `,
//     //     [userId, hash, amount, from, to],
//     //   );
//     //   // Update POL balance
//     //   await db.query(
//     //     `
//     //             UPDATE investments
//     //             SET pol_balance = pol_balance + $1
//     //             WHERE user_id = $2 AND status = 'active'
//     //         `,
//     //     [amount, userId],
//     //   );
//     //   console.log(`✅ POL deposit processed for user ${userId}`);
//     // } catch (error) {
//     //   console.error('Error handling POL deposit:', error);
//     // }
//   }

//   async createOrUpdateInvestment(userId, amount) {
//     // Check if user has active investment
//     // const existing = await db.query(
//     //   'SELECT id, principal FROM investments WHERE user_id = $1 AND status = $2',
//     //   [userId, 'active'],
//     // );
//     // if (existing && existing.rows.length > 0) {
//     //   // Update existing investment
//     //   const newPrincipal = parseFloat(existing.rows[0].principal) + amount;
//     //   await db.query(
//     //     `
//     //             UPDATE investments
//     //             SET principal = $1,
//     //                 current_value = $1,
//     //                 updated_at = NOW()
//     //             WHERE id = $2
//     //         `,
//     //     [newPrincipal, existing.rows[0].id],
//     //   );
//     // } else {
//     //   // Create new investment
//     //   await db.query(
//     //     `
//     //             INSERT INTO investments (
//     //                 user_id,
//     //                 principal,
//     //                 current_value,
//     //                 pol_balance,
//     //                 status,
//     //                 invested_at,
//     //                 maturity_date
//     //             )
//     //             VALUES ($1, $2, $2, 0, 'active', NOW(), NOW() + INTERVAL '30 days')
//     //         `,
//     //     [userId, amount],
//     //   );
//     // }
//   }

//   async getDepositAddresses(): Promise<Set<string>> {
//     return new Set([
//       '0x20b501036B015e6ea9C11ba049DC215666176eB2',
//       '0x337c458D59b1E01A11A4077d2D2a79b1C91d6D2b',
//     ]);
//     // Check cache validity
//     // const now = Date.now();
//     // if (
//     //   this.cachedAddresses &&
//     //   now - this.cacheTime < this.config.cacheTimeout
//     // ) {
//     //   return new Set(this.cachedAddresses);
//     // }

//     // try {
//     //   console.log('🔄 Refreshing deposit address cache...');

//     //   const result = await db.query(
//     //     'SELECT deposit_address FROM users WHERE deposit_address IS NOT NULL',
//     //   );

//     //   if (!result || !result.rows) {
//     //     console.warn('⚠️  No users found in database');
//     //     return new Set([]);
//     //   }

//     //   this.cachedAddresses = result.rows.map((r) => r.deposit_address);
//     //   this.cacheTime = now;

//     //   console.log(`✅ Cached ${this.cachedAddresses.length} addresses`);

//     //   return new Set(this.cachedAddresses);
//     // } catch (error) {
//     //   console.error('Error fetching deposit addresses:', error);

//     //   // Return old cache if available
//     //   if (this.cachedAddresses) {
//     //     console.warn('⚠️  Using stale cache');
//     //     return new Set(this.cachedAddresses);
//     //   }

//     //   return new Set([]);
//     // }
//   }

//   async catchUpMissedBlocks() {
//     try {
//       // Get current block number
//       const currentBlock = await this.provider.getBlockNumber();

//       // Calculate gap
//       const gap = currentBlock - this.lastProcessedBlock;

//       if (gap <= 1) {
//         // No gap, we're up to date
//         return;
//       }

//       console.log(`\n🔄 Catching up on ${gap} missed blocks...`);

//       // Process missed blocks (with limit to prevent overwhelming)
//       const maxCatchUp = 100; // Don't catch up more than 100 blocks at once
//       const blocksToProcess = Math.min(gap - 1, maxCatchUp);

//       for (let i = 1; i <= blocksToProcess; i++) {
//         const blockNumber = this.lastProcessedBlock + i;
//         await this.processBlock(blockNumber);

//         // Small delay to prevent rate limiting
//         await this.sleep(100);
//       }

//       console.log(`✅ Caught up ${blocksToProcess} blocks`);

//       if (gap > maxCatchUp) {
//         console.warn(
//           `⚠️  Still ${gap - maxCatchUp} blocks behind. Will catch up in next cycle.`,
//         );
//       }
//     } catch (error) {
//       console.error('Error catching up missed blocks:', error);
//     }
//   }

//   async retryProcessBlock(blockNumber, attempt = 1) {
//     if (attempt > this.config.maxRetries) {
//       console.error(
//         `❌ Failed to process block ${blockNumber} after ${this.config.maxRetries} attempts`,
//       );
//       // Log to error tracking system
//       // await db.logFailedBlock(blockNumber, attempt);
//       return;
//     }

//     console.log(
//       `🔄 Retrying block ${blockNumber} (attempt ${attempt}/${this.config.maxRetries})...`,
//     );

//     // Exponential backoff
//     await this.sleep(1000 * Math.pow(2, attempt - 1));

//     try {
//       await this.processBlock(blockNumber);
//     } catch (error) {
//       await this.retryProcessBlock(blockNumber, attempt + 1);
//     }
//   }

//   async queueConsolidation(userId, address, amount) {
//     // try {
//     //   // Add to job queue (using Redis, Bull, or similar)
//     //   await db.query(
//     //     `
//     //             INSERT INTO consolidation_queue (user_id, address, amount, status, created_at)
//     //             VALUES ($1, $2, $3, 'pending', NOW())
//     //         `,
//     //     [userId, address, amount],
//     //   );
//     //   console.log(`📋 Queued consolidation for user ${userId}`);
//     // } catch (error) {
//     //   console.error('Error queuing consolidation:', error);
//     // }
//   }

//   async notifyUser(userId, type, amount, txHash) {
//     try {
//       // Implement your notification logic here
//       console.log(
//         `📧 Notifying user ${userId} about ${type}: ${amount} USDT (${txHash})`,
//       );

//       // Examples:
//       // - Send email
//       // - Push notification
//       // - WebSocket update
//       // - SMS
//     } catch (error) {
//       console.error('Error notifying user:', error);
//     }
//   }

//   async reconnect() {
//     console.log('🔄 Attempting to reconnect...');

//     try {
//       // Remove old listeners
//       this.provider.removeAllListeners();

//       // Create new provider
//       // this.provider = new ethers.providers.JsonRpcProvider(this.config.rpcUrl);

//       // Recreate contract
//       this.usdtContract = new ethers.Contract(
//         this.config.usdtAddress,
//         USDT_ABI,
//         this.provider,
//       );

//       // Restart listeners
//       this.startBlockListener();

//       console.log('✅ Reconnected successfully');
//     } catch (error) {
//       console.error('❌ Reconnection failed:', error);

//       // Retry after delay
//       setTimeout(() => this.reconnect(), 5000);
//     }
//   }

//   sleep(ms: number) {
//     return new Promise((resolve) => setTimeout(resolve, ms));
//   }

//   async stop() {
//     console.log('🛑 Stopping deposit monitor...');

//     // Clear polling timer
//     if (this.pollingTimer) {
//       clearInterval(this.pollingTimer);
//     }

//     // Remove event listeners
//     this.provider.removeAllListeners();

//     console.log('✅ Deposit monitor stopped');
//   }
// }

// // Export
// // module.exports = BlockChainMonitor;

// // Usage example:
// // if (require.main === module) {
// //   const monitor = new BlockChainMonitor({
// //     rpcUrl: process.env.POLYGON_RPC_URL,
// //     usdtAddress: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
// //   });

// //   monitor.start().catch((error) => {
// //     console.error('Fatal error:', error);
// //     process.exit(1);
// //   });

// //   // Graceful shutdown
// //   process.on('SIGINT', async () => {
// //     await monitor.stop();
// //     process.exit(0);
// //   });
// // }
