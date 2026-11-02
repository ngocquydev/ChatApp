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
import {
  CreateGroupDto,
  UpdateGroupDto,
  AddGroupMembersDto,
  SendGroupMessageDto,
} from './dto/group-chat.dto.js';
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

  private getParticipantId(p: unknown): string {
    if (!p) return '';
    if (typeof p === 'string') return p;
    if (typeof p === 'object' && '_id' in p) {
      return String((p as { _id: unknown })._id);
    }
    if (
      typeof p === 'object' &&
      typeof (p as { toString?: () => string }).toString === 'function'
    ) {
      return (p as { toString: () => string }).toString();
    }
    return '';
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

  @Post('group')
  @ApiOperation({ summary: 'Tạo nhóm chat mới' })
  async createGroup(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateGroupDto,
  ) {
    const userId = this.extractUserId(req);
    const conversation = await this.chatService.createGroupConversation(
      userId,
      dto,
    );
    if (this.chatGateway) {
      conversation.participants.forEach((p) => {
        const pid = this.getParticipantId(p);
        this.chatGateway?.server?.to(`user:${pid}`).emit('conversation:created', {
          conversation,
        });
      });
    }
    return {
      success: true,
      conversation,
    };
  }

  @Get('group/:id')
  @ApiOperation({ summary: 'Lấy thông tin chi tiết nhóm chat' })
  async getGroupDetails(
    @Req() req: AuthenticatedRequest,
    @Param('id') conversationId: string,
  ) {
    const userId = this.extractUserId(req);
    const conversation = await this.chatService.getGroupDetails(
      userId,
      conversationId,
    );
    return {
      success: true,
      conversation,
    };
  }

  @Patch('group/:id')
  @ApiOperation({ summary: 'Cập nhật tên hoặc ảnh đại diện nhóm chat' })
  async updateGroup(
    @Req() req: AuthenticatedRequest,
    @Param('id') conversationId: string,
    @Body() dto: UpdateGroupDto,
  ) {
    const userId = this.extractUserId(req);
    const conversation = await this.chatService.updateGroupInfo(
      userId,
      conversationId,
      dto,
    );
    if (this.chatGateway) {
      this.chatGateway.server?.to(`conversation:${conversationId}`).emit('group:updated', {
        conversationId,
        conversation,
      });
      conversation.participants.forEach((p) => {
        const pid = this.getParticipantId(p);
        this.chatGateway?.server?.to(`user:${pid}`).emit('conversation:updated', {
          conversation,
        });
      });
    }
    return {
      success: true,
      conversation,
    };
  }

  @Post('group/:id/members')
  @ApiOperation({ summary: 'Thêm thành viên vào nhóm chat' })
  async addMembers(
    @Req() req: AuthenticatedRequest,
    @Param('id') conversationId: string,
    @Body() dto: AddGroupMembersDto,
  ) {
    const userId = this.extractUserId(req);
    const conversation = await this.chatService.addGroupMembers(
      userId,
      conversationId,
      dto.memberIds,
    );
    if (this.chatGateway) {
      this.chatGateway.server?.to(`conversation:${conversationId}`).emit('group:members_added', {
        conversationId,
        conversation,
      });
      conversation.participants.forEach((p) => {
        const pid = this.getParticipantId(p);
        this.chatGateway?.server?.to(`user:${pid}`).emit('conversation:updated', {
          conversation,
        });
      });
    }
    return {
      success: true,
      conversation,
    };
  }

  @Delete('group/:id/members/:memberId')
  @ApiOperation({ summary: 'Xóa thành viên hoặc tự rời khỏi nhóm' })
  async removeMember(
    @Req() req: AuthenticatedRequest,
    @Param('id') conversationId: string,
    @Param('memberId') memberId: string,
  ) {
    const userId = this.extractUserId(req);
    const conversation = await this.chatService.removeGroupMember(
      userId,
      conversationId,
      memberId,
    );
    if (this.chatGateway) {
      this.chatGateway.server?.to(`conversation:${conversationId}`).emit('group:member_removed', {
        conversationId,
        memberId,
        conversation,
      });
      this.chatGateway.server?.to(`user:${memberId}`).emit('group:kicked', {
        conversationId,
      });
      conversation.participants.forEach((p) => {
        const pid = this.getParticipantId(p);
        this.chatGateway?.server?.to(`user:${pid}`).emit('conversation:updated', {
          conversation,
        });
      });
    }
    return {
      success: true,
      conversation,
    };
  }

  @Post('group/:id/admins/:targetUserId')
  @ApiOperation({ summary: 'Bổ nhiệm thành viên làm quản trị viên nhóm' })
  async promoteAdmin(
    @Req() req: AuthenticatedRequest,
    @Param('id') conversationId: string,
    @Param('targetUserId') targetUserId: string,
  ) {
    const userId = this.extractUserId(req);
    const conversation = await this.chatService.promoteGroupAdmin(
      userId,
      conversationId,
      targetUserId,
    );
    if (this.chatGateway) {
      this.chatGateway.server?.to(`conversation:${conversationId}`).emit('group:admin_promoted', {
        conversationId,
        targetUserId,
        conversation,
      });
      conversation.participants.forEach((p) => {
        const pid = this.getParticipantId(p);
        this.chatGateway?.server?.to(`user:${pid}`).emit('conversation:updated', {
          conversation,
        });
      });
    }
    return {
      success: true,
      conversation,
    };
  }

  @Post('group/:id/messages')
  @ApiOperation({ summary: 'Gửi tin nhắn vào nhóm trò chuyện' })
  async sendGroupMessage(
    @Req() req: AuthenticatedRequest,
    @Param('id') conversationId: string,
    @Body() dto: SendGroupMessageDto,
  ) {
    const userId = this.extractUserId(req);
    const message = await this.chatService.saveGroupMessage(
      userId,
      conversationId,
      dto.text,
      {
        type: dto.type,
        location: dto.location,
      },
    );
    if (this.chatGateway) {
      const conv = await this.chatService.getConversationById(conversationId);
      if (conv) {
        conv.participants.forEach((p) => {
          const pid = p.toString();
          this.chatGateway?.server?.to(`user:${pid}`).emit('message:received', {
            message,
          });
        });
      }
    }
    return {
      success: true,
      message,
    };
  }
}
