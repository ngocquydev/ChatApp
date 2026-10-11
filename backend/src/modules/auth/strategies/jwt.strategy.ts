// src/modules/auth/strategies/jwt.strategy.ts
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import type { Request } from 'express';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      // ✅ Tự động trích xuất Access Token từ HttpOnly Cookie có tên là 'accessToken'
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

  async validate(payload: any) {
    // Payload sau khi verify sẽ được gán vào req.user
    return { sub: payload.sub, email: payload.email, role: payload.role };
  }
}
