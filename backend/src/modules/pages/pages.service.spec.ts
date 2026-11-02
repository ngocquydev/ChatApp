import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PagesService } from './pages.service.js';
import { Types } from 'mongoose';
import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';

describe('PagesService', () => {
  let service: PagesService;
  let mockPageModel: any;

  beforeEach(() => {
    mockPageModel = {
      create: vi.fn(),
      findOne: vi.fn(),
      findById: vi.fn(),
      find: vi.fn(),
    };
    service = new PagesService(mockPageModel);
  });

  it('should create a page successfully', async () => {
    const creatorId = new Types.ObjectId().toString();
    mockPageModel.findOne.mockReturnValue({
      exec: vi.fn().mockResolvedValue(null),
    });

    const mockCreated = {
      _id: new Types.ObjectId(),
      name: 'Trang Test',
      slug: 'trang-test',
      creatorId: new Types.ObjectId(creatorId),
      followers: [new Types.ObjectId(creatorId)],
      followerCount: 1,
    };
    mockPageModel.create.mockResolvedValue(mockCreated);

    const result = await service.createPage(creatorId, {
      name: 'Trang Test',
      slug: 'trang-test',
      bio: 'Tiểu sử trang',
    });

    expect(result).toBeDefined();
    expect(result.slug).toBe('trang-test');
    expect(mockPageModel.create).toHaveBeenCalled();
  });

  it('should throw ConflictException if slug already exists', async () => {
    mockPageModel.findOne.mockReturnValue({
      exec: vi.fn().mockResolvedValue({ _id: new Types.ObjectId() }),
    });

    await expect(
      service.createPage('123456789012345678901234', {
        name: 'Trang Test',
        slug: 'trang-test',
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('should toggle follow page', async () => {
    const pageId = new Types.ObjectId().toString();
    const userId = new Types.ObjectId().toString();

    const mockPage = {
      _id: new Types.ObjectId(pageId),
      followers: [],
      followerCount: 0,
      isDeleted: false,
      save: vi.fn().mockResolvedValue(true),
    };

    mockPageModel.findById.mockReturnValue({
      exec: vi.fn().mockResolvedValue(mockPage),
    });

    const res = await service.toggleFollowPage(pageId, userId);
    expect(res.isFollowing).toBe(true);
    expect(res.followerCount).toBe(1);
    expect(mockPage.save).toHaveBeenCalled();
  });
});

