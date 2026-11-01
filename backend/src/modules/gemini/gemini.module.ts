import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { GeminiService } from './gemini.service.js';
import { GeminiController } from './gemini.controller.js';
import { UsersModule } from '../users/users.module.js';
import { Post, PostSchema } from '../posts/schemas/post.schema.js';
import { PostComment, PostCommentSchema } from '../posts/schemas/post-comment.schema.js';
import { Conversation, ConversationSchema } from '../chat/schemas/conversation.schema.js';
import { Message, MessageSchema } from '../chat/schemas/message.schema.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Post.name, schema: PostSchema },
      { name: PostComment.name, schema: PostCommentSchema },
      { name: Conversation.name, schema: ConversationSchema },
      { name: Message.name, schema: MessageSchema },
    ]),
    UsersModule,
  ],
  controllers: [GeminiController],
  providers: [GeminiService],
  exports: [GeminiService],
})
export class GeminiModule {}
