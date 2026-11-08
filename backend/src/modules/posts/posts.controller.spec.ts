import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PostsController } from './posts.controller.js';
import { PostsService } from './posts.service.js';
import type { CloudinaryService } from '../cloudinary/cloudinary.service.js';

describe('PostsController - Image Upload', () => {
  let controller: PostsController;
  let postsService: PostsService;
  let uploadSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    postsService = {} as unknown as PostsService;
    uploadSpy = vi.fn().mockResolvedValue({
      secure_url: 'https://res.cloudinary.com/test/image/upload/sample.jpg',
      resource_type: 'image',
    });
    const mockCloudinary = {
      isConfigured: () => true,
      uploadBuffer: uploadSpy,
    } as unknown as CloudinaryService;
    controller = new PostsController(postsService, mockCloudinary);
  });

  it('tải ảnh lên Cloudinary khi Cloudinary đã cấu hình', async () => {
    const fakeSafeFile = {
      buffer: Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]),
      mimetype: 'image/jpeg',
      originalname: 'landscape_mountain_trip.jpg',
    };

    const res = await controller.uploadImage(fakeSafeFile);
    expect(res).toEqual({
      success: true,
      url: 'https://res.cloudinary.com/test/image/upload/sample.jpg',
      resource_type: 'image',
    });
    expect(uploadSpy).toHaveBeenCalled();
  });
});
