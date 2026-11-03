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
  chain.then = (resolve: (val: unknown) => unknown) => Promise.resolve(result).then(resolve);
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
    exists: ReturnType<typeof vi.fn>;
    countDocuments: ReturnType<typeof vi.fn>;
  };
  let likeModel: {
    find: ReturnType<typeof vi.fn>;
    findOne: ReturnType<typeof vi.fn>;
    deleteOne: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
  };
  let commentModel: {
    find: ReturnType<typeof vi.fn>;
    findOne: ReturnType<typeof vi.fn>;
    findById: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    deleteOne: ReturnType<typeof vi.fn>;
    aggregate: ReturnType<typeof vi.fn>;
  };
  let friendshipModel: {
    find: ReturnType<typeof vi.fn>;
    exists: ReturnType<typeof vi.fn>;
  };
  let usersService: {
    findByIds: ReturnType<typeof vi.fn>;
    findById: ReturnType<typeof vi.fn>;
    findByIdAndUpdate: ReturnType<typeof vi.fn>;
  };
  let notificationsService: {
    createNotification: ReturnType<typeof vi.fn>;
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
      exists: vi.fn(() => q(null)),
      countDocuments: vi.fn(() => q(0)),
    };
    likeModel = { find: vi.fn(() => q([])), findOne: vi.fn(() => q(null)), deleteOne: vi.fn(), create: vi.fn() };
    commentModel = {
      find: vi.fn(),
      findOne: vi.fn(),
      findById: vi.fn(),
      create: vi.fn(),
      deleteOne: vi.fn(),
      aggregate: vi.fn().mockResolvedValue([]),
    };
    friendshipModel = { find: vi.fn(() => q([])), exists: vi.fn(() => q(null)) };
    usersService = {
      findByIds: vi.fn().mockResolvedValue([]),
      findById: vi.fn().mockResolvedValue(null),
      findByIdAndUpdate: vi.fn().mockResolvedValue(null),
    };
    notificationsService = {
      createNotification: vi.fn().mockResolvedValue({}),
    };
    service = new PostsService(
      postModel as unknown as never,
      likeModel as unknown as never,
      commentModel as unknown as never,
      friendshipModel as unknown as never,
      usersService as unknown as never,
      undefined,
      notificationsService as unknown as never,
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

    it('không giảm shareCount nếu tài khoản vẫn còn bài chia sẻ khác của bài gốc đó', async () => {
      const original = oid();
      const postId = oid();
      postModel.findOne.mockReturnValue(
        q({ _id: postId, authorId: new Types.ObjectId(me), sharedPostId: original }),
      );
      postModel.countDocuments.mockReturnValue(q(1)); // Vẫn còn 1 bài chia sẻ khác
      await service.deletePost(me, postId.toString());
      expect(postModel.updateOne).toHaveBeenCalledTimes(1);
      expect(postModel.updateOne).toHaveBeenCalledWith(
        { _id: postId },
        { $set: { isDeleted: true } },
      );
      expect(postModel.updateOne).not.toHaveBeenCalledWith(
        { _id: original, shareCount: { $gt: 0 } },
        { $inc: { shareCount: -1 } },
      );
    });
  });

  describe('updatePost', () => {
    it('404 khi bài không tồn tại', async () => {
      postModel.findOne.mockReturnValue(q(null));
      await expect(
        service.updatePost(me, oid().toString(), { content: 'test' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('403 khi sửa bài của người khác', async () => {
      postModel.findOne.mockReturnValue(
        q({ _id: oid(), authorId: new Types.ObjectId(other), sharedPostId: null }),
      );
      await expect(
        service.updatePost(me, oid().toString(), { content: 'test' }),
      ).rejects.toThrow(ForbiddenException);
      expect(postModel.updateOne).not.toHaveBeenCalled();
    });

    it('400 khi sửa bài thường thành rỗng không có chữ và không có ảnh', async () => {
      const postId = oid();
      postModel.findOne.mockReturnValue(
        q({
          _id: postId,
          authorId: new Types.ObjectId(me),
          content: 'cũ',
          images: [],
          privacy: 'friends',
          sharedPostId: null,
        }),
      );
      await expect(
        service.updatePost(me, postId.toString(), { content: '   ', images: [] }),
      ).rejects.toThrow(BadRequestException);
      expect(postModel.updateOne).not.toHaveBeenCalled();
    });

    it('cập nhật thành công nội dung và quyền riêng tư của bài viết', async () => {
      const postId = oid();
      const existing = {
        _id: postId,
        authorId: new Types.ObjectId(me),
        content: 'Nội dung cũ',
        images: ['/uploads/posts/11111111-1111-1111-1111-111111111111.jpg'],
        privacy: 'friends',
        sharedPostId: null,
        createdAt: new Date(),
        likeCount: 0,
        commentCount: 0,
        shareCount: 0,
      };
      // findOne lần 1 trong updatePost, lần 2 trong getPost -> loadVisiblePost
      postModel.findOne.mockReturnValue(q(existing));
      postModel.find.mockReturnValue(q([]));
      usersService.findByIds.mockResolvedValue([
        { _id: new Types.ObjectId(me), name: 'Tôi' },
      ]);

      const result = await service.updatePost(me, postId.toString(), {
        content: 'Nội dung mới',
        privacy: 'public',
      });

      expect(postModel.updateOne).toHaveBeenCalledWith(
        { _id: postId },
        {
          $set: {
            content: 'Nội dung mới',
            images: existing.images,
            privacy: 'public',
          },
        },
      );
      expect(result._id).toBe(postId.toString());
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
    it('từ chối khi người khác chia sẻ bài viết chế độ only_me', async () => {
      postModel.findOne.mockReturnValue(
        q({
          _id: oid(),
          authorId: new Types.ObjectId(other),
          privacy: 'only_me',
          sharedPostId: null,
        }),
      );
      await expect(service.sharePost(me, oid().toString(), {})).rejects.toThrow(
        NotFoundException,
      );
      expect(postModel.create).not.toHaveBeenCalled();
    });

    it('cho phép bạn bè chia sẻ bài viết chế độ friends và cộng 1 lượt chia sẻ ở lần đầu', async () => {
      const originalId = oid();
      postModel.findOne.mockReturnValue(
        q({
          _id: originalId,
          authorId: new Types.ObjectId(other),
          privacy: 'friends',
          sharedPostId: null,
        }),
      );
      friendshipModel.exists.mockReturnValue(q({ _id: oid() }));
      postModel.exists.mockReturnValue(q(null));
      const newPostId = oid();
      postModel.create.mockResolvedValue({
        _id: newPostId,
        authorId: new Types.ObjectId(me),
        privacy: 'friends',
        sharedPostId: originalId,
      });

      postModel.find.mockReturnValue(
        q([
          {
            _id: newPostId,
            authorId: new Types.ObjectId(me),
            content: '',
            images: [],
            privacy: 'friends',
            sharedPostId: originalId,
            likeCount: 0,
            commentCount: 0,
            shareCount: 0,
          },
        ]),
      );

      await service.sharePost(me, originalId.toString(), {});
      expect(postModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          authorId: new Types.ObjectId(me),
          sharedPostId: originalId,
        }),
      );
      expect(postModel.updateOne).toHaveBeenCalledWith(
        { _id: originalId },
        { $inc: { shareCount: 1 } },
      );
      expect(notificationsService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          recipientId: other,
          actorId: me,
          type: 'post_share',
        }),
      );
    });

    it('không cộng lượt chia sẻ nếu cùng tài khoản chia sẻ lại bài viết đó lần nữa', async () => {
      const originalId = oid();
      postModel.findOne.mockReturnValue(
        q({
          _id: originalId,
          authorId: new Types.ObjectId(other),
          privacy: 'public',
          sharedPostId: null,
        }),
      );
      postModel.exists.mockReturnValue(q({ _id: oid() }));
      const newPostId = oid();
      postModel.create.mockResolvedValue({
        _id: newPostId,
        authorId: new Types.ObjectId(me),
        privacy: 'friends',
        sharedPostId: originalId,
      });

      postModel.find.mockReturnValue(
        q([
          {
            _id: newPostId,
            authorId: new Types.ObjectId(me),
            content: '',
            images: [],
            privacy: 'friends',
            sharedPostId: originalId,
            likeCount: 0,
            commentCount: 0,
            shareCount: 0,
          },
        ]),
      );

      await service.sharePost(me, originalId.toString(), {});
      expect(postModel.create).toHaveBeenCalled();
      expect(postModel.updateOne).not.toHaveBeenCalledWith(
        { _id: originalId },
        { $inc: { shareCount: 1 } },
      );
    });
  });

  describe('bình luận', () => {
    it('từ chối bình luận rỗng không có media', async () => {
      await expect(service.addComment(me, oid().toString(), '   ')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('cho phép bình luận chỉ có ảnh hoặc video', async () => {
      const postId = oid();
      postModel.findOne.mockReturnValue(
        q({ _id: postId, authorId: new Types.ObjectId(other), privacy: 'public' }),
      );
      commentModel.create.mockResolvedValue({
        _id: oid(),
        postId,
        authorId: new Types.ObjectId(me),
        content: '',
        mediaUrl: 'https://res.cloudinary.com/test/image/upload/sample.jpg',
        mediaType: 'image',
        createdAt: new Date(),
      });
      usersService.findByIds.mockResolvedValue([
        { _id: new Types.ObjectId(me), name: 'Me', avatar: '' },
      ]);
      const res = await service.addComment(
        me,
        postId.toString(),
        '',
        'https://res.cloudinary.com/test/image/upload/sample.jpg',
        'image',
      );
      expect(res.mediaUrl).toBe('https://res.cloudinary.com/test/image/upload/sample.jpg');
      expect(res.mediaType).toBe('image');
      expect(postModel.updateOne).toHaveBeenCalled();
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

  describe('getPostLikes và getPostCommenters', () => {
    it('getPostLikes trả về danh sách user đã thích', async () => {
      const postId = oid();
      const user1 = oid();
      postModel.findOne.mockReturnValue(
        q({ _id: postId, authorId: new Types.ObjectId(me), privacy: 'friends' }),
      );
      likeModel.find.mockReturnValue(q([{ userId: user1 }]));
      usersService.findByIds.mockResolvedValue([
        { _id: user1, name: 'User 1', avatar: 'ava1.jpg' },
      ]);

      const result = await service.getPostLikes(me, postId.toString());
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('User 1');
    });

    it('getPostCommenters trả về danh sách người bình luận không trùng nhau', async () => {
      const postId = oid();
      const user1 = oid();
      postModel.findOne.mockReturnValue(
        q({ _id: postId, authorId: new Types.ObjectId(me), privacy: 'friends' }),
      );
      commentModel.aggregate.mockResolvedValue([{ _id: user1 }]);
      usersService.findByIds.mockResolvedValue([
        { _id: user1, name: 'User 1' },
      ]);

      const result = await service.getPostCommenters(me, postId.toString());
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('User 1');
    });
  });

  describe('toggleLike', () => {
    const publicPost = () => ({
      _id: oid(),
      authorId: new Types.ObjectId(other),
      privacy: 'public',
    });

    it('bỏ thích khi đã thích cùng loại: xóa bản ghi và giảm bộ đếm', async () => {
      const post = publicPost();
      postModel.findOne.mockReturnValue(q(post));
      postModel.findById.mockReturnValue(q({ likeCount: 2, reactionsCount: { like: 2 } }));
      likeModel.findOne.mockReturnValue(q({ _id: new Types.ObjectId(), type: 'like' }));
      likeModel.deleteOne.mockReturnValue(q({ deletedCount: 1 }));
      const result = await service.toggleLike(me, post._id.toString(), 'like');
      expect(result).toEqual({
        success: true,
        liked: false,
        myReaction: null,
        likeCount: 2,
        reactionsCount: { like: 2 },
      });
      expect(postModel.updateOne).toHaveBeenCalledWith(
        { _id: post._id, likeCount: { $gt: 0 } },
        { $inc: { likeCount: -1, 'reactionsCount.like': -1 } },
      );
    });

    it('thích mới khi chưa thích: tạo bản ghi và tăng bộ đếm', async () => {
      const post = publicPost();
      postModel.findOne.mockReturnValue(q(post));
      postModel.findById.mockReturnValue(q({ likeCount: 1, reactionsCount: { like: 1 } }));
      likeModel.findOne.mockReturnValue(q(null));
      likeModel.create.mockResolvedValue({});
      const result = await service.toggleLike(me, post._id.toString(), 'like');
      expect(result.liked).toBe(true);
      expect(result.myReaction).toBe('like');
      expect(postModel.updateOne).toHaveBeenCalledWith(
        { _id: post._id },
        { $inc: { likeCount: 1, 'reactionsCount.like': 1 } },
      );
      expect(notificationsService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          recipientId: other,
          actorId: me,
          type: 'post_like',
        }),
      );
    });

    it('đổi loại cảm xúc khi đã thích loại khác (ví dụ từ like sang haha)', async () => {
      const post = publicPost();
      const existingLikeDoc = {
        _id: new Types.ObjectId(),
        type: 'like',
        save: vi.fn().mockResolvedValue(true),
      };
      postModel.findOne.mockReturnValue(q(post));
      postModel.findById.mockReturnValue(q({ likeCount: 1, reactionsCount: { haha: 1 } }));
      likeModel.findOne.mockReturnValue(q(existingLikeDoc));
      const result = await service.toggleLike(me, post._id.toString(), 'haha');
      expect(result.liked).toBe(true);
      expect(result.myReaction).toBe('haha');
      expect(existingLikeDoc.save).toHaveBeenCalled();
      expect(postModel.updateOne).toHaveBeenCalledWith(
        { _id: post._id },
        { $inc: { 'reactionsCount.like': -1, 'reactionsCount.haha': 1 } },
      );
    });

    it('hai lượt thích đồng thời (E11000) không làm hỏng và không tăng đếm hai lần', async () => {
      const post = publicPost();
      postModel.findOne.mockReturnValue(q(post));
      postModel.findById.mockReturnValue(q({ likeCount: 1, reactionsCount: { like: 1 } }));
      likeModel.findOne.mockReturnValue(q(null));
      likeModel.create.mockRejectedValue({ code: 11000 });
      const result = await service.toggleLike(me, post._id.toString(), 'like');
      expect(result.liked).toBe(true);
      expect(result.myReaction).toBe('like');
    });

    it('thả và hủy cảm xúc bình luận thành công', async () => {
      const post = publicPost();
      const commentDoc = {
        _id: new Types.ObjectId(),
        postId: post._id,
        reactions: [] as { userId: Types.ObjectId; type: string }[],
        likeCount: 0,
        save: vi.fn().mockResolvedValue(true),
      };
      postModel.findOne.mockReturnValue(q(post));
      commentModel.findOne.mockResolvedValue(commentDoc);

      // Thả haha vào bình luận
      const res1 = await service.toggleCommentReaction(me, post._id.toString(), commentDoc._id.toString(), 'haha');
      expect(res1.liked).toBe(true);
      expect(res1.myReaction).toBe('haha');
      expect(commentDoc.reactions.length).toBe(1);

      // Thả lại haha -> hủy cảm xúc
      const res2 = await service.toggleCommentReaction(me, post._id.toString(), commentDoc._id.toString(), 'haha');
      expect(res2.liked).toBe(false);
      expect(res2.myReaction).toBeNull();
      expect(commentDoc.reactions.length).toBe(0);
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

  describe('getUserPhotos', () => {
    it('kết hợp ảnh bài viết, ảnh bìa, avatar và kho lưu trữ của người dùng', async () => {
      postModel.find.mockReturnValue(
        q([{ _id: oid(), images: ['/uploads/posts/p1.jpg'] }]),
      );
      usersService.findById.mockResolvedValue({
        cover: 'https://cloudinary.com/cover.jpg',
        avatar: 'https://cloudinary.com/avatar.jpg',
        photos: ['https://cloudinary.com/old-avatar.jpg'],
      });

      const photos = await service.getUserPhotos(me, other, 9);
      expect(photos).toHaveLength(4);
      expect(photos.map((p) => p.url)).toEqual([
        '/uploads/posts/p1.jpg',
        'https://cloudinary.com/cover.jpg',
        'https://cloudinary.com/avatar.jpg',
        'https://cloudinary.com/old-avatar.jpg',
      ]);
    });

    it('loại bỏ các URL ảnh bị trùng lặp', async () => {
      postModel.find.mockReturnValue(
        q([{ _id: oid(), images: ['https://cloudinary.com/avatar.jpg'] }]),
      );
      usersService.findById.mockResolvedValue({
        avatar: 'https://cloudinary.com/avatar.jpg',
        photos: ['https://cloudinary.com/avatar.jpg'],
      });

      const photos = await service.getUserPhotos(me, other, 9);
      expect(photos).toHaveLength(1);
      expect(photos[0].url).toBe('https://cloudinary.com/avatar.jpg');
    });
  });

  describe('reportComment', () => {
    it('từ chối nếu bình luận không tồn tại', async () => {
      commentModel.findById.mockReturnValue(q(null));
      await expect(
        service.reportComment(me, oid().toString(), { target: 'web_admin', reason: 'spam' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('từ chối nếu người dùng tự báo cáo bình luận của chính mình', async () => {
      commentModel.findById.mockReturnValue(
        q({ _id: oid(), authorId: new Types.ObjectId(me), content: 'mine' }),
      );
      await expect(
        service.reportComment(me, oid().toString(), { target: 'web_admin', reason: 'spam' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('báo cáo thành công cho BQT nhóm khi bài viết thuộc nhóm', async () => {
      const commentId = oid();
      const authorId = oid();
      const groupId = oid();
      commentModel.findById.mockReturnValue(
        q({ _id: commentId, postId: oid(), authorId, content: 'bad comment' }),
      );
      postModel.findById.mockReturnValue(
        q({ _id: oid(), groupId, isDeleted: false }),
      );
      const mockReportModel = {
        findOne: vi.fn().mockReturnValue(q(null)),
        create: vi.fn().mockResolvedValue({ _id: oid() }),
      };
      const svc = new PostsService(
        postModel as unknown as never,
        likeModel as unknown as never,
        commentModel as unknown as never,
        friendshipModel as unknown as never,
        usersService as unknown as never,
        undefined,
        notificationsService as unknown as never,
        undefined,
        undefined,
        mockReportModel as unknown as never,
      );

      const res = await svc.reportComment(me, commentId.toString(), {
        target: 'group_admin',
        reason: 'harassment',
        details: 'vi phạm nội quy nhóm',
      });
      expect(res.success).toBe(true);
      expect(mockReportModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          target: 'group_admin',
          reason: 'harassment',
          details: 'vi phạm nội quy nhóm',
        }),
      );
    });
  });

  describe('phát sự kiện thời gian thực (Realtime Socket)', () => {
    it('phát post:new qua socket khi đăng bài viết công khai', async () => {
      const serverEmit = vi.fn();
      const chatGateway = { server: { emit: serverEmit, to: vi.fn(() => ({ emit: vi.fn() })) } };
      const svc = new PostsService(
        postModel as unknown as never,
        likeModel as unknown as never,
        commentModel as unknown as never,
        friendshipModel as unknown as never,
        usersService as unknown as never,
        undefined,
        notificationsService as unknown as never,
        chatGateway as unknown as never,
      );
      const createdId = oid();
      postModel.create.mockResolvedValue({ _id: createdId });
      postModel.findOne.mockReturnValue(
        q({
          _id: createdId,
          authorId: new Types.ObjectId(me),
          content: 'Bài viết test realtime',
          images: [],
          privacy: 'public',
          likeCount: 0,
          commentCount: 0,
          shareCount: 0,
          isDeleted: false,
        }),
      );
      usersService.findByIds.mockResolvedValue([{ _id: me, name: 'Tôi' }]);

      const res = await svc.createPost(me, { content: 'Bài viết test realtime', privacy: 'public' });
      expect(res._id).toBe(createdId.toString());
      expect(serverEmit).toHaveBeenCalledWith('post:new', expect.objectContaining({ _id: createdId.toString() }));
    });

    it('phát post:deleted qua socket khi xóa bài viết', async () => {
      const serverEmit = vi.fn();
      const chatGateway = { server: { emit: serverEmit } };
      const svc = new PostsService(
        postModel as unknown as never,
        likeModel as unknown as never,
        commentModel as unknown as never,
        friendshipModel as unknown as never,
        usersService as unknown as never,
        undefined,
        notificationsService as unknown as never,
        chatGateway as unknown as never,
      );
      const postId = oid();
      postModel.findOne.mockReturnValue(
        q({ _id: postId, authorId: new Types.ObjectId(me), sharedPostId: null }),
      );
      await svc.deletePost(me, postId.toString());
      expect(serverEmit).toHaveBeenCalledWith('post:deleted', { postId: postId.toString() });
    });

    it('phát post:reaction qua socket khi người dùng thả icon', async () => {
      const serverEmit = vi.fn();
      const chatGateway = { server: { emit: serverEmit } };
      const svc = new PostsService(
        postModel as unknown as never,
        likeModel as unknown as never,
        commentModel as unknown as never,
        friendshipModel as unknown as never,
        usersService as unknown as never,
        undefined,
        notificationsService as unknown as never,
        chatGateway as unknown as never,
      );
      const postId = oid();
      postModel.findOne.mockReturnValue(
        q({ _id: postId, authorId: new Types.ObjectId(me), privacy: 'public' }),
      );
      likeModel.findOne.mockReturnValue(q(null));
      postModel.findById.mockReturnValue(q({ likeCount: 1, reactionsCount: { love: 1 } }));

      await svc.toggleLike(other, postId.toString(), 'love');
      expect(serverEmit).toHaveBeenCalledWith('post:reaction', expect.objectContaining({
        postId: postId.toString(),
        likeCount: 1,
        reactionsCount: { love: 1 },
        userId: other,
        reactionType: 'love',
        liked: true,
      }));
    });

    it('phát post:comment qua socket khi người dùng thêm bình luận', async () => {
      const serverEmit = vi.fn();
      const chatGateway = { server: { emit: serverEmit } };
      const svc = new PostsService(
        postModel as unknown as never,
        likeModel as unknown as never,
        commentModel as unknown as never,
        friendshipModel as unknown as never,
        usersService as unknown as never,
        undefined,
        notificationsService as unknown as never,
        chatGateway as unknown as never,
      );
      const postId = oid();
      const commentId = oid();
      postModel.findOne.mockReturnValue(
        q({ _id: postId, authorId: new Types.ObjectId(me), privacy: 'public' }),
      );
      commentModel.create.mockResolvedValue({
        _id: commentId,
        postId,
        authorId: new Types.ObjectId(other),
        content: 'Bình luận test',
        likeCount: 0,
        createdAt: new Date(),
      });
      postModel.findById.mockReturnValue(q({ commentCount: 1 }));
      usersService.findByIds.mockResolvedValue([{ _id: other, name: 'Người khác' }]);

      await svc.addComment(other, postId.toString(), 'Bình luận test');
      expect(serverEmit).toHaveBeenCalledWith('post:comment', expect.objectContaining({
        postId: postId.toString(),
        commentCount: 1,
        comment: expect.objectContaining({ _id: commentId.toString(), content: 'Bình luận test' }),
      }));
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
