import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import Redis from 'ioredis';
import { UserProfile, UserProfileDocument } from './schemas/user-profile.schema';
import { RecommendationItemDto, RecommendationResponseDto } from './dto/recommendation-response.dto';

@Injectable()
export class RecommendationService {
  private readonly logger = new Logger(RecommendationService.name);
  private readonly redis: Redis;

  constructor(
    @InjectModel(UserProfile.name)
    private readonly userProfileModel: Model<UserProfileDocument>,
  ) {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD || undefined,
      lazyConnect: false,
    });
  }

  /**
   * Endpoint chính: Lấy danh sách gợi ý bạn bè tối ưu theo Kiến trúc Lambda
   *
   * Quy trình xử lý đa tầng:
   * 1. ƯU TIÊN 1 (Warm Users - < 5ms): Đọc từ Redis Sorted Set `rec:user:{userId}`.
   *    Dữ liệu được hợp nhất liên tục giữa Batch Layer (Spark) và Speed Layer (Kafka).
   * 2. ƯU TIÊN 2 (Cold-Start Fallback): Nếu Redis rỗng (người dùng mới đăng ký, 0 bạn bè):
   *    - Tìm người dùng lân cận theo tọa độ GPS trong bán kính 10km (MongoDB `$geoNear` index 2dsphere).
   *    - Kết hợp độ tương đồng sở thích (Matching Interests/Tags).
   *    - Ghi bù (Backfill) kết quả vào Redis với TTL ngắn hạn để cache cho các request tiếp theo.
   */
  async getRecommendations(userId: string, limit = 20): Promise<RecommendationResponseDto> {
    const startTime = Date.now();
    const redisKey = `rec:user:${userId}`;

    // =========================================================================
    // ƯU TIÊN 1: TRUY VẤN TỪ SERVING CACHE (REDIS ZSET) - ĐỘ TRỄ < 5ms
    // =========================================================================
    // Lấy Top N phần tử có điểm Adamic-Adar cao nhất: ZREVRANGEBYSCORE +inf -inf WITHSCORES LIMIT 0 limit
    const rawScores = await this.redis.zrevrangebyscore(
      redisKey,
      '+inf',
      '-inf',
      'WITHSCORES',
      'LIMIT',
      0,
      limit,
    );

    if (rawScores && rawScores.length > 0) {
      // Phân rã mảng [member1, score1, member2, score2, ...]
      const candidateList: { candidateId: string; score: number }[] = [];
      for (let i = 0; i < rawScores.length; i += 2) {
        candidateList.push({
          candidateId: rawScores[i],
          score: parseFloat(rawScores[i + 1]),
        });
      }

      // Truy vấn thông tin người dùng theo batch (single query)
      const candidateIds = candidateList.map((c) => c.candidateId);
      const userProfiles = await this.fetchProfilesByIds(candidateIds);
      const profileMap = new Map(userProfiles.map((u) => [String(u._id), u]));

      // Tính số bạn chung chính xác bằng Redis SINTERCARD (hoặc SINTER)
      const pipeline = this.redis.pipeline();
      candidateIds.forEach((cId) => {
        pipeline.sinter(`user:${userId}:friends`, `user:${cId}:friends`);
      });
      const mutualFriendsResults = (await pipeline.exec()) || [];

      const rawList = candidateList.map((candidate, idx): RecommendationItemDto | null => {
        const profile = profileMap.get(candidate.candidateId);
        if (!profile) return null;

        const mutualArray = (mutualFriendsResults[idx]?.[1] as string[]) || [];
        const mutualCount = mutualArray.length;

        const reason =
          mutualCount > 0
            ? `Có ${mutualCount} bạn chung`
            : `Điểm gắn kết Adamic-Adar: ${candidate.score.toFixed(2)}`;

        return {
          userId: String(profile._id),
          name: profile.name,
          avatar: profile.avatar,
          bio: profile.bio,
          mutualFriendsCount: mutualCount,
          score: candidate.score,
          reason,
        };
      });

      const recommendations: RecommendationItemDto[] = rawList.filter(
        (item): item is RecommendationItemDto => item !== null,
      );

      const latency = Date.now() - startTime;
      return {
        success: true,
        source: 'BATCH_SPEED_REDIS',
        latencyMs: latency,
        count: recommendations.length,
        data: recommendations,
      };
    }

    // =========================================================================
    // ƯU TIÊN 2: CHIẾN LƯỢC COLD-START CHO NGƯỜI DÙNG MỚI (GEO + INTERESTS)
    // =========================================================================
    this.logger.log(`[ColdStart] Kích hoạt giải thuật Cold-Start Fallback cho user: ${userId}`);
    const coldStartResults = await this.resolveColdStart(userId, limit);

    // Ghi bù kết quả gợi ý vào Redis với TTL 1 giờ để tăng tốc cho các lần truy vấn tiếp theo
    if (coldStartResults.length > 0) {
      const backfillPipeline = this.redis.pipeline();
      coldStartResults.forEach((item) => {
        backfillPipeline.zadd(redisKey, item.score, item.userId);
      });
      backfillPipeline.expire(redisKey, 3600); // 1 giờ
      backfillPipeline.exec().catch((err) => {
        this.logger.warn(`Lỗi khi backfill Redis cho Cold-Start user ${userId}: ${err.message}`);
      });
    }

    const latency = Date.now() - startTime;
    return {
      success: true,
      source: 'COLD_START_GEO_INTERESTS',
      latencyMs: latency,
      count: coldStartResults.length,
      data: coldStartResults,
    };
  }

  /**
   * Giải thuật Cold-Start: Kết hợp Geospatial 2dsphere (bán kính 10km) và Tương đồng Sở thích
   */
  private async resolveColdStart(userId: string, limit: number): Promise<RecommendationItemDto[]> {
    let targetUser: any = null;

    if (Types.ObjectId.isValid(userId)) {
      targetUser = await this.userProfileModel.findById(userId).lean();
    } else {
      // Tìm theo trường id hoặc custom ID
      targetUser = await this.userProfileModel.findOne({ _id: userId } as any).lean();
    }

    if (!targetUser) {
      throw new NotFoundException(`Không tìm thấy thông tin người dùng với ID: ${userId}`);
    }

    const targetLocation = targetUser.location;
    const targetInterests = targetUser.interests || [];
    const hasCoordinates =
      targetLocation &&
      targetLocation.coordinates &&
      targetLocation.coordinates.length === 2;

    const pipeline: any[] = [];

    // Bước 1: Nếu người dùng có tọa độ GPS -> Ưu tiên tìm trong bán kính 10km ($geoNear)
    if (hasCoordinates) {
      pipeline.push({
        $geoNear: {
          near: {
            type: 'Point',
            coordinates: targetLocation.coordinates,
          },
          distanceField: 'distanceMeters',
          maxDistance: 10000, // 10 km
          spherical: true,
          query: {
            _id: { $ne: targetUser._id },
            isDeleted: false,
          },
        },
      });
    } else {
      pipeline.push({
        $match: {
          _id: { $ne: targetUser._id },
          isDeleted: false,
        },
      });
    }

    // Lấy danh sách ứng viên tiềm năng
    pipeline.push({ $limit: limit * 3 });

    const rawCandidates: any[] = await this.userProfileModel.aggregate(pipeline);

    // Bước 2: Tính toán điểm số phối hợp (Hybrid Scoring: Geo + Interests)
    const scoredList: RecommendationItemDto[] = rawCandidates.map((candidate) => {
      const candidateInterests: string[] = candidate.interests || [];
      const distMeters: number | undefined = candidate.distanceMeters;
      const distKm = distMeters !== undefined ? distMeters / 1000 : undefined;

      // Tìm các sở thích chung
      const matchingInterests = candidateInterests.filter((tag) =>
        targetInterests.includes(tag),
      );

      // Điểm khoảng cách (càng gần điểm càng cao, tối đa 50đ nếu ở ngay sát)
      let geoScore = 0;
      if (distKm !== undefined) {
        geoScore = Math.max(0, (1 - distKm / 10) * 50);
      }

      // Điểm sở thích (mỗi sở thích chung +25đ)
      const interestScore = matchingInterests.length * 25;

      const totalScore = geoScore + interestScore;

      // Xây dựng lý do gợi ý thân thiện
      const reasons: string[] = [];
      if (distKm !== undefined) {
        reasons.push(
          distKm < 1
            ? `Ở gần bạn (${Math.round(distMeters!)}m)`
            : `Ở gần bạn (${distKm.toFixed(1)} km)`,
        );
      }
      if (matchingInterests.length > 0) {
        reasons.push(`Chung sở thích: ${matchingInterests.slice(0, 3).join(', ')}`);
      }
      if (reasons.length === 0) {
        reasons.push('Gợi ý cho người dùng mới');
      }

      return {
        userId: String(candidate._id),
        name: candidate.name,
        avatar: candidate.avatar,
        bio: candidate.bio,
        mutualFriendsCount: 0,
        score: Math.round(totalScore * 100) / 100,
        distanceKm: distKm ? Math.round(distKm * 10) / 10 : undefined,
        reason: reasons.join(' • '),
      };
    });

    // Sắp xếp điểm cao nhất lên đầu
    scoredList.sort((a, b) => b.score - a.score);

    return scoredList.slice(0, limit);
  }

  private async fetchProfilesByIds(ids: string[]): Promise<any[]> {
    const validObjectIds = ids.filter((id) => Types.ObjectId.isValid(id));
    return this.userProfileModel
      .find({
        $or: [{ _id: { $in: validObjectIds } }, { _id: { $in: ids } }],
      })
      .select('name avatar bio location interests')
      .lean();
  }
}

