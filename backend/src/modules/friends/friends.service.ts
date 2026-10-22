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
import { ChatGateway } from '../chat/chat.gateway.js';
import { RedisService } from '../redis/redis/redis.service.js';

export interface UserRelationResult {
  _id: string;
  name: string;
  email: string;
  avatar?: string;
  bio?: string;
  relationStatus: 'none' | 'pending_sent' | 'pending_received' | 'friends';
  requestId?: string;
}

export interface FriendRecommendationResult {
  _id: string;
  name: string;
  email: string;
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

@Injectable()
export class FriendsService {
  constructor(
    @InjectModel(Friendship.name)
    private readonly friendshipModel: Model<FriendshipDocument>,
    private readonly usersService: UsersService,
    private readonly redisService: RedisService,
    @Optional()
    private readonly chatGateway?: ChatGateway,
  ) {}

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

    try {
      this.chatGateway?.server
        ?.to(`user:${recipientId}`)
        .emit('friend:request_received', {
          request: created,
        });
    } catch {
      // Bỏ qua nếu socket chưa sẵn sàng
    }

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

      try {
        this.chatGateway?.server
          ?.to(`user:${request.requesterId.toString()}`)
          .emit('friend:accepted', {
            friendshipId: request._id,
            user: { _id: userId },
          });
      } catch {
        // Bỏ qua
      }

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

    return { success: true, message: 'Đã hủy kết bạn thành công' };
  }

