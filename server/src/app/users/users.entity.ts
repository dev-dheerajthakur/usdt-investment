// user.entity.ts
import crypto from 'crypto';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  BeforeInsert,
  BeforeUpdate,
  UpdateDateColumn,
} from 'typeorm';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { Investment } from '../investment/investment.entity';


export enum UserStatus {
  PENDING = 'PENDING',
  VERIFIED = 'VERIFIED',
  REJECTED = 'REJECTED',
}

@Entity('users')
export class User {
  private static chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  static generateUniqueCode(length = 7): string {
    const bytes = crypto.randomBytes(length);
    let result = '';
    for (let i = 0; i < length; i++) {
      const index = bytes[i] % this.chars.length;
      result += this.chars[index];
    }
    return result;
  }

  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Profile
  @Column({ unique: true })
  email: string;

  @Column({ nullable: true, length: 10 })
  phone: string;

  @Column()
  name: string;

  @Column({
    type: 'enum',
    enum: UserStatus,
    default: UserStatus.PENDING,
  })
  status: UserStatus;

  @Column({ nullable: true, select: false })
  password: string;

  @Column({ nullable: true, select: false })
  salt: string;

  @Column({ default: '0' })
  usdtChainBalance: string;

  @Column({ default: '0' })
  usdtBalance: string;

  @Column({ nullable: true, unique: true })
  polygonAddress: string;

  @Column({ nullable: true })
  externalWalletAddress: string;

  //Referrals
  @Column({
    unique: true,
    length: 7,
    nullable: true,
  })
  referralCode: string;

  // Store referral code instead of user id
  @Column({ type: 'varchar', nullable: true, default: "S2I73XD" })
  referred_by: string;

  // Relation to parent (referrer) - join on referralCode instead of id
  @ManyToOne(() => User, (user) => user.referrals, { nullable: true })
  @JoinColumn({ name: 'referred_by', referencedColumnName: 'referralCode' })
  referrer: User;

  // Relation to children (people this user referred)
  @OneToMany(() => User, (user) => user.referrer)
  referrals: User[];

  // // Self-referencing foreign key
  // @Column({ type: 'uuid', nullable: true })
  // referred_by: string;

  // // Relation to parent (referrer)
  // @ManyToOne(() => User, (user) => user.referrals, { nullable: true })
  // @JoinColumn({ name: 'referred_by' })
  // referrer: User;

  // // Relation to children (people this user referred)
  // @OneToMany(() => User, (user) => user.referrer)
  // referrals: User[];

  @OneToMany(() => Investment, (investment) => investment.user)
  investments: Investment[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  // Hooks
  @BeforeInsert()
  @BeforeUpdate()
  async hashPassword() {
    if (this.password && !this.password.startsWith('$2b$')) {
      const salt = await bcrypt.genSalt(10);
      this.password = await bcrypt.hash(this.password, salt);
    }
  }

  @BeforeInsert()
  generateRefferalCode() {
    this.referralCode = User.generateUniqueCode();
  }

  // Methods
  async validatePassword(password: string): Promise<boolean> {
    return bcrypt.compare(password, this.password);
  }

  async signToken(
    jwtService: JwtService,
  ): Promise<string> {
    const auth_token = await jwtService.signAsync(
      {
        id: this.id,
        polygonAddress: this.polygonAddress,
        externalWalletAddress: this.externalWalletAddress
      },
      { expiresIn: 30 * 24 * 60 * 60 },
    ); // 30 days
    return auth_token;
  }
}
