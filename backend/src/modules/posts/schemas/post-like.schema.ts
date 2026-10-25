import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type PostLikeDocument = PostLike & Document;

/** Mỗi lượt thích là một bản ghi riêng (không nhét mảng vào bài viết để không phình tài liệu). */
@Schema({ timestamps: { createdAt: true, updatedAt: false } })
export class PostLike {
  @Prop({ type: Types.ObjectId, ref: 'Post', required: true })
  postId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  createdAt?: Date;
}

export const PostLikeSchema = SchemaFactory.createForClass(PostLike);
// Mỗi người chỉ thích một bài một lần; đồng thời phục vụ truy vấn "tôi đã thích những bài nào"
PostLikeSchema.index({ userId: 1, postId: 1 }, { unique: true });
