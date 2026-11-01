import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { GroqService } from './groq.service.js';
import { GroqController } from './groq.controller.js';
import { AuraRagService } from './rag/aura-rag.service.js';
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
  controllers: [GroqController],
  providers: [GroqService, AuraRagService],
  exports: [GroqService, AuraRagService],
})
export class GroqModule {}
