import { Injectable } from '@nestjs/common';
import { ReferralRepository } from './refferal.repository';

@Injectable()
export class ReferralService {
  constructor(private readonly referralRepo: ReferralRepository) {}

  async getReferralInvestmentSummary(userId: string) {
    const data = await this.referralRepo.getInvestmentByLevel(userId);

    // Compute grand total across all levels
    const grandTotal = data.reduce((sum, row) => sum + Number(row.total_investment), 0);

    return {
      userId,
      levels: data,
      grandTotal,
    };
  }

  async getReferralInvestmentDetails(userId: string) {
    const data = await this.referralRepo.getInvestmentDetailByLevel(userId);

    // Group by level for a cleaner response
    const grouped = data.reduce((acc, row) => {
      const lvl = row.level;
      if (!acc[lvl]) acc[lvl] = { level: lvl, users: [], levelTotal: 0 };
      acc[lvl].users.push({ user_id: row.user_id, name: row.name, total_invested: row.total_invested });
      acc[lvl].levelTotal += Number(row.total_invested);
      return acc;
    }, {} as Record<number, any>);

    return {
      userId,
      levels: Object.values(grouped),
    };
  }
}