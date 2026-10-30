import { ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { AuthGuard } from '@nestjs/passport';
import { RedisService } from '../../redis/redis/redis.service.js';

@Injectable()
export class GqlAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly redisService: RedisService) {
    super();
  }

  getRequest(context: ExecutionContext) {
    const ctx = GqlExecutionContext.create(context);
    return ctx.getContext().req;
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isValid = (await super.canActivate(context)) as boolean;
    if (!isValid) return false;

    const req = this.getRequest(context);
    const token =
      req.cookies?.['accessToken'] ||
      req.headers['authorization']?.split(' ')[1];

    if (token) {
      try {
        const isBlacklisted = await this.redisService.isTokenBlacklisted(token);
        if (isBlacklisted) {
          throw new UnauthorizedException('Token đã bị vô hiệu hóa (Đăng xuất)');
        }
      } catch (err) {
        if (err instanceof UnauthorizedException) {
          throw err;
        }
      }
    }

    return true;
  }
}
