// user.controller.ts
import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { UserService, ReferralTreeNode, ReferralStats } from './users.service';
import { createResponse } from 'src/common/helper/response.helper';

@Controller({path: 'users', version: '1'})
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get(':userId/referrals/tree')
  async getReferralTree(@Param('userId') userId: string): Promise<ReferralTreeNode[]> {
    return await this.userService.getReferralTree(userId);
  }

  @Get(':userId/referrals/level/:level')
  async getReferralsByLevel(
    @Param('userId') userId: string,
    @Param('level') level: number
  ) {
    return await this.userService.getReferralsByLevel(userId, level);
  }

  @Get('addresses') 
  async getAddress() {
    const address = await this.userService.getAllUsersAddress();
    return createResponse.success({addresses: Array.from(address)})
  }

  @Get(':userId/referrals/direct')
  async getDirectReferrals(@Param('userId') userId: string) {
    return await this.userService.getDirectReferrals(userId);
  }

  @Get(':userId/referrals/stats')
  async getReferralStats(@Param('userId') userId: string): Promise<ReferralStats[]> {
    return await this.userService.getReferralStats(userId);
  }

  @Get(':userId/referrals/total')
  async getTotalReferrals(@Param('userId') userId: string) {
    const count = await this.userService.getTotalReferrals(userId);
    return { total: count };
  }

  @Get(':userId/referrals/chain')
  async getReferralChain(@Param('userId') userId: string) {
    return await this.userService.getReferralChain(userId);
  }
}