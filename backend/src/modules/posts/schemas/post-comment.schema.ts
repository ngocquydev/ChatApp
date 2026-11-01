import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type PostCommentDocument = PostComment & Document;

export interface CommentReaction {
  userId: Types.ObjectId;
  type: string;
  createdAt?: Date;
}

@Schema({ timestamps: { createdAt: true, updatedAt: false } })
export class PostComment {
  @Prop({ type: Types.ObjectId, ref: 'Post', required: true })
  postId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  authorId: Types.ObjectId;

  @Prop({ type: String, required: false, default: '', maxlength: 1000 })
  content: string;

  @Prop({ type: String, required: false })
  mediaUrl?: string;

  @Prop({ type: String, required: false, enum: ['image', 'video'] })
  mediaType?: 'image' | 'video';

  @Prop({
    type: [
      {
        userId: { type: Types.ObjectId, ref: 'User', required: true },
        type: {
          type: String,
          enum: ['like', 'love', 'care', 'haha', 'wow', 'sad', 'angry'],
          default: 'like',
        },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    default: [],
  })
  reactions?: CommentReaction[];

  @Prop({ type: Number, default: 0, min: 0 })
  likeCount?: number;

  createdAt?: Date;
}

export const PostCommentSchema = SchemaFactory.createForClass(PostComment);
PostCommentSchema.index({ postId: 1, _id: 1 });
