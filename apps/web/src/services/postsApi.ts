import axios from "axios";
import api from "./api";
import { requestGraphQL } from "./graphqlApi";
export { GraphQLQueryError as PostQueryError } from "./graphqlApi";

export type PostPrivacy = "public" | "friends" | "only_me";

export interface PostAuthor {
  _id: string;
  name: string;
  avatar?: string;
}

export interface SharedPostView {
  _id: string;
  author: PostAuthor;
  content: string;
  images: string[];
  privacy: PostPrivacy;
  createdAt?: string;
  shareCount?: number;
}

export type ReactionType = "like" | "love" | "care" | "haha" | "wow" | "sad" | "angry";

export interface PostView {
  _id: string;
  author: PostAuthor;
  content: string;
  images: string[];
  privacy: PostPrivacy;
  createdAt?: string;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  likedByMe: boolean;
  myReaction?: ReactionType | null;
  reactionsCount?: Record<ReactionType, number>;
  sharedPost: SharedPostView | { unavailable: true } | null;
  isSensitive?: boolean;
  moderationStatus?: "approved" | "flagged" | "rejected";
  moderationReason?: string;
  toxicityScore?: number;
  pageId?: string;
  groupId?: string;
}

export interface CommentView {
  _id: string;
  postId: string;
  author: PostAuthor;
  content: string;
  mediaUrl?: string;
  mediaType?: "image" | "video";
  createdAt?: string;
  likeCount?: number;
  likedByMe?: boolean;
  myReaction?: ReactionType | null;
  reactionsCount?: Record<ReactionType, number>;
}

export interface CursorPage<T> {
  items: T[];
  hasMore: boolean;
  nextCursor: string | null;
}

export interface PublicProfile {
  user: {
    _id: string;
    name: string;
    avatar?: string;
    cover?: string;
    bio?: string;
    school?: string;
    relationshipStatus?: string;
    createdAt?: string;
  };
  relationStatus: "self" | "none" | "pending_sent" | "pending_received" | "friends";
  requestId?: string;
  friendCount: number;
  friendsPreview: PostAuthor[];
}

export interface PhotoItem {
  postId: string;
  url: string;
}

export const MAX_POST_IMAGES = 4;
export const MAX_IMAGE_BYTES = 100 * 1024 * 1024;
export const MAX_FILE_BYTES = 100 * 1024 * 1024; // 100MB
export const POST_MAX_LENGTH = 5000;
export const COMMENT_MAX_LENGTH = 1000;

export function isVideoUrl(url?: string | null): boolean {
  if (!url) return false;
  return /\.(mp4|webm|mov|mkv|avi)(\?.*)?$/i.test(url) || url.includes("/video/upload/");
}

export function isAudioUrl(url?: string | null): boolean {
  if (!url) return false;
  return /\.(mp3|wav|ogg|m4a|aac|flac|wma)(\?.*)?$/i.test(url);
}

export function isFileDocUrl(url?: string | null): boolean {
  if (!url) return false;
  if (isVideoUrl(url) || isAudioUrl(url)) return false;
  if (url.includes("/raw/upload/")) return true;
  return /\.(pdf|doc|docx|xls|xlsx|ppt|pptx|txt|csv|zip|rar|7z|tar|gz|json|xml)(\?.*)?$/i.test(url);
}

export function getFileNameFromUrl(url?: string | null): string {
  if (!url) return "";
  try {
    const pathname = new URL(url).pathname;
    const segments = pathname.split("/");
    const last = segments[segments.length - 1];
    return decodeURIComponent(last || "");
  } catch {
    const parts = url.split("/");
    return parts[parts.length - 1] || "file";
  }
}

export function formatFileSize(bytes?: number): string {
  if (!bytes || bytes <= 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
export function mediaUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  const base = (api.defaults.baseURL ?? "").replace(/\/$/, "");
  return `${base}${path}`;
}

export function isSharedPostAvailable(
  shared: PostView["sharedPost"],
): shared is SharedPostView {
  return !!shared && !("unavailable" in shared);
}

export function apiErrorMessage(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err)) {
    if (!err.response) return "Không kết nối được máy chủ. Hãy kiểm tra mạng rồi thử lại.";
    const message = (err.response.data as { message?: string | string[] } | undefined)?.message;
    if (typeof message === "string" && message) return message;
    if (Array.isArray(message) && message[0]) return message[0];
    if (err.response.status === 413) return "Tệp quá lớn.";
  }
  return fallback;
}

