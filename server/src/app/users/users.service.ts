// user.service.ts
import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { User, UserStatus } from './users.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginUserDto } from './dto/login-user.dto';
import { JwtService } from '@nestjs/jwt';
import { Tx } from '../chaintxs/chaintxs.entity';
import { WalletService } from '../wallet/wallet.service';
import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';

export interface ReferralTreeNode {
  id: string;
  name: string;
  email: string;
  level: number;
  referred_by: string;
  created_at: Date; // ADD THIS
}

export interface ReferralStats {
  level: number;
  count: number;
}

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly dataSource: DataSource,
    private readonly walletService: WalletService,
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache
  ) {}

  // Create user with referral
  async createUser(payload: CreateUserDto): Promise<{
    auth_token: string;
  }> {
    const user = this.userRepository.create(payload);
    const { address, saltHex } = await this.walletService.createWallet(user.id);
    user.status = UserStatus.VERIFIED;
    user.polygonAddress = address;
    user.salt = saltHex;

    await this.userRepository.save(user);
    const auth_token = await user.signToken(this.jwtService);
    return {
      auth_token,
    };
  }

  //login user
  async loginUser(payload: LoginUserDto): Promise<{
    auth_token: string;
    user: any;
  }> {
    const user = await this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.email = :email', { email: payload.email })
      .getOne();
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const isPasswordValid = await user.validatePassword(payload.password);
    if (!isPasswordValid) {
      throw new BadRequestException('Invalid password');
    }
    const auth_token = await user.signToken(this.jwtService);
    const safeUser = { ...user, password: undefined };
    return { auth_token, user: safeUser };
  }

  async getUserProfile(id: string): Promise<Partial<User> | null> {
    const user = await this.userRepository.findOne({
      where: { id },
    });
    return user;
  }

  async getUserUsdtBalance(userId: string): Promise<{
    usdtBalance: string;
    usdtChainBalance: string;
    totalBalance: string;
  }> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['usdtBalance', 'usdtChainBalance'],
    });
    if (!user) throw new NotFoundException('User not found');
    return {
      usdtBalance: user.usdtBalance,
      usdtChainBalance: user.usdtChainBalance,
      totalBalance: (
        BigInt(user.usdtBalance) + BigInt(user.usdtChainBalance)
      ).toString(),
    };
  }

  async getAllUsersAddressesWithBalances(): Promise<
    { polygonAddress: string; usdtBalance: string }[]
  > {
    const users = await this.userRepository.find({
      select: ['polygonAddress', 'usdtBalance', 'usdtChainBalance'],
    });
    return users.map((user) => ({
      polygonAddress: user.polygonAddress,
      usdtBalance: String(
        BigInt(user.usdtBalance) + BigInt(user.usdtChainBalance),
      ),
    }));
  }
  
  async getAllUsersAddress(): Promise<Set<string>> {
    const cachedAddresses = await this.cacheManager.get<string[]>('addresses');
    if(cachedAddresses) return new Set(cachedAddresses);
    const addresses =( await this.userRepository.find({
      select: ['polygonAddress']
    })).map( user => user.polygonAddress );
    await this.cacheManager.set('addresses', addresses);
    return new Set(addresses);
  }

  async updateBalance(
    manager: EntityManager,
    tx: { from: string; to: string; value: string },
  ) {
    const userRepo = manager.getRepository(User);
    const [sender, recipient] = await Promise.all([
      userRepo.findOne({
        where: { polygonAddress: tx.from },
        lock: { mode: 'pessimistic_write' },
      }),
      userRepo.findOne({
        where: { polygonAddress: tx.to },
        lock: { mode: 'pessimistic_write' },
      }),
    ]);

    if (!sender) throw new UnauthorizedException('user not found');

    const senderUsdtBalance =
      BigInt(sender.usdtBalance) + BigInt(sender.usdtChainBalance);

    const delta = BigInt(tx.value);
    if (senderUsdtBalance < delta) {
      throw new BadRequestException('Insufficient balance');
    }

    if (sender) {
      sender.usdtBalance = (BigInt(sender.usdtBalance) - delta).toString();
    }

    if (recipient) {
      recipient.usdtBalance = (
        BigInt(recipient.usdtBalance) + delta
      ).toString();
    }

    const usersToSave = [sender, recipient].filter(
      (user): user is User => user !== null,
    );

    await userRepo.save(usersToSave);
  }
  async updateChainBalance(tx: Tx) {
    await this.dataSource.transaction(async (manager) => {
      const [sender, recipient] = await Promise.all([
        manager.findOne(User, {
          where: { polygonAddress: tx.fromAddress },
          lock: { mode: 'pessimistic_write' },
        }),
        manager.findOne(User, {
          where: { polygonAddress: tx.toAddress ?? '' },
          lock: { mode: 'pessimistic_write' },
        }),
      ]);

      const delta = BigInt(tx.value);

      if (sender) {
        sender.usdtChainBalance = (
          BigInt(sender.usdtChainBalance) - delta
        ).toString();
      }

      if (recipient) {
        recipient.usdtChainBalance = (
          BigInt(recipient.usdtChainBalance) + delta
        ).toString();
      }

      const usersToSave = [sender, recipient].filter(
        (user): user is User => user !== null,
      );

      await manager.save(usersToSave);
    });
  }

  async updateAddressAndSalt(
    userId: string,
    salt: string,
    polygonAddress: string,
  ) {
    if (!salt || !polygonAddress) {
      throw new Error('Invalid wallet data');
    }
    const result = await this.userRepository.update(
      { id: userId },
      { salt, polygonAddress },
    );

    if (result.affected === 0) {
      throw new Error('User not found or update failed');
    }
  }

  // Get complete referral tree with levels
  async getReferralTree(userId: string): Promise<ReferralTreeNode[]> {
    // Validate userId
    if (!userId || userId.trim() === '') {
      throw new BadRequestException('User ID is required');
    }

    // Validate UUID format
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(userId)) {
      throw new BadRequestException('Invalid User ID format');
    }

    // Check if user exists
    const userExists = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!userExists) {
      throw new NotFoundException(`User not found `);
    }

    const query = `
            WITH RECURSIVE referral_tree AS (
                SELECT
                  id,
                  name,
                  email,
                  "referralCode",
                  referred_by,
                  created_at,
                  0 AS level
                FROM users
                WHERE id = $1

                UNION ALL

                SELECT
                  u.id,
                  u.name,
                  u.email,
                  u."referralCode",
                  u.referred_by,
                  u.created_at,
                  rt.level + 1
                FROM users u
                INNER JOIN referral_tree rt
                  ON u.referred_by = rt."referralCode"
                WHERE rt.level < 100
              )

              SELECT
                id,
                name,
                email,
                referred_by,
                level,
                created_at
              FROM referral_tree
              WHERE level > 0
              ORDER BY level, created_at;
          `;

    const result = await this.userRepository.query(query, [userId]);

    this.logger.log(`Retrieved ${result.length} referrals for user ${userId}`);

    return result || [];
  }

  // Get referrals by specific level (1st, 2nd, 3rd, etc.)
  async getReferralsByLevel(userId: string, level: number): Promise<User[]> {
    const query = `
      WITH RECURSIVE referral_tree AS (
        SELECT 
          id, 
          name, 
          email,
          referred_by,
          created_at,
          0 as level
        FROM users
        WHERE id = $1
        
        UNION ALL
        
        SELECT 
          u.id, 
          u.name,
          u.email,
          u.referred_by,
          u.created_at,
          rt.level + 1
        FROM users u
        INNER JOIN referral_tree rt ON u.referred_by = rt.id
        WHERE rt.level < $2
      )
      SELECT 
        id,
        name,
        email,
        referred_by,
        created_at
      FROM referral_tree 
      WHERE level = $2
      ORDER BY created_at;
    `;

    return await this.userRepository.query(query, [userId, level]);
  }

  // Get direct referrals only (1st level)
  async getDirectReferrals(userId: string): Promise<User[]> {
    return await this.userRepository.find({
      where: { referred_by: userId },
      order: { created_at: 'ASC' },
    });
  }

  // Get referral statistics (count per level)
  async getReferralStats(userId: string): Promise<ReferralStats[]> {
    const query = `
      WITH RECURSIVE referral_tree AS (
        SELECT 
          id, 
          0 as level
        FROM users
        WHERE id = $1
        
        UNION ALL
        
        SELECT 
          u.id, 
          rt.level + 1
        FROM users u
        INNER JOIN referral_tree rt ON u.referred_by = rt.id
        WHERE rt.level < 10
      )
      SELECT 
        level,
        COUNT(*)::int as count
      FROM referral_tree
      WHERE level > 0
      GROUP BY level
      ORDER BY level;
    `;

    return await this.userRepository.query(query, [userId]);
  }

  // Get total referral count
  async getTotalReferrals(userId: string): Promise<number> {
    const query = `
      WITH RECURSIVE referral_tree AS (
        SELECT id FROM users WHERE id = $1
        UNION ALL
        SELECT u.id FROM users u
        INNER JOIN referral_tree rt ON u.referred_by = rt.id
      )
      SELECT COUNT(*)::int as count FROM referral_tree WHERE id != $1;
    `;

    const result = await this.userRepository.query(query, [userId]);
    return result[0]?.count || 0;
  }

  // Get referral chain (path from root to user)
  async getReferralChain(userId: string): Promise<User[]> {
    const query = `
      WITH RECURSIVE referral_chain AS (
        SELECT 
          id, 
          name, 
          email,
          referred_by,
          1 as level
        FROM users
        WHERE id = $1
        
        UNION ALL
        
        SELECT 
          u.id, 
          u.name,
          u.email,
          u.referred_by,
          rc.level + 1
        FROM users u
        INNER JOIN referral_chain rc ON rc.referred_by = u.id
      )
      SELECT * FROM referral_chain ORDER BY level DESC;
    `;

    return await this.userRepository.query(query, [userId]);
  }

  // Get user with referrer info
  async getUserWithReferrer(userId: string): Promise<User | null> {
    return await this.userRepository.findOne({
      where: { id: userId },
      relations: ['referrer'],
    });
  }
}
