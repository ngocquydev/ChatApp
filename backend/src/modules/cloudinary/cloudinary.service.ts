import { Injectable, Logger, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import { Readable } from 'node:stream';
import type { CloudinaryUploadResult, UploadOptions } from './cloudinary.interface.js';

@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);
  private readonly configured: boolean;

  constructor(private readonly configService: ConfigService) {
    const cloudName = this.configService.get<string>('CLOUDINARY_CLOUD_NAME');
    const apiKey = this.configService.get<string>('CLOUDINARY_API_KEY');
    const apiSecret = this.configService.get<string>('CLOUDINARY_API_SECRET');
    this.configured = Boolean(cloudName && apiKey && apiSecret);

    if (this.configured) {
      this.logger.log(`Cloudinary đã được cấu hình với cloud: ${cloudName}`);
    } else {
      this.logger.warn('Cloudinary chưa được cấu hình (thiếu CLOUDINARY_CLOUD_NAME / API_KEY / API_SECRET)');
    }
  }

  isConfigured(): boolean {
    return this.configured;
  }

  /**
   * Tải buffer tệp (ảnh hoặc video) lên Cloudinary qua luồng stream
   */
  async uploadBuffer(
    buffer: Buffer,
    options: UploadOptions = {},
  ): Promise<CloudinaryUploadResult> {
    if (!this.configured) {
      throw new InternalServerErrorException('Dịch vụ lưu trữ Cloudinary chưa được cấu hình');
    }
    if (!buffer || buffer.length === 0) {
      throw new BadRequestException('Tệp tải lên không hợp lệ hoặc rỗng');
    }

    const folder = options.folder ?? 'chatapp/media';
    const resourceType = options.resource_type ?? 'auto';

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: resourceType,
          filename_override: options.filename,
          use_filename: options.use_filename,
          unique_filename: options.unique_filename,
        },
        (error, result: UploadApiResponse | undefined) => {
          if (error || !result) {
            this.logger.error(`Lỗi tải lên Cloudinary: ${error?.message || 'Không có kết quả trả về'}`);
            return reject(new BadRequestException(`Tải lên Cloudinary thất bại: ${error?.message || 'Lỗi không xác định'}`));
          }

          resolve({
            url: result.url,
            secure_url: result.secure_url,
            public_id: result.public_id,
            format: result.format,
            resource_type: result.resource_type,
            bytes: result.bytes,
            width: result.width,
            height: result.height,
            duration: result.duration,
          });
        },
      );

      Readable.from(buffer).pipe(uploadStream);
    });
  }

  /**
   * Tải ảnh/video base64 hoặc Data URI lên Cloudinary
   */
  async uploadBase64(
    base64Str: string,
    options: UploadOptions = {},
  ): Promise<CloudinaryUploadResult> {
    if (!this.configured) {
      throw new InternalServerErrorException('Dịch vụ lưu trữ Cloudinary chưa được cấu hình');
    }
    if (!base64Str || !base64Str.trim()) {
      throw new BadRequestException('Dữ liệu tải lên rỗng');
    }

    // Phòng thủ theo chiều sâu chống SSRF: Chỉ chấp nhận Data URI hợp lệ, chặn truyền URL từ xa vào SDK
    if (!base64Str.startsWith('data:image/') && !base64Str.startsWith('data:video/')) {
      throw new BadRequestException('Dữ liệu tải lên phải là Data URI hợp lệ (data:image/... hoặc data:video/...)');
    }

    const folder = options.folder ?? 'chatapp/avatars';
    const resourceType = options.resource_type ?? 'auto';

    try {
      const result = await cloudinary.uploader.upload(base64Str, {
        folder,
        resource_type: resourceType,
      });

      return {
        url: result.url,
        secure_url: result.secure_url,
        public_id: result.public_id,
        format: result.format,
        resource_type: result.resource_type,
        bytes: result.bytes,
        width: result.width,
        height: result.height,
        duration: result.duration,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Lỗi tải base64 lên Cloudinary: ${msg}`);
      throw new BadRequestException(`Tải lên Cloudinary thất bại: ${msg}`);
    }
  }

  /**
   * Xóa tệp khỏi Cloudinary bằng public_id
   */
  async deleteFile(
    publicId: string,
    resourceType: 'image' | 'video' | 'raw' = 'image',
  ): Promise<{ result: string }> {
    if (!this.configured) return { result: 'not_configured' };
    try {
      const result = (await cloudinary.uploader.destroy(publicId, {
        resource_type: resourceType,
      })) as { result: string };
      return result;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Không thể xóa tệp Cloudinary ${publicId}: ${msg}`);
      return { result: 'error' };
    }
  }
}
