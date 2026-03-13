import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReferralService } from './referral.service';
import { ReferralController } from './referral.controller';
import { Investment } from '../investment/investment.entity';
import { User } from '../users/users.entity';
import { ReferralRepository } from './refferal.repository';

@Module({
  imports: [TypeOrmModule.forFeature([User, Investment])],
  providers: [ReferralRepository, ReferralService],
  controllers: [ReferralController],
  exports: [ReferralService],
})
export class ReferralModule {}
