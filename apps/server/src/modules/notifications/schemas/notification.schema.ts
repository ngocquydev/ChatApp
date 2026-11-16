import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type NotificationType =
  | 'friend_accepted'
  | 'friend_request'
  | 'post_like'
  | 'post_comment'
  | 'post_share'
  | 'mention'
  | 'system';

export type NotificationDocument = Notification & Document;

@Schema({ timestamps: true })
export class Notification {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  recipientId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  actorId: Types.ObjectId;

  @Prop({
    type: String,
    enum: [
      'friend_accepted',
      'friend_request',
      'post_like',
      'post_comment',
      'post_share',
      'mention',
      'system',
    ],
    required: true,
  })
  type: NotificationType;

  @Prop({ type: String, required: true, maxlength: 200 })
  title: string;

  @Prop({ type: String, required: true, maxlength: 500 })
  content: string;

  @Prop({ type: String, maxlength: 300 })
  link?: string;

  @Prop({ type: Boolean, default: false })
  isRead: boolean;

  @Prop({ type: Object })
  metadata?: Record<string, unknown>;

  createdAt?: Date;
  updatedAt?: Date;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);

NotificationSchema.index({ recipientId: 1, createdAt: -1 });
NotificationSchema.index({ recipientId: 1, isRead: 1 });
