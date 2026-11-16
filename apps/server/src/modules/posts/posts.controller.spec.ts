import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ServiceUnavailableException } from '@nestjs/common';
import { PostsController } from './posts.controller.js';
import { PostsService } from './posts.service.js';
import type { CloudinaryService } from '../cloudinary/cloudinary.service.js';
import { isSupportedPostVideo, optimizePostVideo } from './video-optimization.util.js';

vi.mock('./video-optimization.util.js', () => ({ isSupportedPostVideo: vi.fn().mockReturnValue(false), optimizePostVideo: vi.fn() }));

describe('PostsController - Image Upload', () => {
  let controller: PostsController;
  let postsService: PostsService;
  let uploadSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.mocked(isSupportedPostVideo).mockReset().mockReturnValue(false);
    vi.mocked(optimizePostVideo).mockReset();
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

  it('optimizes post video before uploading it as MP4', async () => {
    vi.mocked(optimizePostVideo).mockResolvedValue(Buffer.from('optimized video'));
    uploadSpy.mockResolvedValueOnce({ secure_url: 'https://res.cloudinary.com/test/video/upload/video.mp4', resource_type: 'video' });
    const result = await controller.uploadImage({ buffer: Buffer.from('source'), mimetype: 'video/webm', originalname: 'video.webm' });
    expect(optimizePostVideo).toHaveBeenCalledWith(Buffer.from('source'));
    expect(uploadSpy).toHaveBeenCalledWith(Buffer.from('optimized video'), expect.objectContaining({ resource_type: 'video', filename: 'video.mp4' }));
    expect(result.resource_type).toBe('video');
  });

  it('does not upload the original when video encoding fails', async () => {
    vi.mocked(optimizePostVideo).mockRejectedValueOnce(new Error('encoding failed'));
    await expect(controller.uploadImage({ buffer: Buffer.from('source'), mimetype: 'video/mp4' })).rejects.toThrow('encoding failed');
    expect(uploadSpy).not.toHaveBeenCalled();
  });

  it('optimizes recognized video even if its MIME type is generic', async () => {
    vi.mocked(isSupportedPostVideo).mockReturnValueOnce(true);
    vi.mocked(optimizePostVideo).mockResolvedValueOnce(Buffer.from('optimized video'));
    await controller.uploadImage({ buffer: Buffer.from('source'), mimetype: 'application/octet-stream' });
    expect(uploadSpy).toHaveBeenCalledWith(Buffer.from('optimized video'), expect.objectContaining({ resource_type: 'video' }));
  });

  it('keeps declared images on the existing image upload path', async () => {
    const source = Buffer.from('image');
    await controller.uploadImage({ buffer: source, mimetype: 'image/avif', originalname: 'photo.avif' });
    expect(isSupportedPostVideo).not.toHaveBeenCalled();
    expect(optimizePostVideo).not.toHaveBeenCalled();
    expect(uploadSpy).toHaveBeenCalledWith(source, expect.objectContaining({ resource_type: 'auto', filename: 'photo.avif' }));
  });

  it('reports unavailable storage for video when Cloudinary is not configured', async () => {
    const withoutCloudinary = new PostsController(postsService);
    await expect(withoutCloudinary.uploadImage({ buffer: Buffer.from('source'), mimetype: 'video/mp4' })).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
