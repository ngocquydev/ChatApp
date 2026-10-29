import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { UsersService } from '../users/users.service.js';
import { Friendship, FriendshipDocument } from '../friends/schemas/friendship.schema.js';
import { Post, PostDocument } from './schemas/post.schema.js';
import type { PostPrivacy } from './schemas/post.schema.js';
import { PostLike, PostLikeDocument } from './schemas/post-like.schema.js';
import { PostComment, PostCommentDocument } from './schemas/post-comment.schema.js';
import type { CreatePostDto, SharePostDto, UpdatePostDto } from './dto/posts.dto.js';

export type ViewerRelation = 'self' | 'friends' | 'none';

export interface PostAuthorView {
  _id: string;
  name: string;
  avatar?: string;
}

export interface SharedPostView {
  _id: string;
  author: PostAuthorView;
  content: string;
  images: string[];
  privacy: PostPrivacy;
  createdAt?: Date;
}

export interface PostView {
  _id: string;
  author: PostAuthorView;
  content: string;
  images: string[];
  privacy: PostPrivacy;
  createdAt?: Date;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  likedByMe: boolean;
  /** null = bài thường; { unavailable } = bài gốc đã xóa hoặc người xem không có quyền */
  sharedPost: SharedPostView | { unavailable: true } | null;
}

export interface CommentView {
  _id: string;
  postId: string;
  author: PostAuthorView;
  content: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video';
  createdAt?: Date;
}

export interface Page<T> {
  items: T[];
  hasMore: boolean;
  nextCursor: string | null;
}

type LeanPost = Post & { _id: Types.ObjectId };

const DEFAULT_PAGE = 10;
const MAX_PAGE = 30;

const clampLimit = (limit: number | undefined, fallback = DEFAULT_PAGE) =>
  Math.min(Math.max(limit ?? fallback, 1), MAX_PAGE);

const toObjectId = (id: string, message = 'Mã không hợp lệ') => {
  if (!Types.ObjectId.isValid(id)) throw new BadRequestException(message);
  return new Types.ObjectId(id);
};

@Injectable()
export class PostsService {
  constructor(
    @InjectModel(Post.name) private readonly postModel: Model<PostDocument>,
    @InjectModel(PostLike.name) private readonly likeModel: Model<PostLikeDocument>,
    @InjectModel(PostComment.name)
    private readonly commentModel: Model<PostCommentDocument>,
    @InjectModel(Friendship.name)
    private readonly friendshipModel: Model<FriendshipDocument>,
    private readonly usersService: UsersService,
  ) {}

  // ───────────────────────── Quan hệ & quyền xem ─────────────────────────

  /** Danh sách id bạn bè (đã chấp nhận) — một truy vấn duy nhất. */
  async getFriendIds(userId: string): Promise<Types.ObjectId[]> {
    const me = new Types.ObjectId(userId);
    const rows = await this.friendshipModel
      .find({ status: 'accepted', $or: [{ requesterId: me }, { recipientId: me }] })
      .select('requesterId recipientId')
      .lean()
      .exec();
    return rows.map((r) =>
      r.requesterId.toString() === userId ? r.recipientId : r.requesterId,
    );
  }

  async relationBetween(viewerId: string, authorId: string): Promise<ViewerRelation> {
    if (viewerId === authorId) return 'self';
    const a = new Types.ObjectId(viewerId);
    const b = new Types.ObjectId(authorId);
    const found = await this.friendshipModel
      .exists({
        status: 'accepted',
        $or: [
          { requesterId: a, recipientId: b },
          { requesterId: b, recipientId: a },
        ],
      })
      .exec();
    return found ? 'friends' : 'none';
  }

  static privaciesFor(relation: ViewerRelation): PostPrivacy[] {
    if (relation === 'self') return ['public', 'friends', 'only_me'];
    if (relation === 'friends') return ['public', 'friends'];
    return ['public'];
  }

  static canView(privacy: PostPrivacy, relation: ViewerRelation): boolean {
    return PostsService.privaciesFor(relation).includes(privacy);
  }

