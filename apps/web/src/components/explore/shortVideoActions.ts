import type { PostView, ReactionType } from "@/services/postsApi";

type ReactionState = Pick<PostView, "likedByMe" | "myReaction" | "likeCount" | "reactionsCount">;

export function nextLoveReaction(post: ReactionState): ReactionState {
  const removingLove = post.likedByMe && post.myReaction === "love";
  const counts: Record<string, number> = { ...post.reactionsCount };

  if (post.likedByMe) {
    const previous = post.myReaction ?? "like";
    counts[previous] = Math.max(0, (counts[previous] ?? 0) - 1);
  }
  if (!removingLove) counts.love = (counts.love ?? 0) + 1;

  return {
    likedByMe: !removingLove,
    myReaction: removingLove ? null : "love",
    likeCount: Math.max(0, post.likeCount + (removingLove ? -1 : post.likedByMe ? 0 : 1)),
    reactionsCount: counts as Record<ReactionType, number>,
  };
}

export function externalShareableVideoUrl(
  post: Pick<PostView, "privacy" | "isSensitive">,
  videoUrl: string | null,
): string | null {
  return post.privacy === "public" && !post.isSensitive ? videoUrl : null;
}

export function videoShareLinks(videoUrl: string) {
  const facebook = new URL("https://www.facebook.com/sharer/sharer.php");
  facebook.searchParams.set("u", videoUrl);

  const x = new URL("https://x.com/intent/tweet");
  x.searchParams.set("url", videoUrl);

  const whatsapp = new URL("https://wa.me/");
  whatsapp.searchParams.set("text", videoUrl);

  const telegram = new URL("https://t.me/share/url");
  telegram.searchParams.set("url", videoUrl);

  return {
    facebook: facebook.toString(),
    x: x.toString(),
    whatsapp: whatsapp.toString(),
    telegram: telegram.toString(),
  };
}
