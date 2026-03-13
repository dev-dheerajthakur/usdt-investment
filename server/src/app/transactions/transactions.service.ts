import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Not, Repository } from 'typeorm';
import {
  Transactions,
  TransactionStatus,
  TransactionType,
} from './transactions.entity';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { UserService } from '../users/users.service';
import { Investment } from '../investment/investment.entity';
import { ADMIN_WALLET_ADDRESS } from 'src/constants/wallet';
import { ChaintxsService } from '../chaintxs/chaintxs.service';

@Injectable()
export class TransactionsService {
  constructor(
    @InjectRepository(Transactions)
    private transactionsRepository: Repository<Transactions>,
    @InjectQueue('user-verification')
    private readonly blockQueue: Queue,
    private readonly userService: UserService,
    private readonly dataSource: DataSource,
    private readonly chainTxService: ChaintxsService,
  ) {}

  async addQueue() {
    const d = await this.blockQueue.add('process-block', { id: 'hilo' });
    console.log(d);
  }

  async create(
    manager: EntityManager,
    investment: Investment,
  ): Promise<Transactions> {
    const transactionRepo = manager.getRepository(Transactions);
    const transaction = transactionRepo.create({
      fromAddress: investment.user.polygonAddress,
      toAddress: ADMIN_WALLET_ADDRESS,
      amount: String(BigInt(investment.unit) * 20000000n),
      type: TransactionType.PURCHASE,
      status: TransactionStatus.COMPLETED,
      investment,
      description: `Investment of ${investment.unit} units (Investment ID: ${investment.id})`,
    });
    await this.userService.updateBalance(manager, {
      from: investment.user.polygonAddress,
      to: ADMIN_WALLET_ADDRESS,
      value: String(BigInt(investment.unit) * 20000000n),
    });
    await transactionRepo.save(transaction);
    return transaction;
  }

  // Your main use case - find by address
  async findByUserAddress(address: string) {
    const chainTxs = (
      await this.chainTxService.findTxByUserAddress(address)
    ).map((tx) => {
      return {
        id: tx.id,
        fromAddress: tx.fromAddress,
        toAddress: tx.toAddress,
        amount: tx.value,
        type: TransactionType.DEPOSIT,
        status: TransactionStatus.COMPLETED,
        description: 'deposite successfull',
        createdAt: tx.createdAt,
        updatedAt: tx.updatedAt,
      };
    });
    const tx = await this.transactionsRepository.find({
      where: [
        { fromAddress: address, type: Not(TransactionType.CHAINTX) },
        { toAddress: address, type: Not(TransactionType.CHAINTX) },
      ],
      order: { createdAt: 'DESC' },
    });
    return [...chainTxs, ...tx].sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    );
  }

  // Get sent transactions
  async findSentByAddress(address: string) {
    return await this.transactionsRepository.find({
      where: { fromAddress: address },
      order: { createdAt: 'DESC' },
    });
  }

  // Get received transactions
  async findReceivedByAddress(address: string) {
    return await this.transactionsRepository.find({
      where: { toAddress: address },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string) {
    return await this.transactionsRepository.findOne({
      where: { id },
    });
  }
}
