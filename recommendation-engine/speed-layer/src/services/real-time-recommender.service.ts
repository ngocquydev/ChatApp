import Redis from 'ioredis';
import { config } from '../config/env';

export interface FriendAcceptedEvent {
  eventType?: string;
  userA: number | string;
  userB: number | string;
  timestamp: number;
}

/**
 * =========================================================================================
 * SPEED LAYER: REAL-TIME RECOMMENDATION INCREMENTAL ENGINE
 * =========================================================================================
 *
 * Nhiệm vụ:
 * 1. Khi 2 người A và B chấp nhận kết bạn (FRIEND_ACCEPTED):
 *    - A và B không còn là ứng viên của nhau nữa -> Xóa B khỏi ZSET của A và ngược lại (ZREM).
 *    - Cập nhật đồ thị bạn bè thời gian thực trong Redis Set: `user:{A}:friends` và `user:{B}:friends`.
 *
 * 2. Cập nhật bạn của bạn (Friends-of-Friends) theo công thức Adamic-Adar tức thì:
 *    - Bạn bè của B (ký hiệu F_B) giờ đây có thêm bạn chung là A (thông qua cầu nối B).
 *    - Tính trọng số bổ sung: Delta_W = 1.0 / ln(max(degree(B), 2)).
 *    - Nếu F_B chưa phải là bạn của A: tăng điểm gợi ý bằng `ZINCRBY rec:user:{A} Delta_W F_B`.
 *    - Làm đối xứng tương tự cho bạn bè của A (F_A) đối với B.
 *
 * 3. Chống nghẽn & Bùng nổ phép tính (KOL Pruning):
 *    - Nếu bậc của B > 1000, bỏ qua bước lan truyền (propagation) tới hàng nghìn tài khoản
 *      để tránh làm nghẽn Redis Server.
 */
export class RealTimeRecommenderService {
  private redis: Redis;

  constructor() {
    this.redis = new Redis({
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password,
      retryStrategy: (times) => Math.min(times * 100, 3000),
      maxRetriesPerRequest: 3,
    });

    this.redis.on('connect', () => {
      console.log(`[SpeedLayer] Đã kết nối Redis tại ${config.redis.host}:${config.redis.port}`);
    });

    this.redis.on('error', (err) => {
      console.error('[SpeedLayer] Lỗi kết nối Redis:', err.message);
    });
  }

  /**
   * Xử lý sự kiện FRIEND_ACCEPTED thời gian thực từ Kafka
   */
  async handleFriendAccepted(event: FriendAcceptedEvent): Promise<void> {
    const userA = String(event.userA);
    const userB = String(event.userB);

    if (userA === userB) return;

    const startTime = Date.now();
    const recKeyA = `${config.redis.keyPrefix}${userA}`;
    const recKeyB = `${config.redis.keyPrefix}${userB}`;
    const friendSetKeyA = `${config.redis.friendKeyPrefix}${userA}:friends`;
    const friendSetKeyB = `${config.redis.friendKeyPrefix}${userB}:friends`;

    try {
      // 1. Lấy danh sách bạn bè hiện tại của A và B đồng thời qua Redis
      const [friendsOfA, friendsOfB] = await Promise.all([
        this.redis.smembers(friendSetKeyA),
        this.redis.smembers(friendSetKeyB),
      ]);

      const degreeA = friendsOfA.length + 1; // +1 vì đã kết bạn với B
      const degreeB = friendsOfB.length + 1; // +1 vì đã kết bạn với A

      // Trọng số Adamic-Adar gia tăng qua cầu nối A và B
      // W = 1.0 / ln(degree)
      const weightFromBridgeB = 1.0 / Math.log(Math.max(degreeB, 2));
      const weightFromBridgeA = 1.0 / Math.log(Math.max(degreeA, 2));

      const pipeline = this.redis.pipeline();

      // 2. Thêm nhau vào danh sách bạn bè chính thức
      pipeline.sadd(friendSetKeyA, userB);
      pipeline.sadd(friendSetKeyB, userA);

      // 3. Xóa B khỏi danh sách gợi ý của A và ngược lại (vì đã là bạn)
      pipeline.zrem(recKeyA, userB);
      pipeline.zrem(recKeyB, userA);

      const setA = new Set(friendsOfA);
      const setB = new Set(friendsOfB);

      // 4. Cộng điểm cho bạn bè của B đối với A (nếu B không phải KOL > 1000 bạn)
      if (degreeB <= 1000) {
        for (const friendOfB of friendsOfB) {
          // Bỏ qua nếu friendOfB chính là userA hoặc đã là bạn bè với userA
          if (friendOfB !== userA && !setA.has(friendOfB)) {
            pipeline.zincrby(recKeyA, weightFromBridgeB, friendOfB);
          }
        }
      }

      // 5. Ngược lại: Cộng điểm cho bạn bè của A đối với B (nếu A không phải KOL > 1000 bạn)
      if (degreeA <= 1000) {
        for (const friendOfA of friendsOfA) {
          // Bỏ qua nếu friendOfA chính là userB hoặc đã là bạn bè với userB
          if (friendOfA !== userB && !setB.has(friendOfA)) {
            pipeline.zincrby(recKeyB, weightFromBridgeA, friendOfA);
          }
        }
      }

      // 6. Giữ danh sách gợi ý luôn gọn gàng (Giới hạn tối đa 50 gợi ý điểm cao nhất)
      // ZREMRANGEBYRANK xóa các phần tử có rank thấp (từ 0 đến -(50 + 1))
      pipeline.zremrangebyrank(recKeyA, 0, -51);
      pipeline.zremrangebyrank(recKeyB, 0, -51);

      // 7. Thực thi toàn bộ lệnh trong 1 single network round-trip
      await pipeline.exec();

      const durationMs = Date.now() - startTime;
      console.log(
        `[SpeedLayer] Đã xử lý FRIEND_ACCEPTED (${userA} <-> ${userB}) | Bậc A=${degreeA}, B=${degreeB} | Thực thi: ${durationMs}ms`,
      );
    } catch (error) {
      console.error(
        `[SpeedLayer] Lỗi khi cập nhật thời gian thực cho cặp (${userA}, ${userB}):`,
        error,
      );
      throw error;
    }
  }

  async close(): Promise<void> {
    await this.redis.quit();
  }
}
