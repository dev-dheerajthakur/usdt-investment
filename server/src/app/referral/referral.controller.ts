import { Controller, Get, Param } from '@nestjs/common';
import { ReferralService } from './referral.service';

@Controller('referrals')
export class ReferralController {
  constructor(private readonly referralService: ReferralService) {}

  // GET /referrals/:userId/investments/summary
  // → total investment per level
  @Get(':userId/investments/summary')
  async getInvestmentSummary(@Param('userId') userId: string) {
    return this.referralService.getReferralInvestmentSummary(userId);
  }

  // GET /referrals/:userId/investments/details
  // → per-user investment breakdown with level
  @Get(':userId/investments/details')
  async getInvestmentDetails(@Param('userId') userId: string) {
    return this.referralService.getReferralInvestmentDetails(userId);
  }
}