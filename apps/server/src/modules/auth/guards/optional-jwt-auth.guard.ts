import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RedisService } from '../../redis/redis/redis.service.js';
import { RequestWithCookies } from '../types/auth.types.js';

@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly redisService: RedisService) {
    super();
  }

  // Override handleRequest: không ném UnauthorizedException khi không có token hoặc token sai
  override handleRequest<TUser = any>(err: any, user: any): TUser {
    if (err || !user) {
      return null as TUser;
    }
    return user;
  }

  override async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      await super.canActivate(context);
    } catch {
      // Cho phép request của khách tiếp tục mà không chặn lại
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithCookies>();
    if (request.user) {
      const token =
        request.cookies?.['accessToken'] ||
        request.headers['authorization']?.split(' ')[1];

      if (token) {
        try {
          const isBlacklisted = await this.redisService.isTokenBlacklisted(token);
          if (isBlacklisted) {
            request.user = undefined;
          }
        } catch {
          // Fail-safe
        }
      }
    }

    return true;
  }
}
