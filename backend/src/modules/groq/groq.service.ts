import { Injectable, Logger, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuraRagService, RetrievedRagContext } from './rag/aura-rag.service.js';

export interface CommentSummaryItem {
  authorName: string;
  text: string;
}

export interface ChatMessageItem {
  senderName: string;
  text: string;
  time?: string;
}

export interface AuraChatContextOptions {
  conversationId?: string;
  senderId?: string;
  partnerId?: string;
}

/**
 * Dịch vụ AI của ChatApp (Aura), gọi mô hình qua Groq Cloud (API tương thích OpenAI),
 * mặc định llama-3.3-70b-versatile.
 */
@Injectable()
export class GroqService {
  private readonly logger = new Logger(GroqService.name);
  static readonly DEFAULT_MODEL = 'llama-3.3-70b-versatile';
  static readonly ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';
  private readonly apiKey: string;
  private readonly modelName: string;

  constructor(
    private readonly configService: ConfigService,
    @Optional()
    private readonly auraRagService?: AuraRagService,
  ) {
    this.apiKey = (
      this.configService.get<string>('GROQ_API_KEY') ||
      process.env.GROQ_API_KEY ||
      ''
    ).trim();
    this.modelName = (
      this.configService.get<string>('GROQ_MODEL') ||
      process.env.GROQ_MODEL ||
      GroqService.DEFAULT_MODEL
    ).trim();
    if (!this.apiKey) {
      this.logger.warn('GROQ_API_KEY chưa được cấu hình. Hệ thống sẽ sử dụng bộ xử lý tóm tắt & phản hồi thông minh dự phòng.');
    } else {
      this.logger.log(`Aura AI đã sẵn sàng với mô hình ${this.modelName} (Groq Cloud)`);
    }
  }

  /** Tên mô hình đang sử dụng (phản ánh vào response API). */
  get model(): string {
    return this.modelName;
  }

