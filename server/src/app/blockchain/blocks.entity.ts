import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum BlockStatus {
  WAITING = 'WAITING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
}

@Entity('blockstate')
export class BlockState {
  @PrimaryColumn()
  blockNumber: number;
  
  @Column({ type: 'enum', enum: BlockStatus })
  status: BlockStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}