import { BadRequestException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UploadController } from './upload.controller.js';
import { CloudinaryService } from '../cloudinary/cloudinary.service.js';

describe('UploadController', () => {
  let controller: UploadController;
  let cloudinaryService: Partial<CloudinaryService>;

  beforeEach(() => {
    cloudinaryService = {
      uploadBuffer: vi.fn().mockResolvedValue({
        url: 'http://res.cloudinary.com/test/image/upload/v1/test.jpg',
        secure_url: 'https://res.cloudinary.com/test/image/upload/v1/test.jpg',
        public_id: 'chatapp/media/test',
        resource_type: 'image',
        bytes: 1024,
      }),
    };
    controller = new UploadController(cloudinaryService as CloudinaryService);
  });

  it('báo lỗi khi không có tệp nào được gửi lên', async () => {
    await expect(controller.uploadMedia(undefined)).rejects.toThrow(BadRequestException);
  });

  it('báo lỗi khi định dạng tệp không được hỗ trợ', async () => {
    await expect(
      controller.uploadMedia({
        buffer: Buffer.from('test'),
        mimetype: 'application/pdf',
        originalname: 'doc.pdf',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('tải lên ảnh thành công và trả về secure_url', async () => {
    const res = await controller.uploadMedia({
      buffer: Buffer.from('fake-image-bytes'),
      mimetype: 'image/jpeg',
      originalname: 'photo.jpg',
    });
    expect(res.success).toBe(true);
    expect(res.url).toBe('https://res.cloudinary.com/test/image/upload/v1/test.jpg');
    expect(cloudinaryService.uploadBuffer).toHaveBeenCalledWith(
      expect.any(Buffer),
      expect.objectContaining({ folder: 'chatapp/media' }),
    );
  });
});
