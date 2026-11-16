import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { WafAdminController } from './waf-admin.controller.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/auth/roles.guard.js';
import { ROLES_KEY } from '../../common/auth/roles.decorator.js';
import { DEFAULT_WAF_CONFIG } from './waf.types.js';
import type { WafConfigService } from './waf-config.service.js';
import type { WafEventsService } from './waf-events.service.js';
import type { EdgeBanService } from './edge-ban.service.js';
import type { CloudflareWafService } from './cloudflare/cloudflare-waf.service.js';

const adminReq = {
  user: { _id: 'admin1', role: 'admin' },
  realClientIp: '113.161.72.10',
  headers: {},
  socket: { remoteAddress: '127.0.0.1' },
} as never;

describe('WafAdminController', () => {
  let config: { getConfig: ReturnType<typeof vi.fn>; updateConfig: ReturnType<typeof vi.fn> };
  let cloudflare: Record<string, ReturnType<typeof vi.fn>>;
  let bans: Record<string, ReturnType<typeof vi.fn>>;
  let controller: WafAdminController;

  beforeEach(() => {
    config = {
      getConfig: vi.fn().mockResolvedValue(DEFAULT_WAF_CONFIG),
      updateConfig: vi.fn().mockImplementation((patch: object) => Promise.resolve({ ...DEFAULT_WAF_CONFIG, ...patch })),
    };
    cloudflare = {
      getStatus: vi.fn().mockResolvedValue({ configured: false, autoBan: false }),
      isConfigured: vi.fn().mockReturnValue(true),
      setUnderAttack: vi.fn().mockResolvedValue('under_attack'),
      setBotFightMode: vi.fn().mockResolvedValue(true),
      syncRules: vi.fn().mockResolvedValue({ customRules: 3, rateLimitRules: 1, preservedUserRules: 0 }),
    };
    bans = {
      listBans: vi.fn().mockResolvedValue([]),
      ban: vi.fn().mockResolvedValue({ ip: '203.0.113.5' }),
      unban: vi.fn().mockResolvedValue(true),
    };
    controller = new WafAdminController(
      config as unknown as WafConfigService,
      { list: vi.fn().mockResolvedValue([]) } as unknown as WafEventsService,
      bans as unknown as EdgeBanService,
      cloudflare as unknown as CloudflareWafService,
    );
  });

  it('[abuse] toàn bộ controller yêu cầu đăng nhập + role admin', () => {
    expect(Reflect.getMetadata(GUARDS_METADATA, WafAdminController)).toEqual([JwtAuthGuard, RolesGuard]);
    expect(Reflect.getMetadata(ROLES_KEY, WafAdminController)).toEqual(['admin']);
  });

  it('cập nhật cấu hình hợp lệ, chuẩn hóa mã quốc gia', async () => {
    const result = await controller.updateConfig(
      { blockScanners: false, allowedCountries: ['vn', 'sg'], ipBlocklist: ['198.51.100.0/24'] },
      adminReq,
    );
    expect(config.updateConfig).toHaveBeenCalledWith(
      { blockScanners: false, allowedCountries: ['VN', 'SG'], ipBlocklist: ['198.51.100.0/24'] },
      'admin1',
    );
    expect(result.blockScanners).toBe(false);
  });

  it('từ chối CIDR sai định dạng và liệt kê giá trị lỗi', async () => {
    await expect(controller.updateConfig({ ipAllowlist: ['10.0.0.0/8', 'abc'] }, adminReq)).rejects.toThrow(/abc/);
  });

  it('[abuse] không cho admin tự chặn IP của chính mình', async () => {
    await expect(controller.updateConfig({ ipBlocklist: ['113.161.72.0/24'] }, adminReq)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('Under Attack phạm vi "both" bật cả trong app và trên Cloudflare', async () => {
    const result = await controller.setUnderAttack({ enabled: true, scope: 'both' }, adminReq);
    expect(config.updateConfig).toHaveBeenCalledWith({ underAttack: true }, 'admin1');
    expect(cloudflare.setUnderAttack).toHaveBeenCalledWith(true);
    expect(result).toEqual({ app: true, cloudflareSecurityLevel: 'under_attack' });
  });

  it('Under Attack phạm vi "app" không gọi Cloudflare', async () => {
    await controller.setUnderAttack({ enabled: false, scope: 'app' }, adminReq);
    expect(cloudflare.setUnderAttack).not.toHaveBeenCalled();
  });

  it('chặn thủ công dùng thời hạn tính theo phút', async () => {
    await controller.createBan({ ip: '203.0.113.5', durationMinutes: 30 });
    expect(bans.ban).toHaveBeenCalledWith('203.0.113.5', 'manual', 1800);
  });
});

