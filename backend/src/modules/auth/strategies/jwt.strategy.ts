// src/modules/auth/strategies/jwt.strategy.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import type { Request } from 'express';
import { Types } from 'mongoose';
import { UsersService } from '../../users/users.service.js';

type Payload = {
  sub: string;
  email: string;
  role: string;
};

type SafeUserResponse = {
  _id: Types.ObjectId | string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  isDeleted: boolean;
  isBan: boolean;
  firebaseUid?: string;
  avatar?: string;
  createdAt?: Date;
  updatedAt?: Date;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly usersService: UsersService) {
    super({
      jwtFromRequest: (req: Request) => {
        let token = null;
        if (req && req.cookies) {
          token = req.cookies['accessToken'];
        }
        return token;
      },
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'your_secret_key',
    });
  }

  async validate(payload: Payload): Promise<SafeUserResponse> {
    const user = await this.usersService.findById(payload.sub);

    if (!user || user.isDeleted || user.isBan) {
      throw new UnauthorizedException(
        'Người dùng không tồn tại hoặc đã bị khóa!',
      );
    }

    const userObj =
      typeof user.toObject === 'function' ? user.toObject() : user;

    const {
      password: _password,
      refreshToken: _refreshToken,
      ...result
    } = userObj;

    return {
      ...result,
      _id: result._id.toString(),
    } as SafeUserResponse;
  }
}
