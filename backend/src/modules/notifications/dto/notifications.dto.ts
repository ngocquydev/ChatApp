import { IsOptional, IsInt, Min, Max, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import type { NotificationType } from '../schemas/notification.schema.js';

export class GetNotificationsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 20;

  @IsOptional()
  @IsString()
  before?: string;
}

export interface CreateNotificationInput {
  recipientId: string;
  actorId: string;
  type: NotificationType;
  title: string;
  content: string;
  link?: string;
  metadata?: Record<string, unknown>;
}

export interface NotificationActorView {
  _id: string;
  name: string;
  avatar?: string;
}

export interface NotificationView {
  _id: string;
  type: NotificationType;
  title: string;
  content: string;
  link?: string;
  metadata?: Record<string, unknown>;
  isRead: boolean;
  actor: NotificationActorView;
  createdAt?: Date;
}