interface PageOptions {
  limit?: number;
  after?: string | null;
}

const pageParams = ({ limit, after }: PageOptions) => ({
  ...(limit ? { limit } : {}),
  ...(after ? { after } : {}),
});

type GraphQLPost = Omit<PostView, "sharedPost"> & {
  sharedPost: (SharedPostView & { unavailable?: boolean | null }) | { unavailable: true } | null;
};

const postFields = `
  _id author { _id name avatar } content images privacy createdAt
  likeCount commentCount shareCount likedByMe myReaction
  reactionsCount { like love care haha wow sad angry }
  sharedPost { unavailable _id author { _id name avatar } content images privacy createdAt shareCount }
  isSensitive moderationStatus moderationReason toxicityScore pageId groupId
`;

function mapPostPage(page: CursorPage<GraphQLPost>): CursorPage<PostView> {
  return {
    ...page,
    items: page.items.map(({ sharedPost, ...post }) => ({
      ...post,
      sharedPost: !sharedPost ? null : sharedPost.unavailable ? { unavailable: true } : {
        _id: sharedPost._id,
        author: sharedPost.author,
        content: sharedPost.content,
        images: sharedPost.images,
        privacy: sharedPost.privacy,
        createdAt: sharedPost.createdAt,
        shareCount: sharedPost.shareCount,
      },
    })),
  };
}

export async function fetchFeed(options: PageOptions = {}): Promise<CursorPage<PostView>> {
  const data = await requestGraphQL<{ feed: CursorPage<GraphQLPost> }>(
    `query Feed($limit: Int, $after: String) {
      feed(limit: $limit, after: $after) { items { ${postFields} } hasMore nextCursor }
    }`,
    { limit: options.limit ?? 10, after: options.after ?? null },
  );
  return mapPostPage(data.feed);
}

export async function fetchPagePosts(
  pageId: string,
  options: PageOptions = {},
): Promise<CursorPage<PostView>> {
  const { data } = await api.get(`/posts/page/${pageId}`, { params: pageParams(options) });
  return data;
}

export async function fetchGroupsFeed(
  options: PageOptions = {},
): Promise<CursorPage<PostView>> {
  const { data } = await api.get("/posts/groups/feed", { params: pageParams(options) });
  return data;
}

export async function fetchGroupPosts(
  groupId: string,
  options: PageOptions = {},
): Promise<CursorPage<PostView>> {
  const { data } = await api.get(`/posts/group/${groupId}`, { params: pageParams(options) });
  return data;
}

export async function fetchUserPosts(
  userId: string,
  options: PageOptions = {},
): Promise<CursorPage<PostView>> {
  const data = await requestGraphQL<{ profilePosts: CursorPage<GraphQLPost> }>(
    `query ProfilePosts($userId: String!, $limit: Int, $after: String) {
      profilePosts(userId: $userId, limit: $limit, after: $after) { items { ${postFields} } hasMore nextCursor }
    }`,
    { userId, limit: options.limit ?? 10, after: options.after ?? null },
  );
  return mapPostPage(data.profilePosts);
}

export async function fetchUserPhotos(userId: string, limit = 9): Promise<PhotoItem[]> {
  const { data } = await api.get(`/posts/user/${userId}/photos`, { params: { limit } });
  return data.photos ?? [];
}

export async function fetchPublicProfile(userId: string): Promise<PublicProfile> {
  const data = await requestGraphQL<{ publicProfile: PublicProfile }>(
    `query PublicProfile($userId: String!) {
      publicProfile(userId: $userId) {
        user { _id name avatar cover bio school relationshipStatus createdAt }
        relationStatus requestId friendCount friendsPreview { _id name avatar }
      }
    }`,
    { userId },
  );
  return data.publicProfile;
}

