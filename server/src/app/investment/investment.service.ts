import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Repository,
  Between,
  FindOptionsWhere,
  EntityManager,
  DataSource,
  MoreThanOrEqual,
} from 'typeorm';
import { Investment, InvestmentStatus } from './investment.entity';
import { CreateInvestmentDto } from './dto/create-investment.dto';
import { UpdateInvestmentDto } from './dto/update-investment.dto';
import { InvestmentQueryDto } from './dto/investment-query.dto';
import {
  InvestmentStatsDto,
  PaginatedInvestmentDto,
} from './dto/investment-response.dto';
import { User } from '../users/users.entity';
import { JwtService } from '@nestjs/jwt';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { TransactionsService } from '../transactions/transactions.service';
import { UserService } from '../users/users.service';
import {
  TransactionStatus,
  TransactionType,
} from '../transactions/transactions.entity';
import { InjectQueue } from '@nestjs/bullmq';
import {
  INVESTMENT_QUEUE,
  INVESTMENT_REQ_REVIEW_QUEUE,
} from 'src/constants/queue';
import { Queue } from 'bullmq';
import { connectRedis } from 'src/cache/redis';
import { RedisService } from '../redis/redis.provider';
import { waitForDebugger } from 'inspector';
import { ADMIN_WALLET_ADDRESS } from 'src/constants/wallet';
import { InvestmentAnalyticsFilter } from 'src/types';

@Injectable()
export class InvestmentService {
  constructor(
    @InjectRepository(Investment)
    private readonly investmentRepository: Repository<Investment>,
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    private readonly dataSource: DataSource,
    private readonly transactionService: TransactionsService,
    private readonly userService: UserService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    @InjectQueue(INVESTMENT_QUEUE) private readonly investmentQueue: Queue,
    private readonly redisService: RedisService,
    @InjectQueue(INVESTMENT_REQ_REVIEW_QUEUE)
    private readonly investmentReqReviewQueue: Queue,
  ) {}

  // ─── CREATE ────────────────────────────────────────────────────────────────

  async loadBalances() {
    const allUsersBalances =
      await this.userService.getAllUsersAddressesWithBalances();
    allUsersBalances.forEach(({ polygonAddress, usdtBalance }) => {
      this.redisService.client.set(
        `user:usdtBalance:${polygonAddress}`,
        usdtBalance,
      );
    });
    return { message: 'Balances loaded into Redis successfully' };
  }

  async create({
    polygonAddress,
    unit,
  }: CreateInvestmentDto): Promise<{ message?: string; processId?: string }> {
    await this.loadBalances();
    const balance = await this.redisService.client.get(
      `user:usdtBalance:${polygonAddress}`,
    );
    if (!balance) {
      const { id } = await this.investmentReqReviewQueue.add(
        'processInvestmentRequest',
        { polygonAddress, unit },
        {
          jobId: `${polygonAddress}-${Date.now()}`,
          removeOnComplete: true,
          removeOnFail: 24 * 3600,
        },
      );
      return { message: 'Request under review', processId: id };
    }
    if (BigInt(balance) < BigInt(unit) * 20000000n) {
      throw new BadRequestException(
        'Insufficient USDT balance for this investment',
      );
    }
    const availableBalance = BigInt(
      await this.redisService.client.decrBy(
        `user:usdtBalance:${polygonAddress}`,
        unit * 20000000,
      ),
    );
    if (availableBalance < 0) {
      await this.redisService.client.incrBy(
        `user:usdtBalance:${polygonAddress}`,
        unit * 20000000,
      );
      throw new BadRequestException(
        'Insufficient USDT balance for this investment',
      );
    }
    try {
      const { id } = await this.investmentQueue.add(
        'processInvestment',
        { polygonAddress, unit },
        {
          jobId: `${polygonAddress}-${Date.now()}`,
          attempts: 2,
          removeOnComplete: true,
          removeOnFail: 24 * 3600,
        },
      ); // delay to ensure transaction is processed
      return { processId: id, message: 'Investment created successfully' };
    } catch (error) {
      await this.redisService.client.incrBy(
        `user:usdtBalance:${polygonAddress}`,
        unit * 20000000,
      );
      throw new InternalServerErrorException(
        'Failed to queue investment processing. Please try again.',
      );
    }
  }

