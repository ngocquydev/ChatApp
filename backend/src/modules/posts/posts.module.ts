import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersModule } from '../users/users.module.js';
import { ModerationModule } from '../moderation/moderation.module.js';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { Friendship, FriendshipSchema } from '../friends/schemas/friendship.schema.js';
import { Post, PostSchema } from './schemas/post.schema.js';
import { PostLike, PostLikeSchema } from './schemas/post-like.schema.js';
import { PostComment, PostCommentSchema } from './schemas/post-comment.schema.js';
import { PostsController } from './posts.controller.js';
import { PostsService } from './posts.service.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Post.name, schema: PostSchema },
      { name: PostLike.name, schema: PostLikeSchema },
      { name: PostComment.name, schema: PostCommentSchema },
      { name: Friendship.name, schema: FriendshipSchema },
    ]),
    UsersModule,
    ModerationModule,
    NotificationsModule,
  ],
  controllers: [PostsController],
  providers: [PostsService],
  exports: [PostsService],
})
export class PostsModule {}
