import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Optional,
  forwardRef,
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
import { ChatGateway } from './chat.gateway.js';
import { SendMessageDto } from './dto/send-message.dto.js';
import type { AuthenticatedRequest } from '../auth/types/auth.types.js';

@ApiTags('Chat')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('chat')
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    @Optional()
    @Inject(forwardRef(() => ChatGateway))
    private readonly chatGateway?: ChatGateway,
  ) {}

  private extractUserId(req: AuthenticatedRequest): string {
    const userId =
      req.user?._id?.toString() ||
      req.user?.id?.toString() ||
      req.user?.sub;
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
      {
        type: dto.type,
        location: dto.location,
      },
    );

    if (this.chatGateway) {
      void this.chatGateway.triggerAuraReply({
        senderId: userId,
        receiverId: dto.receiverId,
        text: dto.text,
        conversationId: message.conversationId.toString(),
      });
    }

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

  @Delete('conversations/:id')
  @ApiOperation({ summary: 'Xóa cuộc hội thoại' })
  async deleteConversation(
    @Req() req: AuthenticatedRequest,
    @Param('id') conversationId: string,
  ) {
    const userId = this.extractUserId(req);
    await this.chatService.deleteConversation(conversationId, userId);
    return {
      success: true,
      message: 'Đã xóa cuộc hội thoại thành công',
    };
  }

  @Patch('conversations/:id/block')
  @ApiOperation({ summary: 'Chặn cuộc hội thoại' })
  async blockConversation(
    @Req() req: AuthenticatedRequest,
    @Param('id') conversationId: string,
  ) {
    const userId = this.extractUserId(req);
    const conversation = await this.chatService.blockConversation(
      conversationId,
      userId,
    );
    return {
      success: true,
      conversation,
    };
  }

  @Patch('conversations/:id/unblock')
  @ApiOperation({ summary: 'Bỏ chặn cuộc hội thoại' })
  async unblockConversation(
    @Req() req: AuthenticatedRequest,
    @Param('id') conversationId: string,
  ) {
    const userId = this.extractUserId(req);
    const conversation = await this.chatService.unblockConversation(
      conversationId,
      userId,
    );
    return {
      success: true,
      conversation,
    };
  }

  @Patch('conversations/:id/restrict')
  @ApiOperation({ summary: 'Bật hoặc tắt hạn chế cuộc trò chuyện' })
  async restrictConversation(
    @Req() req: AuthenticatedRequest,
    @Param('id') conversationId: string,
    @Body('restrict') restrict: boolean,
  ) {
    const userId = this.extractUserId(req);
    const conversation = await this.chatService.restrictConversation(
      conversationId,
      userId,
      Boolean(restrict),
    );
    return {
      success: true,
      conversation,
    };
  }

  @Patch('conversations/:id/theme')
  @ApiOperation({ summary: 'Đổi chủ đề / hình nền cho cuộc trò chuyện' })
  async updateTheme(
    @Req() req: AuthenticatedRequest,
    @Param('id') conversationId: string,
    @Body('theme') theme: string,
  ) {
    const userId = this.extractUserId(req);
    const conversation = await this.chatService.updateConversationTheme(
      conversationId,
      userId,
      theme,
    );
    return {
      success: true,
      conversation,
    };
  }

  @Delete('messages/:id')
  @ApiOperation({ summary: 'Thu hồi / Xóa tin nhắn của chính mình' })
  async deleteMessage(
    @Req() req: AuthenticatedRequest,
    @Param('id') messageId: string,
  ) {
    const userId = this.extractUserId(req);
    const message = await this.chatService.deleteMessage(messageId, userId);
    return {
      success: true,
      message,
    };
  }

  @Post('messages/:id/reaction')
  @ApiOperation({ summary: 'Thả cảm xúc / xóa cảm xúc vào tin nhắn' })
  async reactToMessage(
    @Req() req: AuthenticatedRequest,
    @Param('id') messageId: string,
    @Body('type') type: string,
  ) {
    const userId = this.extractUserId(req);
    const result = await this.chatService.reactToMessage(messageId, userId, type);
    return {
      success: true,
      ...result,
    };
  }
}
