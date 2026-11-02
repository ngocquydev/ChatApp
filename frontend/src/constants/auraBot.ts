import type { ChatUser } from "@/store/useChatStore";

export const AURA_BOT_ID = "666666666666666666666666";

export const AURA_BOT_USER: ChatUser = {
  _id: AURA_BOT_ID,
  id: AURA_BOT_ID,
  name: "Aura AI",
  email: "aura.bot@chatapp.internal",
  avatar: "/assets/avatars/aura-bot.svg",
  bio: "Trợ lý ảo AI thông minh trên nền tảng Groq Cloud (Llama 3.3 70B Versatile) & RAG",
  role: "bot",
};

export function isAuraBot(userId?: string | null, name?: string | null): boolean {
  if (!userId && !name) return false;
  if (userId && String(userId) === AURA_BOT_ID) return true;
  if (name && (name.toLowerCase() === "aura ai" || name.toLowerCase() === "aura")) return true;
  return false;
}