  /**
   * Lấy danh sách bạn bè chính thức
   */
  async getFriendsList(userId: string): Promise<any[]> {
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
      const requester = f.requesterId as any;
      const recipient = f.recipientId as any;
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
    received: any[];
    sent: any[];
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
  ): Promise<UserRelationResult[]> {
    const users = await this.usersService.searchUsers(keyword, currentUserId);
    if (!users || users.length === 0) return [];

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

    return users.map((u) => {
      const uId = u._id.toString();
      const relInfo = relationMap.get(uId) || { status: 'none' };
      return {
        _id: uId,
        name: u.name,
        email: u.email,
        avatar: u.avatar,
        bio: u.bio,
        relationStatus: relInfo.status,
        requestId: relInfo.requestId,
      };
    });
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
    await (this.redisService.client as any).geoadd(
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
   * Thuật toán gợi ý bạn bè thông minh kết hợp Redis Geospatial + Redis Sets + MongoDB:
   * 1. Ưu tiên người có bạn chung (Redis SINTER)
   * 2. Ưu tiên người ở gần / cùng khu vực (Redis GEOSEARCH / GEORADIUS)
   * 3. Chấm điểm uy tín, ưu tiên người có nhiều bạn bè (tránh tài khoản clone / ảo)
   * 4. Cuối cùng mới xếp người lạ vào danh sách
   */
  async getFriendRecommendations(
    currentUserId: string,
    options: { limit?: number; radiusKm?: number; lat?: number; lng?: number } = {},
  ): Promise<FriendRecommendationResult[]> {
    const limit = options.limit || 20;
    const radiusKm = options.radiusKm || 25;

    // 1. Nếu có lat, lng từ client gửi lên -> Cập nhật vị trí hiện tại
    let currentLat = options.lat;
    let currentLng = options.lng;

    if (typeof currentLat === 'number' && typeof currentLng === 'number') {
      await this.updateUserLocation(currentUserId, currentLat, currentLng);
    } else {
      // Thử lấy vị trí đã lưu của user từ Redis GEO
      try {
        const pos = await (this.redisService.client as any).geopos(
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

    // 2. Đồng bộ bạn bè của chính mình vào Redis Set
    const myFriendIds = await this.syncFriendsSet(currentUserId);

    // 3. Lấy danh sách ID cần loại trừ (chính mình, bạn bè đã kết bạn, lời mời đang pending)
    const userObjId = new Types.ObjectId(currentUserId);
    const existingRelations = await this.friendshipModel.find({
      $or: [{ requesterId: userObjId }, { recipientId: userObjId }],
    });

    const excludedIds = new Set<string>();
    excludedIds.add(currentUserId);

    for (const rel of existingRelations) {
      const otherId =
        rel.requesterId.toString() === currentUserId
          ? rel.recipientId.toString()
          : rel.requesterId.toString();
      excludedIds.add(otherId);
    }

    // 4. Thu thập hồ bơi ứng viên (Candidate Pool)
    const candidateMap = new Map<string, { distanceKm?: number }>();

    // 4.1. Nguồn 1: Người dùng ở gần vị trí (Redis Geospatial GEORADIUS)
    if (typeof currentLat === 'number' && typeof currentLng === 'number') {
      try {
        const geoResults = await (this.redisService.client as any).georadius(
          'users:locations',
          currentLng,
          currentLat,
          radiusKm,
          'km',
          'WITHDIST',
          'ASC',
        );

        if (Array.isArray(geoResults)) {
          for (const item of geoResults) {
            const candidateId = Array.isArray(item) ? item[0] : item;
            const dist = Array.isArray(item) && item[1] ? parseFloat(item[1]) : undefined;

            if (candidateId && !excludedIds.has(candidateId)) {
              candidateMap.set(candidateId, { distanceKm: dist });
            }
          }
        }
      } catch {
        // Bỏ qua lỗi GEO nếu chưa có dữ liệu
      }
    }

    // 4.2. Nguồn 2: Bạn của bạn bè (Mutual Friends Candidates - 2nd degree network)
    for (const friendId of myFriendIds.slice(0, 15)) {
      let fofIds = await this.redisService.client.smembers(`user:${friendId}:friends`);
      if (!fofIds || fofIds.length === 0) {
        fofIds = await this.syncFriendsSet(friendId);
      }
      for (const fofId of fofIds) {
        if (!excludedIds.has(fofId) && !candidateMap.has(fofId)) {
          candidateMap.set(fofId, {});
        }
      }
    }

    // 4.3. Nguồn 3: Người dùng tích cực từ MongoDB nếu pool còn ít
    if (candidateMap.size < 40) {
      const activeUsers = await this.usersService.findActiveUsersExcluding(
        Array.from(excludedIds),
        50,
      );
      for (const u of activeUsers) {
        const uId = u._id.toString();
        if (!candidateMap.has(uId)) {
          candidateMap.set(uId, {});
        }
      }
    }

    if (candidateMap.size === 0) {
      return [];
    }

    // 5. Lấy chi tiết hồ sơ các ứng viên từ MongoDB
    const candidateIds = Array.from(candidateMap.keys());
    const candidateUsers = await this.usersService.findByIds(candidateIds);

    // 6. Chấm điểm ưu tiên (Weighted Scoring Engine)
    const scoredList: FriendRecommendationResult[] = [];

    for (const candidate of candidateUsers) {
      const candidateId = candidate._id.toString();
      const meta = candidateMap.get(candidateId);

      // Đồng bộ bạn bè của candidate vào Redis nếu chưa có
      let candidateFriendIds = await this.redisService.client.smembers(
        `user:${candidateId}:friends`,
      );
      if (!candidateFriendIds || candidateFriendIds.length === 0) {
        candidateFriendIds = await this.syncFriendsSet(candidateId);
      }
      const candidateFriendsCount = candidateFriendIds.length;

      // Tính số bạn chung bằng Redis SINTER
      const mutualFriends = await this.redisService.client.sinter(
        `user:${currentUserId}:friends`,
        `user:${candidateId}:friends`,
      );
      const mutualCount = mutualFriends.length;

      // === TÍNH TOÁN ĐIỂM SỐ (SCORING) ===
      // A. Điểm Bạn chung (Trọng số cao nhất: +35đ mỗi bạn chung, tối đa 140đ)
      let mutualScore = 0;
      if (mutualCount > 0) {
        mutualScore = Math.min(mutualCount * 35, 140);
      }

      // B. Điểm Vị trí địa lý (Redis GEO)
      let geoScore = 0;
      const dist = meta?.distanceKm;
      if (dist !== undefined) {
        if (dist <= 3) {
          geoScore = 50; // Rất gần (< 3km)
        } else if (dist <= 10) {
          geoScore = 30; // Gần (< 10km)
        } else if (dist <= 25) {
          geoScore = 15; // Cùng khu vực (< 25km)
        } else {
          geoScore = 5;
        }
      }

      // C. Điểm Chống Nick Clone / Ảo & Điểm Uy tín
      let trustScore = 0;
      // Số lượng bạn bè
      if (candidateFriendsCount >= 20) {
        trustScore += 25; // Uy tín cao, kết nối rộng
      } else if (candidateFriendsCount >= 5) {
        trustScore += 15; // Người dùng thật
      } else if (candidateFriendsCount >= 2) {
        trustScore += 5;
      } else {
        trustScore -= 30; // 0-1 bạn bè: TRỪ ĐIỂM NẶNG vì nghi vấn nick clone / acc rác!
      }

      // Độ hoàn thiện hồ sơ cá nhân
      if (
        candidate.avatar &&
        !candidate.avatar.includes('default') &&
        candidate.avatar.trim() !== ''
      ) {
        trustScore += 10;
      } else {
        trustScore -= 10; // Không avatar: nghi vấn clone
      }

      if (candidate.bio && candidate.bio.trim().length >= 5) {
        trustScore += 10;
      }
      if (candidate.phone) {
        trustScore += 5;
      }

      // Tuổi thọ tài khoản
      if (candidate.createdAt) {
        const ageDays =
          (Date.now() - new Date(candidate.createdAt).getTime()) / (1000 * 86400);
        if (ageDays >= 30) {
          trustScore += 15;
        } else if (ageDays >= 7) {
          trustScore += 10;
        } else if (ageDays < 2) {
          trustScore -= 20; // Vừa tạo < 48 giờ: trừ điểm clone
        }
      }

      // D. Tổng điểm
      const totalScore = mutualScore + geoScore + trustScore;

      // E. Lý do gợi ý thân thiện
      const reasons: string[] = [];
      if (mutualCount > 0) {
        reasons.push(`${mutualCount} bạn chung`);
      }
      if (dist !== undefined) {
        reasons.push(
          dist < 1 ? `Cách ${Math.round(dist * 1000)}m` : `Cách ${dist.toFixed(1)} km`,
        );
      }
      if (candidateFriendsCount >= 10 && reasons.length === 0) {
        reasons.push(`Người dùng tích cực (${candidateFriendsCount} bạn bè)`);
      }
      if (reasons.length === 0) {
        reasons.push('Gợi ý cho bạn');
      }

      scoredList.push({
        _id: candidateId,
        name: candidate.name,
        email: candidate.email,
        avatar: candidate.avatar,
        bio: candidate.bio,
        distanceKm: dist,
        mutualFriendsCount: mutualCount,
        friendsCount: candidateFriendsCount,
        score: totalScore,
        recommendationReason: reasons.join(' • '),
        relationStatus: 'none',
      });
    }

    // 7. Sắp xếp giảm dần theo tổng điểm (Điểm cao nhất lên trước)
    scoredList.sort((a, b) => b.score - a.score);

    return scoredList.slice(0, limit);
  }
}
