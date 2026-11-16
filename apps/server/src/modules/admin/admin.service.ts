import {
  BadRequestException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import * as os from 'node:os';
import * as v8 from 'node:v8';
import * as fs from 'node:fs';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserRepository } from '../users/entities/user.entity.js';
import { Post, PostDocument } from '../posts/schemas/post.schema.js';
import { PostComment, PostCommentDocument } from '../posts/schemas/post-comment.schema.js';
import { CommentReport, CommentReportDocument } from '../posts/schemas/comment-report.schema.js';
import { WafConfigService } from '../waf/waf-config.service.js';
import { EdgeBanService } from '../waf/edge-ban.service.js';
import { RedisService } from '../redis/redis/redis.service.js';
import { Neo4jService } from '../neo4j/neo4j.service.js';
import { AdminUsersQueryDto } from './dto/admin-users.dto.js';
import { AdminPostsQueryDto } from './dto/admin-posts.dto.js';
import { AdminModerationQueueQueryDto, AdminResolveQueueDto } from './dto/admin-moderation.dto.js';

@Injectable()
export class AdminService {
  // Collection totals are comparatively stable. Keep one small snapshot per process;
  // RAM, uptime, connectivity and security state are always collected live.
  private readonly countsTtlMs = 15_000;
  private countsCache: { expiresAt: number; values: [number, number, number, number, number, number] } | null = null;
  private countsInFlight: Promise<[number, number, number, number, number, number]> | null = null;

  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserRepository>,
    @InjectModel(Post.name) private readonly postModel: Model<PostDocument>,
    @InjectModel(PostComment.name) private readonly commentModel: Model<PostCommentDocument>,
    private readonly wafConfigService: WafConfigService,
    private readonly edgeBanService: EdgeBanService,
    @Optional() private readonly redisService?: RedisService,
    @Optional() private readonly neo4jService?: Neo4jService,
    @Optional()
    @InjectModel(CommentReport.name)
    private readonly reportModel?: Model<CommentReportDocument>,
  ) {}

  private async getCachedCounts(): Promise<[number, number, number, number, number, number]> {
    if (this.countsCache && Date.now() < this.countsCache.expiresAt) {
      return this.countsCache.values;
    }
    if (this.countsInFlight) return this.countsInFlight;

    this.countsInFlight = Promise.all([
      this.userModel.countDocuments({ isDeleted: { $ne: true } }),
      this.userModel.countDocuments({ isDeleted: { $ne: true }, isBan: { $ne: true } }),
      this.userModel.countDocuments({ isDeleted: { $ne: true }, isBan: true }),
      this.userModel.countDocuments({ isDeleted: { $ne: true }, role: 'admin' }),
      this.postModel.countDocuments({ isDeleted: { $ne: true } }),
      this.commentModel.countDocuments(),
    ]);
    try {
      const values = await this.countsInFlight;
      this.countsCache = { values, expiresAt: Date.now() + this.countsTtlMs };
      return values;
    } finally {
      this.countsInFlight = null;
    }
  }

  async getStats() {
    const [counts, wafConfig, activeBans] = await Promise.all([
      this.getCachedCounts(),
      this.wafConfigService.getConfig(),
      this.edgeBanService.listBans(),
    ]);
    const [totalUsers, activeUsers, bannedUsers, adminUsers, totalPosts, totalComments] = counts;

    const memoryMetrics = await this.getMemoryMetrics();
    let redisConnected = false;
    if (this.redisService?.client) {
      try {
        const pingRes = await this.redisService.client.ping();
        redisConnected = pingRes === 'PONG';
      } catch {
        redisConnected = false;
      }
    }

    return {
      success: true,
      stats: {
        users: {
          total: totalUsers,
          active: activeUsers,
          banned: bannedUsers,
          admins: adminUsers,
        },
        posts: {
          total: totalPosts,
          comments: totalComments,
        },
        security: {
          enabled: wafConfig.enabled,
          underAttack: wafConfig.underAttack,
          activeBans: activeBans.length,
          blockScanners: wafConfig.blockScanners,
          blockBadUserAgents: wafConfig.blockBadUserAgents,
          challengeForeignAuth: wafConfig.challengeForeignAuth,
          ipAllowlistCount: wafConfig.ipAllowlist?.length || 0,
          ipBlocklistCount: wafConfig.ipBlocklist?.length || 0,
        },
        system: {
          uptimeSeconds: Math.floor(process.uptime()),
          nodeVersion: process.version,
          platform: process.platform,
          memory: memoryMetrics,
          services: {
            mongo: this.userModel.db.readyState === 1 ? 'connected' : 'disconnected',
            redis: redisConnected ? 'connected' : 'disconnected',
            neo4j: this.neo4jService?.isAvailable() ? 'connected' : 'standby',
          },
        },
      },
    };
  }

  async getUsers(query: AdminUsersQueryDto) {
    const page = Math.max(Number(query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(query.limit) || 20, 1), 100);
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = { isDeleted: { $ne: true } };

    if (query.role && query.role !== 'all') {
      filter.role = query.role;
    }

    if (query.status === 'active') {
      filter.isBan = { $ne: true };
    } else if (query.status === 'banned') {
      filter.isBan = true;
    }

    if (query.search?.trim()) {
      const escaped = query.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { name: { $regex: escaped, $options: 'i' } },
        { email: { $regex: escaped, $options: 'i' } },
        { phone: { $regex: escaped, $options: 'i' } },
      ];
    }

    const [total, users] = await Promise.all([
      this.userModel.countDocuments(filter),
      this.userModel
        .find(filter)
        .select('-password -refreshToken')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
    ]);

    return {
      success: true,
      users,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async toggleUserBan(userId: string, isBan: boolean, reason?: string) {
    if (!Types.ObjectId.isValid(userId)) {
      throw new NotFoundException('ID người dùng không hợp lệ');
    }

    const user = await this.userModel.findOne({ _id: userId, isDeleted: { $ne: true } });
    if (!user) {
      throw new NotFoundException('Không tìm thấy người dùng');
    }

    user.isBan = isBan;
    if (isBan) {
      user.refreshToken = undefined;
    }

    await user.save();

    return {
      success: true,
      message: isBan
        ? `Đã cấm tài khoản người dùng${reason ? `: ${reason}` : ''}`
        : 'Đã gỡ cấm tài khoản người dùng',
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isBan: user.isBan,
      },
    };
  }

  async updateUserRole(userId: string, role: 'admin' | 'user') {
    if (!Types.ObjectId.isValid(userId)) {
      throw new NotFoundException('ID người dùng không hợp lệ');
    }

    const user = await this.userModel.findOne({ _id: userId, isDeleted: { $ne: true } });
    if (!user) {
      throw new NotFoundException('Không tìm thấy người dùng');
    }

    user.role = role;
    await user.save();

    return {
      success: true,
      message: `Đã cập nhật vai trò người dùng thành ${role}`,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  }

  async getPosts(query: AdminPostsQueryDto) {
    const page = Math.max(Number(query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(query.limit) || 20, 1), 50);
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = { isDeleted: { $ne: true } };

    if (query.search?.trim()) {
      const escaped = query.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.content = { $regex: escaped, $options: 'i' };
    }

    const [total, posts] = await Promise.all([
      this.postModel.countDocuments(filter),
      this.postModel
        .find(filter)
        .populate('authorId', 'name avatar email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
    ]);

    return {
      success: true,
      posts,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async deletePost(postId: string) {
    if (!Types.ObjectId.isValid(postId)) {
      throw new NotFoundException('ID bài viết không hợp lệ');
    }

    const post = await this.postModel.findOne({ _id: postId, isDeleted: { $ne: true } });
    if (!post) {
      throw new NotFoundException('Không tìm thấy bài viết');
    }

    post.isDeleted = true;
    await post.save();

    return {
      success: true,
      message: 'Đã gỡ bài viết vi phạm thành công',
    };
  }

  testModerationText(text: string, language?: string) {
    return {
      success: true,
      result: {
        action: 'ALLOW',
        safe: true,
        flags: [],
        toxicityScore: 0,
        text,
        language: language || 'vi',
      },
    };
  }

  testModerationBehavior(sample: unknown) {
    return {
      success: true,
      result: {
        isAnomaly: false,
        anomalyScore: 0,
        riskLevel: 'LOW',
        action: 'ALLOW',
        assessment: 'Normal behavioral pattern',
        sample,
      },
    };
  }

  async getModerationQueue(query: AdminModerationQueueQueryDto) {
    const page = Math.max(Number(query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(query.limit) || 20, 1), 50);
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = { isDeleted: { $ne: true } };
    if (query.status && query.status !== 'all') {
      filter.moderationStatus = query.status;
    } else {
      filter.moderationStatus = { $in: ['flagged', 'pending'] };
    }

    const [total, items] = await Promise.all([
      this.postModel.countDocuments(filter),
      this.postModel
        .find(filter)
        .populate('authorId', 'name email avatar')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
    ]);

    return {
      success: true,
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async resolveModerationQueue(id: string, dto: AdminResolveQueueDto) {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('ID mục kiểm duyệt không hợp lệ');
    }

    const post = await this.postModel.findOne({ _id: id });
    if (!post) {
      throw new NotFoundException('Không tìm thấy bài viết cần kiểm duyệt');
    }

    if (dto.action === 'approve') {
      post.moderationStatus = 'approved';
      post.isSensitive = false;
      await post.save();
      return {
        success: true,
        message: 'Đã phê duyệt nội dung an toàn',
      };
    } else if (dto.action === 'hide') {
      post.moderationStatus = 'rejected';
      post.isDeleted = true;
      await post.save();
      return {
        success: true,
        message: 'Đã gỡ bỏ bài viết vi phạm',
      };
    } else if (dto.action === 'warn') {
      post.moderationStatus = 'rejected';
      post.isDeleted = true;
      post.moderationReason = dto.reason || 'Vi phạm tiêu chuẩn cộng đồng';
      await post.save();
      return {
        success: true,
        message: 'Đã cảnh cáo người dùng và xử lý nội dung vi phạm',
      };
    }

    throw new BadRequestException('Thao tác kiểm duyệt không hợp lệ');
  }

  async getMemoryMetrics() {
    const mem = process.memoryUsage();
    const heapStats = v8.getHeapStatistics();

    // 1. Lấy thông số RAM Render Cloud (Backend Node.js container)
    let renderTotalMB = Number(process.env.RENDER_MAX_RAM_MB) || Number(process.env.RENDER_MEMORY_LIMIT_MB) || 512;
    let renderUsedMB = Math.round(mem.rss / 1024 / 1024);

    try {
      if (fs.existsSync('/sys/fs/cgroup/memory.max')) {
        const val = fs.readFileSync('/sys/fs/cgroup/memory.max', 'utf-8').trim();
        if (val !== 'max') {
          const bytes = parseInt(val, 10);
          if (bytes > 0 && bytes < 100 * 1024 * 1024 * 1024) {
            renderTotalMB = Math.round(bytes / 1024 / 1024);
          }
        }
      }
      if (fs.existsSync('/sys/fs/cgroup/memory.current')) {
        const currentBytes = parseInt(fs.readFileSync('/sys/fs/cgroup/memory.current', 'utf-8').trim(), 10);
        if (currentBytes > 0) {
          renderUsedMB = Math.round(currentBytes / 1024 / 1024);
        }
      }
    } catch {
      // Fallback nếu không chạy trong cgroup Linux
    }

    // 2. Lấy thông số RAM Redis Cloud (Upstash)
    let redisUsedMB = 0;
    let redisTotalMB = 64; // Gói mặc định Upstash free tier (64MB)
    if (this.redisService?.client) {
      try {
        const info = await this.redisService.client.info('memory');
        const usedMatch = info.match(/used_memory:(\d+)/);
        const maxMatch = info.match(/maxmemory:(\d+)/);
        if (usedMatch) {
          redisUsedMB = Math.round(parseInt(usedMatch[1], 10) / 1024 / 1024);
        }
        if (maxMatch) {
          const maxBytes = parseInt(maxMatch[1], 10);
          if (maxBytes > 0) {
            redisTotalMB = Math.round(maxBytes / 1024 / 1024);
          }
        }
      } catch {
        // Fallback nếu chưa kết nối Redis
      }
    }

    // 3. Tổng hợp RAM kết hợp: Render Cloud + Cloud Redis
    const systemTotalMB = renderTotalMB + redisTotalMB;
    const systemUsedMB = renderUsedMB + redisUsedMB;
    const systemFreeMB = Math.max(0, systemTotalMB - systemUsedMB);
    const systemUsagePercent = systemTotalMB > 0
      ? Math.min(100, Math.round((systemUsedMB / systemTotalMB) * 100))
      : 0;

    const heapUsedMB = Math.round(mem.heapUsed / 1024 / 1024);
    const heapTotalMB = Math.round(mem.heapTotal / 1024 / 1024);
    const rssMB = Math.round(mem.rss / 1024 / 1024);
    const heapLimitMB = Math.round(heapStats.heap_size_limit / 1024 / 1024);
    const heapLimitPercent = heapStats.heap_size_limit > 0
      ? Math.min(100, Math.round((mem.heapUsed / heapStats.heap_size_limit) * 100))
      : 0;

    // Ngưỡng cảnh báo dựa trên tổng hợp tài nguyên Cloud
    let status: 'healthy' | 'warning' | 'critical' = 'healthy';
    let alertMessage = 'Bộ nhớ Cloud RAM (Render + Redis) hoạt động tối ưu.';
    let alertMessageEn = 'Cloud RAM (Render + Redis) is operating optimally.';
    let recommendation = `Tài nguyên Cloud hiện tại (${systemUsedMB} MB / ${systemTotalMB} MB) đáp ứng tốt lưu lượng.`;
    let recommendationEn = `Current cloud resources (${systemUsedMB} MB / ${systemTotalMB} MB) are healthy.`;

    const systemTotalGB = Math.max(1, Math.round(systemTotalMB / 1024));
    const recommendedAddRamGB = systemTotalGB <= 4 ? 4 : systemTotalGB <= 8 ? 8 : 16;
    const targetTotalRamGB = systemTotalGB + recommendedAddRamGB;
    const suggestedNodeFlag = `--max-old-space-size=${Math.min(targetTotalRamGB * 1024 * 0.75, 8192)}`;

    const maxRatio = Math.max(systemUsagePercent, heapLimitPercent);

    if (maxRatio >= 85) {
      status = 'critical';
      alertMessage = `CẢNH BÁO NGUY CẤP: Bộ nhớ Cloud (Render + Redis) đã dùng ${maxRatio}%. Nguy cơ tràn RAM (Out of Memory)!`;
      alertMessageEn = `CRITICAL ALERT: Cloud memory usage reached ${maxRatio}%. High risk of Out of Memory crash!`;
      recommendation = `Khuyến nghị nâng cấp: Cloud RAM chỉ còn ${systemFreeMB} MB trống. Cần nâng gói Render từ 512MB lên 1GB hoặc mở rộng Upstash Redis.`;
      recommendationEn = `Upgrade recommended: Only ${systemFreeMB} MB free cloud RAM. Upgrade Render container or expand Redis quota.`;
    } else if (maxRatio >= 75) {
      status = 'warning';
      alertMessage = `CẢNH BÁO: Tải bộ nhớ Cloud (Render + Redis) đang ở mức cao (${maxRatio}%).`;
      alertMessageEn = `WARNING: Cloud memory utilization is high (${maxRatio}%).`;
      recommendation = `Khuyến nghị theo dõi: Đã sử dụng ${maxRatio}% tài nguyên Cloud (${systemUsedMB}/${systemTotalMB} MB).`;
      recommendationEn = `Monitoring recommended: Cloud memory is at ${maxRatio}% (${systemUsedMB}/${systemTotalMB} MB).`;
    }

    return {
      heapUsedBytes: mem.heapUsed,
      heapTotalBytes: mem.heapTotal,
      rssBytes: mem.rss,
      externalBytes: mem.external,
      heapUsedMB,
      heapTotalMB,
      rssMB,
      heapLimitMB,
      heapLimitPercent,
      systemTotalMB,
      systemUsedMB,
      systemFreeMB,
      systemUsagePercent,
      cloudBreakdown: {
        render: {
          name: 'Render Cloud Backend',
          usedMB: renderUsedMB,
          totalMB: renderTotalMB,
          percent: Math.round((renderUsedMB / renderTotalMB) * 100),
        },
        redis: {
          name: 'Upstash Cloud Redis',
          usedMB: redisUsedMB,
          totalMB: redisTotalMB,
          percent: redisTotalMB > 0 ? Math.round((redisUsedMB / redisTotalMB) * 100) : 0,
        },
      },
      status,
      alertMessage,
      alertMessageEn,
      recommendation,
      recommendationEn,
      upgradePlan: {
        currentTotalRamGB: systemTotalGB,
        recommendedAddRamGB,
        targetTotalRamGB,
        suggestedNodeFlag,
      },
    };
  }

  async getSystemHealth() {
    const memoryMetrics = await this.getMemoryMetrics();
    let redisConnected = false;
    let redisPingMs = 0;
    if (this.redisService?.client) {
      try {
        const start = Date.now();
        const pingRes = await this.redisService.client.ping();
        redisPingMs = Date.now() - start;
        redisConnected = pingRes === 'PONG';
      } catch {
        redisConnected = false;
      }
    }

    return {
      success: true,
      system: {
        serverTime: new Date().toISOString(),
        uptimeSeconds: Math.floor(process.uptime()),
        nodeVersion: process.version,
        platform: process.platform,
        architecture: process.arch,
        pid: process.pid,
        memory: memoryMetrics,
        services: {
          mongo: {
            status: this.userModel.db.readyState === 1 ? 'connected' : 'disconnected',
            readyState: this.userModel.db.readyState,
          },
          redis: {
            status: redisConnected ? 'connected' : 'disconnected',
            latencyMs: redisPingMs,
          },
          neo4j: {
            status: this.neo4jService?.isAvailable() ? 'connected' : 'standby',
          },
        },
      },
    };
  }

  /**
   * Lấy danh sách báo cáo bình luận dành cho Quản trị viên hệ thống (Web Admin)
   */
  async getCommentReports(target?: string, status?: string) {
    if (!this.reportModel) return [];

    const query: any = {};
    if (target && target !== 'all') {
      query.target = target;
    }
    if (status && status !== 'all') {
      query.status = status;
    }

    const reports = await this.reportModel
      .find(query)
      .populate('reporterId', 'name avatar email')
      .populate('commentAuthorId', 'name avatar email')
      .populate('groupId', 'name slug')
      .populate('resolvedBy', 'name avatar')
      .sort({ createdAt: -1 })
      .lean()
      .exec();

    return reports;
  }

  /**
   * Web Admin xử lý báo cáo bình luận
   */
  async resolveCommentReport(
    reportId: string,
    adminId: string,
    dto: { action: 'dismiss' | 'delete_comment' | 'banned_user'; note?: string },
  ) {
    if (!Types.ObjectId.isValid(reportId)) {
      throw new BadRequestException('Mã báo cáo không hợp lệ');
    }

    if (!this.reportModel) {
      throw new BadRequestException('Mô hình báo cáo chưa được cấu hình');
    }

    const report = await this.reportModel.findById(reportId).exec();
    if (!report) {
      throw new NotFoundException('Báo cáo không tồn tại');
    }

    const adminObjId = new Types.ObjectId(adminId);

    if (dto.action === 'dismiss') {
      report.status = 'dismissed';
      report.actionTaken = 'dismissed';
      report.resolvedBy = adminObjId;
      report.resolvedAt = new Date();
      report.resolutionNote = dto.note || 'Bỏ qua báo cáo';
      await report.save();
      return { success: true, message: 'Đã bỏ qua báo cáo', report };
    }

    if (dto.action === 'delete_comment') {
      const comment = await this.commentModel.findById(report.commentId).exec();
      if (comment) {
        await this.commentModel.deleteOne({ _id: comment._id }).exec();
        await this.postModel
          .updateOne({ _id: comment.postId, commentCount: { $gt: 0 } }, { $inc: { commentCount: -1 } })
          .exec();
      }

      report.status = 'resolved';
      report.actionTaken = 'deleted_comment';
      report.resolvedBy = adminObjId;
      report.resolvedAt = new Date();
      report.resolutionNote = dto.note || 'Đã xóa bình luận vi phạm';
      await report.save();

      return { success: true, message: 'Đã xóa bình luận vi phạm', report };
    }

    if (dto.action === 'banned_user') {
      const comment = await this.commentModel.findById(report.commentId).exec();
      if (comment) {
        await this.commentModel.deleteOne({ _id: comment._id }).exec();
        await this.postModel
          .updateOne({ _id: comment.postId, commentCount: { $gt: 0 } }, { $inc: { commentCount: -1 } })
          .exec();
      }

      if (report.commentAuthorId) {
        await this.userModel.updateOne(
          { _id: report.commentAuthorId },
          { $set: { isBan: true } },
        ).exec();
      }

      report.status = 'resolved';
      report.actionTaken = 'banned_user';
      report.resolvedBy = adminObjId;
      report.resolvedAt = new Date();
      report.resolutionNote = dto.note || 'Đã xóa bình luận và khóa tài khoản vi phạm';
      await report.save();

      return { success: true, message: 'Đã xóa bình luận và khóa tài khoản vi phạm', report };
    }

    throw new BadRequestException('Hành động xử lý không hợp lệ');
  }
}
