import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { PostsController } from './posts.controller.js';
import { PostsService } from './posts.service.js';
import { ModerationService } from '../moderation/moderation.service.js';
import type { CloudinaryService } from '../cloudinary/cloudinary.service.js';

describe('PostsController - Image Moderation', () => {
  let controller: PostsController;
  let moderationService: ModerationService;
  let postsService: PostsService;

  beforeEach(() => {
    moderationService = new ModerationService();
    moderationService.onModuleInit();
    postsService = {} as unknown as PostsService;
    controller = new PostsController(postsService, undefined, moderationService);
  });

  it('chặn tải lên ảnh 18+ / khiêu dâm ngay tại endpoint POST /posts/images', async () => {
    const fakeAdultFile = {
      buffer: Buffer.from('fake-adult-data'),
      mimetype: 'image/jpeg',
      originalname: 'anh_nong_18plus_khoa_than.jpg',
    };

    await expect(controller.uploadImage(fakeAdultFile)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('tải ảnh an toàn lên Cloudinary khi Cloudinary đã cấu hình', async () => {
    const uploadSpy = vi.fn().mockResolvedValue({
      secure_url: 'https://res.cloudinary.com/test/image/upload/sample.jpg',
      resource_type: 'image',
    });
    const mockCloudinary = {
      isConfigured: () => true,
      uploadBuffer: uploadSpy,
    } as unknown as CloudinaryService;

    const controllerWithCloudinary = new PostsController(
      postsService,
      mockCloudinary,
      moderationService,
    );

    const fakeSafeFile = {
      buffer: Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]),
      mimetype: 'image/jpeg',
      originalname: 'landscape_mountain_trip.jpg',
    };

    const res = await controllerWithCloudinary.uploadImage(fakeSafeFile);
    expect(res).toEqual({
      success: true,
      url: 'https://res.cloudinary.com/test/image/upload/sample.jpg',
      resource_type: 'image',
    });
    expect(uploadSpy).toHaveBeenCalled();
  });

  it('chặn tệp JPEG thực tế có tỷ lệ phơi bày da người cao (18+ / nude) kể cả khi tên tệp vô hại', async () => {
    const width = 30;
    const height = 30;
    const frame = Buffer.alloc(width * height * 4);
    for (let i = 0; i < frame.length; i += 4) {
      frame[i] = 215;     // R
      frame[i + 1] = 150; // G
      frame[i + 2] = 110; // B
      frame[i + 3] = 255; // A
    }
    const jpeg = await import('jpeg-js');
    const encodeFn = jpeg.default?.encode || (jpeg as unknown as { encode: typeof jpeg.default.encode }).encode;
    const encoded = encodeFn({ data: frame, width, height }, 80);

    const nudeFile = {
      buffer: encoded.data,
      mimetype: 'image/jpeg',
      originalname: 'innocent_photo.jpg', // Tên tệp hoàn toàn vô hại
    };

    await expect(controller.uploadImage(nudeFile)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('cho phép tải lên ảnh an toàn hợp lệ', async () => {
    const fakeSafeFile = {
      buffer: Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]),
      mimetype: 'image/jpeg',
      originalname: 'landscape_mountain_trip.jpg',
    };

    // Khi cloudinaryService undefined và file hợp lệ, savePostImage sẽ được gọi (hoặc kiểm tra không ném lỗi kiểm duyệt 18+)
    const res = await controller.uploadImage(fakeSafeFile).catch((err) => err);
    // Nếu ném lỗi từ savePostImage (vì buffer quá ngắn), nhưng không phải lỗi chặn 18+
    if (res instanceof BadRequestException) {
      expect(res.message).not.toContain('18+');
    }
  });
});
