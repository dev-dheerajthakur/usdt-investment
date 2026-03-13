import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Transactions } from './transactions.entity';
import { TransactionsController } from './transactions.controller';
import { TransactionsService } from './transactions.service';
import { BullModule } from '@nestjs/bullmq';
import { UsersModule } from '../users/users.module';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { ChaintxsModule } from '../chaintxs/chaintxs.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Transactions]),
    BullModule.registerQueue({
      name: 'block-processing',
    }),
    BullModule.registerQueue({
      name: "user-verification",
    }),
    UsersModule,
    JwtModule.registerAsync({
      useFactory: () => ({
        secret: process.env.JWT_SECRET
      })
    }),
    ChaintxsModule
  ],
  exports: [TransactionsService],
  controllers: [TransactionsController],
  providers: [TransactionsService],
})
export class TransactionsModule {}
