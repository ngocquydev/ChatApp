import { Test, TestingModule } from '@nestjs/testing';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { UsersController } from './users.controller.js';
import { UsersService } from './users.service.js';
import { RedisService } from '../redis/redis/redis.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/auth/roles.guard.js';
import { ROLES_KEY } from '../../common/auth/roles.decorator.js';

describe('UsersController', () => {
  let controller: UsersController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        { provide: UsersService, useValue: {} },
        { provide: RedisService, useValue: {} },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it.each(['create', 'findAll'] as const)(
    '[abuse] %s chỉ dành cho admin đã đăng nhập (JwtAuthGuard + RolesGuard + @Roles("admin"))',
    (method) => {
      const handler = UsersController.prototype[method];
      expect(Reflect.getMetadata(GUARDS_METADATA, handler)).toEqual([JwtAuthGuard, RolesGuard]);
      expect(Reflect.getMetadata(ROLES_KEY, handler)).toEqual(['admin']);
    },
  );
});
