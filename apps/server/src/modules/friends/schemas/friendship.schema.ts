import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type FriendshipDocument = Friendship & Document;

export type FriendshipStatus = 'pending' | 'accepted' | 'rejected';

@Schema({ timestamps: true })
export class Friendship {
  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: true,
  })
  requesterId: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: true,
  })
  recipientId: Types.ObjectId;

  @Prop({
    type: String,
    enum: ['pending', 'accepted', 'rejected'],
    default: 'pending',
  })
  status: FriendshipStatus;

  createdAt?: Date;
  updatedAt?: Date;
}

export const FriendshipSchema = SchemaFactory.createForClass(Friendship);
FriendshipSchema.index({ requesterId: 1, recipientId: 1 }, { unique: true });
FriendshipSchema.index({ recipientId: 1, status: 1 });
FriendshipSchema.index({ requesterId: 1, status: 1 });
