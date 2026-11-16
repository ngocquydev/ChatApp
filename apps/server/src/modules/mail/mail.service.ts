import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: Transporter | null = null;

  constructor(private readonly configService: ConfigService) {
    this.initTransporter();
  }

  private initTransporter() {
    const service =
      this.configService.get<string>('SMTP_SERVICE') ||
      process.env.SMTP_SERVICE;
    const host =
      this.configService.get<string>('SMTP_HOST') ||
      process.env.SMTP_HOST;
    const port = Number(
      this.configService.get<number>('SMTP_PORT') ||
        process.env.SMTP_PORT ||
        587,
    );
    const user =
      this.configService.get<string>('SMTP_USER') ||
      process.env.SMTP_USER;
    const pass =
      this.configService.get<string>('SMTP_PASS') ||
      process.env.SMTP_PASS;

    if (user && pass && (service || host)) {
      if (service) {
        this.transporter = nodemailer.createTransport({
          service,
          auth: { user, pass },
        });
        this.logger.log(`Cấu hình Mail Transporter thành công qua service: ${service}`);
      } else {
        this.transporter = nodemailer.createTransport({
          host,
          port,
          secure: port === 465,
          auth: { user, pass },
        });
        this.logger.log(`Cấu hình Mail Transporter thành công qua ${host}:${port}`);
      }
    } else {
      this.logger.warn(
        'Chưa cấu hình SMTP_USER / SMTP_PASS trong .env. Hệ thống sẽ sử dụng chế độ Dev Logger Fallback để in mã OTP ra Terminal.',
      );
    }
  }

  async sendOtpEmail(
    toEmail: string,
    otp: string,
    userName?: string,
  ): Promise<boolean> {
    const displayName = userName || 'Người dùng ChatApp';

    const htmlContent = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border-radius: 16px; background-color: #f8fafc; border: 1px solid #e2e8f0;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h2 style="color: #2563eb; margin: 0; font-size: 26px; letter-spacing: -0.5px;">ChatApp</h2>
          <p style="color: #64748b; font-size: 14px; margin-top: 4px;">Nền tảng nhắn tin và kết nối thời gian thực</p>
        </div>
        
        <div style="background-color: #ffffff; padding: 32px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
          <h3 style="color: #0f172a; margin-top: 0; font-size: 20px;">Yêu cầu đặt lại mật khẩu</h3>
          <p style="color: #475569; font-size: 15px; line-height: 1.6;">
            Xin chào <strong>${displayName}</strong>,<br/>
            Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản liên kết với email <strong>${toEmail}</strong>.
          </p>
          
          <div style="margin: 28px 0; text-align: center;">
            <span style="display: inline-block; font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #2563eb; background-color: #eff6ff; border: 2px dashed #93c5fd; padding: 14px 28px; border-radius: 12px;">
              ${otp}
            </span>
          </div>
          
          <p style="color: #64748b; font-size: 14px; line-height: 1.6;">
            ⏱ Mã xác thực này có hiệu lực trong <strong>5 phút</strong>.<br/>
            ⚠️ Vì lý do bảo mật, <strong>tuyệt đối không chia sẻ mã này</strong> cho bất kỳ ai khác.
          </p>
          
          <p style="color: #94a3b8; font-size: 13px; margin-top: 24px; border-top: 1px solid #f1f5f9; padding-top: 16px;">
            Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email hoặc đổi mật khẩu tài khoản ngay để đảm bảo an toàn.
          </p>
        </div>
        
        <div style="text-align: center; margin-top: 20px; color: #94a3b8; font-size: 12px;">
          &copy; ${new Date().getFullYear()} ChatApp Platform. Mọi quyền được bảo lưu.
        </div>
      </div>
    `;

    if (this.transporter) {
      try {
        const fromAddress =
          this.configService.get<string>('SMTP_FROM') ||
          process.env.SMTP_FROM ||
          '"ChatApp Security" <no-reply@chatapp.io>';

        await this.transporter.sendMail({
          from: fromAddress,
          to: toEmail,
          subject: `[ChatApp] Mã xác thực đặt lại mật khẩu: ${otp}`,
          html: htmlContent,
        });

        this.logger.log(`Đã gửi email OTP thành công tới: ${toEmail}`);
        return true;
      } catch (error) {
        this.logger.error(
          `Gửi email tới ${toEmail} thất bại: ${error instanceof Error ? error.message : String(error)}`,
        );
        // Fallback to console if SMTP fails
        this.logDevOtpFallback(toEmail, otp);
        return true;
      }
    } else {
      // Dev mode fallback
      this.logDevOtpFallback(toEmail, otp);
      return true;
    }
  }

  private logDevOtpFallback(toEmail: string, otp: string) {
    this.logger.log(`
======================================================================
  [DEVELOPMENT EMAIL FALLBACK]
  Đến: ${toEmail}
  Tiêu đề: [ChatApp] Mã xác thực đặt lại mật khẩu: ${otp}
  MÃ OTP: >>> ${otp} <<< (Hiệu lực: 5 phút)
======================================================================
    `);
  }
}
