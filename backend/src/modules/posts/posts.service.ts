import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
  forwardRef,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { UsersService } from '../users/users.service.js';
import { ModerationService } from '../moderation/moderation.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { ChatGateway } from '../chat/chat.gateway.js';
import { Friendship, FriendshipDocument } from '../friends/schemas/friendship.schema.js';
import { Post, PostDocument } from './schemas/post.schema.js';
import type { PostPrivacy } from './schemas/post.schema.js';
import { PostLike, PostLikeDocument, type ReactionType } from './schemas/post-like.schema.js';
import { PostComment, PostCommentDocument } from './schemas/post-comment.schema.js';
import { CommunityGroup, CommunityGroupDocument } from '../community-groups/schemas/community-group.schema.js';
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
  shareCount?: number;
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
  myReaction?: ReactionType | null;
  reactionsCount?: Record<string, number>;
  /** null = bài thường; { unavailable } = bài gốc đã xóa hoặc người xem không có quyền */
  sharedPost: SharedPostView | { unavailable: true } | null;
  isSensitive?: boolean;
  moderationStatus?: 'approved' | 'flagged' | 'rejected';
  moderationReason?: string;
  toxicityScore?: number;
  pageId?: string;
  groupId?: string;
}

export interface CommentView {
  _id: string;
  postId: string;
  author: PostAuthorView;
  content: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video';
  createdAt?: Date;
  likeCount: number;
  likedByMe: boolean;
  myReaction?: ReactionType | null;
  reactionsCount?: Record<string, number>;
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
  private readonly logger = new Logger(PostsService.name);

  constructor(
    @InjectModel(Post.name) private readonly postModel: Model<PostDocument>,
    @InjectModel(PostLike.name) private readonly likeModel: Model<PostLikeDocument>,
    @InjectModel(PostComment.name)
    private readonly commentModel: Model<PostCommentDocument>,
    @InjectModel(Friendship.name)
    private readonly friendshipModel: Model<FriendshipDocument>,
    private readonly usersService: UsersService,
    @Optional() private readonly moderationService?: ModerationService,
    @Optional() private readonly notificationsService?: NotificationsService,
    @Optional()
    @Inject(forwardRef(() => ChatGateway))
    private readonly chatGateway?: ChatGateway,
    @Optional()
    @InjectModel(CommunityGroup.name)
    private readonly groupModel?: Model<CommunityGroupDocument>,
  ) {}

