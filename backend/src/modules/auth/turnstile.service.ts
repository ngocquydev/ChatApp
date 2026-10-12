import { BadRequestException, Injectable, Logger } from '@nestjs/common';
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

  async validateTurnstile(token?: string, remoteIp?: string): Promise<boolean> {
    const isTest = this.configService.get<string>('NODE_ENV') === 'test';

    // Cho phép bỏ qua xác thực trong môi trường kiểm thử nếu không truyền token
    if (isTest && !token) {
      return true;
    }

    if (!token) {
      throw new BadRequestException(
        'Vui lòng hoàn thành xác minh bảo mật Cloudflare Turnstile!',
      );
    }

    const secretKey = (
      this.configService.get<string>('SECRET_KEY_CLOUDFLARE') ||
      this.configService.get<string>('CLOUDFLARE_TURNSTILE_SECRET_KEY') ||
      ''
    ).trim();

    if (!secretKey) {
      this.logger.warn(
        'SECRET_KEY_CLOUDFLARE chưa được thiết lập. Tạm thời bỏ qua kiểm tra Turnstile.',
      );
      return true;
    }

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
        },
      );

      const data = (await response.json()) as TurnstileVerifyResponse;

      if (!data.success) {
        this.logger.warn(
          `Xác thực Cloudflare Turnstile thất bại: ${JSON.stringify(
            data['error-codes'],
          )}`,
        );
        throw new BadRequestException(
          'Xác thực bảo mật Turnstile không hợp lệ hoặc đã hết hạn!',
        );
      }

      return true;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error('Lỗi khi gọi API Cloudflare siteverify:', error);
      throw new BadRequestException(
        'Không thể xác minh bảo mật Cloudflare Turnstile. Vui lòng thử lại!',
      );
    }
  }
}
