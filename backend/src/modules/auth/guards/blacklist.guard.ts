// src/common/guards/blacklist.guard.ts
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { RedisService } from '../../redis/redis/redis.service.js';

@Injectable()
export class BlacklistGuard implements CanActivate {
  constructor(private readonly redisService: RedisService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = request.cookies?.['accessToken'];

    if (token) {
      const isBlacklisted = await this.redisService.isTokenBlacklisted(token);
      if (isBlacklisted) {
        throw new UnauthorizedException('Token đã bị vô hiệu hóa (Đăng xuất)');
      }
    }

    return true;
  }
}
