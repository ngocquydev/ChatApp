import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CommunityGroupsService } from './community-groups.service.js';
import {
  CreateCommunityGroupDto,
  UpdateCommunityGroupDto,
  JoinGroupDto,
  SetDeputyDto,
  ToggleMuteCommentsDto,
  ToggleBlockPostingDto,
} from './dto/community-group.dto.js';

interface AuthenticatedRequest extends Request {
  user: {
    sub: string;
    email: string;
    role: string;
  };
}

@ApiTags('Community Groups (Hội nhóm MXH)')
@Controller('community-groups')
export class CommunityGroupsController {
  constructor(private readonly groupsService: CommunityGroupsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Tạo hội nhóm mới' })
  async createGroup(@Request() req: AuthenticatedRequest, @Body() dto: CreateCommunityGroupDto) {
    return this.groupsService.createGroup(req.user.sub, dto);
  }

  @Get('my')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lấy danh sách các hội nhóm của tôi' })
  async getMyGroups(@Request() req: AuthenticatedRequest) {
    return this.groupsService.getMyGroups(req.user.sub);
  }

  @Get('explore')
  @ApiOperation({ summary: 'Khám phá danh sách hội nhóm công khai' })
  async exploreGroups(
    @Query('q') q?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.groupsService.exploreGroups(q, limit ? Number(limit) : 20, offset ? Number(offset) : 0);
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Lấy thông tin chi tiết một nhóm theo slug' })
  async getGroupBySlug(
    @Param('slug') slug: string,
    @Request() req?: AuthenticatedRequest,
  ) {
    const viewerId = req?.user?.sub;
    return this.groupsService.getGroupBySlug(slug, viewerId);
  }

  @Post(':id/join')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Tham gia hoặc gửi yêu cầu tham gia nhóm kèm câu trả lời' })
  async joinGroup(
    @Param('id') groupId: string,
    @Request() req: AuthenticatedRequest,
    @Body() dto?: JoinGroupDto,
  ) {
    return this.groupsService.joinGroup(groupId, req.user.sub, dto);
  }

  @Post(':id/leave')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Rời khỏi nhóm' })
  async leaveGroup(
    @Param('id') groupId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.groupsService.leaveGroup(groupId, req.user.sub);
  }

  @Get(':id/members')
  @ApiOperation({ summary: 'Lấy danh sách thành viên nhóm kèm vai trò và quyền hạn' })
  async getGroupMembers(
    @Param('id') groupId: string,
    @Request() req?: AuthenticatedRequest,
  ) {
    return this.groupsService.getGroupMembers(groupId, req?.user?.sub);
  }

  @Get(':id/pending-requests')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lấy danh sách người xin vào nhóm kèm lý do/câu trả lời' })
  async getPendingRequests(
    @Param('id') groupId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.groupsService.getPendingRequests(req.user.sub, groupId);
  }

  @Post(':id/members/:userId/approve')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Duyệt thành viên chờ vào nhóm' })
  async approveMember(
    @Param('id') groupId: string,
    @Param('userId') targetUserId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.groupsService.approveMember(req.user.sub, groupId, targetUserId);
  }

  @Post(':id/members/:userId/reject')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Từ chối thành viên chờ vào nhóm' })
  async rejectMember(
    @Param('id') groupId: string,
    @Param('userId') targetUserId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.groupsService.rejectMember(req.user.sub, groupId, targetUserId);
  }

  @Delete(':id/members/:userId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Xóa thành viên khỏi nhóm' })
  async removeMember(
    @Param('id') groupId: string,
    @Param('userId') targetUserId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.groupsService.removeMember(req.user.sub, groupId, targetUserId);
  }

  @Post(':id/deputies')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Bổ nhiệm hoặc chỉnh sửa quyền hạn phó nhóm' })
  async setDeputy(
    @Param('id') groupId: string,
    @Request() req: AuthenticatedRequest,
    @Body() dto: SetDeputyDto,
  ) {
    return this.groupsService.setDeputy(req.user.sub, groupId, dto);
  }

  @Delete(':id/deputies/:userId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Thu hồi vai trò phó nhóm' })
  async removeDeputy(
    @Param('id') groupId: string,
    @Param('userId') targetUserId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.groupsService.removeDeputy(req.user.sub, groupId, targetUserId);
  }

  @Post(':id/members/:userId/mute-comments')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Khóa hoặc mở khóa quyền bình luận của thành viên trong nhóm' })
  async toggleMuteComments(
    @Param('id') groupId: string,
    @Param('userId') targetUserId: string,
    @Request() req: AuthenticatedRequest,
    @Body() dto: ToggleMuteCommentsDto,
  ) {
    return this.groupsService.toggleMuteComments(req.user.sub, groupId, targetUserId, dto.muted);
  }

  @Post(':id/members/:userId/block-posting')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Khóa hoặc mở khóa quyền đăng bài của thành viên trong nhóm' })
  async toggleBlockPosting(
    @Param('id') groupId: string,
    @Param('userId') targetUserId: string,
    @Request() req: AuthenticatedRequest,
    @Body() dto: ToggleBlockPostingDto,
  ) {
    return this.groupsService.toggleBlockPosting(req.user.sub, groupId, targetUserId, dto.blocked);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cập nhật thông tin hội nhóm' })
  async updateGroup(
    @Param('id') groupId: string,
    @Request() req: AuthenticatedRequest,
    @Body() dto: UpdateCommunityGroupDto,
  ) {
    return this.groupsService.updateGroup(groupId, req.user.sub, dto);
  }
}

