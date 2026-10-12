import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface TurnstileVerifyResponse {
  success: boolean;
  'error-codes'?: string[];
  challenge_ts?: string;
  hostname?: string;
  action?: string;
  cdata?: string;
}

@Injectable()
export class TurnstileService {
  private readonly logger = new Logger(TurnstileService.name);

  constructor(private readonly configService: ConfigService) {}

  /**
   * Xác thực canonical Cloudflare Turnstile token
   * @param token Token cf-turnstile-response gửi từ frontend
   * @param remoteIp IP của client (từ header CF-Connecting-IP hoặc req.ip)
   * @param expectedAction Tên action dự kiến (mặc định 'login')
   */
  async validateTurnstile(
    token?: string,
    remoteIp?: string,
    expectedAction = 'login',
  ): Promise<boolean> {
    const isTest = this.configService.get<string>('NODE_ENV') === 'test';

    // Cho phép bỏ qua xác thực trong môi trường kiểm thử (Vitest / Supertest) nếu không truyền token
    if (isTest && !token) {
      return true;
    }

    if (!token || typeof token !== 'string' || token.length === 0 || token.length > 2048) {
      throw new BadRequestException(
        'Vui lòng hoàn thành xác minh bảo mật Cloudflare Turnstile!',
      );
    }

    const secretKey = (
      this.configService.get<string>('TURNSTILE_SECRET') ||
      this.configService.get<string>('SECRET_KEY_CLOUDFLARE') ||
      this.configService.get<string>('CLOUDFLARE_TURNSTILE_SECRET_KEY') ||
      ''
    ).trim();

    if (!secretKey) {
      this.logger.warn(
        'TURNSTILE_SECRET chưa được thiết lập. Tạm thời bỏ qua kiểm tra Turnstile.',
      );
      return true;
    }

    // Danh sách hostname được phép (mặc định: localhost, 127.0.0.1 hoặc biến môi trường)
    const hostnamesConfig =
      this.configService.get<string>('TURNSTILE_HOSTNAMES') || 'localhost,127.0.0.1';
    const expectedHostnames = new Set(
      hostnamesConfig
        .split(',')
        .map((h) => h.trim().toLowerCase())
        .filter(Boolean),
    );

    let result: TurnstileVerifyResponse;

    try {
      const formData = new URLSearchParams();
      formData.append('secret', secretKey);
      formData.append('response', token);
      if (remoteIp) {
        formData.append('remoteip', remoteIp);
      }

      const response = await fetch(
        'https://challenges.cloudflare.com/turnstile/v0/siteverify',
        {
          method: 'POST',
          body: formData,
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          signal: AbortSignal.timeout(10_000),
        },
      );

      if (!response.ok) {
        throw new Error(`Cloudflare siteverify HTTP error: ${response.status}`);
      }

      result = (await response.json()) as TurnstileVerifyResponse;
    } catch (error) {
      this.logger.error('Lỗi khi gọi API Cloudflare siteverify:', error);
      throw new ForbiddenException(
        'Không thể xác minh bảo mật Cloudflare Turnstile. Vui lòng thử lại!',
      );
    }

    if (!result.success) {
      this.logger.warn(
        `Cloudflare Turnstile verification failed. Error codes: ${JSON.stringify(
          result['error-codes'],
        )}`,
      );
      throw new ForbiddenException(
        'Xác thực bảo mật Turnstile không hợp lệ hoặc đã hết hạn!',
      );
    }

    // Kiểm tra action nếu widget gửi action
    if (result.action && expectedAction && result.action !== expectedAction) {
      this.logger.warn(
        `Turnstile action mismatch: expected "${expectedAction}", got "${result.action}"`,
      );
      throw new ForbiddenException('Hành vi xác thực bảo mật không khớp!');
    }

    // Kiểm tra hostname nếu có thiết lập TURNSTILE_HOSTNAMES
    if (
      expectedHostnames.size > 0 &&
      result.hostname &&
      !expectedHostnames.has(result.hostname.toLowerCase())
    ) {
      this.logger.warn(
        `Turnstile hostname mismatch: "${result.hostname}" not in allowed list [${Array.from(
          expectedHostnames,
        ).join(', ')}]`,
      );
      throw new ForbiddenException('Tên miền xác thực bảo mật không được phép!');
    }

    return true;
  }
}
