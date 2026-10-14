import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { ChatService } from './chat.service.js';
import { SendMessageDto } from './dto/send-message.dto.js';
import type { AuthenticatedRequest } from '../auth/types/auth.types.js';

@ApiTags('Chat')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  private extractUserId(req: AuthenticatedRequest): string {
    const userId =
      req.user?._id?.toString() ||
      req.user?.id?.toString() ||
      (req.user as any)?.sub;
    if (!userId) {
      throw new UnauthorizedException('Không thể xác thực danh tính người dùng');
    }
    return userId;
  }

  @Get('conversations')
  @ApiOperation({ summary: 'Lấy danh sách các cuộc hội thoại của tôi' })
  async getConversations(@Req() req: AuthenticatedRequest) {
    const userId = this.extractUserId(req);
    const conversations = await this.chatService.getUserConversations(userId);
    return {
      success: true,
      conversations,
    };
  }

  @Post('conversations')
  @ApiOperation({ summary: 'Tạo hoặc lấy cuộc hội thoại 1-1 với một người dùng' })
  async getOrCreateConversation(
    @Req() req: AuthenticatedRequest,
    @Body('participantId') participantId: string,
  ) {
    const userId = this.extractUserId(req);
    const conversation = await this.chatService.getOrCreateConversation(
      userId,
      participantId,
    );
    return {
      success: true,
      conversation,
    };
  }

  @Get('conversations/:id/messages')
  @ApiOperation({ summary: 'Lấy lịch sử tin nhắn của một cuộc hội thoại' })
  async getMessages(
    @Req() req: AuthenticatedRequest,
    @Param('id') conversationId: string,
    @Query('limit') limit?: string,
  ) {
    const userId = this.extractUserId(req);
    const messageLimit = limit ? Math.min(Number(limit), 100) : 50;
    const messages = await this.chatService.getMessages(
      conversationId,
      userId,
      messageLimit,
    );
    return {
      success: true,
      messages,
    };
  }

  @Post('messages')
  @ApiOperation({ summary: 'Gửi tin nhắn qua REST API (fallback)' })
  async sendMessage(
    @Req() req: AuthenticatedRequest,
    @Body() dto: SendMessageDto,
  ) {
    const userId = this.extractUserId(req);
    const message = await this.chatService.saveMessage(
      userId,
      dto.receiverId,
      dto.text,
      dto.conversationId,
    );
    return {
      success: true,
      message,
    };
  }

  @Patch('conversations/:id/read')
  @ApiOperation({ summary: 'Đánh dấu các tin nhắn trong hội thoại là đã xem' })
  async markAsRead(
    @Req() req: AuthenticatedRequest,
    @Param('id') conversationId: string,
  ) {
    const userId = this.extractUserId(req);
    return this.chatService.markAsRead(conversationId, userId);
  }
}
