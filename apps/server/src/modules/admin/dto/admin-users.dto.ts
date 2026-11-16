import { IsBoolean, IsIn, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class AdminUsersQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsIn(['all', 'admin', 'user'])
  role?: 'all' | 'admin' | 'user' = 'all';

  @IsOptional()
  @IsIn(['all', 'active', 'banned'])
  status?: 'all' | 'active' | 'banned' = 'all';

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

export class AdminToggleBanDto {
  @IsBoolean()
  isBan: boolean;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class AdminUpdateRoleDto {
  @IsIn(['admin', 'user'])
  role: 'admin' | 'user';
}
