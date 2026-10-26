import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { PostsService } from './posts.service.js';
import { detectImageExt, savePostImage } from './post-image.util.js';
import { POST_IMAGE_PATH_REGEX } from './dto/posts.dto.js';

/** Query mock có thể chuỗi hóa: find().sort().limit().lean().exec() → result */
const q = (result: unknown) => {
  const chain: Record<string, unknown> = {};
  for (const m of ['select', 'sort', 'limit', 'lean']) chain[m] = vi.fn(() => chain);
  chain.exec = vi.fn().mockResolvedValue(result);
  return chain;
};

const oid = () => new Types.ObjectId();

describe('PostsService – quyền riêng tư', () => {
  it('privaciesFor: bản thân thấy tất cả, bạn bè thấy công khai + bạn bè, người lạ chỉ thấy công khai', () => {
    expect(PostsService.privaciesFor('self')).toEqual(['public', 'friends', 'only_me']);
    expect(PostsService.privaciesFor('friends')).toEqual(['public', 'friends']);
    expect(PostsService.privaciesFor('none')).toEqual(['public']);
  });

  it('canView chặn bài only_me với người khác và bài friends với người lạ', () => {
    expect(PostsService.canView('only_me', 'friends')).toBe(false);
    expect(PostsService.canView('only_me', 'none')).toBe(false);
    expect(PostsService.canView('friends', 'none')).toBe(false);
    expect(PostsService.canView('friends', 'friends')).toBe(true);
    expect(PostsService.canView('only_me', 'self')).toBe(true);
    expect(PostsService.canView('public', 'none')).toBe(true);
  });
});

