import { Column, CreateDateColumn, Entity, UpdateDateColumn } from "typeorm";

@Entity('unit')
export class Unit {
  @Column()
  unit: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}