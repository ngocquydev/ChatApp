import {
  Body,
  Controller,
  Delete,
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
import { FriendsService } from './friends.service.js';
import { SendFriendRequestDto } from './dto/friend-request.dto.js';
import { RespondFriendRequestDto } from './dto/respond-request.dto.js';
import type { AuthenticatedRequest } from '../auth/types/auth.types.js';

@ApiTags('Friends')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('friends')
export class FriendsController {
  constructor(private readonly friendsService: FriendsService) {}

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

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách bạn bè chính thức' })
  async getFriendsList(@Req() req: AuthenticatedRequest) {
    const userId = this.extractUserId(req);
    const friends = await this.friendsService.getFriendsList(userId);
    return {
      success: true,
      friends,
    };
  }

  @Get('requests')
  @ApiOperation({ summary: 'Lấy danh sách lời mời kết bạn đã nhận và đã gửi' })
  async getFriendRequests(@Req() req: AuthenticatedRequest) {
    const userId = this.extractUserId(req);
    const requests = await this.friendsService.getFriendRequests(userId);
    return {
      success: true,
      ...requests,
    };
  }

  @Get('search')
  @ApiOperation({ summary: 'Tìm kiếm người dùng kèm trạng thái quan hệ bạn bè' })
  async searchUsers(
    @Req() req: AuthenticatedRequest,
    @Query('q') query?: string,
  ) {
    const userId = this.extractUserId(req);
    const users = await this.friendsService.searchUsersWithRelation(
      query || '',
      userId,
    );
    return {
      success: true,
      users,
    };
  }

  @Post('request')
  @ApiOperation({ summary: 'Gửi lời mời kết bạn' })
  async sendFriendRequest(
    @Req() req: AuthenticatedRequest,
    @Body() dto: SendFriendRequestDto,
  ) {
    const userId = this.extractUserId(req);
    const request = await this.friendsService.sendFriendRequest(
      userId,
      dto.recipientId,
    );
    return {
      success: true,
      message:
        request.status === 'accepted'
          ? 'Đã tự động kết bạn thành công!'
          : 'Đã gửi lời mời kết bạn thành công!',
      request,
    };
  }

  @Patch('requests/:id/respond')
  @ApiOperation({ summary: 'Chấp nhận hoặc từ chối lời mời kết bạn' })
  async respondToRequest(
    @Req() req: AuthenticatedRequest,
    @Param('id') requestId: string,
    @Body() dto: RespondFriendRequestDto,
  ) {
    const userId = this.extractUserId(req);
    return this.friendsService.respondToRequest(requestId, userId, dto.action);
  }

  @Delete('requests/:id')
  @ApiOperation({ summary: 'Hủy lời mời kết bạn đã gửi' })
  async cancelRequest(
    @Req() req: AuthenticatedRequest,
    @Param('id') requestId: string,
  ) {
    const userId = this.extractUserId(req);
    return this.friendsService.cancelRequest(requestId, userId);
  }

  @Delete(':friendId')
  @ApiOperation({ summary: 'Hủy kết bạn' })
  async unfriend(
    @Req() req: AuthenticatedRequest,
    @Param('friendId') friendId: string,
  ) {
    const userId = this.extractUserId(req);
    return this.friendsService.unfriend(userId, friendId);
  }
}
