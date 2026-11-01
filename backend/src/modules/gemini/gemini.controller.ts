import {
  Body,
  Controller,
  ForbiddenException,
  NotFoundException,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import type { AuthenticatedRequest } from '../auth/types/auth.types.js';
import { GeminiService } from './gemini.service.js';
import { UsersService } from '../users/users.service.js';
import { Post as PostEntity, PostDocument } from '../posts/schemas/post.schema.js';
import { PostComment, PostCommentDocument } from '../posts/schemas/post-comment.schema.js';
import { Conversation, ConversationDocument } from '../chat/schemas/conversation.schema.js';
import { Message, MessageDocument } from '../chat/schemas/message.schema.js';

export class SummarizeCommentsDto {
  postId: string;
}

export class SummarizeChatDto {
  conversationId: string;
  limit?: number;
}

export class AskAuraDto {
  prompt: string;
  conversationId?: string;
}

@ApiTags('Gemini & Aura AI')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('gemini')
export class GeminiController {
  constructor(
    private readonly geminiService: GeminiService,
    private readonly usersService: UsersService,
    @InjectModel(PostEntity.name)
    private readonly postModel: Model<PostDocument>,
    @InjectModel(PostComment.name)
    private readonly commentModel: Model<PostCommentDocument>,
    @InjectModel(Conversation.name)
    private readonly conversationModel: Model<ConversationDocument>,
    @InjectModel(Message.name)
    private readonly messageModel: Model<MessageDocument>,
  ) {}

  private extractUserId(req: AuthenticatedRequest): string {
    const userId =
      req.user?._id?.toString() ||
      req.user?.id?.toString() ||
      (req.user as { sub?: string } | undefined)?.sub;
    if (!userId) {
      throw new UnauthorizedException('Không thể xác thực danh tính người dùng');
    }
    return userId;
  }

  @Post('summarize-comments')
  @ApiOperation({ summary: 'Tóm tắt bình luận bài viết bằng Gemini 1.5 Flash' })
  async summarizeComments(
    @Req() req: AuthenticatedRequest,
    @Body() dto: SummarizeCommentsDto,
  ) {
    this.extractUserId(req);
    if (!dto.postId) {
      throw new BadRequestException('Mã bài viết (postId) là bắt buộc');
    }

    if (!Types.ObjectId.isValid(dto.postId)) {
      throw new BadRequestException('Mã bài viết không hợp lệ');
    }

    const post = await this.postModel
      .findOne({ _id: new Types.ObjectId(dto.postId), deletedAt: null })
      .lean()
      .exec();

    if (!post) {
      throw new NotFoundException('Không tìm thấy bài viết hoặc bài viết đã bị xóa');
    }

    const comments = await this.commentModel
      .find({ postId: post._id })
      .sort({ createdAt: 1 })
      .limit(50)
      .lean()
      .exec();

    const authorIds = Array.from(new Set(comments.map((c) => c.authorId.toString())));
    const authors = await this.usersService.findByIds(authorIds);
    const authorsMap = new Map(authors.map((a) => [a._id.toString(), a.name]));

    const commentItems = comments.map((c) => ({
      authorName: authorsMap.get(c.authorId.toString()) || 'Người dùng',
      text: c.content || (c.mediaUrl ? '[Ảnh/Video đính kèm]' : ''),
    }));

    const summary = await this.geminiService.summarizeComments(
      post.content || '',
      commentItems,
    );

    return {
      success: true,
      summary,
      commentCount: comments.length,
      model: 'gemini-1.5-flash',
    };
  }

  @Post('summarize-chat')
  @ApiOperation({ summary: 'Tóm tắt nội dung cuộc trò chuyện bằng Gemini 1.5 Flash' })
  async summarizeChat(
    @Req() req: AuthenticatedRequest,
    @Body() dto: SummarizeChatDto,
  ) {
    const viewerId = this.extractUserId(req);
    if (!dto.conversationId) {
      throw new BadRequestException('Mã cuộc trò chuyện (conversationId) là bắt buộc');
    }

    if (!Types.ObjectId.isValid(dto.conversationId)) {
      throw new BadRequestException('Mã cuộc trò chuyện không hợp lệ');
    }

    const conv = await this.conversationModel
      .findById(new Types.ObjectId(dto.conversationId))
      .lean()
      .exec();

    if (!conv) {
      throw new NotFoundException('Không tìm thấy cuộc trò chuyện');
    }

    const isParticipant = conv.participants.some(
      (p) => p.toString() === viewerId,
    );
    if (!isParticipant) {
      throw new ForbiddenException('Bạn không thuộc cuộc trò chuyện này');
    }

    const limit = Math.min(Math.max(dto.limit || 30, 5), 50);
    const messages = await this.messageModel
      .find({ conversationId: conv._id })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean()
      .exec();

    const sortedMessages = messages.reverse();

    const senderIds = Array.from(new Set(sortedMessages.map((m) => m.senderId.toString())));
    const senders = await this.usersService.findByIds(senderIds);
    const sendersMap = new Map<string, string>(
      senders.map((u) => [u._id.toString(), u.name || (u._id.toString() === viewerId ? 'Tôi' : 'Bạn bè')]),
    );

    const chatItems = sortedMessages.map((m) => ({
      senderName: sendersMap.get(m.senderId.toString()) || 'Người dùng',
      text: m.text,
      time: m.createdAt ? new Date(m.createdAt).toLocaleTimeString('vi-VN') : undefined,
    }));

    const summary = await this.geminiService.summarizeChat(chatItems);

    return {
      success: true,
      summary,
      messageCount: sortedMessages.length,
      model: 'gemini-1.5-flash',
    };
  }

  @Post('ask-aura')
  @ApiOperation({ summary: 'Hỏi đáp trực tiếp với trợ lý Aura AI (Gemini 1.5 Flash)' })
  async askAura(
    @Req() req: AuthenticatedRequest,
    @Body() dto: AskAuraDto,
  ) {
    const viewerId = this.extractUserId(req);
    if (!dto.prompt || !dto.prompt.trim()) {
      throw new BadRequestException('Nội dung câu hỏi (prompt) không được để trống');
    }

    let historyItems: Array<{ senderName: string; text: string }> = [];
    if (dto.conversationId && Types.ObjectId.isValid(dto.conversationId)) {
      try {
        const messages = await this.messageModel
          .find({ conversationId: new Types.ObjectId(dto.conversationId) })
          .sort({ createdAt: -1 })
          .limit(10)
          .lean()
          .exec();

        historyItems = messages.reverse().map((m) => ({
          senderName: m.senderId.toString() === viewerId ? 'Người dùng' : 'Đối phương',
          text: m.text,
        }));
      } catch {
        // Bỏ qua nếu không load được history
      }
    }

    const reply = await this.geminiService.generateAuraChatReply(dto.prompt, historyItems);

    return {
      success: true,
      reply,
      model: 'gemini-1.5-flash',
    };
  }
}
