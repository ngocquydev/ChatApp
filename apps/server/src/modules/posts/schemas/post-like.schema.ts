import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type PostLikeDocument = PostLike & Document;

export const REACTION_TYPES = [
  'like',
  'love',
  'care',
  'haha',
  'wow',
  'sad',
  'angry',
] as const;
export type ReactionType = (typeof REACTION_TYPES)[number];

/** Mỗi lượt thích / thả cảm xúc là một bản ghi riêng (không nhét mảng vào bài viết để không phình tài liệu). */
@Schema({ timestamps: { createdAt: true, updatedAt: false } })
export class PostLike {
  @Prop({ type: Types.ObjectId, ref: 'Post', required: true })
  postId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: String, enum: REACTION_TYPES, default: 'like' })
  type: ReactionType;

  createdAt?: Date;
}

export const PostLikeSchema = SchemaFactory.createForClass(PostLike);
// Mỗi người chỉ thích một bài một lần; đồng thời phục vụ truy vấn "tôi đã thích những bài nào"
PostLikeSchema.index({ userId: 1, postId: 1 }, { unique: true });
