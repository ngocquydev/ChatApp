import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type CommentReportDocument = CommentReport & Document;

export type ReportTarget = 'group_admin' | 'web_admin';
export type ReportStatus = 'pending' | 'resolved' | 'dismissed';
export type ReportActionTaken =
  | 'none'
  | 'dismissed'
  | 'deleted_comment'
  | 'muted_user'
  | 'banned_posting'
  | 'banned_user';

@Schema({ timestamps: true })
export class CommentReport {
  @Prop({ type: Types.ObjectId, ref: 'PostComment', required: true, index: true })
  commentId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Post', required: true, index: true })
  postId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  reporterId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  commentAuthorId: Types.ObjectId;

  @Prop({ type: String, required: true, default: '' })
  commentContent: string;

  /** Hội nhóm sở hữu bài viết (nếu bình luận nằm trong bài viết thuộc nhóm) */
  @Prop({ type: Types.ObjectId, ref: 'CommunityGroup', default: null, index: true })
  groupId?: Types.ObjectId | null;

  /** Đối tượng nhận báo cáo: quản trị viên nhóm hay quản trị viên hệ thống (web admin) */
  @Prop({ type: String, enum: ['group_admin', 'web_admin'], required: true, index: true })
  target: ReportTarget;

  /** Lý do báo cáo: spam, harassment, hate_speech, inappropriate, other */
  @Prop({ type: String, required: true })
  reason: string;

  /** Chi tiết mô tả thêm của người báo cáo */
  @Prop({ type: String, default: '' })
  details: string;

  /** Trạng thái xử lý báo cáo */
  @Prop({ type: String, enum: ['pending', 'resolved', 'dismissed'], default: 'pending', index: true })
  status: ReportStatus;

  /** Người đã xử lý báo cáo (Quản trị viên nhóm hoặc Admin Web) */
  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  resolvedBy?: Types.ObjectId | null;

  @Prop({ type: Date, default: null })
  resolvedAt?: Date | null;

  @Prop({
    type: String,
    enum: ['none', 'dismissed', 'deleted_comment', 'muted_user', 'banned_posting', 'banned_user'],
    default: 'none',
  })
  actionTaken: ReportActionTaken;

  @Prop({ type: String, default: '' })
  resolutionNote?: string;

  createdAt?: Date;
  updatedAt?: Date;
}

export const CommentReportSchema = SchemaFactory.createForClass(CommentReport);
CommentReportSchema.index({ groupId: 1, target: 1, status: 1, createdAt: -1 });
CommentReportSchema.index({ commentId: 1, reporterId: 1 });

