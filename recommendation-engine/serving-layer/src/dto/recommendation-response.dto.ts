export class RecommendationItemDto {
  userId: string;
  name: string;
  avatar?: string;
  bio?: string;
  mutualFriendsCount: number;
  score: number;
  distanceKm?: number;
  reason: string; // "Bạn chung (3 người)", "Ở gần bạn (1.2 km)", "Chung sở thích (AI, Du lịch)"
}

export class RecommendationResponseDto {
  success: boolean;
  source: 'BATCH_SPEED_REDIS' | 'COLD_START_GEO_INTERESTS';
  latencyMs: number;
  count: number;
  data: RecommendationItemDto[];
}

