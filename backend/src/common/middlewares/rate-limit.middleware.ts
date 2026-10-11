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
    // 1. Lấy IP của client gọi request
    const clientIp = req.ip || req.headers['x-forwarded-for'] || 'unknown';
    const key = `rate_limit:${clientIp}`;

    // Cấu hình: Cho phép tối đa 10 request trong vòng 60 giây
    const MAX_REQUESTS = 10;
    const TTL_SECONDS = 60;

    // 2. Lấy số lần request hiện tại từ Redis
    const currentRequests = await this.redisService.get(key);

    if (!currentRequests) {
      // Nếu chưa có, khởi tạo với giá trị 1 và thời gian sống là 60 giây
      await this.redisService.set(key, '1', TTL_SECONDS);
    } else {
      const count = parseInt(currentRequests, 10);
      if (count >= MAX_REQUESTS) {
        // Nếu vượt quá giới hạn -> Chặn lại, báo lỗi 429 (Too Many Requests)
        throw new HttpException(
          {
            statusCode: HttpStatus.TOO_MANY_REQUESTS,
            message:
              'Bạn đã gửi quá nhiều yêu cầu. Vui lòng thử lại sau 1 phút!',
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
      // Nếu chưa vượt quá, tăng số đếm lên 1
      await this.redisService.client.incr(key);
    }

    next();
  }
}