  private async loadVisiblePost(postId: string, viewerId: string): Promise<LeanPost> {
    const post = await this.postModel
      .findOne({ _id: toObjectId(postId, 'Mã bài viết không hợp lệ'), isDeleted: false })
      .lean<LeanPost>()
      .exec();
    if (!post) throw new NotFoundException('Bài viết không tồn tại hoặc đã bị xóa');
    const relation = await this.relationBetween(viewerId, post.authorId.toString());
    if (!PostsService.canView(post.privacy, relation)) {
      // Cùng thông báo với "không tồn tại" để không lộ sự có mặt của bài riêng tư
      throw new NotFoundException('Bài viết không tồn tại hoặc đã bị xóa');
    }
    return post;
  }

  // ───────────────────────── Dựng dữ liệu trả về ─────────────────────────

  private async loadAuthors(ids: Types.ObjectId[]): Promise<Map<string, PostAuthorView>> {
    const unique = [...new Set(ids.map((i) => i.toString()))];
    const users = unique.length ? await this.usersService.findByIds(unique) : [];
    const map = new Map<string, PostAuthorView>();
    for (const u of users) {
      map.set(u._id.toString(), {
        _id: u._id.toString(),
        name: u.name,
        avatar: u.avatar ?? undefined,
      });
    }
    return map;
  }

  private static unknownAuthor(id: Types.ObjectId): PostAuthorView {
    return { _id: id.toString(), name: 'Người dùng không còn tồn tại' };
  }

  /**
   * Gắn tác giả, trạng thái thích và bài gốc cho một trang bài viết.
   * Số truy vấn cố định (≤ 5) bất kể số bài — không N+1.
   */
  private async hydratePosts(posts: LeanPost[], viewerId: string): Promise<PostView[]> {
    if (posts.length === 0) return [];

    const sharedIds = posts
      .map((p) => p.sharedPostId)
      .filter((id): id is Types.ObjectId => !!id);

    const [originals, likes, friendIds] = await Promise.all([
      sharedIds.length
        ? this.postModel
            .find({ _id: { $in: sharedIds }, isDeleted: false })
            .lean<LeanPost[]>()
            .exec()
        : Promise.resolve([] as LeanPost[]),
      this.likeModel
        .find({ userId: new Types.ObjectId(viewerId), postId: { $in: posts.map((p) => p._id) } })
        .select('postId')
        .lean()
        .exec(),
      sharedIds.length ? this.getFriendIds(viewerId) : Promise.resolve([] as Types.ObjectId[]),
    ]);

    const authors = await this.loadAuthors([
      ...posts.map((p) => p.authorId),
      ...originals.map((o) => o.authorId),
    ]);
    const authorOf = (id: Types.ObjectId) => authors.get(id.toString()) ?? PostsService.unknownAuthor(id);

    const likedSet = new Set(likes.map((l) => l.postId.toString()));
    const friendSet = new Set(friendIds.map((f) => f.toString()));
    const originalMap = new Map(originals.map((o) => [o._id.toString(), o]));

    const relationTo = (authorId: Types.ObjectId): ViewerRelation => {
      const id = authorId.toString();
      if (id === viewerId) return 'self';
      return friendSet.has(id) ? 'friends' : 'none';
    };

    return posts.map((p) => {
      let sharedPost: PostView['sharedPost'] = null;
      if (p.sharedPostId) {
        const original = originalMap.get(p.sharedPostId.toString());
        if (original && PostsService.canView(original.privacy, relationTo(original.authorId))) {
          sharedPost = {
            _id: original._id.toString(),
            author: authorOf(original.authorId),
            content: original.content,
            images: original.images,
            privacy: original.privacy,
            createdAt: original.createdAt,
          };
        } else {
          sharedPost = { unavailable: true };
        }
      }
      return {
        _id: p._id.toString(),
        author: authorOf(p.authorId),
        content: p.content,
        images: p.images,
        privacy: p.privacy,
        createdAt: p.createdAt,
        likeCount: p.likeCount,
        commentCount: p.commentCount,
        shareCount: p.shareCount,
        likedByMe: likedSet.has(p._id.toString()),
        sharedPost,
      };
    });
  }

