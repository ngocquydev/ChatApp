import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module.js';
import { User, UserSchema } from '../users/entities/user.entity.js';
import { Post, PostSchema } from '../posts/schemas/post.schema.js';
import { PostComment, PostCommentSchema } from '../posts/schemas/post-comment.schema.js';
import { CommentReport, CommentReportSchema } from '../posts/schemas/comment-report.schema.js';
import { WafModule } from '../waf/waf.module.js';
import { RedisModule } from '../redis/redis/redis.module.js';
import { Neo4jModule } from '../neo4j/neo4j.module.js';
import { AdminService } from './admin.service.js';
import { AdminController } from './admin.controller.js';

@Module({
  imports: [
    AuthModule,
    WafModule,
    RedisModule,
    Neo4jModule,
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Post.name, schema: PostSchema },
      { name: PostComment.name, schema: PostCommentSchema },
      { name: CommentReport.name, schema: CommentReportSchema },
    ]),
  ],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
