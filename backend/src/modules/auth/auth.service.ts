// src/modules/auth/auth.service.ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { User, UserRepository } from '../users/entities/user.entity.js';
import { Response as ExpressResponse } from 'express';
@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @InjectModel(User.name) private readonly userModel: Model<UserRepository>,
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
  // Hàm sinh cặp token (Access Token & Refresh Token)
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

    await this.userModel.findByIdAndUpdate(userId, {
      refreshToken: hashedRefreshToken,
    });
  }
  // Lưu refresh token vào DB (đã mã hóa bcrypt)
  private async updateRefreshToken(userId: string, refreshToken: string) {
    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
    await this.userModel.findByIdAndUpdate(userId, {
      refreshToken: hashedRefreshToken,
    });
  }

  // 3. Logic làm mới token
  //   async refreshTokens(userId: string, rt: string) {
  //     const user = await this.userModel.findById(userId);
  //     if (!user || !user.refreshToken || user.isDeleted || user.isBan) {
  //       throw new UnauthorizedException('Truy cập bị từ chối!');
  //     }

  //     const rtMatches = await bcrypt.compare(rt, user.refreshToken);
  //     if (!rtMatches) {
  //       throw new UnauthorizedException('Truy cập bị từ chối!');
  //     }

  //     const tokens = await this.generateTokens(
  //       user._id.toString(),
  //       user.email,
  //       user.role,
  //     );
  //     await this.updateRefreshToken(user._id.toString(), tokens.refreshToken);

  //     return {
  //       success: true,
  //       message: 'Làm mới token thành công!',
  //       ...tokens,
  //     };
  //   }
}
