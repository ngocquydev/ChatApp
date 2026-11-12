import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { UsersService } from '../users/users.service.js';
import { FirebaseService } from './firebase.service.js';
import { TurnstileService } from './turnstile.service.js';
import { RedisService } from '../redis/redis/redis.service.js';

describe('AuthController', () => {
  let controller: AuthController;
  const redisService = {
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: {} },
        { provide: UsersService, useValue: {} },
        { provide: FirebaseService, useValue: {} },
        { provide: TurnstileService, useValue: {} },
        { provide: RedisService, useValue: redisService },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('caches the authenticated profile in Redis', async () => {
    const user = { _id: 'user-1', name: 'Quý Nguyễn' };
    redisService.get.mockResolvedValue(null);

    await expect(
      controller.getProfile({ user } as never),
    ).resolves.toEqual({
      success: true,
      message: 'Token hợp lệ!',
      profile: user,
    });

    expect(redisService.set).toHaveBeenCalledWith(
      'auth:profile:user-1',
      JSON.stringify(user),
      300,
    );
  });

  it('serves a cached authenticated profile from Redis', async () => {
    const user = { _id: 'user-1', name: 'Quý cũ', role: 'user' };
    redisService.get.mockResolvedValue(JSON.stringify(user));

    await expect(
      controller.getProfile({
        user: { _id: 'user-1', name: 'Quý mới', role: 'admin' },
      } as never),
    ).resolves.toEqual({
      success: true,
      message: 'Token hợp lệ!',
      profile: { ...user, role: 'admin' },
    });

    expect(redisService.set).not.toHaveBeenCalled();
  });
});
