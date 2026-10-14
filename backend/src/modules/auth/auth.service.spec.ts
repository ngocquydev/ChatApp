import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service.js';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service.js';
import { RedisService } from '../redis/redis/redis.service.js';
import { MailService } from '../mail/mail.service.js';

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: JwtService, useValue: {} },
        { provide: ConfigService, useValue: { get: () => 'test' } },
        { provide: UsersService, useValue: {} },
        { provide: RedisService, useValue: {} },
        { provide: MailService, useValue: { sendOtpEmail: () => Promise.resolve(true) } },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
