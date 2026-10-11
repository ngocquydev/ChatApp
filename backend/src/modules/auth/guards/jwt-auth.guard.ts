import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RedisService } from '../../redis/redis/redis.service.js';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly redisService: RedisService) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isValid = (await super.canActivate(context)) as boolean;
    if (!isValid) {
      return false;
    }

    const request = context.switchToHttp().getRequest();

    const token =
      request.cookies?.['accessToken'] ||
      request.headers['authorization']?.split(' ')[1];

    if (token) {
      const isBlacklisted = await this.redisService.isTokenBlacklisted(token);
      if (isBlacklisted) {
        throw new UnauthorizedException('Token đã bị vô hiệu hóa (Đăng xuất)');
      }
    }

    return true;
  }
}
