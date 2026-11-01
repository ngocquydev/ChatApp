import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type CallStatus = 'missed' | 'declined' | 'completed' | 'busy' | 'cancelled';
export type CallType = 'audio' | 'video';

export interface CallLogData {
  callType: CallType;
  status: CallStatus;
  duration: number; // Thời lượng tính bằng giây
}

export interface LocationData {
  latitude: number;
  longitude: number;
  address?: string;
  name?: string;
  isLive?: boolean;
  liveExpiresAt?: Date | string | null;
  isLiveActive?: boolean;
}

export interface MessageReaction {
  userId: Types.ObjectId;
  type: string;
  createdAt?: Date;
}

export type MessageDocument = Message & Document;

@Schema({ timestamps: true })
export class Message {
  @Prop({
    type: Types.ObjectId,
    ref: 'Conversation',
    required: true,
    index: true,
  })
  conversationId: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  })
  senderId: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  })
  receiverId: Types.ObjectId;

  @Prop({
    type: String,
    required: true,
    trim: true,
  })
  text: string;

  @Prop({
    type: String,
    enum: ['text', 'call', 'location'],
    default: 'text',
  })
  type?: 'text' | 'call' | 'location';

  @Prop({
    type: {
      latitude: { type: Number, required: true },
      longitude: { type: Number, required: true },
      address: { type: String, default: '' },
      name: { type: String, default: '' },
      isLive: { type: Boolean, default: false },
      liveExpiresAt: { type: Date, default: null },
      isLiveActive: { type: Boolean, default: true },
    },
    default: null,
  })
  location?: LocationData | null;

  @Prop({
    type: {
      callType: { type: String, enum: ['audio', 'video'], default: 'audio' },
      status: {
        type: String,
        enum: ['missed', 'declined', 'completed', 'busy', 'cancelled'],
        default: 'completed',
      },
      duration: { type: Number, default: 0 },
    },
    default: null,
  })
  callLog?: CallLogData | null;

  @Prop({
    type: Date,
    default: null,
  })
  readAt?: Date | null;

  @Prop({
    type: [
      {
        userId: { type: Types.ObjectId, ref: 'User', required: true },
        type: {
          type: String,
          enum: ['like', 'love', 'care', 'haha', 'wow', 'sad', 'angry'],
          required: true,
        },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    default: [],
  })
  reactions?: MessageReaction[];

  @Prop({
    type: Boolean,
    default: false,
  })
  isDeleted: boolean;

  @Prop({
    type: Date,
    default: null,
  })
  deletedAt?: Date | null;

  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    default: null,
  })
  deletedBy?: Types.ObjectId | null;

  createdAt?: Date;
  updatedAt?: Date;
}

export const MessageSchema = SchemaFactory.createForClass(Message);
MessageSchema.index({ conversationId: 1, createdAt: 1 });
MessageSchema.index({ receiverId: 1, readAt: 1 });
