import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConfigService } from '@nestjs/config';
import { AwsRekognitionService } from './aws-rekognition.service.js';

describe('AwsRekognitionService', () => {
  let service: AwsRekognitionService;
  let mockConfigService: Partial<ConfigService>;
  let mockSend: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockConfigService = {
      get: vi.fn((key: string) => {
        if (key === 'AWS_REGION') return 'ap-southeast-2';
        return undefined;
      }),
    };

    mockSend = vi.fn();

    service = new AwsRekognitionService(mockConfigService as ConfigService);
    (service as unknown as { rekognitionClient: { send: typeof mockSend } }).rekognitionClient = {
      send: mockSend,
    };
  });

  it('phải được khởi tạo và cấu hình đúng vùng ap-southeast-2', () => {
    expect(service).toBeDefined();
    expect(service.isConfigured()).toBe(true);
  });

  it('detectModeration: trả về ALLOW khi ảnh không có nhãn vi phạm', async () => {
    mockSend.mockResolvedValueOnce({
      ModerationLabels: [],
    });

    const buffer = Buffer.from('safe-image');
    const result = await service.detectModeration(buffer);

    expect(result.action).toBe('ALLOW');
    expect(result.isUnsafe).toBe(false);
    expect(result.adultScore).toBe(0);
  });

  it('detectModeration: trả về BLOCK khi phát hiện nhãn Explicit Nudity hoặc Nipple/Genitalia', async () => {
    mockSend.mockResolvedValueOnce({
      ModerationLabels: [
        {
          Name: 'Explicit Nudity',
          ParentName: 'Explicit',
          Confidence: 94.5,
        },
        {
          Name: 'Exposed Female Nipple',
          ParentName: 'Explicit Nudity',
          Confidence: 94.5,
        },
      ],
    });

    const buffer = Buffer.from('explicit-image');
    const result = await service.detectModeration(buffer);

    expect(result.action).toBe('BLOCK');
    expect(result.isUnsafe).toBe(true);
    expect(result.adultScore).toBeGreaterThanOrEqual(0.9);
    expect(result.reason).toContain('Hình ảnh bị Amazon Rekognition chặn');
    expect(result.labels.length).toBe(2);
  });

  it('detectModeration: xử lý an toàn khi Rekognition trả lỗi mạng mà không crash app', async () => {
    mockSend.mockRejectedValueOnce(new Error('Network error calling Rekognition'));

    const buffer = Buffer.from('test-image');
    const result = await service.detectModeration(buffer);

    expect(result.action).toBe('ALLOW');
    expect(result.isUnsafe).toBe(false);
  });

  it('detectModeration: tự động trích xuất frame từ GIF động và chặn nếu phát hiện nhãn 18+', async () => {
    mockSend.mockResolvedValueOnce({
      ModerationLabels: [
        {
          Name: 'Exposed Female Genitalia',
          ParentName: 'Explicit Nudity',
          Confidence: 96.0,
        },
      ],
    });

    // Tạo GIF hợp lệ 2x2
    const gifHeader = Buffer.from([
      0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x02, 0x00, 0x02, 0x00, 0x80, 0x00, 0x00, 0x00, 0x00,
      0x00, 0xff, 0xff, 0xff, 0x2c, 0x00, 0x00, 0x00, 0x00, 0x02, 0x00, 0x02, 0x00, 0x00, 0x02,
      0x02, 0x44, 0x01, 0x00, 0x3b,
    ]);

    const result = await service.detectModeration(gifHeader);

    expect(result.action).toBe('BLOCK');
    expect(result.isUnsafe).toBe(true);
    expect(result.adultScore).toBeGreaterThanOrEqual(0.9);
  });
});

