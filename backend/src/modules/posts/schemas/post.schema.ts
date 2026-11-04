import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type PostDocument = Post & Document;

export const POST_PRIVACIES = ['public', 'friends', 'only_me'] as const;
export type PostPrivacy = (typeof POST_PRIVACIES)[number];

@Schema({ timestamps: true })
export class Post {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  authorId: Types.ObjectId;

  /** Đăng dưới tư cách Trang (Fanpage) */
  @Prop({ type: Types.ObjectId, ref: 'Page', default: null })
  pageId?: Types.ObjectId | null;

  /** Đăng trong Hội nhóm (Community Group) */
  @Prop({ type: Types.ObjectId, ref: 'CommunityGroup', default: null })
  groupId?: Types.ObjectId | null;

  @Prop({ type: String, default: '', maxlength: 5000 })
  content: string;

  /** Đường dẫn ảnh nội bộ (/uploads/posts/<uuid>.<ext>), tối đa 4 ảnh */
  @Prop({ type: [String], default: [] })
  images: string[];

  @Prop({ type: String, enum: POST_PRIVACIES, default: 'friends' })
  privacy: PostPrivacy;

  /** Bài gốc khi đây là bài chia sẻ lại (luôn trỏ tới bài gốc, không lồng nhiều tầng) */
  @Prop({ type: Types.ObjectId, ref: 'Post', default: null })
  sharedPostId: Types.ObjectId | null;

  @Prop({ type: Number, default: 0, min: 0 })
  likeCount: number;

  @Prop({
    type: {
      like: { type: Number, default: 0 },
      love: { type: Number, default: 0 },
      care: { type: Number, default: 0 },
      haha: { type: Number, default: 0 },
      wow: { type: Number, default: 0 },
      sad: { type: Number, default: 0 },
      angry: { type: Number, default: 0 },
    },
    default: () => ({ like: 0, love: 0, care: 0, haha: 0, wow: 0, sad: 0, angry: 0 }),
  })
  reactionsCount: Record<string, number>;

  @Prop({ type: Number, default: 0, min: 0 })
  commentCount: number;

  @Prop({ type: Number, default: 0, min: 0 })
  shareCount: number;

  @Prop({ type: Boolean, default: false })
  isDeleted: boolean;

  /** Cờ nội dung có thể nhạy cảm (bạo lực, NSFW hoặc độc hại) */
  @Prop({ type: Boolean, default: false })
  isSensitive: boolean;

  /** Trạng thái kiểm duyệt: 'approved' | 'flagged' | 'rejected' */
  @Prop({ type: String, enum: ['approved', 'flagged', 'rejected'], default: 'approved' })
  moderationStatus: 'approved' | 'flagged' | 'rejected';

  /** Điểm độc hại từ mô hình NLP (0.0 -> 1.0) */
  @Prop({ type: Number, default: 0 })
  toxicityScore: number;

  /** Lý do vi phạm từ bộ máy AI hoặc kiểm duyệt viên */
  @Prop({ type: String, default: '' })
  moderationReason: string;

  createdAt?: Date;
  updatedAt?: Date;
}

export const PostSchema = SchemaFactory.createForClass(Post);
// Dòng thời gian của một người dùng (cuộn theo _id giảm dần)
PostSchema.index({ authorId: 1, _id: -1 });
// Ảnh của một người dùng (tab "Ảnh")
PostSchema.index({ authorId: 1, isDeleted: 1, 'images.0': 1, _id: -1 });
// Hàng đợi kiểm duyệt bài viết
PostSchema.index({ moderationStatus: 1, createdAt: -1 });
// Dòng thời gian bài viết trong hội nhóm
PostSchema.index({ groupId: 1, isDeleted: 1, _id: -1 });
// Dòng thời gian bài viết trên trang
PostSchema.index({ pageId: 1, isDeleted: 1, _id: -1 });
// Tối ưu truy vấn kiểm tra trùng lặp tài khoản chia sẻ bài viết
PostSchema.index({ sharedPostId: 1, authorId: 1, isDeleted: 1 });
