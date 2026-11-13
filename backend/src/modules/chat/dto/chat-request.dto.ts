import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsMongoId, IsOptional, Max, Min } from 'class-validator';

export class GetMessagesQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 50;

  @IsOptional()
  @IsMongoId()
  before?: string;
}

export class CreateDirectConversationDto {
  @IsMongoId()
  participantId: string;
}

export class RestrictConversationDto {
  @IsBoolean()
  restrict: boolean;
}
