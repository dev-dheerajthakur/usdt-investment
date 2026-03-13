import { forwardRef, Module } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { UsersModule } from '../users/users.module';
import { WalletController } from './wallet.controller';

@Module({
  providers: [WalletService],
  imports: [forwardRef(() => UsersModule)],
  controllers: [WalletController],
  exports: [WalletService]
})
export class WalletModule {}
