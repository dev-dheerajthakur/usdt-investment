import { Column, Entity, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Index, BeforeInsert, OneToOne, JoinColumn } from 'typeorm';
import { Investment } from '../investment/investment.entity';
import { ChainTxs } from '../chaintxs/chaintxs.entity';

export enum TransactionType {
  DEPOSIT = 'DEPOSITE',
  PURCHASE = 'PURCHASE',
  TRANSFER = 'TRANSFER',
  MATURITY = 'MATURITY',
  CHAINTX = 'CHAINTX',
  REFERAL_REWARD = 'REFERAL_REWARD'
}

export enum TransactionStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  ACTIVE = 'ACTIVE',
}

@Entity('transactions')
@Index(['fromAddress', 'createdAt']) // For queries: transactions FROM this address
@Index(['toAddress', 'createdAt'])   // For queries: transactions TO this address
@Index(['status', 'createdAt'])
export class Transactions {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'from_address', length: 42 })
  @Index()
  fromAddress: string;

  @Column({ name: 'to_address', length: 42 })
  @Index()
  toAddress: string;

  @Column()
  amount: string;

  @Column({
    type: 'enum',
    enum: TransactionType,
  })
  type: TransactionType;

  @OneToOne(() => Investment, investment => investment.transaction)
  @JoinColumn({ name: 'investmentId' })
  investment: Investment;

  @Column({
    type: 'enum',
    enum: TransactionStatus,
    default: TransactionStatus.PENDING,
  })
  status: TransactionStatus;

  @OneToOne(() => ChainTxs, chainTxs => chainTxs.transaction)
  @JoinColumn({name: 'chainTxId'})
  chainTx: ChainTxs

  @OneToOne(() => Transactions)
  @JoinColumn({name: 'referalInvestmentTx'})
  referalInvestmentTx: Transactions

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;
}