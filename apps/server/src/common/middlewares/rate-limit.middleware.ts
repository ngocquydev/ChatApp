import {
  Injectable,
  NestMiddleware,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { RedisService } from '../../modules/redis/redis/redis.service.js';
import { EdgeBanService } from '../../modules/waf/edge-ban.service.js';
import { getClientIp } from '../utils/client-ip.util.js';

@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
  private readonly logger = new Logger(RateLimitMiddleware.name);

  constructor(
    private readonly redisService: RedisService,
    private readonly bans: EdgeBanService,
  ) {}

  async use(req: Request, res: Response, next: NextFunction) {
    // 1. Lấy IP thực của client (Ưu tiên Cloudflare CF-Connecting-IP, X-Forwarded-For)
    const clientIp = getClientIp(req);
    const key = `rate_limit:${clientIp}`;

    const MAX_REQUESTS = Number(process.env.RATE_LIMIT_MAX) || 10;
    const TTL_SECONDS = Number(process.env.RATE_LIMIT_TTL) || 60;

    try {
      if (!this.redisService.isAvailable()) {
        return next();
      }

      const count = await this.redisService.client.incr(key);

      if (count === 1) {
        await this.redisService.client.expire(key, TTL_SECONDS);
      }

      if (count > MAX_REQUESTS) {
        const currentTtl = await this.redisService.client.ttl(key);
        if (currentTtl === -1) {
          await this.redisService.client.expire(key, TTL_SECONDS);
        }

        // Ghi nhận vi phạm một lần mỗi cửa sổ (đúng lúc vừa vượt ngưỡng) để tự động chặn kẻ tái phạm
        if (count === MAX_REQUESTS + 1) {
          void this.bans.reportOffense(clientIp, 'rate_limit');
        }

        throw new HttpException(
          {
            statusCode: HttpStatus.TOO_MANY_REQUESTS,
            message:
              'Bạn đã gửi quá nhiều yêu cầu. Vui lòng thử lại sau 1 phút!',
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    } catch (err) {
      if (err instanceof HttpException) {
        throw err;
      }
      this.logger.warn(
        `Lỗi rate limit Redis (Fail-safe mở): ${err instanceof Error ? err.message : String(err)}`,
      );
      return next();
    }

    next();
  }
}