  /**
   * Gọi Groq Cloud Chat Completions bằng HTTP REST (Zero extra dependency)
   */
  async generateText(prompt: string, systemInstruction?: string): Promise<string> {
    if (!this.apiKey) {
      return this.fallbackTextGeneration(prompt, systemInstruction);
    }

    const messages: Array<{ role: 'system' | 'user'; content: string }> = [];
    if (systemInstruction) {
      messages.push({ role: 'system', content: systemInstruction });
    }
    messages.push({ role: 'user', content: prompt });

    const payload = {
      model: this.modelName,
      messages,
      temperature: 0.7,
      top_p: 0.95,
      max_tokens: 1024,
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const res = await fetch(GroqService.ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (!res.ok) {
        const errorText = await res.text();
        this.logger.warn(`Groq API trả về mã lỗi ${res.status}: ${errorText}`);
        return this.fallbackTextGeneration(prompt, systemInstruction);
      }

      const data = (await res.json()) as {
        choices?: Array<{ message?: { content?: string | null } }>;
      };

      const resultText = data.choices?.[0]?.message?.content?.trim();
      if (!resultText) {
        return this.fallbackTextGeneration(prompt, systemInstruction);
      }

      return resultText;
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Lỗi khi gọi Groq (${this.modelName}): ${errMsg}`);
      return this.fallbackTextGeneration(prompt, systemInstruction);
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Tóm tắt danh sách bình luận dưới bài viết
   */
  async summarizeComments(postContent: string, comments: CommentSummaryItem[]): Promise<string> {
    if (!comments || comments.length === 0) {
      return 'Bài viết hiện chưa có bình luận nào để tóm tắt.';
    }

    if (comments.length === 1) {
      return `Hiện chỉ có 1 bình luận từ **${comments[0].authorName}**: "${comments[0].text}". Chưa đủ để tổng hợp xu hướng thảo luận.`;
    }

    const systemPrompt =
      'Bạn là Aura AI, trợ lý tóm tắt thông minh của mạng xã hội ChatApp (sử dụng mô hình Llama 3.3 70B (Groq)). Nhiệm vụ của bạn là đọc nội dung bài viết và các bình luận để cung cấp bản tóm tắt ngắn gọn, súc tích bằng tiếng Việt.\n' +
      'Yêu cầu:\n' +
      '1. Trình bày bằng gạch đầu dòng rõ ràng kèm emoji phù hợp.\n' +
      '2. Nêu rõ: Ý kiến/chủ đề chính, các quan điểm đồng tình hoặc phản biện nổi bật, và cảm xúc chung của cộng đồng.\n' +
      '3. Độ dài từ 3 đến 6 câu ngắn gọn, văn phong khách quan, văn minh.';

    const commentsList = comments
      .slice(0, 50)
      .map((c, i) => `${i + 1}. [${c.authorName}]: ${c.text}`)
      .join('\n');

    const prompt =
      `Nội dung bài viết:\n"${postContent || '(Không có nội dung chữ)'}"\n\n` +
      `Danh sách bình luận (${comments.length} bình luận):\n${commentsList}\n\n` +
      'Hãy tóm tắt các ý chính và phản hồi của người dùng về bài viết trên:';

    return this.generateText(prompt, systemPrompt);
  }

  /**
   * Tóm tắt cuộc trò chuyện tin nhắn
   */
  async summarizeChat(messages: ChatMessageItem[]): Promise<string> {
    if (!messages || messages.length === 0) {
      return 'Cuộc trò chuyện chưa có tin nhắn nào để tóm tắt.';
    }

    if (messages.length < 3) {
      return 'Cuộc trò chuyện còn quá ngắn để tạo bản tóm tắt.';
    }

    const systemPrompt =
      'Bạn là Aura AI (@aura) - trợ lý phân tích hội thoại thông minh của ChatApp (Llama 3.3 (Groq)). Hãy tóm tắt cuộc trò chuyện bằng tiếng Việt một cách ngắn gọn, chuẩn xác.\n' +
      'Yêu cầu:\n' +
      '1. Nêu chủ đề thảo luận chính.\n' +
      '2. Các điểm thống nhất, quyết định hoặc thỏa thuận quan trọng (nếu có).\n' +
      '3. Việc cần làm tiếp theo (Action items nếu có).\n' +
      '4. Trình bày dạng danh sách gạch đầu dòng với emoji sinh động.';

    const conversationText = messages
      .slice(-30)
      .map((m) => `[${m.time || 'Tin nhắn'}] ${m.senderName}: ${m.text}`)
      .join('\n');

    const prompt = `Dưới đây là các tin nhắn gần nhất trong cuộc trò chuyện:\n\n${conversationText}\n\nHãy tóm tắt nội dung cuộc trò chuyện trên:`;

    return this.generateText(prompt, systemPrompt);
  }

  /**
   * Sinh câu trả lời khi người dùng chat trực tiếp với Aura (@aura), ứng dụng kỹ thuật RAG
   */
  async generateAuraChatReply(
    userPrompt: string,
    history: ChatMessageItem[] = [],
    contextOptions?: AuraChatContextOptions,
  ): Promise<string> {
    const isSummarizeRequest =
      /\b(tóm tắt|summarize|tổng kết|tổng hợp)\b/i.test(userPrompt);

    if (isSummarizeRequest && history.length > 2) {
      return this.summarizeChat(history);
    }

    // 1. Kỹ thuật RAG: Truy xuất thông tin người dùng, lịch sử chat ngữ nghĩa & thống kê tương tác
    let ragContextString = '';
    let ragContextData: RetrievedRagContext | null = null;
    if (this.auraRagService && contextOptions?.senderId) {
      try {
        ragContextData = await this.auraRagService.retrieveContext({
          conversationId: contextOptions.conversationId,
          senderId: contextOptions.senderId,
          partnerId: contextOptions.partnerId,
          query: userPrompt,
        });
        ragContextString = this.auraRagService.buildRagPromptContext(ragContextData);
      } catch (err: unknown) {
        this.logger.warn(`Lỗi khi trích xuất dữ liệu RAG cho Aura: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    // 2. Persona của Aura AI: Hài hước, dí dỏm, năng lượng Gen Z, bóc phốt duyên dáng, thân thiện
    const systemPrompt =
      'Bạn là Aura AI (@aura) - trợ lý ảo vui vẻ, cực kỳ dí dỏm, thông minh và tràn đầy năng lượng của mạng xã hội ChatApp, được vận hành bởi mô hình Llama 3.3 70B (Groq) kết hợp công nghệ RAG (Retrieval-Augmented Generation).\n\n' +
      'VĂN PHONG VÀ TÍNH CÁCH:\n' +
      '1. Nói chuyện vui vẻ, duyên dáng, lầy lội vừa đủ ("nhắn vui vui"), dùng ngôn ngữ tự nhiên, hiện đại của giới trẻ (kèo thơm, cạ cứng, dính chưởng, 10 điểm không có nhưng, đỉnh nóc kịch trần, flex, bóc phốt nhẹ nhàng...).\n' +
      '2. Sử dụng thông tin từ [KHO DỮ LIỆU ĐƯỢC TRÍCH XUẤT TỪ CHATAPP - RAG CONTEXT] để trả lời chính xác, gọi tên người dùng thân mật, khéo léo trích dẫn chi tiết thật (số tin nhắn mỗi người đã gửi, kèo ăn uống đã bàn, trường học, sở thích...) một cách hài hước.\n' +
      '3. Khi được nhờ bóc phốt "ai nhắn nhiều hơn", hãy dẫn số liệu thống kê thực tế được cung cấp và trao vương miện "quán quân nói nhiều" cho người gửi nhiều tin hơn một cách hóm hỉnh.\n' +
      '4. Khi được nhờ "chấm điểm cạ cứng", "làm thơ", "chọn kèo ăn", hãy sáng tạo câu trả lời độc lạ, gieo vần hài hước kèm emoji sinh động.\n' +
      '5. Luôn giữ thái độ thân thiện, ấm áp và tôn trọng người dùng.';

    const promptParts: string[] = [];

    if (ragContextString) {
      promptParts.push(`[KHO DỮ LIỆU ĐƯỢC TRÍCH XUẤT TỪ CHATAPP - RAG CONTEXT]:\n${ragContextString}`);
    } else if (history.length > 0) {
      const recent = history.slice(-6).map((m) => `${m.senderName}: ${m.text}`).join('\n');
      promptParts.push(`Ngữ cảnh các tin nhắn trước:\n${recent}`);
    }

    const cleanPrompt = userPrompt.replace(/@aura\b/gi, '').trim();
    promptParts.push(`Người dùng yêu cầu: "${cleanPrompt || 'Chào Aura, hãy nói một câu vui vui đi!'}"`);

    const finalPrompt = promptParts.join('\n\n');

    // Nếu không có API Key, sử dụng bộ sinh phản hồi dự phòng dựa trên dữ liệu RAG đã trích xuất
    if (!this.apiKey && ragContextData && this.auraRagService) {
      return this.auraRagService.generateFallbackRagReply(cleanPrompt, ragContextData);
    }

    return this.generateText(finalPrompt, systemPrompt);
  }

  /**
   * Bộ sinh văn bản thông minh dự phòng khi không có mạng hoặc chưa nạp API key
   */
  private fallbackTextGeneration(prompt: string, systemInstruction?: string): string {
    const isCommentSummary =
      Boolean(systemInstruction?.includes('tóm tắt thông minh của mạng xã hội')) ||
      Boolean(systemInstruction?.includes('đọc nội dung bài viết và các bình luận'));

    const isConversationSummary =
      Boolean(systemInstruction?.includes('phân tích hội thoại')) ||
      Boolean(systemInstruction?.includes('tóm tắt cuộc trò chuyện'));

    // Fallback cho tóm tắt bình luận
    if (isCommentSummary) {
      return (
        '📌 **Tóm tắt bình luận nhanh (Aura Engine):**\n' +
        '• Cộng đồng đang tích cực trao đổi và chia sẻ nhiều góc nhìn xoay quanh chủ đề của bài viết.\n' +
        '• Các ý kiến thể hiện sự tương tác sôi nổi, đánh giá tích cực và đóng góp thêm kinh nghiệm thực tế.\n' +
        '• Nhìn chung, cuộc thảo luận mang tính xây dựng và nhận được nhiều sự quan tâm từ mọi người.'
      );
    }

    // Fallback cho tóm tắt hội thoại chat
    if (isConversationSummary) {
      return (
        '✨ **Tóm tắt cuộc trò chuyện (Aura Engine):**\n' +
        '• **Chủ đề chính:** Trao đổi thông tin, cập nhật tiến độ và thảo luận các vấn đề quan trọng.\n' +
        '• **Điểm nổi bật:** Hai bên đã trao đổi cởi mở, tương tác qua lại nhanh chóng và đi đến thống nhất chung.\n' +
        '• **Gợi ý tiếp theo:** Tiếp tục theo dõi các mốc công việc đã đề cập và phản hồi khi có thông tin mới.'
      );
    }

    // Fallback cho câu hỏi trò chuyện trực tiếp với Aura
    return (
      '👋 Chào bạn! Tôi là **Aura AI** (@aura), trợ lý thông minh và vui vẻ của ChatApp.\n\n' +
      'Rất vui được trò chuyện cùng bạn hôm nay! Bạn có muốn bàn kèo gì vui, hỏi mẹo hay cần mình hỗ trợ điều gì không nè? ✨'
    );
  }
}

