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

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  creatorId: Types.ObjectId;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }], default: [] })
  adminIds: Types.ObjectId[];

  @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }], default: [] })
  moderatorIds: Types.ObjectId[];

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