  private async toPage(
    filter: Record<string, unknown>,
    viewerId: string,
    options: { limit?: number; after?: string },
  ): Promise<Page<PostView>> {
    const limit = clampLimit(options.limit);
    const query: Record<string, unknown> = { ...filter, isDeleted: false };
    if (options.after) {
      query._id = { $lt: toObjectId(options.after, 'Con trỏ không hợp lệ') };
    }
    const rows = await this.postModel
      .find(query)
      .sort({ _id: -1 })
      .limit(limit + 1)
      .lean<LeanPost[]>()
      .exec();
    const hasMore = rows.length > limit;
    const pageRows = hasMore ? rows.slice(0, limit) : rows;
    const items = await this.hydratePosts(pageRows, viewerId);
    return {
      items,
      hasMore,
      nextCursor: hasMore ? items[items.length - 1]._id : null,
    };
  }

  // ───────────────────────── Bảng tin & hồ sơ ─────────────────────────

  /** Bảng tin: bài của chính mình + bài bạn bè của bạn bè + tất cả bài viết công khai toàn hệ thống. */
  async getFeed(viewerId: string, options: { limit?: number; after?: string }) {
    const friendIds = await this.getFriendIds(viewerId);
    return this.toPage(
      {
        $or: [
          { authorId: new Types.ObjectId(viewerId) },
          { authorId: { $in: friendIds }, privacy: 'friends' },
          { privacy: 'public' },
        ],
      },
      viewerId,
      options,
    );
  }

  /** Dòng thời gian của một người; phạm vi hiển thị phụ thuộc quan hệ với người xem. */
  async getUserPosts(
    viewerId: string,
    targetUserId: string,
    options: { limit?: number; after?: string },
  ) {
    const target = toObjectId(targetUserId, 'Mã người dùng không hợp lệ');
    const relation = await this.relationBetween(viewerId, targetUserId);
    return this.toPage(
      { authorId: target, privacy: { $in: PostsService.privaciesFor(relation) } },
      viewerId,
      options,
    );
  }

  /** Ảnh gần đây của một người (cho khung "Ảnh" ở hồ sơ). */
  async getUserPhotos(viewerId: string, targetUserId: string, limit = 9) {
    const target = toObjectId(targetUserId, 'Mã người dùng không hợp lệ');
    const max = Math.min(Math.max(limit, 1), MAX_PAGE);
    const relation = await this.relationBetween(viewerId, targetUserId);
    const rows = await this.postModel
      .find({
        authorId: target,
        isDeleted: false,
        privacy: { $in: PostsService.privaciesFor(relation) },
        'images.0': { $exists: true },
      })
      .sort({ _id: -1 })
      .limit(max)
      .select('images')
      .lean<{ _id: Types.ObjectId; images: string[] }[]>()
      .exec();
    const photos = rows.flatMap((r) =>
      r.images.map((url) => ({ postId: r._id.toString(), url })),
    );
    return photos.slice(0, max);
  }

  async getPost(viewerId: string, postId: string): Promise<PostView> {
    const post = await this.loadVisiblePost(postId, viewerId);
    const [view] = await this.hydratePosts([post], viewerId);
    return view;
  }

  // ───────────────────────── Tạo / xóa / chia sẻ ─────────────────────────

  async createPost(authorId: string, dto: CreatePostDto): Promise<PostView> {
    const content = (dto.content ?? '').trim();
    const images = dto.images ?? [];
    if (!content && images.length === 0) {
      throw new BadRequestException('Bài viết cần có nội dung hoặc ít nhất một ảnh');
    }
    const created = await this.postModel.create({
      authorId: new Types.ObjectId(authorId),
      content,
      images,
      privacy: dto.privacy ?? 'friends',
    });
    return this.getPost(authorId, created._id.toString());
  }

  async updatePost(viewerId: string, postId: string, dto: UpdatePostDto): Promise<PostView> {
    const post = await this.postModel
      .findOne({ _id: toObjectId(postId, 'Mã bài viết không hợp lệ'), isDeleted: false })
      .lean<LeanPost>()
      .exec();
    if (!post) throw new NotFoundException('Bài viết không tồn tại hoặc đã bị xóa');
    if (post.authorId.toString() !== viewerId) {
      throw new ForbiddenException('Bạn không có quyền chỉnh sửa bài viết này');
    }

    const content = dto.content !== undefined ? dto.content.trim() : post.content;
    const images = dto.images !== undefined ? dto.images : post.images;
    const privacy = dto.privacy !== undefined ? dto.privacy : post.privacy;

    if (!post.sharedPostId && !content && images.length === 0) {
      throw new BadRequestException('Bài viết cần có nội dung hoặc ít nhất một ảnh');
    }

    await this.postModel
      .updateOne(
        { _id: post._id },
        {
          $set: {
            content,
            images,
            privacy,
          },
        },
      )
      .exec();

    return this.getPost(viewerId, post._id.toString());
  }

