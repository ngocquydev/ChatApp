import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Friendship,
  FriendshipDocument,
} from './schemas/friendship.schema.js';
import { UsersService } from '../users/users.service.js';
import { User } from '../users/entities/user.entity.js';
import { ChatGateway } from '../chat/chat.gateway.js';
import { RedisService } from '../redis/redis/redis.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { Neo4jService } from '../neo4j/neo4j.service.js';

export interface UserRelationResult {
  _id: string;
  name: string;
  email?: string;
  avatar?: string;
  bio?: string;
  relationStatus: 'none' | 'pending_sent' | 'pending_received' | 'friends';
  requestId?: string;
}

export interface FriendRecommendationResult {
  _id: string;
  name: string;
  email?: string;
  avatar?: string;
  bio?: string;
  distanceKm?: number;
  mutualFriendsCount: number;
  friendsCount: number;
  score: number;
  recommendationReason: string;
  relationStatus: 'none' | 'pending_sent' | 'pending_received' | 'friends';
  requestId?: string;
}

interface RedisGeoClient {
  geoadd(key: string, longitude: number, latitude: number, member: string): Promise<number>;
  geopos(key: string, member: string): Promise<Array<[string, string] | null> | null>;
  georadius(
    key: string,
    longitude: number,
    latitude: number,
    radius: number,
    unit: string,
    ...args: string[]
  ): Promise<Array<[string, string]> | unknown[]>;
}

@Injectable()
export class FriendsService {
  constructor(
    @InjectModel(Friendship.name)
    private readonly friendshipModel: Model<FriendshipDocument>,
    private readonly usersService: UsersService,
    private readonly redisService: RedisService,
    @Optional()
    private readonly chatGateway?: ChatGateway,
    @Optional()
    private readonly notificationsService?: NotificationsService,
    @Optional()
    private readonly neo4jService?: Neo4jService,
  ) {}

  /**
   * Gửi sự kiện realtime tới phòng cá nhân của một người dùng, kèm tên/avatar của người liên quan
   * và lưu thông báo bền vững vào cơ sở dữ liệu để người dùng offline khi vào lại vẫn thấy.
   */
  private async emitFriendEvent(
    toUserId: string,
    event: 'friend:accepted' | 'friend:request_received',
    actorId: string,
    extra: Record<string, unknown>,
  ): Promise<void> {
    try {
      const server = this.chatGateway?.server;
      if (server) {
        const actor = await this.usersService.findById(actorId);
        server.to(`user:${toUserId}`).emit(event, {
          ...extra,
          user: { _id: actorId, name: actor?.name, avatar: actor?.avatar },
        });
      }
    } catch {
      // Bỏ qua nếu socket chưa sẵn sàng
    }

    // Lưu thông báo vào cơ sở dữ liệu (kể cả khi người nhận đang offline)
    if (this.notificationsService) {
      const isAccepted = event === 'friend:accepted';
      this.notificationsService.createNotification({
        recipientId: toUserId,
        actorId,
        type: isAccepted ? 'friend_accepted' : 'friend_request',
        title: isAccepted ? 'Lời mời kết bạn đã được chấp nhận' : 'Lời mời kết bạn mới',
        content: isAccepted
          ? 'đã chấp nhận lời mời kết bạn của bạn.'
          : 'đã gửi cho bạn một lời mời kết bạn.',
        link: `/profile/${actorId}`,
        metadata: extra,
      }).catch(() => {});
    }
  }

