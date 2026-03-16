import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum BlockStatus {
  WAITING = 'WAITING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
}

@Entity('blockstate')
export class BlockState {
  @PrimaryGeneratedColumn('increment')
  id: number;
  
  @Column()
  blockNumber: number;
  
  @Column({ type: 'enum', enum: BlockStatus })
  status: BlockStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
