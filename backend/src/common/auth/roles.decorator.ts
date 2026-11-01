import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

/** Đánh dấu route chỉ dành cho các role chỉ định. Dùng cùng JwtAuthGuard + RolesGuard. */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
