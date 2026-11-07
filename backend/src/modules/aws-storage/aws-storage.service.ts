import { Injectable, Logger, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, DeleteObjectCommand, CopyObjectCommand } from '@aws-sdk/client-s3';
import * as path from 'node:path';
import * as crypto from 'node:crypto';
import type { S3UploadOptions, S3UploadResult } from './aws-storage.interface.js';

@Injectable()
export class AwsStorageService {
  private readonly logger = new Logger(AwsStorageService.name);
  private readonly s3Client: S3Client;
  private readonly bucketName: string;
  private readonly region: string;
  private readonly configured: boolean;

  constructor(private readonly configService: ConfigService) {
    this.region = this.configService.get<string>('AWS_REGION') || 'ap-southeast-2';
    this.bucketName =
      this.configService.get<string>('AWS_S3_BUCKET_NAME') ||
      'chatapp-media-703002395048-ap-southeast-2';

    try {
      this.s3Client = new S3Client({
        region: this.region,
      });
      this.configured = Boolean(this.bucketName && this.region);
      if (this.configured) {
        this.logger.log(`AWS S3 Storage đã được cấu hình với bucket: ${this.bucketName} tại vùng: ${this.region}`);
      }
    } catch (err: unknown) {
      this.configured = false;
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Không thể khởi tạo S3Client: ${message}`);
    }
  }

  isConfigured(): boolean {
    return this.configured;
  }

  getBucketName(): string {
    return this.bucketName;
  }

  getRegion(): string {
    return this.region;
  }

  /**
   * Tải bộ đệm tệp (Buffer) lên AWS S3
   */
  async uploadBuffer(
    buffer: Buffer,
    options: S3UploadOptions = {},
  ): Promise<S3UploadResult> {
    if (!this.configured) {
      throw new InternalServerErrorException('Dịch vụ lưu trữ AWS S3 chưa được cấu hình');
    }
    if (!buffer || buffer.length === 0) {
      throw new BadRequestException('Dữ liệu tệp tải lên không hợp lệ hoặc rỗng');
    }

    const folder = options.folder ? `${options.folder.replace(/^\/+|\/+$/g, '')}/` : 'posts/';
    const ext = options.filename ? path.extname(options.filename).toLowerCase() || '.jpg' : '.jpg';
    const uniqueId = crypto.randomUUID();
    const key = `${folder}${uniqueId}${ext}`;

    const contentType = options.mimetype || 'image/jpeg';

    try {
      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.bucketName,
          Key: key,
          Body: buffer,
          ContentType: contentType,
          Metadata: options.metadata,
        }),
      );

      const url = `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${key}`;

      return {
        url,
        bucket: this.bucketName,
        key,
        contentType,
        bytes: buffer.length,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Lỗi tải tệp lên AWS S3: ${message}`);
      throw new InternalServerErrorException(`Không thể tải tệp lên AWS S3: ${message}`);
    }
  }

  /**
   * Xóa đối tượng trên S3 theo key
   */
  async deleteObject(key: string): Promise<void> {
    if (!this.configured || !key) return;

    try {
      await this.s3Client.send(
        new DeleteObjectCommand({
          Bucket: this.bucketName,
          Key: key,
        }),
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Lỗi khi xóa đối tượng ${key} trên S3: ${message}`);
    }
  }

  /**
   * Di chuyển đối tượng từ key nguồn sang key đích trên S3
   */
  async moveObject(sourceKey: string, destKey: string): Promise<string> {
    if (!this.configured) {
      throw new InternalServerErrorException('Dịch vụ lưu trữ AWS S3 chưa được cấu hình');
    }

    try {
      // Sao chép sang vị trí mới
      await this.s3Client.send(
        new CopyObjectCommand({
          Bucket: this.bucketName,
          CopySource: `${this.bucketName}/${sourceKey}`,
          Key: destKey,
        }),
      );

      // Xóa vị trí cũ
      await this.deleteObject(sourceKey);

      return `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${destKey}`;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Lỗi di chuyển đối tượng trên S3 (${sourceKey} -> ${destKey}): ${message}`);
      throw new InternalServerErrorException(`Không thể di chuyển đối tượng trên S3: ${message}`);
    }
  }
}

