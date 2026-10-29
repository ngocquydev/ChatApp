import { Controller, Get, Param, Query } from '@nestjs/common';
import { RecommendationService } from './recommendation.service';
import { RecommendationResponseDto } from './dto/recommendation-response.dto';

@Controller('users')
export class RecommendationController {
  constructor(private readonly recommendationService: RecommendationService) {}

  /**
   * GET /users/:id/recommendations
   *
   * Endpoint phục vụ gợi ý kết bạn:
   * - Trả về dữ liệu từ Redis Sorted Set với thời gian đáp ứng < 10ms.
   * - Tự động kích hoạt cơ chế Cold-Start (Geo-proximity 10km + Interests) nếu người dùng chưa có bạn bè.
   */
  @Get(':id/recommendations')
  async getRecommendations(
    @Param('id') userId: string,
    @Query('limit') limitStr?: string,
  ): Promise<RecommendationResponseDto> {
    const limit = limitStr ? Math.min(Math.max(parseInt(limitStr, 10), 1), 50) : 20;
    return this.recommendationService.getRecommendations(userId, limit);
  }
}