  /**
   * Gửi lời mời kết bạn tới một người dùng
   */
  async sendFriendRequest(
    requesterId: string,
    recipientId: string,
  ): Promise<FriendshipDocument> {
    if (requesterId === recipientId) {
      throw new BadRequestException('Không thể gửi lời mời kết bạn cho chính mình');
    }

    const recipient = await this.usersService.findById(recipientId);
    if (!recipient) {
      throw new NotFoundException('Người dùng nhận lời mời không tồn tại');
    }

    const reqObjId = new Types.ObjectId(requesterId);
    const recObjId = new Types.ObjectId(recipientId);

    // Kiểm tra mối quan hệ hiện tại giữa 2 người (hai chiều)
    const existing = await this.friendshipModel.findOne({
      $or: [
        { requesterId: reqObjId, recipientId: recObjId },
        { requesterId: recObjId, recipientId: reqObjId },
      ],
    });

    if (existing) {
      if (existing.status === 'accepted') {
        throw new BadRequestException('Hai người đã là bạn bè');
      }

      // Đã gửi trước đó và đang chờ duyệt
      if (
        existing.status === 'pending' &&
        existing.requesterId.toString() === requesterId
      ) {
        throw new ConflictException('Lời mời kết bạn đã được gửi trước đó');
      }

      // Đối phương đã gửi cho mình trước đó -> Tự động chấp nhận kết bạn
      if (
        existing.status === 'pending' &&
        existing.recipientId.toString() === requesterId
      ) {
        existing.status = 'accepted';
        await existing.save();

        // Đồng bộ bạn bè vào Redis Set cho cả 2 người
        this.syncFriendsSet(requesterId).catch(() => {});
        this.syncFriendsSet(recipientId).catch(() => {});
        this.neo4jService?.addFriendship(requesterId, recipientId).catch(() => {});

        // Báo cho người đã gửi lời mời trước đó: lời mời của họ vừa được chấp nhận
        this.emitFriendEvent(recipientId, 'friend:accepted', requesterId, {
          friendshipId: existing._id,
        }).catch(() => {});
        return existing;
      }

      // Nếu trước đó bị từ chối, cho phép mở lại lời mời mới
      if (existing.status === 'rejected') {
        existing.requesterId = reqObjId;
        existing.recipientId = recObjId;
        existing.status = 'pending';
        await existing.save();
        return existing;
      }
    }

    // Tạo lời mời mới
    const created = await this.friendshipModel.create({
      requesterId: reqObjId,
      recipientId: recObjId,
      status: 'pending',
    });

    this.emitFriendEvent(recipientId, 'friend:request_received', requesterId, {
      request: created,
    }).catch(() => {});

    return created;
  }

  /**
   * Phản hồi lời mời kết bạn (Chấp nhận hoặc Từ chối)
   */
  async respondToRequest(
    requestId: string,
    userId: string,
    action: 'accept' | 'reject',
  ): Promise<{ success: boolean; message: string }> {
    const request = await this.friendshipModel.findById(requestId);
    if (!request) {
      throw new NotFoundException('Không tìm thấy lời mời kết bạn');
    }

    if (request.recipientId.toString() !== userId) {
      throw new ForbiddenException('Bạn không có quyền phản hồi lời mời này');
    }

    if (request.status !== 'pending') {
      throw new BadRequestException('Lời mời này không ở trạng thái chờ duyệt');
    }

    if (action === 'accept') {
      request.status = 'accepted';
      await request.save();

      // Đồng bộ bạn bè vào Redis Set cho cả 2 người
      this.syncFriendsSet(userId).catch(() => {});
      this.syncFriendsSet(request.requesterId.toString()).catch(() => {});
      // Cập nhật đồ thị Neo4j khi kết bạn thành công
      this.neo4jService?.addFriendship(userId, request.requesterId.toString()).catch(() => {});

      // Báo cho người đã gửi lời mời (kèm tên/avatar người chấp nhận)
      this.emitFriendEvent(
        request.requesterId.toString(),
        'friend:accepted',
        userId,
        { friendshipId: request._id },
      ).catch(() => {});

      return { success: true, message: 'Đã chấp nhận lời mời kết bạn' };
    } else {
      await this.friendshipModel.deleteOne({ _id: request._id });
      return { success: true, message: 'Đã từ chối lời mời kết bạn' };
    }
  }

  /**
   * Hủy lời mời kết bạn đã gửi
   */
  async cancelRequest(
    requestId: string,
    userId: string,
  ): Promise<{ success: boolean; message: string }> {
    const request = await this.friendshipModel.findById(requestId);
    if (!request) {
      throw new NotFoundException('Không tìm thấy lời mời kết bạn');
    }

    if (request.requesterId.toString() !== userId) {
      throw new ForbiddenException('Bạn không có quyền hủy lời mời này');
    }

    await this.friendshipModel.deleteOne({ _id: request._id });
    return { success: true, message: 'Đã hủy lời mời kết bạn' };
  }

