import { Injectable, Logger } from '@nestjs/common';
import { createHmac, randomBytes } from 'node:crypto';
import type { Request, Response } from 'express';
import { CLEARANCE_TTL_SECONDS, signClearance, verifyClearance } from './waf-clearance.util.js';
import { WAF_CLEARANCE_COOKIE } from './waf.types.js';

/** Cấp và kiểm tra cookie clearance sau khi người dùng vượt qua Turnstile */
@Injectable()
export class WafClearanceService {
  private readonly logger = new Logger(WafClearanceService.name);
  private readonly secret: string;

  constructor() {
    const explicit = process.env.WAF_CLEARANCE_SECRET?.trim();
    const jwtSecret = process.env.JWT_SECRET?.trim();
    if (explicit && explicit.length >= 32) {
      this.secret = explicit;
    } else if (jwtSecret) {
      // Dẫn xuất khóa riêng từ JWT_SECRET để không dùng chung một khóa cho hai mục đích
      this.secret = createHmac('sha256', jwtSecret).update('waf-clearance-v1').digest('hex');
    } else {
      this.secret = randomBytes(32).toString('hex');
      this.logger.warn('Thiếu WAF_CLEARANCE_SECRET và JWT_SECRET — clearance chỉ có hiệu lực tới khi khởi động lại.');
    }
  }

  isValid(req: Request, ip: string): boolean {
    const cookies = (req as Request & { cookies?: Record<string, string> }).cookies;
    return verifyClearance(cookies?.[WAF_CLEARANCE_COOKIE], ip, this.secret);
  }

  issue(res: Response, ip: string): number {
    res.cookie(WAF_CLEARANCE_COOKIE, signClearance(ip, this.secret), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: CLEARANCE_TTL_SECONDS * 1000,
    });
    return CLEARANCE_TTL_SECONDS;
  }
}
