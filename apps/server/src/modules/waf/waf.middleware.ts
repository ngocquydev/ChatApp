import { Injectable, HttpException, HttpStatus, type NestMiddleware } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';
import { getClientIp } from '../../common/utils/client-ip.util.js';
import { WafConfigService } from './waf-config.service.js';
import { WafEventsService } from './waf-events.service.js';
import { WafClearanceService } from './waf-clearance.service.js';
import { EdgeBanService } from './edge-ban.service.js';
import {
  WAF_ERROR_BLOCKED,
  WAF_ERROR_CHALLENGE,
  type WafDecision,
  type WafRequestContext,
} from './waf.types.js';

type CloudflareAwareRequest = Request & {
  realClientIp?: string;
  isCloudflare?: boolean;
  cfCountry?: string | string[] | null;
};

/** IP client đã chuẩn hóa (CloudflareMiddleware gắn sẵn realClientIp) */
export function resolveWafIp(req: CloudflareAwareRequest): string {
  return req.realClientIp ?? getClientIp(req);
}

/** Chuẩn hóa request Express thành ngữ cảnh đánh giá luật WAF */
export function buildWafContext(
  req: CloudflareAwareRequest,
  hasClearance: (ip: string) => boolean,
  isBanned = false,
): WafRequestContext {
  const ip = resolveWafIp(req);
  const url = req.originalUrl || req.url || '/';
  const rawCountry = req.isCloudflare ? req.cfCountry : null;
  const country = typeof rawCountry === 'string' && /^[A-Za-z]{2}$/.test(rawCountry) ? rawCountry.toUpperCase() : null;
  const userAgent = req.headers['user-agent'];

  return {
    ip,
    method: req.method,
    path: url.split('?')[0] || '/',
    url,
    userAgent: typeof userAgent === 'string' ? userAgent.slice(0, 512) : '',
    country,
    hasClearance: hasClearance(ip),
    isBanned,
  };
}

/** Tường lửa ứng dụng: chạy sau CloudflareMiddleware (đã có IP thật) và trước RateLimitMiddleware */
@Injectable()
export class WafMiddleware implements NestMiddleware {
  constructor(
    private readonly configService: WafConfigService,
    private readonly events: WafEventsService,
    private readonly clearance: WafClearanceService,
    private readonly bans: EdgeBanService,
  ) {}

  async use(req: Request, _res: Response, next: NextFunction): Promise<void> {
    const { engine } = await this.configService.getEngine();
    const isBanned = await this.bans.isBanned(resolveWafIp(req));
    const ctx = buildWafContext(req, (ip) => this.clearance.isValid(req, ip), isBanned);
    const decision = engine.evaluate(ctx);
    this.enforce(decision, ctx);
    next();
  }

  private enforce(decision: WafDecision, ctx: WafRequestContext): void {
    if (decision.action === 'allow' || !decision.reason) return;

    this.events.record({
      ip: ctx.ip,
      action: decision.action,
      reason: decision.reason,
      method: ctx.method,
      path: ctx.path,
      country: ctx.country,
    });

    // Dò lỗ hổng / UA công cụ tấn công là vi phạm: tái phạm sẽ bị chặn tự động (cả ở Cloudflare nếu bật)
    if (decision.reason === 'scanner_path' || decision.reason === 'bad_user_agent') {
      void this.bans.reportOffense(ctx.ip, decision.reason);
    }

    if (decision.action === 'challenge') {
      throw new HttpException(
        { message: 'Vui lòng xác minh bảo mật để tiếp tục.', error: WAF_ERROR_CHALLENGE },
        HttpStatus.FORBIDDEN,
      );
    }
    throw new HttpException(
      { message: 'Yêu cầu của bạn đã bị tường lửa ứng dụng chặn.', error: WAF_ERROR_BLOCKED },
      HttpStatus.FORBIDDEN,
    );
  }
}
