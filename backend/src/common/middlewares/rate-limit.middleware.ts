import {
  Injectable,
  NestMiddleware,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { RedisService } from '../../modules/redis/redis/redis.service.js';

@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
  constructor(private readonly redisService: RedisService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    // 1. Lấy IP của client gọi request (ưu tiên req.ip của Express, hỗ trợ proxy headers nếu có)
    const forwarded = req.headers['x-forwarded-for'];
    const clientIp =
      req.ip ||
      (typeof forwarded === 'string'
        ? forwarded.split(',')[0].trim()
        : Array.isArray(forwarded)
          ? forwarded[0]
          : null) ||
      req.socket?.remoteAddress ||
      'unknown';

    const key = `rate_limit:${clientIp}`;

    // Cấu hình: Cho phép tối đa 10 request trong vòng 60 giây
    const MAX_REQUESTS = 10;
    const TTL_SECONDS = 60;

    // 2. Thao tác nguyên tử (Atomic) với Redis INCR
    const count = await this.redisService.client.incr(key);

    // Nếu là request đầu tiên, thiết lập thời gian hết hạn (TTL)
    if (count === 1) {
      await this.redisService.client.expire(key, TTL_SECONDS);
    }

    if (count > MAX_REQUESTS) {
      // Đảm bảo key luôn có TTL tránh rò rỉ key vĩnh viễn
      const currentTtl = await this.redisService.client.ttl(key);
      if (currentTtl === -1) {
        await this.redisService.client.expire(key, TTL_SECONDS);
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

    next();
  }
}
