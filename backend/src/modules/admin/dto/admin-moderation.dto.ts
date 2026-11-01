import { IsIn, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import type { ModerationLanguage } from '../../moderation/algorithms/transformer-text-moderator.js';

export class AdminTestTextDto {
  @IsString()
  text: string;

  @IsOptional()
  @IsIn(['vi', 'en', 'auto'])
  language?: ModerationLanguage = 'vi';
}

export class AdminTestBehaviorDto {
  @IsNumber()
  @Min(0)
  friendRequestsPerHour: number;

  @IsNumber()
  @Min(0)
  @Max(1)
  acceptanceRate: number;

  @IsNumber()
  @Min(0)
  actionIntervalVariance: number;

  @IsNumber()
  @Min(0)
  @Max(1)
  actionRepetitionRatio: number;

  @IsNumber()
  @Min(0)
  interactionVelocity: number;

  @IsNumber()
  @Min(0)
  @Max(1)
  distinctTargetRatio: number;
}

export class AdminModerationQueueQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(50)
  limit?: number = 20;

  @IsOptional()
  @IsString()
  status?: string;
}

export class AdminResolveQueueDto {
  @IsIn(['approve', 'hide', 'warn'])
  action: 'approve' | 'hide' | 'warn';

  @IsOptional()
  @IsString()
  reason?: string;
}