  async calculateUnits() {
    
  }

  // async calculateUnits() {
  //   const maxUnits = 30;
  //   const now = new Date();
  //   const hours = now.getHours();
  //   const minutes = now.getMinutes();
  //   const seconds = now.getSeconds();

  //   const totalSeconds = hours * 3600 + minutes * 60 + seconds;
  //   const startSeconds = 9 * 3600; // 9:00 AM
  //   const wipeMinSeconds = 9 * 3600 + 15 * 60; // 9:15 AM
  //   const wipeMaxSeconds = 9 * 3600 + 20 * 60; // 9:20 AM

  //   if (totalSeconds < startSeconds) return maxUnits; // before 9:00 → full

  //   // Seed per day for consistent finish time
  //   const seed =
  //     now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();
  //   const pseudoRandom = ((seed * 9301 + 49297) % 233280) / 233280;

  //   // Random finish between 9:15 and 9:20
  //   const finishSeconds =
  //     wipeMinSeconds + pseudoRandom * (wipeMaxSeconds - wipeMinSeconds);

  //   if (totalSeconds >= finishSeconds) return 0; // after finish → empty

  //   const elapsed = totalSeconds - startSeconds;
  //   const duration = finishSeconds - startSeconds;
  //   const progress = elapsed / duration; // 0 → 1

  //   // Noise changes every 10s for non-uniform feel
  //   const noiseSeed = Math.floor(totalSeconds / 10);
  //   const noise = ((noiseSeed * 1664525 + 1013904223) % 100) / 100;
  //   const decay = Math.pow(progress, 0.8) + noise * 0.1 * progress;

  //   return Math.max(0, Math.floor(maxUnits * (1 - Math.min(decay, 1))));
  // }

  async processInvestment(polygonAddress: string, unit: number): Promise<void> {
    const user = await this.userRepository.findOne({
      where: { polygonAddress },
    });
    if (!user) {
      await this.redisService.client.incrBy(
        `user:usdtBalance:${polygonAddress}`,
        unit * 20000000,
      );
      throw new NotFoundException(
        `User with address ${polygonAddress} not found`,
      );
    }
    const investment = this.investmentRepository.create({
      user,
      unit,
      status: InvestmentStatus.PENDING,
    });
    await this.investmentRepository.save(investment);

    await this.dataSource.transaction(async (manager) => {
      const investmentRepo = manager.getRepository(Investment);
      const transaction = await this.transactionService.create(
        manager,
        investment,
      );
      investment.status = InvestmentStatus.ACTIVE;
      investment.transaction = transaction;
      await investmentRepo.save(investment);
    });
  }

  async findInvestments(userId: string | undefined) {
    if (!userId) throw new UnauthorizedException('unauthorized');
    const investments = await this.investmentRepository.find({
      where: {
        user: { id: userId },
      },
    });
    return {
      length: investments.length,
      investments,
    };
  }

  async getAnalytics([from, to]: [Date, Date]) {
    from.setUTCHours(0, 0, 0, 0);
    to.setUTCHours(23, 59, 59, 999);

    const prevFrom = new Date(from);
    const prevTo = new Date(to);

    prevFrom.setDate(from.getDate() - 5);
    prevTo.setDate(to.getDate() - 5);

    const supply = (
      await this.investmentRepository.find({
        where: {
          createdAt: Between(from, to),
        },
      })
    ).reduce((sum, investment) => sum + investment.unit, 0);

    const demand = (
      await this.investmentRepository.find({
        where: {
          createdAt: Between(prevFrom, prevTo),
        },
      })
    ).reduce((sum, investment) => sum + investment.unit, 0);

    return {
      supply,
      demand,
      supplyUSDT: supply * 20,
      demandUSDT: demand * 23,
    };
  }

  // ─── FIND ALL (with filters + pagination) ──────────────────────────────────

