import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { RedisService } from '../src/modules/redis/redis/redis.service.js';
import cookieParser from 'cookie-parser'; // 👈 1. Import cookie-parser

describe('Auth Flow (E2E) - Login, Logout & Redis Blacklist', () => {
  let app: INestApplication<App>;
  let redisService: RedisService;

  const uniqueEmail = `test_auth_${Date.now()}@example.com`;
  const password = 'Password123!';
  let accessTokenCookie: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // 👈 2. Bắt buộc gắn middleware cookie-parser cho app test
    app.use(cookieParser());

    redisService = app.get<RedisService>(RedisService);
    await app.init();

    // Xóa sạch rate limit key của localhost trước khi test luồng auth để tránh dính 429
    if (redisService && redisService.client) {
      await redisService.client.del('rate_limit:127.0.0.1');
      await redisService.client.del('rate_limit:::1');
    }
  });

  afterAll(async () => {
    await app.close();
  });

  it('1. Đăng ký tài khoản mới thành công', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: uniqueEmail,
        password: password,
        name: 'Test User',
      });

    expect([200, 201]).toContain(response.status);
  });

  it('2. Đăng nhập thành công và nhận HttpOnly Cookie', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: uniqueEmail,
        password: password,
      });

    expect([200, 201]).toContain(response.status);

    const cookies = response.get('Set-Cookie');
    expect(cookies).toBeDefined();

    const accessTokenCookieItem = cookies?.find((c) =>
      c.includes('accessToken='),
    );
    expect(accessTokenCookieItem).toBeDefined();

    accessTokenCookie = accessTokenCookieItem!.split(';')[0];
  });

  it('3. Gọi API được bảo vệ thành công khi chưa đăng xuất', async () => {
    if (!accessTokenCookie) return;

    const response = await request(app.getHttpServer())
      .get('/auth/profile')
      .set('Cookie', accessTokenCookie);

    expect(response.status).toBe(200);
  });

  it('4. Đăng xuất: Xóa Cookie và đưa Token vào Redis Blacklist', async () => {
    if (!accessTokenCookie) return;

    const response = await request(app.getHttpServer())
      .post('/auth/logout')
      .set('Cookie', accessTokenCookie);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });

  it('5. Gọi lại API được bảo vệ sau khi đăng xuất phải bị chặn (401 Unauthorized)', async () => {
    if (!accessTokenCookie) return;

    const response = await request(app.getHttpServer())
      .get('/auth/profile')
      .set('Cookie', accessTokenCookie);

    expect(response.status).toBe(401); // Bị chặn đứng bởi Blacklist Guard!
  });
});
