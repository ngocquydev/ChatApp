import {
  BadGatewayException,
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  NotFoundException,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/auth/roles.guard.js';
import { Roles } from '../../common/auth/roles.decorator.js';
import { createIpMatcher, getClientIp, isValidCidr } from '../../common/utils/client-ip.util.js';
import { WafConfigService } from './waf-config.service.js';
import { WafEventsService } from './waf-events.service.js';
import { EdgeBanService } from './edge-ban.service.js';
import { CloudflareWafService } from './cloudflare/cloudflare-waf.service.js';
import { CloudflareApiError } from './cloudflare/cloudflare-api.client.js';
import { CreateBanDto, ToggleDto, UnderAttackDto, UpdateWafConfigDto } from './dto/waf-admin.dto.js';
import type { WafConfig } from './waf.types.js';

type AdminRequest = Request & { user?: { _id?: string }; realClientIp?: string };

function adminId(req: AdminRequest): string {
  return String(req.user?._id ?? 'unknown');
}

/** API quản trị WAF — chỉ admin. Mọi thay đổi được ghi log kèm ID admin (không ghi email). */
@ApiTags('Admin WAF')
@ApiBearerAuth()
@Controller('admin/waf')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class WafAdminController {
  private readonly logger = new Logger(WafAdminController.name);

  constructor(
    private readonly config: WafConfigService,
    private readonly events: WafEventsService,
    private readonly bans: EdgeBanService,
    private readonly cloudflare: CloudflareWafService,
  ) {}

  @Get('status')
  @ApiOperation({ summary: 'Trạng thái WAF trong app và trên Cloudflare' })
  async status() {
    const [app, cloudflare, bans] = await Promise.all([
      this.config.getConfig(),
      this.cloudflare.getStatus(),
      this.bans.listBans(),
    ]);
    return { app, cloudflare, activeBans: bans.length };
  }

  @Patch('config')
  @ApiOperation({ summary: 'Cập nhật cấu hình WAF trong app' })
  async updateConfig(@Body() dto: UpdateWafConfigDto, @Req() req: AdminRequest): Promise<WafConfig> {
    const patch: Partial<WafConfig> = {};
    for (const key of ['enabled', 'blockScanners', 'blockBadUserAgents', 'challengeForeignAuth'] as const) {
      if (dto[key] !== undefined) patch[key] = dto[key];
    }
    if (dto.allowedCountries) patch.allowedCountries = [...new Set(dto.allowedCountries.map((c) => c.toUpperCase()))];

    for (const key of ['ipAllowlist', 'ipBlocklist'] as const) {
      const list = dto[key];
      if (!list) continue;
      const cleaned = [...new Set(list.map((c) => c.trim()).filter(Boolean))];
      const invalid = cleaned.filter((c) => !isValidCidr(c));
      if (invalid.length > 0) {
        throw new BadRequestException(`Địa chỉ IP/CIDR không hợp lệ: ${invalid.slice(0, 5).join(', ')}`);
      }
      patch[key] = cleaned;
    }

    if (patch.ipBlocklist) {
      const ownIp = req.realClientIp ?? getClientIp(req);
      if (createIpMatcher(patch.ipBlocklist)(ownIp)) {
        throw new BadRequestException('Danh sách chặn đang bao gồm IP hiện tại của bạn — bạn sẽ tự khóa mình.');
      }
    }

    const updated = await this.config.updateConfig(patch, adminId(req));
    this.logger.log(`[Audit] Admin ${adminId(req)} cập nhật cấu hình WAF: ${Object.keys(patch).join(', ')}`);
    return updated;
  }

  @Post('under-attack')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Bật/tắt Under Attack Mode (trong app, trên Cloudflare hoặc cả hai)' })
  async setUnderAttack(@Body() dto: UnderAttackDto, @Req() req: AdminRequest) {
    const result: { app?: boolean; cloudflareSecurityLevel?: string } = {};
    if (dto.scope === 'app' || dto.scope === 'both') {
      result.app = (await this.config.updateConfig({ underAttack: dto.enabled }, adminId(req))).underAttack;
    }
    if (dto.scope === 'cloudflare' || dto.scope === 'both') {
      try {
        result.cloudflareSecurityLevel = await this.cloudflare.setUnderAttack(dto.enabled);
      } catch (err) {
        if (err instanceof CloudflareApiError) throw new BadGatewayException(err.message);
        throw err;
      }
    }
    this.logger.warn(`[Audit] Admin ${adminId(req)} ${dto.enabled ? 'BẬT' : 'TẮT'} Under Attack (${dto.scope})`);
    return result;
  }

  @Post('cloudflare/bot-fight')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Bật/tắt Bot Fight Mode trên Cloudflare' })
  async setBotFight(@Body() dto: ToggleDto, @Req() req: AdminRequest) {
    try {
      const botFightMode = await this.cloudflare.setBotFightMode(dto.enabled);
      this.logger.log(`[Audit] Admin ${adminId(req)} đặt Bot Fight Mode = ${botFightMode}`);
      return { botFightMode };
    } catch (err) {
      if (err instanceof CloudflareApiError) throw new BadGatewayException(err.message);
      throw err;
    }
  }

  @Post('cloudflare/sync')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Đồng bộ custom rules + rate limiting rule lên Cloudflare' })
  async syncCloudflare(@Req() req: AdminRequest) {
    try {
      const result = await this.cloudflare.syncRules();
      this.logger.log(`[Audit] Admin ${adminId(req)} đồng bộ luật WAF lên Cloudflare`);
      return result;
    } catch (err) {
      if (err instanceof CloudflareApiError) throw new BadGatewayException(err.message);
      throw err;
    }
  }

  @Get('bans')
  @ApiOperation({ summary: 'Danh sách IP đang bị chặn' })
  listBans() {
    return this.bans.listBans();
  }

  @Post('bans')
  @ApiOperation({ summary: 'Chặn thủ công một IP' })
  createBan(@Body() dto: CreateBanDto) {
    return this.bans.ban(dto.ip, 'manual', (dto.durationMinutes ?? 60) * 60);
  }

  @Delete('bans/:ip')
  @ApiOperation({ summary: 'Gỡ chặn một IP' })
  async deleteBan(@Param('ip') ip: string) {
    if (!(await this.bans.unban(ip))) throw new NotFoundException('IP này không nằm trong danh sách chặn.');
    return { success: true };
  }

  @Get('events')
  @ApiOperation({ summary: '100 sự kiện WAF gần nhất' })
  listEvents() {
    return this.events.list();
  }
}

