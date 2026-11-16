import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CommunityGroup, CommunityGroupSchema } from './schemas/community-group.schema.js';
import { CommentReport, CommentReportSchema } from '../posts/schemas/comment-report.schema.js';
import { PostComment, PostCommentSchema } from '../posts/schemas/post-comment.schema.js';
import { Post, PostSchema } from '../posts/schemas/post.schema.js';
import { CommunityGroupsService } from './community-groups.service.js';
import { CommunityGroupsController } from './community-groups.controller.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CommunityGroup.name, schema: CommunityGroupSchema },
      { name: CommentReport.name, schema: CommentReportSchema },
      { name: PostComment.name, schema: PostCommentSchema },
      { name: Post.name, schema: PostSchema },
    ]),
  ],
  controllers: [CommunityGroupsController],
  providers: [CommunityGroupsService],
  exports: [CommunityGroupsService],
})
export class CommunityGroupsModule {}

