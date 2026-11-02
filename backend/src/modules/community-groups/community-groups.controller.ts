import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CommunityGroupsService } from './community-groups.service.js';
import { CreateCommunityGroupDto, UpdateCommunityGroupDto } from './dto/community-group.dto.js';

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
  @ApiOperation({ summary: 'Tham gia hoặc gửi yêu cầu tham gia nhóm' })
  async joinGroup(
    @Param('id') groupId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.groupsService.joinGroup(groupId, req.user.sub);
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
