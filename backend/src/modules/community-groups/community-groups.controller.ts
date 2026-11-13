import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  HttpCode,
  HttpStatus,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard.js';
import { CommunityGroupsService } from './community-groups.service.js';
import {
  CreateCommunityGroupDto,
  UpdateCommunityGroupDto,
  JoinGroupDto,
  SetDeputyDto,
  ToggleMuteCommentsDto,
  ToggleBlockPostingDto,
} from './dto/community-group.dto.js';
import { ResolveCommentReportDto } from '../posts/dto/report-comment.dto.js';

interface AuthenticatedRequest extends Request {
  user?: {
    sub?: string;
    _id?: string;
    id?: string;
    email?: string;
    role?: string;
  };
}

@ApiTags('Community Groups (Hội nhóm MXH)')
@Controller('community-groups')
export class CommunityGroupsController {
  constructor(private readonly groupsService: CommunityGroupsService) {}

  private extractUserId(req?: AuthenticatedRequest): string {
    const userId =
      req?.user?._id?.toString() ||
      req?.user?.id?.toString() ||
      req?.user?.sub;
    return userId ? String(userId) : '';
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Tạo hội nhóm mới' })
  async createGroup(@Request() req: AuthenticatedRequest, @Body() dto: CreateCommunityGroupDto) {
    const userId = this.extractUserId(req);
    return this.groupsService.createGroup(userId, dto);
  }

  @Get('my')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lấy danh sách các hội nhóm của tôi' })
  async getMyGroups(@Request() req: AuthenticatedRequest) {
    const userId = this.extractUserId(req);
    return this.groupsService.getMyGroups(userId);
  }

  @Get('explore')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Khám phá danh sách hội nhóm công khai' })
  async exploreGroups(
    @Query('q') q?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
    @Request() req?: AuthenticatedRequest,
  ) {
    const viewerId = this.extractUserId(req);
    return this.groupsService.exploreGroups(q, limit ? Number(limit) : 20, offset ? Number(offset) : 0, viewerId);
  }

  @Get(':slug')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Lấy thông tin chi tiết một nhóm theo slug' })
  async getGroupBySlug(
    @Param('slug') slug: string,
    @Request() req?: AuthenticatedRequest,
  ) {
    const viewerId = this.extractUserId(req);
    return this.groupsService.getGroupBySlug(slug, viewerId);
  }

  @Post(':id/join')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Tham gia hoặc gửi yêu cầu tham gia nhóm kèm câu trả lời' })
  async joinGroup(
    @Param('id') groupId: string,
    @Request() req: AuthenticatedRequest,
    @Body() dto?: JoinGroupDto,
  ) {
    const userId = this.extractUserId(req);
    return this.groupsService.joinGroup(groupId, userId, dto);
  }

  @Post(':id/leave')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Rời khỏi nhóm' })
  async leaveGroup(
    @Param('id') groupId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    const userId = this.extractUserId(req);
    return this.groupsService.leaveGroup(groupId, userId);
  }

  @Get(':id/members')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Lấy danh sách thành viên nhóm kèm vai trò và quyền hạn' })
  async getGroupMembers(
    @Param('id') groupId: string,
    @Request() req?: AuthenticatedRequest,
  ) {
    const viewerId = this.extractUserId(req);
    return this.groupsService.getGroupMembers(groupId, viewerId);
  }

  @Get(':id/pending-requests')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lấy danh sách người xin vào nhóm kèm lý do/câu trả lời' })
  async getPendingRequests(
    @Param('id') groupId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    const userId = this.extractUserId(req);
    return this.groupsService.getPendingRequests(userId, groupId);
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
    const userId = this.extractUserId(req);
    return this.groupsService.approveMember(userId, groupId, targetUserId);
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
    const userId = this.extractUserId(req);
    return this.groupsService.rejectMember(userId, groupId, targetUserId);
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
    const userId = this.extractUserId(req);
    return this.groupsService.removeMember(userId, groupId, targetUserId);
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
    const userId = this.extractUserId(req);
    return this.groupsService.setDeputy(userId, groupId, dto);
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
    const userId = this.extractUserId(req);
    return this.groupsService.removeDeputy(userId, groupId, targetUserId);
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
    const userId = this.extractUserId(req);
    return this.groupsService.toggleMuteComments(userId, groupId, targetUserId, dto.muted);
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
    const userId = this.extractUserId(req);
    return this.groupsService.toggleBlockPosting(userId, groupId, targetUserId, dto.blocked);
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
    const userId = this.extractUserId(req);
    return this.groupsService.updateGroup(groupId, userId, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Xóa hội nhóm (Dành cho Quản trị viên nhóm)' })
  async deleteGroup(
    @Param('id') groupId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    const userId = this.extractUserId(req);
    return this.groupsService.deleteGroup(groupId, userId);
  }

  @Get(':id/comment-reports')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lấy danh sách báo cáo bình luận trong nhóm (Dành cho BQT nhóm)' })
  async getGroupCommentReports(
    @Param('id') groupId: string,
    @Request() req: AuthenticatedRequest,
    @Query('status') status?: string,
  ) {
    const userId = this.extractUserId(req);
    return this.groupsService.getGroupCommentReports(groupId, userId, status);
  }

  @Post(':id/comment-reports/:reportId/resolve')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Quản trị viên / phó nhóm xử lý báo cáo bình luận' })
  async resolveGroupCommentReport(
    @Param('id') groupId: string,
    @Param('reportId') reportId: string,
    @Request() req: AuthenticatedRequest,
    @Body() dto: ResolveCommentReportDto,
  ) {
    const userId = this.extractUserId(req);
    return this.groupsService.resolveGroupCommentReport(groupId, reportId, userId, dto);
  }
}
