import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { verifyToken } from '@clerk/backend';
import { RedisService } from '../../redis/redis/redis.service.js';

@Injectable()
export class MultiAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly redisService: RedisService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    // 1. LOCAL AUTH: Chỉ lấy token từ Cookie 'accessToken' riêng biệt
    const localToken = request.cookies?.['accessToken'];

    if (localToken) {
      try {
        const payload = this.jwtService.verify(localToken, {
          secret: process.env.JWT_SECRET,
        });

        const isBlacklisted =
          await this.redisService.isTokenBlacklisted(localToken);
        if (isBlacklisted) {
          throw new UnauthorizedException(
            'Token đã bị vô hiệu hóa (Đăng xuất)',
          );
        }

        request.user = { type: 'local', ...payload };
        return true;
      } catch (err) {
        // Nếu token local sai/hết hạn, có thể throw hoặc cho rớt xuống check Clerk tùy ý
      }
    }

    // 2. CLERK AUTH: Lấy token từ Authorization Header hoặc Cookie __session của Clerk
    const authHeader = request.headers['authorization'];
    const clerkToken = authHeader?.startsWith('Bearer ')
      ? authHeader.split(' ')[1]
      : request.cookies?.__session;

    if (clerkToken) {
      try {
        const sessionClaims = await verifyToken(clerkToken, {
          secretKey: process.env.CLERK_SECRET_KEY,
        });

        request.user = { type: 'clerk', ...sessionClaims };
        return true;
      } catch (error) {
        throw new UnauthorizedException(
          'Clerk Token không hợp lệ hoặc đã hết hạn',
        );
      }
    }

    throw new UnauthorizedException(
      'Không tìm thấy thông tin xác thực (Unauthorized)',
    );
  }
}
