import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request: Request = context.switchToHttp().getRequest();

    const token = request.cookies?.auth_token;

    if (!token) {
      throw new UnauthorizedException('Auth token missing');
    }

    try {
      const payload = await this.jwtService.verifyAsync(token);
      if(!payload.id || !payload.polygonAddress) throw new UnauthorizedException('Invalid or expired token');
      request['userId'] = payload.id;
      request['polygonAddress'] = payload.polygonAddress;
      return true;
    } catch (err) {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