  /**
   * Phát sự kiện realtime về bài viết tới các client phù hợp:
   * - only_me: chỉ thiết bị của tác giả
   * - friends: tác giả + bạn bè đang online
   * - public: toàn bộ client
   */
  private emitRealtimePost(event: string, postView: PostView, authorId: string) {
    try {
      const server = this.chatGateway?.server;
      if (!server) return;

      if (postView.privacy === 'only_me') {
        server.to(`user:${authorId}`).emit(event, postView);
        return;
      }

      if (postView.privacy === 'friends') {
        void this.getFriendIds(authorId)
          .then((friendIds) => {
            server.to(`user:${authorId}`).emit(event, postView);
            for (const fid of friendIds) {
              server.to(`user:${fid.toString()}`).emit(event, postView);
            }
          })
          .catch(() => {});
        return;
      }

      // Public post (hoặc post trong nhóm/trang): phát toàn hệ thống
      server.emit(event, postView);
    } catch {
      // Nuốt lỗi socket nền để không chặn luồng HTTP
    }
  }

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
        .select('postId type')
        .lean()
        .exec(),
      sharedIds.length ? this.getFriendIds(viewerId) : Promise.resolve([] as Types.ObjectId[]),
    ]);

    const authors = await this.loadAuthors([
      ...posts.map((p) => p.authorId),
      ...originals.map((o) => o.authorId),
    ]);
    const authorOf = (id: Types.ObjectId) => authors.get(id.toString()) ?? PostsService.unknownAuthor(id);

    const likeMap = new Map(
      likes.map((l) => [l.postId.toString(), (l as { type?: ReactionType }).type || 'like']),
    );
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
            shareCount: original.shareCount ?? 0,
          };
        } else {
          sharedPost = { unavailable: true };
        }
      }
      const myReaction = likeMap.get(p._id.toString()) || null;
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
        likedByMe: Boolean(myReaction),
        myReaction,
        reactionsCount: (p as { reactionsCount?: Record<string, number> }).reactionsCount || { like: p.likeCount || 0 },
        isSensitive: p.isSensitive ?? false,
        moderationStatus: p.moderationStatus ?? 'approved',
        moderationReason: p.moderationReason,
        toxicityScore: p.toxicityScore,
        pageId: p.pageId ? p.pageId.toString() : undefined,
        groupId: p.groupId ? p.groupId.toString() : undefined,
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

  /** Dòng thời gian của một Trang Fanpage */
  async getPagePosts(
    viewerId: string,
    pageId: string,
    options: { limit?: number; after?: string },
  ) {
    const pageObjId = toObjectId(pageId, 'Mã trang không hợp lệ');
    return this.toPage(
      { pageId: pageObjId },
      viewerId,
      options,
    );
  }

  /** Dòng thời gian thảo luận của một Hội nhóm */
  async getGroupPosts(
    viewerId: string,
    groupId: string,
    options: { limit?: number; after?: string },
  ) {
    const groupObjId = toObjectId(groupId, 'Mã nhóm không hợp lệ');
    return this.toPage(
      { groupId: groupObjId },
      viewerId,
      options,
    );
  }

  /** Ảnh gần đây của một người (cho khung "Ảnh" ở hồ sơ bao gồm ảnh bài viết, ảnh bìa, avatar). */
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
      .limit(max * 2)
      .select('images')
      .lean<{ _id: Types.ObjectId; images: string[] }[]>()
      .exec();
    const postPhotos = rows.flatMap((r) =>
      r.images.map((url) => ({ postId: r._id.toString(), url })),
    );

    // Lấy thêm ảnh từ thông tin hồ sơ: cover, avatar và kho lưu trữ photos
    const targetUser = await this.usersService.findById(targetUserId).catch(() => null);
    const userPhotosList: { postId: string; url: string }[] = [];

    if (targetUser?.cover && typeof targetUser.cover === 'string' && targetUser.cover.trim()) {
      userPhotosList.push({ postId: 'cover', url: targetUser.cover.trim() });
    }
    if (targetUser?.avatar && typeof targetUser.avatar === 'string' && targetUser.avatar.trim()) {
      userPhotosList.push({ postId: 'avatar', url: targetUser.avatar.trim() });
    }
    if (Array.isArray((targetUser as any)?.photos)) {
      const storedPhotos = (targetUser as any).photos as string[];
      for (let i = storedPhotos.length - 1; i >= 0; i--) {
        const p = storedPhotos[i];
        if (typeof p === 'string' && p.trim()) {
          userPhotosList.push({ postId: 'profile', url: p.trim() });
        }
      }
    }

    // Kết hợp và lọc trùng lặp URL
    const seen = new Set<string>();
    const result: { postId: string; url: string }[] = [];

    for (const item of [...postPhotos, ...userPhotosList]) {
      const normalized = item.url.trim();
      if (!normalized || seen.has(normalized)) continue;
      seen.add(normalized);
      result.push({ postId: item.postId, url: normalized });
      if (result.length >= max) break;
    }

    return result;
  }

  async getPost(viewerId: string, postId: string): Promise<PostView> {
    const post = await this.loadVisiblePost(postId, viewerId);
    const [view] = await this.hydratePosts([post], viewerId);
    return view;
  }

  // ───────────────────────── Tạo / xóa / chia sẻ ─────────────────────────

  /**
   * Trích xuất danh sách ID người dùng được nhắc tên (@[Name](userId), @[Name], hoặc @Name)
   */
  private async extractMentionedUserIds(content: string, authorId: string): Promise<string[]> {
    if (!content) return [];
    const userIds = new Set<string>();

    // 1. Tag có kèm ID: @[Name](userId)
    const idMatches = Array.from(content.matchAll(/@\[([^\]]+)\]\(([a-f0-9]{24})\)/gi));
    for (const m of idMatches) {
      if (m[2] && m[2] !== authorId) userIds.add(m[2]);
    }

    // 2. Tag trong ngoặc không có ID: @[Name]
    const bracketMatches = Array.from(content.matchAll(/@\[([^\]]+)\](?!\()/gi));
    // 3. Tag thông thường: @Tên
    const plainMatches = Array.from(
      content.matchAll(/@([a-zA-Z0-9_\u00C0-\u024F\u1EA0-\u1EF9]+(?:\s[a-zA-Z0-9_\u00C0-\u024F\u1EA0-\u1EF9]+)?)/gi),
    );

    const nameCandidates = new Set<string>();
    for (const m of bracketMatches) {
      if (m[1]?.trim()) nameCandidates.add(m[1].trim());
    }
    for (const m of plainMatches) {
      const n = m[1]?.trim();
      if (n && n.toLowerCase() !== 'aura') nameCandidates.add(n);
    }

    if (nameCandidates.size > 0) {
      // Ưu tiên tìm trong danh sách bạn bè của tác giả
      const friendIds = await this.getFriendIds(authorId).catch(() => [] as Types.ObjectId[]);
      const friends = friendIds.length
        ? await this.usersService.findByIds(friendIds.map((f) => f.toString()))
        : [];
      const friendMap = new Map<string, string>();
      for (const f of friends) {
        if (f.name) friendMap.set(f.name.toLowerCase().trim(), f._id.toString());
      }

      for (const name of nameCandidates) {
        const lower = name.toLowerCase();
        if (friendMap.has(lower)) {
          const fid = friendMap.get(lower)!;
          if (fid !== authorId) userIds.add(fid);
        } else {
          // Thử tìm trong toàn bộ hệ thống
          const found = await this.usersService.findByName(name).catch(() => null);
          if (found && found._id.toString() !== authorId) {
            userIds.add(found._id.toString());
          }
        }
      }
    }

    return Array.from(userIds);
  }

  async createPost(authorId: string, dto: CreatePostDto): Promise<PostView> {
    const content = (dto.content ?? '').trim();
    const images = dto.images ?? [];
    if (!content && images.length === 0) {
      throw new BadRequestException('Bài viết cần có nội dung hoặc ít nhất một ảnh');
    }
    let isSensitive = false;
    let moderationStatus: 'approved' | 'flagged' | 'rejected' = 'approved';
    if (dto.groupId && this.groupModel) {
      const group = await this.groupModel.findById(dto.groupId).exec();
      if (!group || group.isDeleted) {
        throw new NotFoundException('Hội nhóm không tồn tại');
      }
      if (group.bannedPostingUserIds?.some((b) => b.toString() === authorId)) {
        throw new ForbiddenException('Bạn đã bị quản trị viên khóa quyền đăng bài trong nhóm này');
      }
      const isMember = group.members?.some((m) => m.toString() === authorId);
      if (group.privacy === 'private' && !isMember) {
        throw new ForbiddenException('Bạn phải là thành viên để đăng bài trong nhóm này');
      }
    }
    let toxicityScore = 0;
    let moderationReason = '';
    if (this.moderationService && content) {
      const modResult = this.moderationService.moderateText(content);
      toxicityScore = modResult.toxicityScore;
      if (modResult.action === 'BLOCK' || modResult.action === 'FLAG_REVIEW') {
        isSensitive = true;
        moderationStatus = 'flagged';
        moderationReason = modResult.reason || modResult.flags.join(', ');
      }
    }
    const created = await this.postModel.create({
      authorId: new Types.ObjectId(authorId),
      content,
      images,
      privacy: dto.privacy ?? 'friends',
      pageId: dto.pageId ? new Types.ObjectId(dto.pageId) : undefined,
      groupId: dto.groupId ? new Types.ObjectId(dto.groupId) : undefined,
      isSensitive,
      moderationStatus,
      toxicityScore,
      moderationReason,
    });
    if (images.length > 0) {
      await this.usersService
        .findByIdAndUpdate(authorId, {
          $addToSet: { photos: { $each: images } },
        } as any)
        .catch(() => {});
    }

    // Gửi thông báo cho người dùng được nhắc đến trong bài viết
    if (content && this.notificationsService) {
      try {
        const author = await this.usersService.findById(authorId);
        const authorName = author?.name || 'Ai đó';
        const taggedUserIds = await this.extractMentionedUserIds(content, authorId);
        for (const taggedUserId of taggedUserIds) {
          void this.notificationsService.createNotification({
            recipientId: taggedUserId,
            actorId: authorId,
            type: 'mention',
            title: 'Bạn được nhắc đến trong một bài viết',
            content: `${authorName} đã nhắc đến bạn trong một bài viết: "${content.slice(0, 80)}"`,
            link: `/profile/${authorId}`,
            metadata: {
              postId: created._id.toString(),
            },
          }).catch(() => {});
        }
      } catch (err) {
        this.logger.warn(`Lỗi khi gửi thông báo nhắc tên bài viết: ${(err as Error)?.message}`);
      }
    }

    const view = await this.getPost(authorId, created._id.toString());
    this.emitRealtimePost('post:new', view, authorId);
    return view;
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

    const view = await this.getPost(viewerId, post._id.toString());
    this.emitRealtimePost('post:updated', view, viewerId);
    return view;
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
    try {
      this.chatGateway?.server?.emit('post:deleted', { postId: post._id.toString() });
    } catch {}
    if (post.sharedPostId) {
      // Chỉ giảm lượt chia sẻ khi tài khoản này không còn bài chia sẻ nào khác của bài gốc đó
      const remainingCount = await this.postModel
        .countDocuments({
          sharedPostId: post.sharedPostId,
          authorId: post.authorId,
          _id: { $ne: post._id },
          isDeleted: false,
        })
        .exec();
      if (remainingCount === 0) {
        await this.postModel
          .updateOne({ _id: post.sharedPostId, shareCount: { $gt: 0 } }, { $inc: { shareCount: -1 } })
          .exec();
        try {
          const root = await this.postModel
            .findById(post.sharedPostId)
            .select('shareCount')
            .lean<{ shareCount?: number }>()
            .exec();
          this.chatGateway?.server?.emit('post:share_count_updated', {
            postId: post.sharedPostId.toString(),
            shareCount: root?.shareCount ?? 0,
          });
        } catch {}
      }
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
    // Cho phép chia sẻ bài viết ở chế độ Bạn bè (friends) và Công khai (public); cấm chia sẻ bài Chỉ mình tôi (only_me)
    if (!isOwn && target.privacy === 'only_me') {
      throw new ForbiddenException('Bài viết ở chế độ riêng tư không cho phép chia sẻ lại');
    }

    // Kiểm tra xem tài khoản này đã từng chia sẻ bài gốc này hay chưa
    const alreadyShared = await this.postModel
      .exists({
        sharedPostId: target._id,
        authorId: new Types.ObjectId(viewerId),
        isDeleted: false,
      })
      .exec();

    const created = await this.postModel.create({
      authorId: new Types.ObjectId(viewerId),
      content: (dto.content ?? '').trim(),
      images: [],
      privacy: dto.privacy ?? 'friends',
      sharedPostId: target._id,
    });

    // Mỗi tài khoản chỉ đóng góp đúng 1 lượt chia sẻ; chia sẻ lại lần sau không cộng dồn thêm
    if (!alreadyShared) {
      await this.postModel.updateOne({ _id: target._id }, { $inc: { shareCount: 1 } }).exec();
    }

    // Gửi thông báo realtime cho tác giả bài viết gốc nếu không phải tự chia sẻ bài của mình
    if (target.authorId.toString() !== viewerId && this.notificationsService) {
      const viewer = await this.usersService.findById(viewerId);
      const viewerName = viewer?.name || 'Ai đó';
      void this.notificationsService
        .createNotification({
          recipientId: target.authorId.toString(),
          actorId: viewerId,
          type: 'post_share',
          title: 'Bài viết của bạn được chia sẻ',
          content: `${viewerName} đã chia sẻ bài viết của bạn lên dòng thời gian.`,
          link: `/profile/${viewerId}`,
          metadata: {
            postId: target._id.toString(),
            originalPostId: target._id.toString(),
            sharedPostId: created._id.toString(),
          },
        })
        .catch(() => {});
    }

    const view = await this.getPost(viewerId, created._id.toString());
    this.emitRealtimePost('post:new', view, viewerId);
    if (!alreadyShared) {
      try {
        const freshTarget = await this.postModel
          .findById(target._id)
          .select('shareCount')
          .lean<{ shareCount?: number }>()
          .exec();
        this.chatGateway?.server?.emit('post:share_count_updated', {
          postId: target._id.toString(),
          shareCount: freshTarget?.shareCount ?? 0,
        });
      } catch {}
    }
    return view;
  }

  // ───────────────────────── Thích ─────────────────────────

  /** Bật/tắt thích hoặc đổi loại cảm xúc (like, love, care, haha, wow, sad, angry). */
  async toggleLike(
    viewerId: string,
    postId: string,
    reactionType: ReactionType = 'like',
  ) {
    const post = await this.loadVisiblePost(postId, viewerId);
    const userId = new Types.ObjectId(viewerId);

    const existing = await this.likeModel.findOne({ postId: post._id, userId }).exec();
    let liked: boolean;
    let myReaction: ReactionType | null = null;

    if (existing) {
      if (existing.type === reactionType) {
        // Hủy thích (cùng reaction)
        await this.likeModel.deleteOne({ _id: existing._id }).exec();
        liked = false;
        myReaction = null;
        await this.postModel
          .updateOne(
            { _id: post._id, likeCount: { $gt: 0 } },
            {
              $inc: {
                likeCount: -1,
                [`reactionsCount.${reactionType}`]: -1,
              },
            },
          )
          .exec();
      } else {
        // Đổi loại cảm xúc (ví dụ từ like sang love)
        const oldType = existing.type || 'like';
        existing.type = reactionType;
        await existing.save();
        liked = true;
        myReaction = reactionType;
        await this.postModel
          .updateOne(
            { _id: post._id },
            {
              $inc: {
                [`reactionsCount.${oldType}`]: -1,
                [`reactionsCount.${reactionType}`]: 1,
              },
            },
          )
          .exec();
      }
    } else {
      try {
        await this.likeModel.create({ postId: post._id, userId, type: reactionType });
        liked = true;
        myReaction = reactionType;
        await this.postModel
          .updateOne(
            { _id: post._id },
            {
              $inc: {
                likeCount: 1,
                [`reactionsCount.${reactionType}`]: 1,
              },
            },
          )
          .exec();
      } catch (err) {
        if ((err as { code?: number }).code !== 11000) throw err;
        liked = true;
        myReaction = reactionType;
      }
    }

    const fresh = await this.postModel
      .findById(post._id)
      .select('likeCount reactionsCount')
      .lean<{ likeCount: number; reactionsCount?: Record<string, number> }>()
      .exec();

    // Phát socket realtime cập nhật số like / cảm xúc cho tất cả người xem
    try {
      this.chatGateway?.server?.emit('post:reaction', {
        postId: post._id.toString(),
        likeCount: fresh?.likeCount ?? 0,
        reactionsCount: fresh?.reactionsCount ?? {},
        userId: viewerId,
        reactionType: myReaction,
        liked,
      });
    } catch {}

    // Gửi thông báo realtime cho tác giả bài viết khi có người thả cảm xúc
    if (liked && post.authorId.toString() !== viewerId && this.notificationsService) {
      const viewer = await this.usersService.findById(viewerId);
      const viewerName = viewer?.name || 'Ai đó';
      const reactionDescriptions: Record<string, string> = {
        like: 'thích bài viết của bạn.',
        love: 'thả tim bài viết của bạn.',
        care: 'bày tỏ cảm xúc thương thương với bài viết của bạn.',
        haha: 'thả haha vào bài viết của bạn.',
        wow: 'bày tỏ ngạc nhiên về bài viết của bạn.',
        sad: 'bày tỏ cảm xúc buồn về bài viết của bạn.',
        angry: 'thả phẫn nộ vào bài viết của bạn.',
      };
      const desc = reactionDescriptions[reactionType] || 'thích bài viết của bạn.';
      void this.notificationsService
        .createNotification({
          recipientId: post.authorId.toString(),
          actorId: viewerId,
          type: 'post_like',
          title: 'Tương tác mới về bài viết',
          content: `${viewerName} đã ${desc}`,
          link: `/profile/${post.authorId.toString()}`,
          metadata: { postId: post._id.toString(), reactionType },
        })
        .catch(() => {});
    }

    return {
      success: true,
      liked,
      myReaction,
      likeCount: fresh?.likeCount ?? 0,
      reactionsCount: fresh?.reactionsCount ?? {},
    };
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
    const items = pageRows.map((r) => this.toCommentView(r, authors, viewerId));
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
    if (post.groupId && this.groupModel) {
      const group = await this.groupModel.findById(post.groupId).exec();
      if (group) {
        if (group.mutedCommentUserIds?.some((m) => m.toString() === viewerId)) {
          throw new ForbiddenException('Bạn đã bị quản trị viên khóa quyền bình luận trong nhóm này');
        }
      }
    }
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

    // Gửi thông báo cho chủ bài viết (nếu không phải tự bình luận bài của mình)
    if (post.authorId.toString() !== viewerId && this.notificationsService) {
      const author = authors.get(viewerId);
      const authorName = author?.name || 'Ai đó';
      const commentSnippet = content ? `"${content.slice(0, 80)}"` : 'bằng một tệp phương tiện';
      void this.notificationsService.createNotification({
        recipientId: post.authorId.toString(),
        actorId: viewerId,
        type: 'post_comment',
        title: 'Bình luận mới về bài viết',
        content: `${authorName} đã bình luận về bài viết của bạn: ${commentSnippet}`,
        link: `/profile/${post.authorId.toString()}`,
        metadata: { postId: post._id.toString(), commentId: created._id.toString() },
      }).catch(() => {});
    }

    // Gửi thông báo cho người dùng được nhắc đến
    if (content && this.notificationsService) {
      const author = authors.get(viewerId);
      const authorName = author?.name || 'Ai đó';
      const taggedUserIds = await this.extractMentionedUserIds(content, viewerId);
      for (const taggedUserId of taggedUserIds) {
        if (taggedUserId !== post.authorId.toString()) {
          void this.notificationsService.createNotification({
            recipientId: taggedUserId,
            actorId: viewerId,
            type: 'mention',
            title: 'Bạn được nhắc đến trong một bình luận',
            content: `${authorName} đã nhắc đến bạn: "${content.slice(0, 80)}"`,
            link: `/profile/${post.authorId.toString()}`,
            metadata: {
              postId: post._id.toString(),
              commentId: created._id.toString(),
            },
          }).catch(() => {});
        }
      }
    }

    const commentView = this.toCommentView(created, authors, viewerId);
    try {
      const updatedPost = await this.postModel
        .findById(post._id)
        .select('commentCount')
        .lean<{ commentCount: number }>()
        .exec();
      this.chatGateway?.server?.emit('post:comment', {
        postId: post._id.toString(),
        commentCount: updatedPost?.commentCount ?? 0,
        comment: commentView,
      });
    } catch {}

    return commentView;
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
      try {
        const updatedPost = await this.postModel
          .findById(post._id)
          .select('commentCount')
          .lean<{ commentCount: number }>()
          .exec();
        this.chatGateway?.server?.emit('post:comment_deleted', {
          postId: post._id.toString(),
          commentCount: updatedPost?.commentCount ?? 0,
          commentId,
        });
      } catch {}
    }
    return { success: true, message: 'Đã xóa bình luận' };
  }

  /** Bật/tắt thích hoặc thả cảm xúc cho bình luận. */
  async toggleCommentReaction(
    viewerId: string,
    postId: string,
    commentId: string,
    reactionType: ReactionType = 'like',
  ) {
    const post = await this.loadVisiblePost(postId, viewerId);
    const comment = await this.commentModel.findOne({
      _id: toObjectId(commentId, 'Mã bình luận không hợp lệ'),
      postId: post._id,
    });
    if (!comment) throw new NotFoundException('Bình luận không tồn tại');

    if (!comment.reactions) {
      comment.reactions = [];
    }
    const existingIndex = comment.reactions.findIndex(
      (r) => r.userId.toString() === viewerId,
    );

    let liked: boolean;
    let myReaction: ReactionType | null = null;

    if (existingIndex > -1) {
      if (comment.reactions[existingIndex].type === reactionType) {
        // Hủy thích (cùng reaction)
        comment.reactions.splice(existingIndex, 1);
        comment.likeCount = Math.max(0, (comment.likeCount ?? 1) - 1);
        liked = false;
        myReaction = null;
      } else {
        // Đổi loại cảm xúc
        comment.reactions[existingIndex].type = reactionType;
        comment.reactions[existingIndex].createdAt = new Date();
        liked = true;
        myReaction = reactionType;
      }
    } else {
      comment.reactions.push({
        userId: new Types.ObjectId(viewerId),
        type: reactionType,
        createdAt: new Date(),
      });
      comment.likeCount = (comment.likeCount ?? 0) + 1;
      liked = true;
      myReaction = reactionType;
    }

    await comment.save();

    const reactionsCount: Record<string, number> = {};
    for (const r of comment.reactions) {
      reactionsCount[r.type] = (reactionsCount[r.type] || 0) + 1;
    }

    return {
      success: true,
      liked,
      myReaction,
      likeCount: comment.likeCount ?? comment.reactions.length,
      reactionsCount,
    };
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
    viewerId?: string,
  ): CommentView {
    const reactions = row.reactions || [];
    const myReactionObj = viewerId
      ? reactions.find((r) => r.userId.toString() === viewerId)
      : undefined;
    const reactionsCount: Record<string, number> = {};
    for (const r of reactions) {
      reactionsCount[r.type] = (reactionsCount[r.type] || 0) + 1;
    }

    return {
      _id: row._id.toString(),
      postId: row.postId.toString(),
      author: authors.get(row.authorId.toString()) ?? PostsService.unknownAuthor(row.authorId),
      content: row.content,
      mediaUrl: row.mediaUrl,
      mediaType: row.mediaType,
      createdAt: row.createdAt,
      likeCount: row.likeCount ?? reactions.length,
      likedByMe: Boolean(myReactionObj),
      myReaction: (myReactionObj?.type as ReactionType) || null,
      reactionsCount,
    };
  }
}
