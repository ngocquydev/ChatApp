import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  Controller,
  Get,
  UseGuards,
  Req,
} from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { JwtModule, JwtService } from '@nestjs/jwt';
import cookieParser from 'cookie-parser';
import { MultiAuthGuard } from '../src/modules/auth/guards/jwt-auth.guard.js'; // 👈 Trỏ đúng đường dẫn thực tế của bạn
import { RedisService } from '../src/modules/redis/redis/redis.service.js';

import * as ClerkBackend from '@clerk/backend';
vi.mock('@clerk/backend', async () => {
  const actual = await vi.importActual('@clerk/backend');
  return {
    ...actual,
    verifyToken: vi.fn(),
  };
});

@Controller('test-multi-auth')
class TestMultiAuthController {
  @Get('protected')
  @UseGuards(MultiAuthGuard)
  getProtected(@Req() req: any) {
    return { success: true, user: req.user };
  }
}

describe('MultiAuthGuard (E2E)', () => {
  let app: INestApplication<App>;
  let jwtService: JwtService;
  let redisService: RedisService;

  const TEST_SECRET = 'my_super_secret_key_chat_app';

  beforeAll(async () => {
    process.env.JWT_SECRET = TEST_SECRET; // Gán biến môi trường phòng ngừa

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        JwtModule.register({
          secret: TEST_SECRET,
          signOptions: { expiresIn: '1h' },
        }),
      ],
      controllers: [TestMultiAuthController],
      providers: [
        {
          provide: RedisService,
          useValue: {
            isTokenBlacklisted: vi.fn().mockResolvedValue(false),
          },
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    jwtService = moduleFixture.get<JwtService>(JwtService);
    redisService = moduleFixture.get<RedisService>(RedisService);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('1. Cho phép truy cập khi dùng Local JWT hợp lệ', async () => {
    const token = jwtService.sign({
      sub: 'user_123',
      email: 'local@example.com',
    });

    const response = await request(app.getHttpServer())
      .get('/test-multi-auth/protected')
      .set('Cookie', `accessToken=${token}`);

    expect(response.status).toBe(200);
    expect(response.body.user.email).toBe('local@example.com');
  });

  it('2. Chặn truy cập (401) nếu Local JWT nằm trong Redis Blacklist', async () => {
    const token = jwtService.sign({
      sub: 'user_123',
      email: 'local@example.com',
    });

    vi.spyOn(redisService, 'isTokenBlacklisted').mockResolvedValueOnce(true);

    const response = await request(app.getHttpServer())
      .get('/test-multi-auth/protected')
      .set('Cookie', `accessToken=${token}`);

    expect(response.status).toBe(401);
  });

  it('3. Cho phép truy cập khi dùng Clerk Token hợp lệ', async () => {
    (ClerkBackend.verifyToken as any).mockResolvedValueOnce({
      sub: 'clerk_user_999',
      email: 'google-user@gmail.com',
    });

    const response = await request(app.getHttpServer())
      .get('/test-multi-auth/protected')
      .set('Authorization', 'Bearer mock_clerk_valid_token');

    expect(response.status).toBe(200);
    expect(response.body.user.email).toBe('google-user@gmail.com');
  });

  it('4. Chặn truy cập (401) nếu không truyền bất kỳ token nào', async () => {
    const response = await request(app.getHttpServer()).get(
      '/test-multi-auth/protected',
    );

    expect(response.status).toBe(401);
  });
});
