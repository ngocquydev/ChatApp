import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from './roles.decorator.js';

/**
 * Kiểm tra role của người dùng đã xác thực. Phải đặt SAU JwtAuthGuard:
 * `req.user` do JwtStrategy nạp lại từ DB ở mỗi request, nên hạ quyền có hiệu lực ngay.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const user = context.switchToHttp().getRequest<{ user?: { role?: string } }>().user;
    if (!user?.role || !required.includes(user.role)) {
      throw new ForbiddenException('Bạn không có quyền truy cập chức năng này.');
    }
    return true;
  }
}