  async deletePost(viewerId: string, postId: string) {
    const post = await this.postModel
      .findOne({ _id: toObjectId(postId, 'Mã bài viết không hợp lệ'), isDeleted: false })
      .lean<LeanPost>()
      .exec();
    if (!post) throw new NotFoundException('Bài viết không tồn tại hoặc đã bị xóa');
    if (post.authorId.toString() !== viewerId) {
      throw new ForbiddenException('Bạn không có quyền xóa bài viết này');
    }
    await this.postModel.updateOne({ _id: post._id }, { $set: { isDeleted: true } }).exec();
    if (post.sharedPostId) {
      await this.postModel
        .updateOne({ _id: post.sharedPostId, shareCount: { $gt: 0 } }, { $inc: { shareCount: -1 } })
        .exec();
    }
    return { success: true, message: 'Đã xóa bài viết' };
  }

  /** Chia sẻ lại lên dòng thời gian của mình. Luôn trỏ tới bài gốc (không lồng nhiều tầng). */
  async sharePost(viewerId: string, postId: string, dto: SharePostDto): Promise<PostView> {
    let target = await this.loadVisiblePost(postId, viewerId);
    if (target.sharedPostId) {
      // Chia sẻ một bài chia sẻ → quy về bài gốc
      target = await this.loadVisiblePost(target.sharedPostId.toString(), viewerId);
    }
    const isOwn = target.authorId.toString() === viewerId;
    if (!isOwn && target.privacy !== 'public') {
      throw new ForbiddenException('Bài viết này không cho phép chia sẻ lại');
    }
    const created = await this.postModel.create({
      authorId: new Types.ObjectId(viewerId),
      content: (dto.content ?? '').trim(),
      images: [],
      privacy: dto.privacy ?? 'friends',
      sharedPostId: target._id,
    });
    await this.postModel.updateOne({ _id: target._id }, { $inc: { shareCount: 1 } }).exec();
    return this.getPost(viewerId, created._id.toString());
  }

  // ───────────────────────── Thích ─────────────────────────

  /** Bật/tắt thích. Trả số lượt thích mới nhất. */
  async toggleLike(viewerId: string, postId: string) {
    const post = await this.loadVisiblePost(postId, viewerId);
    const userId = new Types.ObjectId(viewerId);

    const removed = await this.likeModel.deleteOne({ postId: post._id, userId }).exec();
    let liked: boolean;
    if (removed.deletedCount === 1) {
      liked = false;
      await this.postModel
        .updateOne({ _id: post._id, likeCount: { $gt: 0 } }, { $inc: { likeCount: -1 } })
        .exec();
    } else {
      try {
        await this.likeModel.create({ postId: post._id, userId });
        liked = true;
        await this.postModel.updateOne({ _id: post._id }, { $inc: { likeCount: 1 } }).exec();
      } catch (err) {
        // Hai yêu cầu "thích" đồng thời: bản ghi đã có → coi như đã thích
        if ((err as { code?: number }).code !== 11000) throw err;
        liked = true;
      }
    }
    const fresh = await this.postModel
      .findById(post._id)
      .select('likeCount')
      .lean<{ likeCount: number }>()
      .exec();
    return { success: true, liked, likeCount: fresh?.likeCount ?? 0 };
  }

  // ───────────────────────── Bình luận ─────────────────────────

  async listComments(
    viewerId: string,
    postId: string,
    options: { limit?: number; after?: string },
  ): Promise<Page<CommentView>> {
    const post = await this.loadVisiblePost(postId, viewerId);
    const limit = clampLimit(options.limit);
    const query: Record<string, unknown> = { postId: post._id };
    if (options.after) {
      query._id = { $gt: toObjectId(options.after, 'Con trỏ không hợp lệ') };
    }
    const rows = await this.commentModel
      .find(query)
      .sort({ _id: 1 })
      .limit(limit + 1)
      .lean<(PostComment & { _id: Types.ObjectId })[]>()
      .exec();
    const hasMore = rows.length > limit;
    const pageRows = hasMore ? rows.slice(0, limit) : rows;
    const authors = await this.loadAuthors(pageRows.map((r) => r.authorId));
    const items = pageRows.map((r) => this.toCommentView(r, authors));
    return { items, hasMore, nextCursor: hasMore ? items[items.length - 1]._id : null };
  }

