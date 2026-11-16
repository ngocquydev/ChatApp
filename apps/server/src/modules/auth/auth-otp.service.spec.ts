import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, HttpException } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service.js';
import { RedisService } from '../redis/redis/redis.service.js';
import { MailService } from '../mail/mail.service.js';
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('AuthService - Forgot Password & OTP Flow (TDD)', () => {
  let authService: AuthService;
  let usersService: {
    findOne: ReturnType<typeof vi.fn>;
    findByIdAndUpdate: ReturnType<typeof vi.fn>;
  };
  let redisService: {
    get: ReturnType<typeof vi.fn>;
    set: ReturnType<typeof vi.fn>;
    del: ReturnType<typeof vi.fn>;
  };
  let mailService: {
    sendOtpEmail: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    usersService = {
      findOne: vi.fn(),
      findByIdAndUpdate: vi.fn(),
    };

    redisService = {
      get: vi.fn(),
      set: vi.fn(),
      del: vi.fn(),
    };

    mailService = {
      sendOtpEmail: vi.fn().mockResolvedValue(true),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: JwtService, useValue: {} },
        { provide: ConfigService, useValue: { get: () => 'test_secret' } },
        { provide: UsersService, useValue: usersService },
        { provide: RedisService, useValue: redisService },
        { provide: MailService, useValue: mailService },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
  });

  describe('Suite 1: forgotPassword', () => {
    it('should throw BadRequestException if user does not exist', async () => {
      usersService.findOne.mockResolvedValue(null);

      await expect(
        authService.forgotPassword('unknown@example.com'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if user is Google/Facebook only (no password)', async () => {
      usersService.findOne.mockResolvedValue({
        _id: 'user123',
        email: 'google@example.com',
        firebaseUid: 'fb_123',
        password: null,
      });

      await expect(
        authService.forgotPassword('google@example.com'),
      ).rejects.toThrow('Tài khoản này được đăng ký bằng Google/Facebook');
    });

    it('should throw HttpException 429 if cooldown is active', async () => {
      usersService.findOne.mockResolvedValue({
        _id: 'user123',
        email: 'test@example.com',
        password: 'hashed_password',
      });
      redisService.get.mockImplementation(async (key: string) => {
        if (key === 'otp_cooldown:test@example.com') return '1';
        return null;
      });

      await expect(
        authService.forgotPassword('test@example.com'),
      ).rejects.toThrow(HttpException);
    });

    it('should successfully store OTP in Redis and send email', async () => {
      usersService.findOne.mockResolvedValue({
        _id: 'user123',
        name: 'Test User',
        email: 'test@example.com',
        password: 'hashed_password',
      });
      redisService.get.mockResolvedValue(null);
      redisService.set.mockResolvedValue(undefined);

      const result = await authService.forgotPassword('test@example.com');

      expect(result.success).toBe(true);
      expect(redisService.set).toHaveBeenCalledWith(
        expect.stringContaining('otp:test@example.com'),
        expect.stringMatching(/^[0-9]{6}$/),
        300,
      );
      expect(redisService.set).toHaveBeenCalledWith(
        expect.stringContaining('otp_cooldown:test@example.com'),
        '1',
        60,
      );
      expect(mailService.sendOtpEmail).toHaveBeenCalled();
    });
  });

  describe('Suite 2: verifyOtp', () => {
    it('should throw BadRequestException if OTP is expired or not found', async () => {
      redisService.get.mockResolvedValue(null);

      await expect(
        authService.verifyOtp('test@example.com', '123456'),
      ).rejects.toThrow('Mã xác thực đã hết hạn');
    });

    it('should increment attempts and throw if OTP is incorrect', async () => {
      redisService.get.mockImplementation(async (key: string) => {
        if (key === 'otp:test@example.com') return '999999';
        if (key === 'otp_attempts:test@example.com') return '1';
        return null;
      });

      await expect(
        authService.verifyOtp('test@example.com', '123456'),
      ).rejects.toThrow('Mã xác thực không chính xác');
      expect(redisService.set).toHaveBeenCalledWith(
        'otp_attempts:test@example.com',
        '2',
        300,
      );
    });

    it('should invalidate OTP if attempts exceed 5', async () => {
      redisService.get.mockImplementation(async (key: string) => {
        if (key === 'otp:test@example.com') return '999999';
        if (key === 'otp_attempts:test@example.com') return '5';
        return null;
      });

      await expect(
        authService.verifyOtp('test@example.com', '123456'),
      ).rejects.toThrow('quá số lần cho phép');
      expect(redisService.del).toHaveBeenCalledWith('otp:test@example.com');
    });

    it('should return resetToken when OTP is correct', async () => {
      redisService.get.mockImplementation(async (key: string) => {
        if (key === 'otp:test@example.com') return '123456';
        return null;
      });

      const result = await authService.verifyOtp('test@example.com', '123456');

      expect(result.success).toBe(true);
      expect(result.resetToken).toBeDefined();
      expect(redisService.del).toHaveBeenCalledWith('otp:test@example.com');
      expect(redisService.del).toHaveBeenCalledWith('otp_attempts:test@example.com');
      expect(redisService.set).toHaveBeenCalledWith(
        expect.stringContaining('reset_token:'),
        'test@example.com',
        600,
      );
    });
  });

  describe('Suite 3: resetPassword', () => {
    it('should throw BadRequestException if resetToken is invalid or expired', async () => {
      redisService.get.mockResolvedValue(null);

      await expect(
        authService.resetPassword('invalid_token', 'NewPassword@123'),
      ).rejects.toThrow('Yêu cầu đặt lại mật khẩu không hợp lệ');
    });

    it('should update password and invalidate resetToken', async () => {
      redisService.get.mockResolvedValue('test@example.com');
      usersService.findOne.mockResolvedValue({
        _id: 'user123',
        email: 'test@example.com',
      });
      usersService.findByIdAndUpdate.mockResolvedValue({
        _id: 'user123',
      });

      const result = await authService.resetPassword(
        'valid_token',
        'NewPassword@123',
      );

      expect(result.success).toBe(true);
      expect(usersService.findByIdAndUpdate).toHaveBeenCalledWith(
        'user123',
        expect.objectContaining({
          refreshToken: null,
        }),
      );
      expect(redisService.del).toHaveBeenCalledWith('reset_token:valid_token');
    });
  });
});
