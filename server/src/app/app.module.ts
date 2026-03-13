import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { typeOrmConfig } from 'typeorm.config';
import { UsersModule } from './users/users.module';
import { JwtModule } from '@nestjs/jwt';
import { AuthModule } from './auth/auth.module';
import { TransactionsModule } from './transactions/transactions.module';
import { WalletModule } from './wallet/wallet.module';
import { BullModule } from '@nestjs/bullmq';
import { BlockchainModule } from './blockchain/blockchain.module';
import { ChaintxsModule } from './chaintxs/chaintxs.module';
import { ReferralModule } from './referral/referral.module';
import { InvestmentModule } from './investment/investment.module';
import { RedisModule } from './redis/redis.module';
import { MetricsModule } from './metrics/metrics.module';
import { CacheModule } from '@nestjs/cache-manager';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      useFactory: typeOrmConfig,
    }),
    ConfigModule.forRoot({
      envFilePath: '.env.local',
      isGlobal: true,
    }),
    JwtModule.registerAsync({
      useFactory: () => ({
        secret: process.env.JWT_SECRET,
      }),
    }),

    BullModule.forRoot({
      connection: {
        host: 'localhost',
        port: 6379,
      },
    }),   
    UsersModule,
    AuthModule,
    TransactionsModule,
    WalletModule,
    BlockchainModule,
    ChaintxsModule,
    ReferralModule,
    InvestmentModule,
    RedisModule,
    MetricsModule,
    CacheModule.register()
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}