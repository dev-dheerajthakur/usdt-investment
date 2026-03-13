import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { User } from '../users/users.entity';

export interface ReferralInvestmentByLevel {
  level: number;
  total_referrals: number;
  total_investment: number;
}

export interface ReferralInvestmentDetail {
  level: number;
  user_id: string;
  name: string;
  total_invested: number;
}

@Injectable()
export class ReferralRepository {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly dataSource: DataSource,
  ) {}

  // ─── Summary: total investment grouped by level ───────────────────────────
  async getInvestmentByLevel(rootUserId: string): Promise<ReferralInvestmentByLevel[]> {
    const result = await this.dataSource.query(
      `
      WITH RECURSIVE referral_tree AS (
        -- Root user (level 0)
        SELECT
          user_id,
          name,
          referred_by,
          0 AS level
        FROM users
        WHERE user_id = $1

        UNION ALL

        -- Recursively fetch referred users
        SELECT
          u.user_id,
          u.name,
          u.referred_by,
          rt.level + 1
        FROM users u
        INNER JOIN referral_tree rt ON u.referred_by = rt.user_id
      ),

      user_investments AS (
        SELECT
          user_id,
          COALESCE(SUM(amount), 0) AS total_investment
        FROM investments
        GROUP BY user_id
      )

      SELECT
        rt.level                                        AS level,
        COUNT(DISTINCT rt.user_id)::int                 AS total_referrals,
        COALESCE(SUM(ui.total_investment), 0)::float    AS total_investment
      FROM referral_tree rt
      LEFT JOIN user_investments ui ON ui.user_id = rt.user_id
      WHERE rt.level > 0
      GROUP BY rt.level
      ORDER BY rt.level;
      `,
      [rootUserId],
    );

    return result;
  }

  // ─── Detail: per-user investment with their level ─────────────────────────
  async getInvestmentDetailByLevel(rootUserId: string): Promise<ReferralInvestmentDetail[]> {
    const result = await this.dataSource.query(
      `
      WITH RECURSIVE referral_tree AS (
        SELECT
          user_id,
          name,
          referred_by,
          0 AS level
        FROM users
        WHERE user_id = $1

        UNION ALL

        SELECT
          u.user_id,
          u.name,
          u.referred_by,
          rt.level + 1
        FROM users u
        INNER JOIN referral_tree rt ON u.referred_by = rt.user_id
      )

      SELECT
        rt.level                                      AS level,
        rt.user_id                                    AS user_id,
        rt.name                                       AS name,
        COALESCE(SUM(i.amount), 0)::float             AS total_invested
      FROM referral_tree rt
      LEFT JOIN investments i ON i.user_id = rt.user_id
      WHERE rt.level > 0
      GROUP BY rt.level, rt.user_id, rt.name
      ORDER BY rt.level, rt.user_id;
      `,
      [rootUserId],
    );

    return result;
  }
}