  /**
   * Hủy kết bạn (Unfriend)
   */
  async unfriend(
    userId: string,
    friendId: string,
  ): Promise<{ success: boolean; message: string }> {
    const userObjId = new Types.ObjectId(userId);
    const friendObjId = new Types.ObjectId(friendId);

    const result = await this.friendshipModel.deleteOne({
      status: 'accepted',
      $or: [
        { requesterId: userObjId, recipientId: friendObjId },
        { requesterId: friendObjId, recipientId: userObjId },
      ],
    });

    if (result.deletedCount === 0) {
      return { success: false, message: 'Không tìm thấy quan hệ bạn bè để hủy' };
    }

    // Cập nhật lại Redis Set bạn bè
    this.syncFriendsSet(userId).catch(() => {});
    this.syncFriendsSet(friendId).catch(() => {});
    this.neo4jService?.removeFriendship(userId, friendId).catch(() => {});

    return { success: true, message: 'Đã hủy kết bạn thành công' };
  }

  /**
   * Lấy danh sách bạn bè chính thức
   */
  async getFriendsList(userId: string): Promise<unknown[]> {
    const userObjId = new Types.ObjectId(userId);

    const friendships = await this.friendshipModel
      .find({
        status: 'accepted',
        $or: [{ requesterId: userObjId }, { recipientId: userObjId }],
      })
      .populate('requesterId', 'name email avatar phone bio')
      .populate('recipientId', 'name email avatar phone bio')
      .exec();

    return friendships.map((f) => {
      const requester = f.requesterId as unknown as { _id?: Types.ObjectId | string };
      const recipient = f.recipientId as unknown as { _id?: Types.ObjectId | string };
      const friend =
        requester?._id?.toString() === userId ? recipient : requester;
      return {
        friendshipId: f._id,
        friend,
        createdAt: f.createdAt,
      };
    });
  }

  /**
   * Lấy danh sách lời mời kết bạn (Đã nhận & Đã gửi)
   */
  async getFriendRequests(userId: string): Promise<{
    received: unknown[];
    sent: unknown[];
  }> {
    const userObjId = new Types.ObjectId(userId);

    const [received, sent] = await Promise.all([
      this.friendshipModel
        .find({ recipientId: userObjId, status: 'pending' })
        .populate('requesterId', 'name email avatar bio')
        .sort({ createdAt: -1 })
        .exec(),
      this.friendshipModel
        .find({ requesterId: userObjId, status: 'pending' })
        .populate('recipientId', 'name email avatar bio')
        .sort({ createdAt: -1 })
        .exec(),
    ]);

    return { received, sent };
  }

  /**
   * Tìm kiếm người dùng kèm trạng thái quan hệ bạn bè đối với user hiện tại
   */
  async searchUsersWithRelation(
    keyword: string,
    currentUserId: string,
    options: { limit?: number; after?: string } = {},
  ): Promise<{
    users: UserRelationResult[];
    hasMore: boolean;
    nextCursor: string | null;
  }> {
    const { users, hasMore } = await this.usersService.searchUsersPage(
      keyword,
      currentUserId,
      options,
    );
    if (!users || users.length === 0) {
      return { users: [], hasMore: false, nextCursor: null };
    }

    const userObjId = new Types.ObjectId(currentUserId);
    const targetIds = users.map((u) => new Types.ObjectId(u._id.toString()));

    const relations = await this.friendshipModel.find({
      $or: [
        { requesterId: userObjId, recipientId: { $in: targetIds } },
        { requesterId: { $in: targetIds }, recipientId: userObjId },
      ],
    });

    const relationMap = new Map<
      string,
      { status: 'none' | 'pending_sent' | 'pending_received' | 'friends'; requestId?: string }
    >();

    for (const rel of relations) {
      const reqId = rel.requesterId.toString();
      const recId = rel.recipientId.toString();
      const otherId = reqId === currentUserId ? recId : reqId;

      if (rel.status === 'accepted') {
        relationMap.set(otherId, { status: 'friends', requestId: rel._id.toString() });
      } else if (rel.status === 'pending') {
        if (reqId === currentUserId) {
          relationMap.set(otherId, { status: 'pending_sent', requestId: rel._id.toString() });
        } else {
          relationMap.set(otherId, { status: 'pending_received', requestId: rel._id.toString() });
        }
      }
    }

    const items = users.map((u) => {
      const uId = u._id.toString();
      const relInfo = relationMap.get(uId) || { status: 'none' };
      return {
        _id: uId,
        name: u.name,
        avatar: u.avatar,
        bio: u.bio,
        relationStatus: relInfo.status,
        requestId: relInfo.requestId,
      } as UserRelationResult;
    });
    return {
      users: items,
      hasMore,
      nextCursor: hasMore ? items[items.length - 1]._id : null,
    };
  }

