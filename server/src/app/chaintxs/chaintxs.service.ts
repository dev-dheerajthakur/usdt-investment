import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ChainTxs, Tx } from './chaintxs.entity';
import { DataSource, In, Repository } from 'typeorm';
import { UserService } from '../users/users.service';

@Injectable()
export class ChaintxsService {
  constructor(
    @InjectRepository(ChainTxs)
    private readonly chainTxsRepository: Repository<ChainTxs>,
    private readonly userSerivce: UserService,
  ) {}

  async processTx(tx: Tx) {
    try {
      const entity = this.chainTxsRepository.create(tx);
      await this.chainTxsRepository.save(entity);
      await this.userSerivce.updateChainBalance(tx);
    } catch (error) {
      console.error('processTx error:', error);
    }
  }

  async findTxByUserAddress(address: string) {
    return await this.chainTxsRepository.find({
      where: [{ toAddress: address }, { fromAddress: address }],
      order: { createdAt: 'DESC' },
    });
  }
}
