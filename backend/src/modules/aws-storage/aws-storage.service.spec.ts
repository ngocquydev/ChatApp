import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConfigService } from '@nestjs/config';
import { AwsStorageService } from './aws-storage.service.js';

describe('AwsStorageService', () => {
  let service: AwsStorageService;
  let mockConfigService: Partial<ConfigService>;
  let mockSend: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockConfigService = {
      get: vi.fn((key: string) => {
        if (key === 'AWS_REGION') return 'ap-southeast-2';
        if (key === 'AWS_S3_BUCKET_NAME') return 'test-bucket';
        return undefined;
      }),
    };

    mockSend = vi.fn().mockResolvedValue({});

    service = new AwsStorageService(mockConfigService as ConfigService);
    // Gán mock client send để không gọi mạng thật trong unit test
    (service as unknown as { s3Client: { send: typeof mockSend } }).s3Client = {
      send: mockSend,
    };
  });

  it('phải được khởi tạo và nhận diện đúng bucket và region', () => {
    expect(service).toBeDefined();
    expect(service.isConfigured()).toBe(true);
    expect(service.getBucketName()).toBe('test-bucket');
    expect(service.getRegion()).toBe('ap-southeast-2');
  });

  it('uploadBuffer: tải buffer thành công và trả về URL S3 chuẩn', async () => {
    const buffer = Buffer.from('fake-image-bytes');
    const result = await service.uploadBuffer(buffer, {
      folder: 'posts',
      filename: 'sample.png',
      mimetype: 'image/png',
    });

    expect(result).toBeDefined();
    expect(result.bucket).toBe('test-bucket');
    expect(result.url).toContain('https://test-bucket.s3.ap-southeast-2.amazonaws.com/posts/');
    expect(result.url).toMatch(/\.png$/);
    expect(result.contentType).toBe('image/png');
    expect(result.bytes).toBe(buffer.length);
    expect(mockSend).toHaveBeenCalledTimes(1);
  });

  it('uploadBuffer: ném lỗi BadRequestException nếu buffer rỗng', async () => {
    const emptyBuffer = Buffer.alloc(0);
    await expect(service.uploadBuffer(emptyBuffer)).rejects.toThrow('Dữ liệu tệp tải lên không hợp lệ');
  });

  it('deleteObject: gọi lệnh DeleteObjectCommand thành công', async () => {
    await service.deleteObject('posts/sample.png');
    expect(mockSend).toHaveBeenCalledTimes(1);
  });

  it('moveObject: gọi CopyObjectCommand sau đó xóa đối tượng nguồn', async () => {
    const newUrl = await service.moveObject('quarantine/temp.jpg', 'posts/final.jpg');
    expect(mockSend).toHaveBeenCalledTimes(2); // 1 copy + 1 delete
    expect(newUrl).toBe('https://test-bucket.s3.ap-southeast-2.amazonaws.com/posts/final.jpg');
  });
});