  /**
   * Hồ sơ công khai của một người dùng: thông tin cơ bản, quan hệ với người xem,
   * số bạn bè và vài bạn bè gần đây (cho cột "Bạn bè" ở trang hồ sơ).
   */
  async getPublicProfile(viewerId: string, targetId: string) {
    if (!Types.ObjectId.isValid(targetId)) {
      throw new BadRequestException('Mã người dùng không hợp lệ');
    }
    const target = await this.usersService.findById(targetId);
    if (!target || target.isDeleted || target.isBan) {
      throw new NotFoundException('Người dùng không tồn tại');
    }

    const targetObjId = new Types.ObjectId(targetId);
    const viewerObjId = new Types.ObjectId(viewerId);
    const acceptedFilter = {
      status: 'accepted' as const,
      $or: [{ requesterId: targetObjId }, { recipientId: targetObjId }],
    };

    const [relationRow, friendCount, previewRows] = await Promise.all([
      viewerId === targetId
        ? Promise.resolve(null)
        : this.friendshipModel
            .findOne({
              $or: [
                { requesterId: viewerObjId, recipientId: targetObjId },
                { requesterId: targetObjId, recipientId: viewerObjId },
              ],
            })
            .lean()
            .exec(),
      this.friendshipModel.countDocuments(acceptedFilter).exec(),
      this.friendshipModel
        .find(acceptedFilter)
        .sort({ _id: -1 })
        .limit(9)
        .select('requesterId recipientId')
        .lean()
        .exec(),
    ]);

    let relationStatus: 'self' | 'none' | 'pending_sent' | 'pending_received' | 'friends' =
      viewerId === targetId ? 'self' : 'none';
    let requestId: string | undefined;
    if (relationRow && relationRow.status !== 'rejected') {
      requestId = relationRow._id.toString();
      if (relationRow.status === 'accepted') relationStatus = 'friends';
      else if (relationRow.requesterId.toString() === viewerId) relationStatus = 'pending_sent';
      else relationStatus = 'pending_received';
    }

    const previewIds = previewRows.map((r) =>
      r.requesterId.toString() === targetId ? r.recipientId : r.requesterId,
    );
    const previewUsers = previewIds.length ? await this.usersService.findByIds(previewIds) : [];

    return {
      user: {
        _id: target._id.toString(),
        name: target.name,
        avatar: target.avatar ?? undefined,
        cover: target.cover ?? undefined,
        bio: target.bio ?? undefined,
        createdAt: target.createdAt,
      },
      relationStatus,
      requestId,
      friendCount,
      friendsPreview: previewUsers.map((u) => ({
        _id: u._id.toString(),
        name: u.name,
        avatar: u.avatar ?? undefined,
      })),
    };
  }

  /**
   * Cập nhật vị trí địa lý của người dùng vào Redis Geospatial (GEOADD)
   */
  async updateUserLocation(
    userId: string,
    latitude: number,
    longitude: number,
  ): Promise<{ success: boolean; message: string }> {
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      throw new BadRequestException('Tọa độ địa lý không hợp lệ');
    }

    // 1. Lưu vào Redis GEO với key 'users:locations'
    await (this.redisService.client as unknown as RedisGeoClient).geoadd(
      'users:locations',
      longitude,
      latitude,
      userId,
    );

    // 2. Lưu timestamp cập nhật vị trí (TTL 7 ngày)
    await this.redisService.client.set(
      `user:${userId}:location_updated`,
      Date.now().toString(),
      'EX',
      86400 * 7,
    );

    // 3. Đồng bộ vị trí vào MongoDB User Model hỗ trợ 2dsphere Geospatial Index bền vững
    try {
      await this.usersService.findByIdAndUpdate(userId, {
        location: {
          type: 'Point',
          coordinates: [longitude, latitude],
        },
      } as unknown as Partial<User>);
    } catch {
      // Bỏ qua lỗi cập nhật MongoDB nếu có
    }

