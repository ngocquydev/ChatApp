import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type CommunityGroupDocument = CommunityGroup & Document;

@Schema({ timestamps: true })
export class CommunityGroup {
  @Prop({ required: true, trim: true, minlength: 2, maxlength: 100 })
  name: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true, index: true })
  slug: string;

  @Prop({ default: '', maxlength: 1000 })
  description: string;

  @Prop({ type: String, enum: ['public', 'private'], default: 'public' })
  privacy: 'public' | 'private';

  @Prop({ type: String, default: null })
  avatar?: string | null;

  @Prop({ type: String, default: null })
  coverImage?: string | null;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  creatorId: Types.ObjectId;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }], default: [] })
  adminIds: Types.ObjectId[];

  @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }], default: [] })
  moderatorIds: Types.ObjectId[];

  @Prop({
    type: [
      {
        userId: { type: Types.ObjectId, ref: 'User', required: true },
        canRemoveMembers: { type: Boolean, default: true },
        canMuteComments: { type: Boolean, default: true },
        canBlockPosting: { type: Boolean, default: true },
      },
    ],
    default: [],
  })
  deputies: Array<{
    userId: Types.ObjectId;
    canRemoveMembers: boolean;
    canMuteComments: boolean;
    canBlockPosting: boolean;
  }>;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }], default: [] })
  bannedPostingUserIds: Types.ObjectId[];

  @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }], default: [] })
  mutedCommentUserIds: Types.ObjectId[];

  @Prop({ type: Boolean, default: false })
  requireJoinReason: boolean;

  @Prop({ type: String, default: 'Tại sao bạn muốn tham gia nhóm này?' })
  joinQuestion: string;

  @Prop({
    type: [
      {
        userId: { type: Types.ObjectId, ref: 'User', required: true },
        reason: { type: String, default: '' },
        requestedAt: { type: Date, default: () => new Date() },
      },
    ],
    default: [],
  })
  pendingRequests: Array<{
    userId: Types.ObjectId;
    reason: string;
    requestedAt: Date;
  }>;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }], default: [] })
  members: Types.ObjectId[];

  @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }], default: [] })
  pendingMemberIds: Types.ObjectId[];

  @Prop({ type: Number, default: 1 })
  memberCount: number;

  @Prop({ type: Boolean, default: false })
  requireApproval: boolean;

  @Prop({ type: [String], default: [] })
  rules: string[];

  @Prop({ type: Boolean, default: false })
  isDeleted: boolean;

  createdAt?: Date;
  updatedAt?: Date;
}

export const CommunityGroupSchema = SchemaFactory.createForClass(CommunityGroup);
CommunityGroupSchema.index({ name: 'text', description: 'text' });
CommunityGroupSchema.index({ creatorId: 1, _id: -1 });
CommunityGroupSchema.index({ members: 1 });
CommunityGroupSchema.index({ adminIds: 1 });
