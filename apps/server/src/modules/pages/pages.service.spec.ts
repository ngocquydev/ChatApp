import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PagesService } from './pages.service.js';
import { Types } from 'mongoose';
import { ConflictException } from '@nestjs/common';
import { model } from 'mongoose';
import { PageSchema } from './schemas/page.schema.js';
import { UpdatePageDto } from './dto/page.dto.js';
import { validate } from 'class-validator';

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

  it('updates page contact details only for an administrator', async () => {
    const adminId = new Types.ObjectId();
    const pageId = new Types.ObjectId().toString();
    const page = {
      creatorId: adminId, adminIds: [], isDeleted: false,
      phone: '', email: '', bio: '',
      save: vi.fn().mockResolvedValue(undefined),
    };
    mockPageModel.findById.mockReturnValue({ exec: vi.fn().mockResolvedValue(page) });

    await service.updatePage(pageId, adminId.toString(), {
      phone: ' +84 912 345 678 ',
      email: ' Contact@Example.com ',
      bio: 'Giới thiệu mới',
    });

    expect(page.phone).toBe('+84 912 345 678');
    expect(page.email).toBe('contact@example.com');
    expect(page.bio).toBe('Giới thiệu mới');
    expect(page.save).toHaveBeenCalledOnce();
    await expect(service.updatePage(pageId, new Types.ObjectId().toString(), { phone: '1234567890' })).rejects.toThrow('Bạn không có quyền');
  });

  it('rejects invalid public contact information', async () => {
    const dto = Object.assign(new UpdatePageDto(), { phone: 'call me', email: 'bad-address' });
    const errors = await validate(dto);
    expect(errors.map((error) => error.property)).toEqual(expect.arrayContaining(['phone', 'email']));
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

  it('does not expose follower and administrator IDs in page JSON', () => {
    const PageModel = model('PagePublicResponseTest', PageSchema);
    const page = new PageModel({
      name: 'Trang công khai', slug: 'trang-cong-khai',
      creatorId: new Types.ObjectId(),
      followers: [new Types.ObjectId()],
      adminIds: [new Types.ObjectId()],
      moderatorIds: [new Types.ObjectId()],
      followerCount: 1,
    });
    const json = page.toJSON();
    expect(json).not.toHaveProperty('followers');
    expect(json).not.toHaveProperty('adminIds');
    expect(json).not.toHaveProperty('moderatorIds');
    expect(json).toHaveProperty('followerCount', 1);
  });

  it('sets follow state without toggling it on a repeated request', async () => {
    const pageId = new Types.ObjectId().toString();
    const userId = new Types.ObjectId().toString();
    const execUpdate = vi.fn()
      .mockResolvedValueOnce({ followerCount: 1 })
      .mockResolvedValueOnce(null);
    mockPageModel.findOneAndUpdate = vi.fn().mockReturnValue({ exec: execUpdate });
    mockPageModel.findById.mockReturnValue({ exec: vi.fn().mockResolvedValue({ followerCount: 1, isDeleted: false }) });

    const first = await service.setFollowPage(pageId, userId, true);
    const repeated = await service.setFollowPage(pageId, userId, true);

    expect(first).toEqual({ isFollowing: true, followerCount: 1 });
    expect(repeated).toEqual(first);
    expect(mockPageModel.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: new Types.ObjectId(pageId), isDeleted: false, followers: { $ne: new Types.ObjectId(userId) } },
      { $addToSet: { followers: new Types.ObjectId(userId) }, $inc: { followerCount: 1 } },
      { new: true },
    );
  });

  it('lists followed pages separately from pages the user administers', async () => {
    const userId = new Types.ObjectId().toString();
    const exec = vi.fn().mockResolvedValue([]);
    const sort = vi.fn().mockReturnValue({ exec });
    mockPageModel.find.mockReturnValue({ sort });

    await service.getFollowedPages(userId);

    expect(mockPageModel.find).toHaveBeenCalledWith({
      followers: new Types.ObjectId(userId),
      creatorId: { $ne: new Types.ObjectId(userId) },
      adminIds: { $ne: new Types.ObjectId(userId) },
      isDeleted: false,
    });
  });

  it('recognizes an administrator from populated user references', async () => {
    const adminId = new Types.ObjectId().toString();
    const page = {
      creatorId: { _id: new Types.ObjectId() },
      adminIds: [{ _id: new Types.ObjectId(adminId) }],
      followers: [],
    };
    const exec = vi.fn().mockResolvedValue(page);
    const populate = vi.fn();
    populate.mockReturnValue({ populate, exec });
    mockPageModel.findOne.mockReturnValue({ populate });

    const result = await service.getPageBySlug('trang-test', adminId);

    expect(result.isAdmin).toBe(true);
    expect(result.isFollowing).toBe(false);
  });

  it('filters explore results by escaped keyword and exact category with bounded pagination', async () => {
    const exec = vi.fn().mockResolvedValue([]);
    const limit = vi.fn().mockReturnValue({ exec });
    const skip = vi.fn().mockReturnValue({ limit });
    const sort = vi.fn().mockReturnValue({ skip });
    mockPageModel.find.mockReturnValue({ sort });

    await service.explorePages('  C++  ', 'Công nghệ', 20, 20);

    expect(mockPageModel.find).toHaveBeenCalledWith({
      isDeleted: false,
      category: 'Công nghệ',
      $or: [
        { name: { $regex: 'C\\+\\+', $options: 'i' } },
        { bio: { $regex: 'C\\+\\+', $options: 'i' } },
      ],
    });
    expect(skip).toHaveBeenCalledWith(20);
    expect(limit).toHaveBeenCalledWith(20);
  });

  it('lists only categories used by active pages', async () => {
    const exec = vi.fn().mockResolvedValue(['Công nghệ', 'Cộng đồng']);
    mockPageModel.distinct = vi.fn().mockReturnValue({ exec });

    await expect(service.getExploreCategories()).resolves.toEqual(['Công nghệ', 'Cộng đồng']);
    expect(mockPageModel.distinct).toHaveBeenCalledWith('category', { isDeleted: false });
  });
});

