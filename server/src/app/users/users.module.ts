// user/user.module.ts
import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './users.entity';
import { UserService } from './users.service';
import { UserController } from './users.controller';
import { JwtModule } from '@nestjs/jwt';
import { BullModule } from '@nestjs/bullmq';
import { GENERATE_WALLET_QUEUE } from 'src/constants/queue';
import { WalletModule } from '../wallet/wallet.module';
import { GenerateWalletProcessor } from './generate-wallet.processor';
import { UserAdminContoller } from './admin/admin.users.controller';
import { UserAdminService } from './admin/admin.users.service';
import { CacheModule } from '@nestjs/cache-manager';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]), // Register User entity
    JwtModule.registerAsync({
      useFactory: () => ({
        secret: process.env.JWT_SECRET
      })
    }),
    BullModule.registerQueue({
      name: GENERATE_WALLET_QUEUE
    }),
    forwardRef(() => WalletModule),
    WalletModule,
    CacheModule.register()
  ],
  providers: [UserService, GenerateWalletProcessor, UserAdminService],
  controllers: [UserController, UserAdminContoller],
  exports: [UserService]
})
export class UsersModule {}