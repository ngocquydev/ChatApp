export interface UserBehaviorSample {
  userId?: string;
  /** Số lượng lời mời kết bạn gửi đi mỗi giờ */
  friendRequestsPerHour: number;
  /** Tỷ lệ chấp nhận kết bạn (0.0 đến 1.0) */
  acceptanceRate: number;
  /** Phương sai của khoảng thời gian giữa các hành động (Bot chu kỳ lặp lại có variance rất thấp ~ 0) */
  actionIntervalVariance: number;
  /** Tỷ lệ lặp lại hành động giống hệt nhau (0.0 đến 1.0) */
  actionRepetitionRatio: number;
  /** Tốc độ bấm thích / tương tác mỗi phút */
  interactionVelocity: number;
  /** Tỷ lệ đối tượng tương tác duy nhất so với tổng tương tác */
  distinctTargetRatio: number;
}

