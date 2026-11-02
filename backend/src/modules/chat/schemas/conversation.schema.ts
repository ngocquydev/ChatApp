import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ConversationDocument = Conversation & Document;

@Schema({ _id: false })
export class LastMessage {
  @Prop({ type: String, required: true })
  text: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  senderId: Types.ObjectId;

  @Prop({ type: Date, default: Date.now })
  createdAt: Date;

  @Prop({ type: String, default: 'text' })
  type?: string;

  @Prop({
    type: {
      callType: { type: String },
      status: { type: String },
      duration: { type: Number },
    },
    default: null,
  })
  callLog?: {
    callType: 'audio' | 'video';
    status: 'missed' | 'declined' | 'completed' | 'busy' | 'cancelled';
    duration: number;
  } | null;
}

export const LastMessageSchema = SchemaFactory.createForClass(LastMessage);

@Schema({ timestamps: true })
export class Conversation {
  @Prop({
    type: [{ type: Types.ObjectId, ref: 'User' }],
    required: true,
  })
  participants: Types.ObjectId[];

  @Prop({
    type: String,
    enum: ['direct', 'group'],
    default: 'direct',
  })
  type: 'direct' | 'group';

  @Prop({
    type: String,
    default: null,
  })
  name?: string | null;

  @Prop({
    type: String,
    default: null,
  })
  avatar?: string | null;

  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    default: null,
  })
  creatorId?: Types.ObjectId | null;

  @Prop({
    type: [{ type: Types.ObjectId, ref: 'User' }],
    default: [],
  })
  adminIds: Types.ObjectId[];

  @Prop({
    type: Types.ObjectId,
    ref: 'Message',
    default: null,
  })
  pinnedMessageId?: Types.ObjectId | null;

  @Prop({
    type: LastMessageSchema,
    default: null,
  })
  lastMessage?: LastMessage | null;

  @Prop({
    type: Map,
    of: Number,
    default: {},
  })
  unreadCounts: Map<string, number>;

  @Prop({
    type: String,
    default: 'default',
  })
  theme: string;

  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    default: null,
  })
  blockedBy?: Types.ObjectId | null;

  @Prop({
    type: [{ type: Types.ObjectId, ref: 'User' }],
    default: [],
  })
  restrictedBy: Types.ObjectId[];

  @Prop({
    type: [{ type: Types.ObjectId, ref: 'User' }],
    default: [],
  })
  deletedByUsers: Types.ObjectId[];

  createdAt?: Date;
  updatedAt?: Date;
}

export const ConversationSchema = SchemaFactory.createForClass(Conversation);
ConversationSchema.index({ participants: 1 });
ConversationSchema.index({ deletedByUsers: 1 });
ConversationSchema.index({ updatedAt: -1 });
