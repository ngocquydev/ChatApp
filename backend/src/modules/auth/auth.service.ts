import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Response as ExpressResponse } from 'express';
import { UsersService } from '../users/users.service.js';
import { RedisService } from '../redis/redis/redis.service.js';
import { MailService } from '../mail/mail.service.js';
import type { JwtSignOptions } from '@nestjs/jwt';
import type {
  JwtPayload,
  JwtPayloadWithExp,
  TokensResponse,
  UpdateProfileResponse,
  ChangePasswordResponse,
  ForgotPasswordResponse,
  VerifyOtpResponse,
  ResetPasswordResponse,
} from './types/auth.types.js';
@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly userService: UsersService,
    private readonly redisService: RedisService,
    private readonly mailService: MailService,
  ) {}
  setTokenCookie(
    res: ExpressResponse,
    name: string,
    token: string,
    maxAgeMs: number,
  ) {
    res.cookie(name, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: maxAgeMs,
    });
  }
  async generateTokens(
    userId: string,
    email: string,
    role: string,
  ): Promise<TokensResponse> {
    const payload: JwtPayload = { sub: userId, email, role };
    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_SECRET'),
      expiresIn: (this.configService.get<string>('JWT_EXPIRES_IN') ||
        '1h') as JwtSignOptions['expiresIn'],
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: (this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') ||
        '7d') as JwtSignOptions['expiresIn'],
    });
    await this.saveRefreshToken(userId, refreshToken);

    return { accessToken, refreshToken };
  }
  async saveRefreshToken(userId: string, refreshToken: string): Promise<void> {
    const saltRounds = 10;
    const hashedRefreshToken = await bcrypt.hash(refreshToken, saltRounds);

    await this.userService.findByIdAndUpdate(userId, {
      refreshToken: hashedRefreshToken,
    });
  }
  async updateRefreshToken(userId: string, refreshToken: string) {
    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
    await this.userService.findByIdAndUpdate(userId, {
      refreshToken: hashedRefreshToken,
    });
  }

  // 3. Logic làm mới token
  async refreshTokens(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });

      const userId = payload.sub;

      const user = await this.userService.findById(userId);
      if (!user || !user.refreshToken || user.isDeleted || user.isBan) {
        throw new UnauthorizedException('Truy cập bị từ chối!');
      }

      const rtMatches = await bcrypt.compare(refreshToken, user.refreshToken);
      if (!rtMatches) {
        throw new UnauthorizedException('Truy cập bị từ chối!');
      }
      const tokens = await this.generateTokens(
        user._id.toString(),
        user.email,
        user.role,
      );
      await this.updateRefreshToken(userId, tokens.refreshToken);
      return {
        success: true,
        message: 'Làm mới token thành công!',
        ...tokens,
      };
    } catch {
      throw new UnauthorizedException(
        'Refresh Token không hợp lệ hoặc đã hết hạn!',
      );
    }
  }
  async signIn(email: string, password: string) {
    // 1. Tìm user qua UsersService
    const user = await this.userService.findOne(email);
    if (!user) {
      throw new UnauthorizedException('Sai email!');
    }
    if (!user.password) {
      throw new UnauthorizedException(
        'Tài khoản này được đăng ký bằng Google/Facebook. Vui lòng đăng nhập qua mạng xã hội!',
      );
    }

    // 2. Kiểm tra tài khoản có bị khóa hoặc xóa không
    if (user.isDeleted) {
      throw new ForbiddenException('Tài khoản này đã bị xóa!');
    }

    if (user.isBan) {
      throw new ForbiddenException('Tài khoản của bạn hiện đang bị khóa!');
    }

    // 3. Kiểm tra mật khẩu
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Mật khẩu không chính xác!');
    }

    const tokens = await this.generateTokens(
      user._id.toString(),
      user.email,
      user.role,
    );

    return {
      success: true,
      message: 'Đăng nhập thành công!',
      profile: {
        _id: user._id.toString(),
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        avatar: user.avatar,
      },
      ...tokens,
    };
  }
  async getMe(userId: string) {
    const user = await this.userService.findById(userId);
    if (!user) {
      throw new NotFoundException('Không tìm thấy thông tin người dùng!');
    }

    return {
      success: true,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
    };
  }
  async checkUserRefreshToken(userId: string) {
    const tokenInfo = await this.userService.getStoredRefreshToken(userId);
    if (!tokenInfo || !tokenInfo.refreshToken) {
      return {
        success: false,
        message: 'Người dùng chưa có Refresh Token hoặc đã đăng xuất.',
      };
    }

    return {
      success: true,
      hashedToken: tokenInfo.refreshToken,
    };
  }
  async logout(userId: string, token?: string) {
    await this.userService.findByIdAndUpdate(userId, {
      refreshToken: null,
    });

    if (token) {
      let ttlSeconds = 60 * 60; // 1h mặc định
      try {
        const decoded = this.jwtService.decode<JwtPayloadWithExp>(token);
        if (decoded?.exp) {
          const remainingSeconds = decoded.exp - Math.floor(Date.now() / 1000);
          ttlSeconds = remainingSeconds > 0 ? remainingSeconds : 0;
        }
      } catch {
        // Fallback default
      }

      if (ttlSeconds > 0) {
        await this.redisService.blacklistToken(token, ttlSeconds);
      }
    }

    return { success: true, message: 'Đăng xuất thành công' };
  }

  async updateProfile(
    userId: string,
    data: { name?: string; phone?: string; avatar?: string; bio?: string },
  ): Promise<UpdateProfileResponse> {
    const user = await this.userService.findById(userId);
    if (!user) {
      throw new NotFoundException('Không tìm thấy thông tin người dùng!');
    }

    const updatePayload: Record<string, unknown> = {};
    if (typeof data.name === 'string') updatePayload.name = data.name.trim();
    if (typeof data.phone === 'string') updatePayload.phone = data.phone.trim();
    if (typeof data.avatar === 'string') updatePayload.avatar = data.avatar.trim();
    if (typeof data.bio === 'string') updatePayload.bio = data.bio.trim();

    const updatedUser = await this.userService.findByIdAndUpdate(
      userId,
      updatePayload,
    );
    if (!updatedUser) {
      throw new NotFoundException('Không tìm thấy thông tin người dùng!');
    }

    const userObj =
      typeof updatedUser.toObject === 'function'
        ? updatedUser.toObject()
        : updatedUser;
    const {
      password: _password,
      refreshToken: _refreshToken,
      ...profile
    } = userObj;

    return {
      success: true,
      message: 'Cập nhật thông tin thành công!',
      profile: {
        ...profile,
        _id: profile._id.toString(),
      },
    };
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<ChangePasswordResponse> {
    const safeUser = await this.userService.findById(userId);
    if (!safeUser) {
      throw new NotFoundException('Không tìm thấy thông tin người dùng!');
    }

    const user = await this.userService.findOne(safeUser.email);
    if (!user) {
      throw new NotFoundException('Không tìm thấy thông tin người dùng!');
    }

    if (!user.password) {
      throw new BadRequestException(
        'Tài khoản này được đăng ký bằng Google/Facebook, không sử dụng mật khẩu riêng!',
      );
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      throw new BadRequestException('Mật khẩu hiện tại không chính xác!');
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
    await this.userService.findByIdAndUpdate(userId, {
      password: hashedPassword,
    });

    return {
      success: true,
      message: 'Đổi mật khẩu thành công!',
    };
  }

  async forgotPassword(email: string): Promise<ForgotPasswordResponse> {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await this.userService.findOne(normalizedEmail);
    if (!user) {
      throw new BadRequestException('Email không tồn tại trong hệ thống!');
    }

    if (!user.password && user.firebaseUid) {
      throw new BadRequestException(
        'Tài khoản này được đăng ký bằng Google/Facebook, không sử dụng mật khẩu riêng!',
      );
    }

    // Kiểm tra cooldown gửi lại mã OTP (60s)
    const cooldownKey = `otp_cooldown:${normalizedEmail}`;
    const isCooldown = await this.redisService.get(cooldownKey);
    if (isCooldown) {
      throw new HttpException(
        'Vui lòng chờ 60 giây trước khi yêu cầu gửi lại mã OTP mới.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Sinh mã OTP 6 chữ số
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Lưu OTP vào Redis với TTL 300s (5 phút)
    const otpKey = `otp:${normalizedEmail}`;
    await this.redisService.set(otpKey, otp, 300);

    // Đặt cooldown 60 giây
    await this.redisService.set(cooldownKey, '1', 60);

    // Reset bộ đếm số lần nhập sai
    await this.redisService.del(`otp_attempts:${normalizedEmail}`);

    // Gửi email OTP
    await this.mailService.sendOtpEmail(normalizedEmail, otp, user.name);

    return {
      success: true,
      message: 'Mã xác thực OTP đã được gửi đến email của bạn!',
    };
  }

  async verifyOtp(email: string, otp: string): Promise<VerifyOtpResponse> {
    const normalizedEmail = email.trim().toLowerCase();
    const otpKey = `otp:${normalizedEmail}`;
    const attemptsKey = `otp_attempts:${normalizedEmail}`;

    const storedOtp = await this.redisService.get(otpKey);
    if (!storedOtp) {
      throw new BadRequestException(
        'Mã xác thực đã hết hạn hoặc không tồn tại! Vui lòng yêu cầu mã mới.',
      );
    }

    const attemptsStr = await this.redisService.get(attemptsKey);
    const attempts = attemptsStr ? parseInt(attemptsStr, 10) : 0;

    if (attempts >= 5) {
      await this.redisService.del(otpKey);
      await this.redisService.del(attemptsKey);
      throw new BadRequestException(
        'Bạn đã nhập sai mã xác thực quá số lần cho phép (5 lần). Vui lòng yêu cầu mã OTP mới!',
      );
    }

    if (storedOtp !== otp.trim()) {
      const nextAttempts = attempts + 1;
      await this.redisService.set(attemptsKey, nextAttempts.toString(), 300);
      const remaining = 5 - nextAttempts;
      throw new BadRequestException(
        `Mã xác thực không chính xác! Bạn còn ${remaining} lần thử lại.`,
      );
    }

    // OTP chính xác: Xóa OTP và bộ đếm
    await this.redisService.del(otpKey);
    await this.redisService.del(attemptsKey);

    // Sinh Reset Token tạm thời (chỉ dùng 1 lần, TTL 600s)
    const randomHex = crypto.randomBytes(24).toString('hex');
    const resetToken = `rst_${randomHex}`;

    await this.redisService.set(
      `reset_token:${resetToken}`,
      normalizedEmail,
      600,
    );

    return {
      success: true,
      message: 'Xác thực mã OTP thành công!',
      resetToken,
    };
  }

  async resetPassword(
    resetToken: string,
    newPassword: string,
  ): Promise<ResetPasswordResponse> {
    const tokenKey = `reset_token:${resetToken.trim()}`;
    const email = await this.redisService.get(tokenKey);

    if (!email) {
      throw new BadRequestException(
        'Yêu cầu đặt lại mật khẩu không hợp lệ hoặc đã hết hạn! Vui lòng thực hiện lại từ đầu.',
      );
    }

    const user = await this.userService.findOne(email);
    if (!user) {
      throw new NotFoundException('Không tìm thấy thông tin người dùng!');
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    await this.userService.findByIdAndUpdate(user._id.toString(), {
      password: hashedPassword,
      refreshToken: null,
    });

    // Thu hồi resetToken ngay sau khi dùng
    await this.redisService.del(tokenKey);

    return {
      success: true,
      message:
        'Đặt lại mật khẩu thành công! Vui lòng đăng nhập bằng mật khẩu mới.',
    };
  }
}
