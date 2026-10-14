import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ConversationDocument = Conversation & Document;

@Schema({ timestamps: true })
export class Conversation {
  @Prop({
    type: [{ type: Types.ObjectId, ref: 'User' }],
    required: true,
  })
  participants: Types.ObjectId[];

  @Prop({
    type: {
      text: { type: String, required: true },
      senderId: { type: Types.ObjectId, ref: 'User', required: true },
      createdAt: { type: Date, default: Date.now },
    },
    default: null,
  })
  lastMessage?: {
    text: string;
    senderId: Types.ObjectId;
    createdAt: Date;
  } | null;

  @Prop({
    type: Map,
    of: Number,
    default: {},
  })
  unreadCounts: Map<string, number>;

  createdAt?: Date;
  updatedAt?: Date;
}

export const ConversationSchema = SchemaFactory.createForClass(Conversation);
ConversationSchema.index({ participants: 1 });
ConversationSchema.index({ updatedAt: -1 });
