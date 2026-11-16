import {
  Injectable,
  NestMiddleware,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';
import { getClientIp, isCloudflareRequest } from '../utils/client-ip.util.js';

@Injectable()
export class CloudflareMiddleware implements NestMiddleware {
  private readonly logger = new Logger(CloudflareMiddleware.name);

  use(req: Request, res: Response, next: NextFunction) {
    const isCf = isCloudflareRequest(req);
    const clientIp = getClientIp(req);

    // Gắn real IP và CF flags vào request để các middleware/controller phía sau tái sử dụng.
    // Header cf-* chỉ có giá trị khi request thật sự đi qua Cloudflare (tránh client tự giả mạo).
    Object.assign(req, {
      realClientIp: clientIp,
      isCloudflare: isCf,
      cfRay: isCf ? req.headers['cf-ray'] || null : null,
      cfCountry: isCf ? req.headers['cf-ipcountry'] || null : null,
    });

    // Thêm header bảo mật nhận diện đã qua bảo vệ
    if (isCf) {
      res.setHeader('X-Edge-Protected-By', 'Cloudflare-DDoS-Shield');
    }

    // Nếu cấu hình chỉ cho phép qua Cloudflare (Chặn tấn công quét thẳng vào IP máy chủ gốc)
    const isCloudflareOnly = process.env.CLOUDFLARE_PROXY_ONLY === 'true';
    if (isCloudflareOnly && !isCf) {
      this.logger.warn(
        `[Origin Shield] Chặn kết nối trực tiếp vào IP máy chủ từ ${clientIp}. Bắt buộc truy cập qua Cloudflare Edge.`,
      );
      throw new HttpException(
        {
          statusCode: HttpStatus.FORBIDDEN,
          message:
            'Truy cập trực tiếp IP máy chủ gốc bị từ chối. Mọi kết nối phải định tuyến qua Cloudflare WAF & DDoS Protection.',
          error: 'Direct Origin Access Blocked',
        },
        HttpStatus.FORBIDDEN,
      );
    }

    next();
  }
}