  async findAll(query: InvestmentQueryDto): Promise<PaginatedInvestmentDto> {
    const { userId, status, from, to, page = 1, limit = 10 } = query;

    const where: FindOptionsWhere<Investment> = {};

    // if (userId) where.userId = userId;
    if (status) where.status = status;
    if (from && to)
      where.createdAt = Between(new Date(from), new Date(to)) as any;

    const [data, total] = await this.investmentRepository.findAndCount({
      where,
      relations: ['user'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    throw new NotFoundException('No investments found matching the criteria');

    // return {
    //   data,
    //   total,
    //   page,
    //   limit,
    //   totalPages: Math.ceil(total / limit),
    // };
  }

  // ─── FIND ONE ──────────────────────────────────────────────────────────────

  async findOne(id: string): Promise<Investment> {
    const investment = await this.investmentRepository.findOne({
      where: { id },
      relations: ['user'],
    });
    if (!investment)
      throw new NotFoundException(`Investment with id ${id} not found`);
    return investment;
  }

  // ─── UPDATE ────────────────────────────────────────────────────────────────

  async update(id: string, dto: UpdateInvestmentDto): Promise<Investment> {
    const investment = await this.findOne(id);

    if (investment.status === InvestmentStatus.COMPLETED) {
      throw new BadRequestException('Cannot update a completed investment');
    }

    Object.assign(investment, dto);
    return this.investmentRepository.save(investment);
  }

  // ─── DELETE ────────────────────────────────────────────────────────────────

  async remove(id: string): Promise<{ message: string }> {
    const investment = await this.findOne(id);
    await this.investmentRepository.remove(investment);
    return { message: `Investment ${id} deleted successfully` };
  }

  // ─── STATS PER USER ────────────────────────────────────────────────────────

  async getStatsByUser(userId: string): Promise<InvestmentStatsDto> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException(`User with id ${userId} not found`);

    const result = await this.investmentRepository
      .createQueryBuilder('inv')
      .select('COALESCE(SUM(inv.amount), 0)', 'totalInvestment')
      .addSelect(
        `COALESCE(SUM(CASE WHEN inv.status = 'active'    THEN inv.amount ELSE 0 END), 0)`,
        'totalActive',
      )
      .addSelect(
        `COALESCE(SUM(CASE WHEN inv.status = 'matured'   THEN inv.amount ELSE 0 END), 0)`,
        'totalMatured',
      )
      .addSelect(
        `COALESCE(SUM(CASE WHEN inv.status = 'withdrawn' THEN inv.amount ELSE 0 END), 0)`,
        'totalWithdrawn',
      )
      .addSelect('COUNT(inv.id)', 'totalCount')
      .where('inv.userId = :userId', { userId })
      .getRawOne();

    return {
      totalInvestment: parseFloat(result.totalInvestment),
      totalActive: parseFloat(result.totalActive),
      totalMatured: parseFloat(result.totalMatured),
      totalWithdrawn: parseFloat(result.totalWithdrawn),
      totalCount: parseInt(result.totalCount),
    };
  }

  // ─── GLOBAL STATS ──────────────────────────────────────────────────────────

  async getGlobalStats(): Promise<InvestmentStatsDto> {
    const result = await this.investmentRepository
      .createQueryBuilder('inv')
      .select('COALESCE(SUM(inv.amount), 0)', 'totalInvestment')
      .addSelect(
        `COALESCE(SUM(CASE WHEN inv.status = 'active'    THEN inv.amount ELSE 0 END), 0)`,
        'totalActive',
      )
      .addSelect(
        `COALESCE(SUM(CASE WHEN inv.status = 'matured'   THEN inv.amount ELSE 0 END), 0)`,
        'totalMatured',
      )
      .addSelect(
        `COALESCE(SUM(CASE WHEN inv.status = 'withdrawn' THEN inv.amount ELSE 0 END), 0)`,
        'totalWithdrawn',
      )
      .addSelect('COUNT(inv.id)', 'totalCount')
      .getRawOne();

    return {
      totalInvestment: parseFloat(result.totalInvestment),
      totalActive: parseFloat(result.totalActive),
      totalMatured: parseFloat(result.totalMatured),
      totalWithdrawn: parseFloat(result.totalWithdrawn),
      totalCount: parseInt(result.totalCount),
    };
  }
}
