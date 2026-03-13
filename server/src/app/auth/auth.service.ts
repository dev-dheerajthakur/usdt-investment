import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../users/users.service';
import { User } from '../users/users.entity';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly userService: UserService,
  ) {}
  async verifyUser(token?: string): Promise<{ user: Partial<User> }> {
    if (token) {
      const jwtPayload =
        await this.jwtService.verifyAsync<AuthTokenPayload>(token);
      const user = await this.userService.getUserProfile(jwtPayload.id);
      if (!user) {
        throw new NotFoundException('user not found');
      }
      return { user };
    } else {
      throw new UnauthorizedException('unauthorized !!');
    }
  }
}
