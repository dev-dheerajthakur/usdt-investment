import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Investment } from './investment.entity';
import { InvestmentService } from './investment.service';
import { InvestmentController } from './investment.controller';
import { User } from '../users/users.entity';
import { JwtModule } from '@nestjs/jwt';
import { TransactionsModule } from '../transactions/transactions.module';
import { CacheModule } from '@nestjs/cache-manager';
import { InvestmentProcessor } from './investment.processor';
import { BullModule } from '@nestjs/bullmq';
import { INVESTMENT_DEAD_QUEUE, INVESTMENT_QUEUE, INVESTMENT_REQ_REVIEW_QUEUE } from 'src/constants/queue';
import { UsersModule } from '../users/users.module';
import { RedisModule } from '../redis/redis.module';
import { InvestmentReqReviewProcessor } from './invetment-req-review.processor';

@Module({
  imports: [
    TypeOrmModule.forFeature([Investment, User]),
    JwtModule.registerAsync({
      useFactory: () => ({
        secret: process.env.JWT_SECRET,
      }),
    }),
    TransactionsModule,
    CacheModule.register(),
    BullModule.registerQueue({
      name: INVESTMENT_QUEUE
    }),
    BullModule.registerQueue({
      name: INVESTMENT_DEAD_QUEUE
    }),
    BullModule.registerQueue({
      name: INVESTMENT_REQ_REVIEW_QUEUE
    }),
    UsersModule,
    RedisModule
  ],
  providers: [InvestmentService, InvestmentProcessor],
  controllers: [InvestmentController],
  exports: [InvestmentService], // export so ReferralService can use it if needed
})
export class InvestmentModule {}