    return { success: true, message: 'Đã cập nhật vị trí địa lý thành công' };
  }

  /**
   * Đồng bộ danh sách bạn bè chính thức của user vào Redis Set
   * Giúp lệnh SINTER đếm số bạn chung tức thì (< 1ms)
   */
  async syncFriendsSet(userId: string): Promise<string[]> {
    const userObjId = new Types.ObjectId(userId);
    const friendships = await this.friendshipModel.find({
      status: 'accepted',
      $or: [{ requesterId: userObjId }, { recipientId: userObjId }],
    });

    const friendIds = friendships.map((f) => {
      const reqId = f.requesterId.toString();
      return reqId === userId ? f.recipientId.toString() : reqId;
    });

    const redisKey = `user:${userId}:friends`;
    await this.redisService.client.del(redisKey);

    if (friendIds.length > 0) {
      await this.redisService.client.sadd(redisKey, ...friendIds);
      await this.redisService.client.expire(redisKey, 86400); // Lưu cache 24h
    }

    return friendIds;
  }

  /**
   * NEO4J GRAPH RECOMMENDATION ENGINE (< 5ms):
   * 1. ƯU TIÊN 1 (Neo4j Graph Database Suggestions):
   *    - Tier 1: Friends-of-friends (2-hops MATCH u-friend-mutual-friend-suggested) xếp theo số bạn chung.
   *    - Tier 2: Degree Centrality (Mạng lưới kết nối mở rộng) cho người dùng mới (Cold-Start).
   *    - Lấy thông tin user (tên, avatar, bio) trong 1 batch query MongoDB.
   *    - Trả về ngay lập tức với độ trễ cực thấp (< 5ms), cache Redis 60s.
   *
   * 2. ƯU TIÊN 2 (Offline Fallback - Khi Neo4j tạm thời không khả dụng):
   *    - Tìm người dùng gần bạn trong bán kính 10-25km (MongoDB 2dsphere index).
   *    - Nếu chưa có GPS: Lấy danh sách người dùng tích cực từ MongoDB.
   */
  async getFriendRecommendations(
    currentUserId: string,
    options: { limit?: number; radiusKm?: number; lat?: number; lng?: number } = {},
  ): Promise<FriendRecommendationResult[]> {
    const limit = options.limit || 20;
    const radiusKm = options.radiusKm || 25;

    // Cache kết quả theo user trong 60 giây để chuyển tab/tải lại đạt độ trễ < 1ms
    let currentLat = options.lat;
    let currentLng = options.lng;
    const cacheKey = `cache:rec:${currentUserId}:${limit}:${currentLat ?? 0}:${currentLng ?? 0}`;
    try {
      const cached = await this.redisService.client.get(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // Bỏ qua lỗi cache read
    }

    // 1. Cập nhật vị trí hiện tại nếu client gửi lên (bất đồng bộ không chặn luồng trả lời)
    if (typeof currentLat === 'number' && typeof currentLng === 'number') {
      void this.updateUserLocation(currentUserId, currentLat, currentLng).catch(() => {});
    }

    // 2. Lấy danh sách ID loại trừ (chính mình + các quan hệ bạn bè/pending hiện có)
    const userObjId = new Types.ObjectId(currentUserId);
    const existingRelations = await this.friendshipModel
      .find({
        $or: [{ requesterId: userObjId }, { recipientId: userObjId }],
      })
      .select('requesterId recipientId')
      .lean();

    const excludedIds = new Set<string>();
    excludedIds.add(currentUserId);
    for (const rel of existingRelations) {
      const otherId =
        rel.requesterId.toString() === currentUserId
          ? rel.recipientId.toString()
          : rel.requesterId.toString();
      excludedIds.add(otherId);
    }

    // =========================================================================
    // ƯU TIÊN 1: THUẬT TOÁN GỢI Ý ĐỒ THỊ NEO4J (BẠN CỦA BẠN & CENTRALITY)
    // =========================================================================
    if (this.neo4jService?.isAvailable()) {
      try {
        const neo4jSuggestions = await this.neo4jService.getFriendSuggestions(currentUserId, limit);
        if (neo4jSuggestions.length > 0) {
          const validSuggestions = neo4jSuggestions.filter((s) => !excludedIds.has(s.id));
          if (validSuggestions.length > 0) {
            const candidateIds = validSuggestions.map((s) => s.id);
            const candidateUsers = await this.usersService.findByIds(candidateIds);
            const userMap = new Map(candidateUsers.map((u) => [u._id.toString(), u]));

            const results: FriendRecommendationResult[] = [];
            for (const s of validSuggestions) {
              const u = userMap.get(s.id);
              results.push({
                _id: s.id,
                name: u?.name || s.name,
                email: u?.email || '',
                avatar: u?.avatar || s.avatar,
                bio: u?.bio,
                mutualFriendsCount: s.mutualFriendsCount,
                friendsCount: s.friendsCount || 0,
                score: s.score,
                recommendationReason: s.reason,
                relationStatus: 'none',
              });
            }

            if (results.length > 0) {
              void this.redisService.client
                .set(cacheKey, JSON.stringify(results), 'EX', 60)
                .catch(() => {});
              return results;
            }
          }
        }
      } catch {
        // Neo4j gặp sự cố -> Fallback sang Cold-Start bên dưới
      }
    }

    // =========================================================================
    // ƯU TIÊN 2: DỰ PHÒNG COLD-START (KHI NEO4J CHƯA ĐỦ DỮ LIỆU / NGOẠI TUYẾN)
    // =========================================================================
    // Thử lấy tọa độ đã lưu của user nếu chưa có từ request
    if (typeof currentLat !== 'number' || typeof currentLng !== 'number') {
      try {
        const pos = await (this.redisService.client as unknown as RedisGeoClient).geopos(
          'users:locations',
          currentUserId,
        );
        if (pos && pos[0]) {
          currentLng = parseFloat(pos[0][0]);
          currentLat = parseFloat(pos[0][1]);
        }
      } catch {
        // Chưa có tọa độ
      }
    }

    const coldCandidates: {
      user: any;
      distKm?: number;
      reason: string;
      score: number;
    }[] = [];

    // 2.1. Tìm kiếm lân cận qua MongoDB 2dsphere index (10km - 25km)
    if (typeof currentLat === 'number' && typeof currentLng === 'number') {
      try {
        const nearbyUsers = await this.usersService.findNearbyUsersExcluding(
          currentLng,
          currentLat,
          radiusKm,
          Array.from(excludedIds),
          limit,
        );

        for (const u of nearbyUsers) {
          const uCoords = u.location?.coordinates;
          let distKm: number | undefined;
          if (Array.isArray(uCoords) && uCoords.length === 2) {
            const dLat = ((uCoords[1] - currentLat) * Math.PI) / 180;
            const dLon = ((uCoords[0] - currentLng) * Math.PI) / 180;
            const a =
              Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos((currentLat * Math.PI) / 180) *
                Math.cos((uCoords[1] * Math.PI) / 180) *
                Math.sin(dLon / 2) *
                Math.sin(dLon / 2);
            distKm = Math.round(6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 10) / 10;
          }

          coldCandidates.push({
            user: u,
            distKm,
            reason: distKm !== undefined ? `Cách ${distKm < 1 ? Math.round(distKm * 1000) + 'm' : distKm + ' km'}` : 'Ở gần bạn',
            score: distKm !== undefined ? Math.max(10, Math.round(100 - distKm * 3)) : 50,
          });
          excludedIds.add(u._id.toString());
        }
      } catch {
        // Lỗi geo query
      }
    }

    // 2.2. Nếu vẫn chưa đủ ứng viên: Lấy người dùng tích cực mới nhất từ MongoDB
    if (coldCandidates.length < limit) {
      const activeUsers = await this.usersService.findActiveUsersExcluding(
        Array.from(excludedIds),
        limit - coldCandidates.length,
      );
      for (const u of activeUsers) {
        coldCandidates.push({
          user: u,
          reason: 'Gợi ý kết bạn',
          score: 30,
        });
      }
    }

    const finalResults = coldCandidates.map(({ user, distKm, reason, score }) => ({
      _id: user._id.toString(),
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      bio: user.bio,
      distanceKm: distKm,
      mutualFriendsCount: 0,
      friendsCount: 0,
      score,
      recommendationReason: reason,
      relationStatus: 'none' as const,
    }));

    if (finalResults.length > 0) {
      void this.redisService.client
        .set(cacheKey, JSON.stringify(finalResults), 'EX', 60)
        .catch(() => {});
    }

    return finalResults;
  }
}
