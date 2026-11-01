export type ReactionType = "like" | "love" | "care" | "haha" | "wow" | "sad" | "angry";

export interface ReactionDefinition {
  type: ReactionType;
  emoji: string;
  labelVi: string;
  labelEn: string;
  color: string;
}

export const REACTIONS: ReactionDefinition[] = [
  {
    type: "like",
    emoji: "👍",
    labelVi: "Thích",
    labelEn: "Like",
    color: "primary.main",
  },
  {
    type: "love",
    emoji: "❤️",
    labelVi: "Yêu thích",
    labelEn: "Love",
    color: "error.main",
  },
  {
    type: "care",
    emoji: "🥰",
    labelVi: "Thương thương",
    labelEn: "Care",
    color: "warning.main",
  },
  {
    type: "haha",
    emoji: "😆",
    labelVi: "Haha",
    labelEn: "Haha",
    color: "warning.main",
  },
  {
    type: "wow",
    emoji: "😮",
    labelVi: "Wow",
    labelEn: "Wow",
    color: "warning.main",
  },
  {
    type: "sad",
    emoji: "😢",
    labelVi: "Buồn",
    labelEn: "Sad",
    color: "warning.main",
  },
  {
    type: "angry",
    emoji: "😡",
    labelVi: "Phẫn nộ",
    labelEn: "Angry",
    color: "error.dark",
  },
];

export const REACTION_MAP: Record<ReactionType, ReactionDefinition> = REACTIONS.reduce(
  (acc, r) => {
    acc[r.type] = r;
    return acc;
  },
  {} as Record<ReactionType, ReactionDefinition>,
);

