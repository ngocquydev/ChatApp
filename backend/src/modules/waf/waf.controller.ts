import { Body, Controller, HttpCode, HttpStatus, Post, Req, Res } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import type { Request, Response } from 'express';
import { getClientIp } from '../../common/utils/client-ip.util.js';
import { TurnstileService } from '../auth/turnstile.service.js';
import { WafClearanceService } from './waf-clearance.service.js';

export class WafClearanceDto {
  // class-validator chạy decorator từ dưới lên: kiểm tra "thiếu" trước, độ dài sau
  @MaxLength(2048, { message: 'Mã xác minh không hợp lệ' })
  @IsString({ message: 'Mã xác minh không hợp lệ' })
  @IsNotEmpty({ message: 'Thiếu mã xác minh Turnstile' })
  token: string;
}

/** Turnstile action riêng cho clearance — khớp prop `action` của TurnstileWidget ở frontend */
export const WAF_TURNSTILE_ACTION = 'waf_clearance';

@ApiTags('WAF')
@Controller('waf')
export class WafController {
  constructor(
    private readonly turnstile: TurnstileService,
    private readonly clearance: WafClearanceService,
  ) {}

  @Post('clearance')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Đổi mã Turnstile lấy cookie clearance khi WAF yêu cầu xác minh' })
  async issueClearance(
    @Body() dto: WafClearanceDto,
    @Req() req: Request & { realClientIp?: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    const ip = req.realClientIp ?? getClientIp(req);
    await this.turnstile.validateTurnstile(dto.token, ip === 'unknown' ? undefined : ip, WAF_TURNSTILE_ACTION);
    const expiresIn = this.clearance.issue(res, ip);
    return { success: true, message: 'Xác minh thành công.', expiresIn };
  }
}
