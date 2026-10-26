import { ConfigService } from '@nestjs/config';
import { BadRequestException } from '@nestjs/common';
import { beforeEach, describe, expect, it } from 'vitest';
import { CloudinaryService } from './cloudinary.service.js';

describe('CloudinaryService', () => {
  let service: CloudinaryService;
  let configService: ConfigService;

  beforeEach(() => {
    configService = new ConfigService({
      CLOUDINARY_CLOUD_NAME: 'test-cloud',
      CLOUDINARY_API_KEY: 'test-key',
      CLOUDINARY_API_SECRET: 'test-secret',
    });
    service = new CloudinaryService(configService);
  });

  it('xác định đúng trạng thái cấu hình', () => {
    expect(service.isConfigured()).toBe(true);

    const emptyConfig = new ConfigService({});
    const unconfiguredService = new CloudinaryService(emptyConfig);
    expect(unconfiguredService.isConfigured()).toBe(false);
  });

  it('báo lỗi khi tải lên buffer rỗng', async () => {
    await expect(service.uploadBuffer(Buffer.alloc(0))).rejects.toThrow(BadRequestException);
  });

  it('báo lỗi khi tải lên base64 rỗng', async () => {
    await expect(service.uploadBase64('')).rejects.toThrow(BadRequestException);
  });
});
