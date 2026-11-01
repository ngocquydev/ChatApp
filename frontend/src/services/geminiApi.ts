import api from "./api";

export interface CommentSummaryResponse {
  success: boolean;
  summary: string;
  commentCount: number;
  model: string;
}

export interface ChatSummaryResponse {
  success: boolean;
  summary: string;
  messageCount: number;
  model: string;
}

export interface AskAuraResponse {
  success: boolean;
  reply: string;
  model: string;
}

/**
 * Tóm tắt bình luận bài viết bằng Llama 3.3 (Groq)
 */
export async function summarizeComments(postId: string): Promise<CommentSummaryResponse> {
  const res = await api.post<CommentSummaryResponse>("/gemini/summarize-comments", { postId });
  return res.data;
}

/**
 * Tóm tắt cuộc trò chuyện bằng Llama 3.3 (Groq)
 */
export async function summarizeChat(conversationId: string, limit = 30): Promise<ChatSummaryResponse> {
  const res = await api.post<ChatSummaryResponse>("/gemini/summarize-chat", {
    conversationId,
    limit,
  });
  return res.data;
}

/**
 * Hỏi đáp trực tiếp với trợ lý Aura AI
 */
export async function askAura(prompt: string, conversationId?: string): Promise<AskAuraResponse> {
  const res = await api.post<AskAuraResponse>("/gemini/ask-aura", {
    prompt,
    conversationId,
  });
  return res.data;
}

