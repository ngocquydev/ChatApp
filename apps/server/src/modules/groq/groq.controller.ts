import {
  Body,
  Controller,
  ForbiddenException,
  NotFoundException,
  Post,
  Get,
  Req,
  UnauthorizedException,
  UseGuards,
  BadRequestException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import type { AuthenticatedRequest } from '../auth/types/auth.types.js';
import { GroqService } from './groq.service.js';
import { AuraRateLimiterService } from './aura-rate-limiter.service.js';
import { UsersService } from '../users/users.service.js';
import { Post as PostEntity, PostDocument } from '../posts/schemas/post.schema.js';
import { PostComment, PostCommentDocument } from '../posts/schemas/post-comment.schema.js';
import { Conversation, ConversationDocument } from '../chat/schemas/conversation.schema.js';
import { Message, MessageDocument } from '../chat/schemas/message.schema.js';
import {
  SummarizeCommentsDto,
  SummarizeChatDto,
  AskAuraDto,
} from './dto/groq.dto.js';

@ApiTags('Groq & Aura AI')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('groq')
export class GroqController {
  constructor(
    private readonly groqService: GroqService,
    private readonly auraRateLimiter: AuraRateLimiterService,
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

  @Get('quota')
  @ApiOperation({ summary: 'Xem hạn ngạch sử dụng Aura AI trong ngày của người dùng' })
  async getQuota(@Req() req: AuthenticatedRequest) {
    const userId = this.extractUserId(req);
    return await this.auraRateLimiter.getUserDailyUsage(userId);
  }

  @Post('summarize-comments')
  @ApiOperation({ summary: 'Tóm tắt bình luận bài viết bằng Llama 3.3 (Groq)' })
  async summarizeComments(
    @Req() req: AuthenticatedRequest,
    @Body() dto: SummarizeCommentsDto,
  ) {
    const userId = this.extractUserId(req);
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

    // 1. Kiểm tra Cache trong Redis trước khi gọi AI (Tiết kiệm 100% token nếu đã có)
    const cached = await this.auraRateLimiter.getCachedCommentSummary(
      post._id.toString(),
      comments.length,
    );
    if (cached) {
      return {
        success: true,
        summary: cached,
        commentCount: comments.length,
        model: this.groqService.model,
        cached: true,
      };
    }

    // 2. Kiểm tra hạn mức & chống spam người dùng
    const quota = await this.auraRateLimiter.checkAndConsumeQuota(userId);
    if (!quota.allowed) {
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: quota.message || 'Bạn đã đạt giới hạn sử dụng AI',
          retryAfter: quota.retryAfterSeconds,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const authorIds = Array.from(new Set(comments.map((c) => c.authorId.toString())));
    const authors = await this.usersService.findByIds(authorIds);
    const authorsMap = new Map(authors.map((a) => [a._id.toString(), a.name]));

    const commentItems = comments.map((c) => ({
      authorName: authorsMap.get(c.authorId.toString()) || 'Người dùng',
      text: c.content || (c.mediaUrl ? '[Ảnh/Video đính kèm]' : ''),
    }));

    try {
      const summary = await this.groqService.summarizeComments(
        post.content || '',
        commentItems,
      );

      // 3. Ghi kết quả vào Cache Redis (TTL 30 phút)
      await this.auraRateLimiter.setCachedCommentSummary(
        post._id.toString(),
        comments.length,
        summary,
      );

      return {
        success: true,
        summary,
        commentCount: comments.length,
        model: this.groqService.model,
        cached: false,
      };
    } finally {
      await this.auraRateLimiter.releaseConcurrencyLock(userId);
    }
  }

  @Post('summarize-chat')
  @ApiOperation({ summary: 'Tóm tắt nội dung cuộc trò chuyện bằng Llama 3.3 (Groq)' })
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

    const quota = await this.auraRateLimiter.checkAndConsumeQuota(viewerId);
    if (!quota.allowed) {
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: quota.message || 'Bạn đã đạt giới hạn sử dụng AI',
          retryAfter: quota.retryAfterSeconds,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const conv = await this.conversationModel
      .findById(new Types.ObjectId(dto.conversationId))
      .lean()
      .exec();

    if (!conv) {
      await this.auraRateLimiter.releaseConcurrencyLock(viewerId);
      throw new NotFoundException('Không tìm thấy cuộc trò chuyện');
    }

    const isParticipant = conv.participants.some(
      (p) => p.toString() === viewerId,
    );
    if (!isParticipant) {
      await this.auraRateLimiter.releaseConcurrencyLock(viewerId);
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

    try {
      const summary = await this.groqService.summarizeChat(chatItems);

      return {
        success: true,
        summary,
        messageCount: sortedMessages.length,
        model: this.groqService.model,
      };
    } finally {
      await this.auraRateLimiter.releaseConcurrencyLock(viewerId);
    }
  }

  @Post('ask-aura')
  @ApiOperation({ summary: 'Hỏi đáp trực tiếp với trợ lý Aura AI (Llama 3.3 (Groq))' })
  async askAura(
    @Req() req: AuthenticatedRequest,
    @Body() dto: AskAuraDto,
  ) {
    const viewerId = this.extractUserId(req);
    if (!dto.prompt || !dto.prompt.trim()) {
      throw new BadRequestException('Nội dung câu hỏi (prompt) không được để trống');
    }

    const quota = await this.auraRateLimiter.checkAndConsumeQuota(viewerId, dto.prompt);
    if (!quota.allowed) {
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: quota.message || 'Bạn đã đạt giới hạn sử dụng AI',
          retryAfter: quota.retryAfterSeconds,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    let historyItems: Array<{ senderName: string; text: string }> = [];
    let partnerId: string | undefined;
    if (dto.conversationId && Types.ObjectId.isValid(dto.conversationId)) {
      try {
        const conv = await this.conversationModel
          .findById(new Types.ObjectId(dto.conversationId))
          .lean()
          .exec();
        if (conv) {
          partnerId = conv.participants.find((p) => p.toString() !== viewerId)?.toString();
        }

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

    try {
      const reply = await this.groqService.generateAuraChatReply(dto.prompt, historyItems, {
        conversationId: dto.conversationId,
        senderId: viewerId,
        partnerId,
      });

      return {
        success: true,
        reply,
        model: this.groqService.model,
      };
    } finally {
      await this.auraRateLimiter.releaseConcurrencyLock(viewerId);
    }
  }
}
