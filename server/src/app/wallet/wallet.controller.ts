import { Body, Controller, Post } from '@nestjs/common';
import { WalletService } from './wallet.service';

@Controller({path: 'wallet', version: '1'})
export class WalletController {
  constructor(
    private readonly walletService: WalletService
  ) {}
  
  @Post('generate')
  async generateWallet(
    @Body() body: { userId: string }
  ) {
    return await this.walletService.createWallet(body.userId)
  }
}
