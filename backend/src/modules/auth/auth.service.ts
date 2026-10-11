import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Response as ExpressResponse } from 'express';
import { UsersService } from '../users/users.service.js';
import { RedisService } from '../redis/redis/redis.service.js';
@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly userService: UsersService,
    private readonly redisService: RedisService,
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
      sameSite: 'strict',
      maxAge: maxAgeMs,
    });
  }
  async generateTokens(userId: string, email: string, role: string) {
    const payload = { sub: userId, email, role };
    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_SECRET'),
      expiresIn: (this.configService.get<string>('JWT_EXPIRES_IN') ||
        '15m') as any,
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: (this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') ||
        '7d') as any,
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
    } catch (error) {
      throw new UnauthorizedException(
        'Refresh Token không hợp lệ hoặc đã hết hạn!',
      );
    }
  }
  async signIn(email: string, password: string) {
    // 1. Tìm user qua UsersService
    const user = await this.userService.findOne(email);
    if (!user) {
      throw new UnauthorizedException('Email hoặc mật khẩu không chính xác!');
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
      throw new UnauthorizedException('Email hoặc mật khẩu không chính xác!');
    }

    const tokens = await this.generateTokens(
      user._id.toString(),
      user.email,
      user.role,
    );

    return {
      success: true,
      message: 'Đăng nhập thành công!',
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
  async logout(userId: string, token: string) {
    await this.userService.findByIdAndUpdate(userId, {
      refreshToken: null,
    });

    if (token) {
      const ttlSeconds = 30;
      await this.redisService.blacklistToken(token, ttlSeconds);
    }

    return { success: true, message: 'Đăng xuất thành công' };
  }
}