  async addComment(
    viewerId: string,
    postId: string,
    rawContent?: string,
    mediaUrl?: string,
    mediaType?: 'image' | 'video',
  ): Promise<CommentView> {
    const content = (rawContent ?? '').trim();
    const cleanMedia = (mediaUrl ?? '').trim();
    if (!content && !cleanMedia) throw new BadRequestException('Bình luận không được để trống');
    const post = await this.loadVisiblePost(postId, viewerId);
    const isVideo = cleanMedia ? (mediaType === 'video' || /\.(mp4|webm|mov|mkv|avi)(\?.*)?$/i.test(cleanMedia) || cleanMedia.includes('/video/upload/')) : false;
    const resolvedType: 'image' | 'video' | undefined = cleanMedia ? (isVideo ? 'video' : 'image') : undefined;

    const created = await this.commentModel.create({
      postId: post._id,
      authorId: new Types.ObjectId(viewerId),
      content,
      mediaUrl: cleanMedia || undefined,
      mediaType: resolvedType,
    });
    await this.postModel.updateOne({ _id: post._id }, { $inc: { commentCount: 1 } }).exec();
    const authors = await this.loadAuthors([created.authorId]);
    return this.toCommentView(created, authors);
  }

  async deleteComment(viewerId: string, postId: string, commentId: string) {
    const post = await this.loadVisiblePost(postId, viewerId);
    const comment = await this.commentModel
      .findOne({ _id: toObjectId(commentId, 'Mã bình luận không hợp lệ'), postId: post._id })
      .lean<PostComment & { _id: Types.ObjectId }>()
      .exec();
    if (!comment) throw new NotFoundException('Bình luận không tồn tại');
    const canDelete =
      comment.authorId.toString() === viewerId || post.authorId.toString() === viewerId;
    if (!canDelete) throw new ForbiddenException('Bạn không có quyền xóa bình luận này');
    const result = await this.commentModel.deleteOne({ _id: comment._id }).exec();
    if (result.deletedCount === 1) {
      await this.postModel
        .updateOne({ _id: post._id, commentCount: { $gt: 0 } }, { $inc: { commentCount: -1 } })
        .exec();
    }
    return { success: true, message: 'Đã xóa bình luận' };
  }

  // ───────────────────────── Danh sách người thích & người bình luận ─────────────────────────

  async getPostLikes(viewerId: string, postId: string): Promise<PostAuthorView[]> {
    const post = await this.loadVisiblePost(postId, viewerId);
    const rows = await this.likeModel
      .find({ postId: post._id })
      .sort({ _id: -1 })
      .limit(100)
      .select('userId')
      .lean<{ userId: Types.ObjectId }[]>()
      .exec();
    const userIds = rows.map((r) => r.userId);
    const authors = await this.loadAuthors(userIds);
    return userIds.map((id) => authors.get(id.toString()) ?? PostsService.unknownAuthor(id));
  }

  async getPostCommenters(viewerId: string, postId: string): Promise<PostAuthorView[]> {
    const post = await this.loadVisiblePost(postId, viewerId);
    const distinctRows = await this.commentModel.aggregate<{ _id: Types.ObjectId }>([
      { $match: { postId: post._id } },
      { $group: { _id: '$authorId', lastAt: { $max: '$_id' } } },
      { $sort: { lastAt: -1 } },
      { $limit: 100 },
    ]);
    const authorIds = distinctRows.map((r) => r._id);
    const authors = await this.loadAuthors(authorIds);
    return authorIds.map((id) => authors.get(id.toString()) ?? PostsService.unknownAuthor(id));
  }

  private toCommentView(
    row: PostComment & { _id: Types.ObjectId },
    authors: Map<string, PostAuthorView>,
  ): CommentView {
    return {
      _id: row._id.toString(),
      postId: row.postId.toString(),
      author: authors.get(row.authorId.toString()) ?? PostsService.unknownAuthor(row.authorId),
      content: row.content,
      mediaUrl: row.mediaUrl,
      mediaType: row.mediaType,
      createdAt: row.createdAt,
    };
  }
}