describe('PostsService', () => {
  let service: PostsService;
  let postModel: {
    find: ReturnType<typeof vi.fn>;
    findOne: ReturnType<typeof vi.fn>;
    findById: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    updateOne: ReturnType<typeof vi.fn>;
  };
  let likeModel: {
    find: ReturnType<typeof vi.fn>;
    deleteOne: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
  };
  let commentModel: {
    find: ReturnType<typeof vi.fn>;
    findOne: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    deleteOne: ReturnType<typeof vi.fn>;
  };
  let friendshipModel: {
    find: ReturnType<typeof vi.fn>;
    exists: ReturnType<typeof vi.fn>;
  };
  let usersService: {
    findByIds: ReturnType<typeof vi.fn>;
  };

  const me = oid().toString();
  const other = oid().toString();

  beforeEach(() => {
    postModel = {
      find: vi.fn(),
      findOne: vi.fn(),
      findById: vi.fn(),
      create: vi.fn(),
      updateOne: vi.fn(() => q({})),
    };
    likeModel = { find: vi.fn(() => q([])), deleteOne: vi.fn(), create: vi.fn() };
    commentModel = { find: vi.fn(), findOne: vi.fn(), create: vi.fn(), deleteOne: vi.fn() };
    friendshipModel = { find: vi.fn(() => q([])), exists: vi.fn(() => q(null)) };
    usersService = { findByIds: vi.fn().mockResolvedValue([]) };
    service = new PostsService(
      postModel as unknown as never,
      likeModel as unknown as never,
      commentModel as unknown as never,
      friendshipModel as unknown as never,
      usersService as unknown as never,
    );
  });

  describe('createPost', () => {
    it('từ chối bài rỗng (không chữ, không ảnh)', async () => {
      await expect(service.createPost(me, { content: '   ' })).rejects.toThrow(
        BadRequestException,
      );
      expect(postModel.create).not.toHaveBeenCalled();
    });
  });

  describe('deletePost', () => {
    it('404 khi bài không tồn tại', async () => {
      postModel.findOne.mockReturnValue(q(null));
      await expect(service.deletePost(me, oid().toString())).rejects.toThrow(NotFoundException);
    });

    it('403 khi xóa bài của người khác', async () => {
      postModel.findOne.mockReturnValue(
        q({ _id: oid(), authorId: new Types.ObjectId(other), sharedPostId: null }),
      );
      await expect(service.deletePost(me, oid().toString())).rejects.toThrow(ForbiddenException);
      expect(postModel.updateOne).not.toHaveBeenCalled();
    });

    it('xóa mềm bài của chính mình và giảm shareCount của bài gốc nếu là bài chia sẻ', async () => {
      const original = oid();
      const postId = oid();
      postModel.findOne.mockReturnValue(
        q({ _id: postId, authorId: new Types.ObjectId(me), sharedPostId: original }),
      );
      await service.deletePost(me, postId.toString());
      expect(postModel.updateOne).toHaveBeenNthCalledWith(
        1,
        { _id: postId },
        { $set: { isDeleted: true } },
      );
      expect(postModel.updateOne).toHaveBeenNthCalledWith(
        2,
        { _id: original, shareCount: { $gt: 0 } },
        { $inc: { shareCount: -1 } },
      );
    });
  });

  describe('xem bài viết', () => {
    it('trả 404 (không lộ sự tồn tại) khi bài only_me của người khác', async () => {
      postModel.findOne.mockReturnValue(
        q({ _id: oid(), authorId: new Types.ObjectId(other), privacy: 'only_me' }),
      );
      await expect(service.getPost(me, oid().toString())).rejects.toThrow(NotFoundException);
    });

    it('trả 400 khi mã bài viết sai định dạng', async () => {
      await expect(service.getPost(me, 'abc')).rejects.toThrow(BadRequestException);
    });
  });

  describe('sharePost', () => {
    it('403 khi chia sẻ lại bài không công khai của người khác', async () => {
      postModel.findOne.mockReturnValue(
        q({
          _id: oid(),
          authorId: new Types.ObjectId(other),
          privacy: 'friends',
          sharedPostId: null,
        }),
      );
      // đang là bạn bè nên xem được, nhưng vẫn không được chia sẻ lại
      friendshipModel.exists.mockReturnValue(q({ _id: oid() }));
      await expect(service.sharePost(me, oid().toString(), {})).rejects.toThrow(
        ForbiddenException,
      );
      expect(postModel.create).not.toHaveBeenCalled();
    });
  });

  describe('bình luận', () => {
    it('từ chối bình luận rỗng', async () => {
      await expect(service.addComment(me, oid().toString(), '   ')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('chỉ tác giả bình luận hoặc chủ bài mới được xóa bình luận', async () => {
      const postId = oid();
      const stranger = oid().toString();
      postModel.findOne.mockReturnValue(
        q({ _id: postId, authorId: new Types.ObjectId(other), privacy: 'public' }),
      );
      commentModel.findOne.mockReturnValue(
        q({ _id: oid(), postId, authorId: new Types.ObjectId(me) }),
      );
      await expect(
        service.deleteComment(stranger, postId.toString(), oid().toString()),
      ).rejects.toThrow(ForbiddenException);
      expect(commentModel.deleteOne).not.toHaveBeenCalled();
    });
  });

  describe('toggleLike', () => {
    const publicPost = () => ({
      _id: oid(),
      authorId: new Types.ObjectId(other),
      privacy: 'public',
    });

    it('bỏ thích khi đã thích: xóa bản ghi và giảm bộ đếm không xuống dưới 0', async () => {
      const post = publicPost();
      postModel.findOne.mockReturnValue(q(post));
      postModel.findById.mockReturnValue(q({ likeCount: 3 }));
      likeModel.deleteOne.mockReturnValue(q({ deletedCount: 1 }));
      const result = await service.toggleLike(me, post._id.toString());
      expect(result).toEqual({ success: true, liked: false, likeCount: 3 });
      expect(postModel.updateOne).toHaveBeenCalledWith(
        { _id: post._id, likeCount: { $gt: 0 } },
        { $inc: { likeCount: -1 } },
      );
    });

    it('thích mới khi chưa thích: tạo bản ghi và tăng bộ đếm', async () => {
      const post = publicPost();
      postModel.findOne.mockReturnValue(q(post));
      postModel.findById.mockReturnValue(q({ likeCount: 1 }));
      likeModel.deleteOne.mockReturnValue(q({ deletedCount: 0 }));
      likeModel.create.mockResolvedValue({});
      const result = await service.toggleLike(me, post._id.toString());
      expect(result.liked).toBe(true);
      expect(postModel.updateOne).toHaveBeenCalledWith(
        { _id: post._id },
        { $inc: { likeCount: 1 } },
      );
    });

    it('hai lượt thích đồng thời (E11000) không làm hỏng và không tăng đếm hai lần', async () => {
      const post = publicPost();
      postModel.findOne.mockReturnValue(q(post));
      postModel.findById.mockReturnValue(q({ likeCount: 1 }));
      likeModel.deleteOne.mockReturnValue(q({ deletedCount: 0 }));
      likeModel.create.mockRejectedValue({ code: 11000 });
      const result = await service.toggleLike(me, post._id.toString());
      expect(result.liked).toBe(true);
      expect(postModel.updateOne).not.toHaveBeenCalled();
    });
  });

  describe('phân trang bảng tin', () => {
    it('lấy dư 1 bản ghi để biết hasMore và trả nextCursor là id bài cuối của trang', async () => {
      const rows = Array.from({ length: 4 }, () => ({
        _id: oid(),
        authorId: new Types.ObjectId(me),
        content: 'x',
        images: [],
        privacy: 'friends',
        sharedPostId: null,
        likeCount: 0,
        commentCount: 0,
        shareCount: 0,
      }));
      const chain = q(rows);
      postModel.find.mockReturnValue(chain);
      const page = await service.getFeed(me, { limit: 3 });
      expect((chain.limit as unknown as { mock: { calls: unknown[][] } }).mock.calls[0][0]).toBe(4);
      expect(page.items).toHaveLength(3);
      expect(page.hasMore).toBe(true);
      expect(page.nextCursor).toBe(rows[2]._id.toString());
    });

    it('lấy cả bài viết công khai toàn hệ thống và bài bạn bè trên bảng tin', async () => {
      postModel.find.mockClear();
      postModel.find.mockReturnValue(q([]));
      await service.getFeed(me, { limit: 10 });
      expect(postModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          $or: expect.arrayContaining([
            { privacy: 'public' },
            expect.objectContaining({ privacy: 'friends' }),
            expect.objectContaining({ authorId: new Types.ObjectId(me) }),
          ]),
        }),
      );
    });

    it('dùng đúng 1 truy vấn bài + 1 truy vấn thích + 1 truy vấn tác giả (không N+1)', async () => {
      const rows = Array.from({ length: 5 }, () => ({
        _id: oid(),
        authorId: new Types.ObjectId(me),
        content: 'x',
        images: [],
        privacy: 'public',
        sharedPostId: null,
        likeCount: 0,
        commentCount: 0,
        shareCount: 0,
      }));
      postModel.find.mockReturnValue(q(rows));
      await service.getUserPosts(me, me, { limit: 10 });
      expect(postModel.find).toHaveBeenCalledTimes(1);
      expect(likeModel.find).toHaveBeenCalledTimes(1);
      expect(usersService.findByIds).toHaveBeenCalledTimes(1);
    });

    it('từ chối con trỏ sai định dạng', async () => {
      await expect(service.getFeed(me, { after: 'bad' })).rejects.toThrow(BadRequestException);
    });
  });
});

describe('tải ảnh lên', () => {
  const jpg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0]);
  const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0]);
  const gif = Buffer.from('GIF89a......');
  const webp = Buffer.concat([
    Buffer.from('RIFF'),
    Buffer.from([0, 0, 0, 0]),
    Buffer.from('WEBPVP8 '),
  ]);

  it('nhận diện đúng JPG/PNG/GIF/WEBP bằng magic bytes', () => {
    expect(detectImageExt(jpg)).toBe('jpg');
    expect(detectImageExt(png)).toBe('png');
    expect(detectImageExt(gif)).toBe('gif');
    expect(detectImageExt(webp)).toBe('webp');
  });

  it('từ chối HTML/SVG/văn bản giả dạng ảnh', () => {
    expect(detectImageExt(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>'))).toBeNull();
    expect(detectImageExt(Buffer.from('<html><script>alert(1)</script></html>'))).toBeNull();
    expect(detectImageExt(Buffer.alloc(0))).toBeNull();
  });

  it('savePostImage từ chối file rỗng, quá lớn hoặc không phải ảnh', async () => {
    await expect(savePostImage(undefined)).rejects.toThrow(BadRequestException);
    await expect(savePostImage(Buffer.alloc(5 * 1024 * 1024 + 1, 0xff))).rejects.toThrow(
      BadRequestException,
    );
    await expect(savePostImage(Buffer.from('not an image'))).rejects.toThrow(
      BadRequestException,
    );
  });

  it('chỉ chấp nhận đường dẫn ảnh do server sinh ra', () => {
    const uuid = '123e4567-e89b-12d3-a456-426614174000';
    expect(POST_IMAGE_PATH_REGEX.test(`/uploads/posts/${uuid}.jpg`)).toBe(true);
    expect(POST_IMAGE_PATH_REGEX.test('https://res.cloudinary.com/rjkxi7lw/image/upload/v123/chatapp/posts/test.jpg')).toBe(true);
    expect(POST_IMAGE_PATH_REGEX.test('https://res.cloudinary.com/rjkxi7lw/video/upload/v123/chatapp/posts/test.mp4')).toBe(true);
    expect(POST_IMAGE_PATH_REGEX.test('https://evil.example/x.jpg')).toBe(false);
    expect(POST_IMAGE_PATH_REGEX.test(`/uploads/posts/../../etc/passwd`)).toBe(false);
    expect(POST_IMAGE_PATH_REGEX.test(`/uploads/posts/${uuid}.svg`)).toBe(false);
    expect(POST_IMAGE_PATH_REGEX.test(`/uploads/posts/${uuid}.jpg?x=1`)).toBe(false);
  });
});
