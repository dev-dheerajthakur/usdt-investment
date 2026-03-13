import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '../users.entity';
import { Repository } from 'typeorm';

@Injectable()
export class UserAdminService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async getTotalUsers(): Promise<{users: User[], length: number}> {
    const [users, length] = await this.userRepository.findAndCount();
    return { length, users };
  }
}
