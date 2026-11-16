import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateWafConfigDto {
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsBoolean()
  blockScanners?: boolean;

  @IsOptional()
  @IsBoolean()
  blockBadUserAgents?: boolean;

  @IsOptional()
  @IsBoolean()
  challengeForeignAuth?: boolean;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @Matches(/^[A-Za-z]{2}$/, { each: true, message: 'Mã quốc gia phải gồm 2 chữ cái (ISO 3166-1)' })
  allowedCountries?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(500)
  @IsString({ each: true })
  @MaxLength(64, { each: true })
  ipAllowlist?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(500)
  @IsString({ each: true })
  @MaxLength(64, { each: true })
  ipBlocklist?: string[];
}

export const UNDER_ATTACK_SCOPES = ['app', 'cloudflare', 'both'] as const;
export type UnderAttackScope = (typeof UNDER_ATTACK_SCOPES)[number];

export class UnderAttackDto {
  @IsBoolean()
  enabled: boolean;

  @IsIn(UNDER_ATTACK_SCOPES)
  scope: UnderAttackScope;
}

export class ToggleDto {
  @IsBoolean()
  enabled: boolean;
}

export class CreateBanDto {
  @IsString()
  @MaxLength(64)
  ip: string;

  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(60 * 24 * 30)
  durationMinutes?: number;
}

