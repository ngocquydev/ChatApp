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
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/auth/roles.guard.js';
import { Roles } from '../../common/auth/roles.decorator.js';
import { AdminService } from './admin.service.js';
import {
  AdminToggleBanDto,
  AdminUpdateRoleDto,
  AdminUsersQueryDto,
} from './dto/admin-users.dto.js';
import { AdminPostsQueryDto } from './dto/admin-posts.dto.js';
import {
  AdminModerationQueueQueryDto,
  AdminResolveQueueDto,
  AdminTestBehaviorDto,
  AdminTestTextDto,
} from './dto/admin-moderation.dto.js';

@ApiTags('Admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Lấy số liệu thống kê tổng thể hệ thống' })
  getStats() {
    return this.adminService.getStats();
  }

  @Get('users')
  @ApiOperation({ summary: 'Danh sách người dùng (tìm kiếm, lọc theo vai trò & trạng thái)' })
  getUsers(@Query() query: AdminUsersQueryDto) {
    return this.adminService.getUsers(query);
  }

  @Patch('users/:id/ban')
  @ApiOperation({ summary: 'Khóa / mở khóa tài khoản người dùng' })
  toggleUserBan(@Param('id') id: string, @Body() dto: AdminToggleBanDto) {
    return this.adminService.toggleUserBan(id, dto.isBan, dto.reason);
  }

  @Patch('users/:id/role')
  @ApiOperation({ summary: 'Cập nhật vai trò người dùng (admin / user)' })
  updateUserRole(@Param('id') id: string, @Body() dto: AdminUpdateRoleDto) {
    return this.adminService.updateUserRole(id, dto.role);
  }

  @Get('posts')
  @ApiOperation({ summary: 'Danh sách bài viết toàn hệ thống để kiểm duyệt' })
  getPosts(@Query() query: AdminPostsQueryDto) {
    return this.adminService.getPosts(query);
  }

  @Delete('posts/:id')
  @ApiOperation({ summary: 'Gỡ bỏ bài viết vi phạm chính sách' })
  deletePost(@Param('id') id: string) {
    return this.adminService.deletePost(id);
  }

  @Post('moderation/test-text')
  @ApiOperation({ summary: 'Thử nghiệm phân loại văn bản độc hại bằng NLP Transformer' })
  testModerationText(@Body() dto: AdminTestTextDto) {
    return this.adminService.testModerationText(dto.text, dto.language);
  }

  @Post('moderation/test-behavior')
  @ApiOperation({ summary: 'Thử nghiệm phát hiện bất thường bằng Isolation Forest & Autoencoder' })
  testModerationBehavior(@Body() dto: AdminTestBehaviorDto) {
    return this.adminService.testModerationBehavior(dto);
  }

  @Get('moderation/queue')
  @ApiOperation({ summary: 'Lấy hàng đợi nội dung cần kiểm duyệt AI' })
  getModerationQueue(@Query() query: AdminModerationQueueQueryDto) {
    return this.adminService.getModerationQueue(query);
  }

  @Patch('moderation/queue/:id/resolve')
  @ApiOperation({ summary: 'Xử lý mục trong hàng đợi kiểm duyệt (approve, hide, warn)' })
  resolveModerationQueue(
    @Param('id') id: string,
    @Body() dto: AdminResolveQueueDto,
  ) {
    return this.adminService.resolveModerationQueue(id, dto);
  }

  @Get('system')
  @ApiOperation({ summary: 'Xem trạng thái sức khỏe chi tiết máy chủ và dịch vụ liên kết' })
  getSystemHealth() {
    return this.adminService.getSystemHealth();
  }

  @Get('comment-reports')
  @ApiOperation({ summary: 'Lấy danh sách báo cáo bình luận dành cho Quản trị viên hệ thống' })
  getCommentReports(
    @Query('target') target?: string,
    @Query('status') status?: string,
  ) {
    return this.adminService.getCommentReports(target, status);
  }

  @Post('comment-reports/:id/resolve')
  @ApiOperation({ summary: 'Web Admin xử lý báo cáo bình luận' })
  resolveCommentReport(
    @Param('id') reportId: string,
    @Req() req: any,
    @Body() dto: { action: 'dismiss' | 'delete_comment' | 'banned_user'; note?: string },
  ) {
    const adminId = req.user?.id || req.user?._id || req.user?.sub;
    return this.adminService.resolveCommentReport(reportId, String(adminId), dto);
  }
}
