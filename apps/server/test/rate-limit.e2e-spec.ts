import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  MiddlewareConsumer,
  Module,
  NestModule,
  Controller,
  Get,
} from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { RateLimitMiddleware } from '../src/common/middlewares/rate-limit.middleware.js';
import { RedisService } from '../src/modules/redis/redis/redis.service.js'; // 👈 Import RedisService trực tiếp

// 1. Controller giả lập dùng riêng cho việc test rate limit
@Controller('test-rate-limit')
class TestRateLimitController {
  @Get()
  getData() {
    return { message: 'OK' };
  }
}

// 2. Module cấu hình tạm thời, đăng ký trực tiếp RedisService vào providers
@Module({
  imports: [],
  controllers: [TestRateLimitController],
  providers: [RedisService], // 👈 Cung cấp RedisService ở đây
})
class TestAppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RateLimitMiddleware).forRoutes('test-rate-limit');
  }
}

describe('RateLimitMiddleware (E2E)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [TestAppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('nên cho phép gọi trong giới hạn và chặn lại khi vượt quá', async () => {
    const agent = request(app.getHttpServer());
    const endpoint = '/test-rate-limit';

    // Gửi liên tiếp 10 request đầu tiên -> Phải nhận mã 200 OK
    for (let i = 1; i <= 10; i++) {
      await agent.get(endpoint).expect(200);
    }

    // Gửi request thứ 11 -> Phải bị chặn và trả về 429 Too Many Requests
    const response = await agent.get(endpoint);
    expect(response.status).toBe(429);
    expect(response.body.message).toContain('quá nhiều yêu cầu');
  });
});
