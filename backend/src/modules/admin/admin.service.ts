import {
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserRepository } from '../users/entities/user.entity.js';
import { Post, PostDocument } from '../posts/schemas/post.schema.js';
import { PostComment, PostCommentDocument } from '../posts/schemas/post-comment.schema.js';
import { ModerationService } from '../moderation/moderation.service.js';
import { WafConfigService } from '../waf/waf-config.service.js';
import { EdgeBanService } from '../waf/edge-ban.service.js';
import { RedisService } from '../redis/redis/redis.service.js';
import { Neo4jService } from '../neo4j/neo4j.service.js';
import { AdminUsersQueryDto } from './dto/admin-users.dto.js';
import { AdminPostsQueryDto } from './dto/admin-posts.dto.js';
import type { ModerationLanguage } from '../moderation/algorithms/transformer-text-moderator.js';
import type { UserBehaviorSample } from '../moderation/moderation.dto.js';

@Injectable()
export class AdminService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserRepository>,
    @InjectModel(Post.name) private readonly postModel: Model<PostDocument>,
    @InjectModel(PostComment.name) private readonly commentModel: Model<PostCommentDocument>,
    private readonly moderationService: ModerationService,
    private readonly wafConfigService: WafConfigService,
    private readonly edgeBanService: EdgeBanService,
    @Optional() private readonly redisService?: RedisService,
    @Optional() private readonly neo4jService?: Neo4jService,
  ) {}

  async getStats() {
    const [
      totalUsers,
      activeUsers,
      bannedUsers,
      adminUsers,
      totalPosts,
      totalComments,
      wafConfig,
      activeBans,
    ] = await Promise.all([
      this.userModel.countDocuments({ isDeleted: { $ne: true } }),
      this.userModel.countDocuments({ isDeleted: { $ne: true }, isBan: { $ne: true } }),
      this.userModel.countDocuments({ isDeleted: { $ne: true }, isBan: true }),
      this.userModel.countDocuments({ isDeleted: { $ne: true }, role: 'admin' }),
      this.postModel.countDocuments({ isDeleted: { $ne: true } }),
      this.commentModel.countDocuments(),
      this.wafConfigService.getConfig(),
      this.edgeBanService.listBans(),
    ]);

    const mem = process.memoryUsage();
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
          memory: {
            heapUsedMB: Math.round(mem.heapUsed / 1024 / 1024),
            heapTotalMB: Math.round(mem.heapTotal / 1024 / 1024),
            rssMB: Math.round(mem.rss / 1024 / 1024),
          },
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

  async deleteUser(userId: string) {
    if (!Types.ObjectId.isValid(userId)) {
      throw new NotFoundException('ID người dùng không hợp lệ');
    }

    const user = await this.userModel.findOne({ _id: userId, isDeleted: { $ne: true } });
    if (!user) {
      throw new NotFoundException('Không tìm thấy người dùng');
    }

    user.isDeleted = true;
    user.refreshToken = undefined;
    await user.save();

    return {
      success: true,
      message: 'Đã xóa người dùng thành công',
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

  testModerationText(text: string, language?: ModerationLanguage) {
    const result = this.moderationService.moderateText(text, language);
    return {
      success: true,
      result,
    };
  }

  testModerationBehavior(sample: UserBehaviorSample) {
    const result = this.moderationService.detectBotAnomaly(sample);
    return {
      success: true,
      result,
    };
  }

  async getSystemHealth() {
    const mem = process.memoryUsage();
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
        memory: {
          heapUsedBytes: mem.heapUsed,
          heapTotalBytes: mem.heapTotal,
          rssBytes: mem.rss,
          externalBytes: mem.external,
          heapUsedMB: Math.round(mem.heapUsed / 1024 / 1024),
          heapTotalMB: Math.round(mem.heapTotal / 1024 / 1024),
          rssMB: Math.round(mem.rss / 1024 / 1024),
        },
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
}
