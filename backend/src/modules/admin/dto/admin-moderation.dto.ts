import { IsIn, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
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

