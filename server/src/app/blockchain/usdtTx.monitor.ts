import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
  Inject,
} from '@nestjs/common';
import { ethers } from 'ethers';
import { BlockchainService } from './blockchain.service';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';
import { ContractEventPayload } from 'node_modules/ethers/lib.esm';
import { Tx } from '../chaintxs/chaintxs.entity';
import { TX_FILTERING_QUEUE } from 'src/constants/queue';

const USDT_ABI = [
  'event Transfer(address indexed from, address indexed to, uint256 value)',
  'function balanceOf(address account) view returns (uint256)',
];
interface Config {
  rpcUrl: string;
  maxBlocksToProcess: number;
  reconnectDelay: number;
}

@Injectable()
export class MonitorUsdtTx implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MonitorUsdtTx.name);
  private provider: ethers.WebSocketProvider;
  private config: Config;
  private isMonitoring: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 10;

  constructor(
    private readonly blockchainService: BlockchainService,
    @InjectQueue(TX_FILTERING_QUEUE)
    private readonly txFilteringQueue: Queue,
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
  ) {
    this.config = {
      rpcUrl: process.env.POLYGON_RPC_URL || 'https://polygon-rpc.com',
      maxBlocksToProcess: 100, // Max blocks to catch up at once
      reconnectDelay: 5000, // 5 seconds
    };
    this.initializeProvider();
  }

  private initializeProvider() {
    this.provider = new ethers.WebSocketProvider(
      'wss://polygon-mainnet.g.alchemy.com/v2/G1haFySXheA8PqZ9PxCmq',
    );
  }

  async onModuleInit() {
    this.logger.log('Blockchain monitor initialized.');
    try {
      await this.startMonitoring();
    } catch (error) {
      this.logger.error('Failed to initialize blockchain monitor:', error);
      // Retry initialization after delay
      setTimeout(() => this.onModuleInit(), this.config.reconnectDelay);
    }
  }

  async onModuleDestroy() {
    this.logger.log('Shutting down blockchain monitor...');
    this.isMonitoring = false;

    // Remove all listeners
    this.provider.removeAllListeners();

    // Destroy provider
    await this.provider.destroy();

    this.logger.log('Blockchain monitor shut down successfully.');
  }

  async startMonitoring() {
    if (this.isMonitoring) {
      this.logger.warn('Monitoring already started, skipping...');
      return;
    }

    try {
      this.logger.log('🔍 Starting Transactions monitor...');
      await this.verifyConnection();
      // Catch up on missed blocks
      // await this.catchUpMissedBlocks();

      // Start real-time monitoring
      this.startEventListener();
      this.isMonitoring = true;
      this.reconnectAttempts = 0; // Reset on successful start

      this.logger.log('✅ Monitoring started successfully');
    } catch (error) {
      this.logger.error('❌ Failed to start deposit monitor:', error);
      throw error;
    }
  }

  async verifyConnection(): Promise<boolean> {
    try {
      const network = await this.provider.getNetwork();
      this.logger.log(
        `🔗 Connected to network: ${network.name} (chainId: ${network.chainId})`,
      );

      // Verify it's Polygon
      if (network.chainId !== BigInt(137)) {
        throw new Error(
          `Wrong network! Expected Polygon (137), got ${network.chainId}`,
        );
      }

      return true;
    } catch (error) {
      this.logger.error('Connection verification failed:', error);
      throw error;
    }
  }

  
  startEventListener() {
    this.logger.log('👂 Starting real-time block listener...');
    const contract = new ethers.Contract(
      '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
      USDT_ABI,
      this.provider,
    );

    contract.on('Transfer', (fromAddress, toAddress, value, event: ContractEventPayload) => {
      this.enqueueBlock({
        fromAddress,
        toAddress,
        value: String(value),
        blockNumber: event.log.blockNumber.toString(),
        blockHash: event.log.blockHash,
        data: event.log.data,
        transactionHash: event.log.transactionHash,
        transactionIndex: event.log.transactionIndex.toString(),
      });
    });
    this.provider.on('error', (error) => {
      this.logger.error('Provider error:', error);
      this.reconnect();
    });
  }

  /**
   * Enqueue a block for processing
   */
  async enqueueBlock(tx: Tx) {
    try {
      await this.txFilteringQueue.add(
        'filter-tx',
        {
          fromAddress: tx.fromAddress,
          toAddress: tx.toAddress,
          value: tx.value,
          blockNumber: tx.blockNumber,
          blockHash: tx.blockHash,
          data: tx.data,
          transactionHash: tx.transactionHash,
          transactionIndex: tx.transactionIndex,
        },
        {
          jobId: `block|${tx.blockNumber}|${tx.transactionHash}`,
          attempts: 3,
          backoff: { type: 'exponential', delay: 2000 },
          removeOnComplete: true,
          removeOnFail: { age: 86400 },
        },
      );
    } catch (error) {
      this.logger.error(`Failed to enqueue block ${tx.blockNumber}:`, error);
      throw error;
    }
  }

  /**
   * Reconnect to the blockchain provider
   */
  async reconnect() {
    if (!this.isMonitoring) {
      return; // Don't reconnect if monitoring is stopped
    }

    this.reconnectAttempts++;

    if (this.reconnectAttempts > this.maxReconnectAttempts) {
      this.logger.error(
        `❌ Max reconnection attempts (${this.maxReconnectAttempts}) reached. Giving up.`,
      );
      this.isMonitoring = false;
      return;
    }

    this.logger.log(
      `🔄 Attempting to reconnect... (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`,
    );

    try {
      // Stop current monitoring
      this.isMonitoring = false;
      this.provider.removeAllListeners();

      // Destroy old provider
      await this.provider.destroy();

      // Wait a bit before reconnecting
      await new Promise((resolve) =>
        setTimeout(resolve, this.config.reconnectDelay),
      );

      // Create new provider
      this.initializeProvider();

      // Restart monitoring
      await this.startMonitoring();

      this.logger.log('✅ Reconnected successfully');
    } catch (error) {
      this.logger.error('❌ Reconnection failed:', error);

      // Retry with exponential backoff
      const backoffDelay =
        this.config.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
      setTimeout(() => this.reconnect(), Math.min(backoffDelay, 60000)); // Max 1 minute
    }
  }

  /**
   * Manual trigger to refresh monitoring (useful for debugging)
   */
  async refreshMonitoring() {
    this.logger.log('Manual refresh triggered');
    await this.reconnect();
  }

  /**
   * Get current monitoring status
   */
  getStatus() {
    return {
      isMonitoring: this.isMonitoring,
      reconnectAttempts: this.reconnectAttempts,
      networkChainId: 137,
    };
  }
}