export async function uploadPostImage(file: File): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  
  const { data } = await api.post("/posts/images", form);
  return data.url as string;
}

export async function uploadMedia(file: File): Promise<{ url: string; resource_type?: string }> {
  const form = new FormData();
  form.append("file", file);
  const { data } = await api.post("/upload", form);
  return { url: data.url, resource_type: data.resource_type };
}

export async function uploadAvatar(file: File | Blob): Promise<string> {
  const form = new FormData();
  form.append("file", file, file instanceof File ? file.name : "avatar.jpg");
  const { data } = await api.post("/upload/avatar", form);
  return data.url as string;
}

export async function uploadCover(file: File | Blob): Promise<string> {
  const form = new FormData();
  form.append("file", file, file instanceof File ? file.name : "cover.jpg");
  const { data } = await api.post("/upload/cover", form);
  return data.url as string;
}

export async function createPost(input: {
  content: string;
  images: string[];
  privacy: PostPrivacy;
  pageId?: string;
  groupId?: string;
}): Promise<PostView> {
  const { data } = await api.post("/posts", input);
  return data.post;
}

export async function fetchPost(postId: string): Promise<PostView> {
  const { data } = await api.get(`/posts/${postId}`);
  return data.post;
}

export async function deletePost(postId: string): Promise<void> {
  await api.delete(`/posts/${postId}`);
}

export async function updatePost(
  postId: string,
  input: {
    content?: string;
    images?: string[];
    privacy?: PostPrivacy;
  },
): Promise<PostView> {
  const { data } = await api.patch(`/posts/${postId}`, input);
  return data.post;
}

export async function sharePost(
  postId: string,
  input: { content?: string; privacy: PostPrivacy },
): Promise<PostView> {
  const { data } = await api.post(`/posts/${postId}/share`, input);
  return data.post;
}

export async function toggleLike(
  postId: string,
  type?: ReactionType,
): Promise<{
  liked: boolean;
  likeCount: number;
  myReaction?: ReactionType | null;
  reactionsCount?: Record<ReactionType, number>;
}> {
  const { data } = await api.post(`/posts/${postId}/like`, type ? { type } : {});
  return data;
}

export async function toggleCommentReaction(
  postId: string,
  commentId: string,
  type?: ReactionType,
): Promise<{
  liked: boolean;
  likeCount: number;
  myReaction?: ReactionType | null;
  reactionsCount?: Record<ReactionType, number>;
}> {
  const { data } = await api.post(
    `/posts/${postId}/comments/${commentId}/reaction`,
    type ? { type } : {},
  );
  return data;
}

export async function fetchComments(
  postId: string,
  options: PageOptions = {},
): Promise<CursorPage<CommentView>> {
  const { data } = await api.get(`/posts/${postId}/comments`, { params: pageParams(options) });
  return data;
}

export async function addComment(
  postId: string,
  content?: string,
  media?: { url: string; type?: "image" | "video" },
): Promise<CommentView> {
  const { data } = await api.post(`/posts/${postId}/comments`, {
    content: content || undefined,
    mediaUrl: media?.url,
    mediaType: media?.type,
  });
  return data.comment;
}

export async function deleteComment(postId: string, commentId: string): Promise<void> {
  await api.delete(`/posts/${postId}/comments/${commentId}`);
}

export async function fetchPostLikes(postId: string): Promise<PostAuthor[]> {
  const { data } = await api.get(`/posts/${postId}/likes`);
  return data.users ?? [];
}

export async function fetchPostCommenters(postId: string): Promise<PostAuthor[]> {
  const { data } = await api.get(`/posts/${postId}/commenters`);
  return data.users ?? [];
}

export interface ReportCommentPayload {
  target: "group_admin" | "web_admin";
  reason: string;
  details?: string;
}

export async function reportComment(
  commentId: string,
  payload: ReportCommentPayload,
): Promise<{ success: boolean; message: string }> {
  const { data } = await api.post(`/posts/comments/${commentId}/report`, payload);
  return data;
}
