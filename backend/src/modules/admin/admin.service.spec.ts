import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Types } from 'mongoose';
import { NotFoundException } from '@nestjs/common';
import { AdminService } from './admin.service.js';

describe('AdminService', () => {
  let service: AdminService;
  let mockUserModel: any;
  let mockPostModel: any;
  let mockCommentModel: any;
  let mockModerationService: any;
  let mockWafConfigService: any;
  let mockEdgeBanService: any;
  let mockRedisService: any;
  let mockNeo4jService: any;

  beforeEach(() => {
    mockUserModel = {
      countDocuments: vi.fn().mockResolvedValue(10),
      find: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        lean: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue([
          { _id: new Types.ObjectId(), name: 'User 1', email: 'u1@example.com', role: 'user', isBan: false },
        ]),
      }),
      findOne: vi.fn(),
      db: { readyState: 1 },
    };

    mockPostModel = {
      countDocuments: vi.fn().mockResolvedValue(25),
      find: vi.fn().mockReturnValue({
        populate: vi.fn().mockReturnThis(),
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        lean: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue([
          { _id: new Types.ObjectId(), content: 'Sample Post', images: [], likeCount: 2 },
        ]),
      }),
      findOne: vi.fn(),
    };

    mockCommentModel = {
      countDocuments: vi.fn().mockResolvedValue(50),
    };

    mockModerationService = {
      moderateText: vi.fn().mockReturnValue({
        isClean: true,
        action: 'pass',
        toxicityScore: 0.05,
      }),
      detectBotAnomaly: vi.fn().mockReturnValue({
        isAnomaly: false,
        anomalyScore: 0.1,
      }),
    };

    mockWafConfigService = {
      getConfig: vi.fn().mockResolvedValue({
        enabled: true,
        underAttack: false,
        blockScanners: true,
        blockBadUserAgents: true,
        challengeForeignAuth: true,
        ipAllowlist: [],
        ipBlocklist: [],
      }),
    };

    mockEdgeBanService = {
      listBans: vi.fn().mockResolvedValue([]),
    };

    mockRedisService = {
      client: {
        ping: vi.fn().mockResolvedValue('PONG'),
      },
    };

    mockNeo4jService = {
      isAvailable: vi.fn().mockReturnValue(true),
    };

    service = new AdminService(
      mockUserModel,
      mockPostModel,
      mockCommentModel,
      mockModerationService,
      mockWafConfigService,
      mockEdgeBanService,
      mockRedisService,
      mockNeo4jService,
    );
  });

  describe('getStats', () => {
    it('should aggregate stats accurately', async () => {
      const res = await service.getStats();
      expect(res.success).toBe(true);
      expect(res.stats.users.total).toBe(10);
      expect(res.stats.posts.total).toBe(25);
      expect(res.stats.posts.comments).toBe(50);
      expect(res.stats.security.blockScanners).toBe(true);
      expect(res.stats.system.services.mongo).toBe('connected');
      expect(res.stats.system.services.redis).toBe('connected');
    });
  });

  describe('getUsers', () => {
    it('should query and return users with pagination', async () => {
      const res = await service.getUsers({ page: 1, limit: 10, search: 'test', role: 'user', status: 'active' });
      expect(res.success).toBe(true);
      expect(res.users.length).toBe(1);
      expect(res.total).toBe(10);
      expect(res.totalPages).toBe(1);
    });
  });

  describe('toggleUserBan', () => {
    it('should ban a user and clear refresh token', async () => {
      const userId = new Types.ObjectId().toString();
      const mockUser = {
        _id: userId,
        name: 'Bad User',
        email: 'bad@example.com',
        role: 'user',
        isBan: false,
        refreshToken: 'token123',
        save: vi.fn().mockResolvedValue(true),
      };
      mockUserModel.findOne.mockResolvedValue(mockUser);

      const res = await service.toggleUserBan(userId, true, 'Spam');
      expect(res.success).toBe(true);
      expect(mockUser.isBan).toBe(true);
      expect(mockUser.refreshToken).toBeUndefined();
      expect(mockUser.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException for invalid ID or not found', async () => {
      await expect(service.toggleUserBan('invalid-id', true)).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateUserRole', () => {
    it('should update user role', async () => {
      const userId = new Types.ObjectId().toString();
      const mockUser = {
        _id: userId,
        name: 'Staff',
        email: 'staff@example.com',
        role: 'user',
        save: vi.fn().mockResolvedValue(true),
      };
      mockUserModel.findOne.mockResolvedValue(mockUser);

      const res = await service.updateUserRole(userId, 'admin');
      expect(res.success).toBe(true);
      expect(mockUser.role).toBe('admin');
      expect(mockUser.save).toHaveBeenCalled();
    });
  });

  describe('getPosts and deletePost', () => {
    it('should fetch posts with pagination', async () => {
      const res = await service.getPosts({ page: 1, limit: 10, search: 'post' });
      expect(res.success).toBe(true);
      expect(res.posts.length).toBe(1);
    });

    it('should soft delete violating post', async () => {
      const postId = new Types.ObjectId().toString();
      const mockPost = {
        _id: postId,
        isDeleted: false,
        save: vi.fn().mockResolvedValue(true),
      };
      mockPostModel.findOne.mockResolvedValue(mockPost);

      const res = await service.deletePost(postId);
      expect(res.success).toBe(true);
      expect(mockPost.isDeleted).toBe(true);
      expect(mockPost.save).toHaveBeenCalled();
    });
  });

  describe('moderation and health', () => {
    it('should test moderation text and behavior', () => {
      const textRes = service.testModerationText('xin chào', 'vi');
      expect(textRes.success).toBe(true);
      expect(mockModerationService.moderateText).toHaveBeenCalledWith('xin chào', 'vi');

      const behaviorRes = service.testModerationBehavior({
        friendRequestsPerHour: 2,
        acceptanceRate: 0.5,
        actionIntervalVariance: 20,
        actionRepetitionRatio: 0.1,
        interactionVelocity: 3,
        distinctTargetRatio: 0.8,
      });
      expect(behaviorRes.success).toBe(true);
    });

    it('should return system health', async () => {
      const res = await service.getSystemHealth();
      expect(res.success).toBe(true);
      expect(res.system.services.mongo.status).toBe('connected');
    });
  });
});
