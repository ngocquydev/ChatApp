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

  /** Lấy API key động từ ConfigService hoặc process.env */
  private getApiKey(): string {
    return (
      process.env.GROQ_API_KEY ||
      this.configService.get<string>('GROQ_API_KEY') ||
      this.apiKey ||
      ''
    ).trim();
  }

  /** Lấy model name động từ ConfigService hoặc process.env */
  private getModelName(): string {
    return (
      process.env.GROQ_MODEL ||
      this.configService.get<string>('GROQ_MODEL') ||
      this.modelName ||
      GroqService.DEFAULT_MODEL
    ).trim();
  }

  /** Tên mô hình đang sử dụng (phản ánh vào response API). */
  get model(): string {
    return this.getModelName();
  }

  /**
   * Gọi Groq Cloud Chat Completions bằng HTTP REST (Zero extra dependency)
   */
  async generateText(prompt: string, systemInstruction?: string): Promise<string> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      return this.fallbackTextGeneration(prompt, systemInstruction);
    }

    const messages: Array<{ role: 'system' | 'user'; content: string }> = [];
    if (systemInstruction) {
      messages.push({ role: 'system', content: systemInstruction });
    }
    messages.push({ role: 'user', content: prompt });

    const payload = {
      model: this.getModelName(),
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
          Authorization: `Bearer ${apiKey}`,
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
   * Sinh văn bản qua Groq API dạng luồng dữ liệu (Stream Chunks)
   */
  async *streamText(prompt: string, systemInstruction?: string): AsyncGenerator<string> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      const fallback = this.fallbackTextGeneration(prompt, systemInstruction);
      for (const chunk of this.chunkString(fallback)) {
        yield chunk;
        await new Promise((r) => setTimeout(r, 45));
      }
      return;
    }

    const messages: Array<{ role: 'system' | 'user'; content: string }> = [];
    if (systemInstruction) {
      messages.push({ role: 'system', content: systemInstruction });
    }
    messages.push({ role: 'user', content: prompt });

    const payload = {
      model: this.getModelName(),
      messages,
      temperature: 0.7,
      top_p: 0.95,
      max_tokens: 1024,
      stream: true,
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);

    try {
      const res = await fetch(GroqService.ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        const errorText = !res.ok ? await res.text() : 'No response body';
        this.logger.warn(`Groq API stream trả về lỗi ${res.status}: ${errorText}`);
        const fallback = this.fallbackTextGeneration(prompt, systemInstruction);
        for (const chunk of this.chunkString(fallback)) {
          yield chunk;
          await new Promise((r) => setTimeout(r, 45));
        }
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data:')) continue;
          const dataStr = trimmed.replace(/^data:\s*/, '');
          if (dataStr === '[DONE]') return;
          try {
            const parsed = JSON.parse(dataStr) as {
              choices?: Array<{ delta?: { content?: string | null } }>;
            };
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              yield delta;
            }
          } catch {
            // bỏ qua chunk JSON chưa hoàn chỉnh
          }
        }
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Lỗi khi stream từ Groq (${this.modelName}): ${errMsg}`);
      const fallback = this.fallbackTextGeneration(prompt, systemInstruction);
      for (const chunk of this.chunkString(fallback)) {
        yield chunk;
        await new Promise((r) => setTimeout(r, 45));
      }
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Chia nhỏ chuỗi thành các chunk từ ngữ tự nhiên kèm khoảng trắng
   */
  private chunkString(text: string): string[] {
    const parts = text.split(/(\s+)/);
    const chunks: string[] = [];
    for (let i = 0; i < parts.length; i += 2) {
      const word = parts[i];
      const space = parts[i + 1] || '';
      if (word || space) {
        chunks.push(word + space);
      }
    }
    return chunks.length > 0 ? chunks : [text];
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

    // 2. Persona của Aura AI: Giống Meta AI - Cực kỳ ngắn gọn, tự nhiên, thân thiện
    const systemPrompt =
      'Bạn là Aura (@aura) - trợ lý trò chuyện trực tiếp của mạng xã hội ChatApp.\n' +
      'QUY TẮC PHẢN HỒI BẮT BUỘC:\n' +
      '1. Trả lời cực kỳ ngắn gọn, súc tích (1-2 câu ngắn, tối đa 3 câu khi giải thích).\n' +
      '2. Khi người dùng chào hỏi ngắn ("chào", "hi", "hello"), chỉ chào lại thật ngắn và tự nhiên (ví dụ: "Chào bạn! 👋 Có gì vui không nè?").\n' +
      '3. Tuyệt đối không tự giới thiệu dài dòng kiểu văn mẫu "Tôi là Aura AI trợ lý ảo...", không lặp lại câu hỏi của người dùng.\n' +
      '4. Giọng điệu thân thiện, tự nhiên như bạn bè nhắn tin với nhau, dùng emoji tinh tế.';

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
    if (!this.getApiKey() && ragContextData && this.auraRagService) {
      return this.auraRagService.generateFallbackRagReply(cleanPrompt, ragContextData);
    }

    return this.generateText(finalPrompt, systemPrompt);
  }

  /**
   * Trả lời trực tiếp của Aura Bot dạng luồng token (Streaming chunks)
   */
  async *streamAuraChatReply(
    userPrompt: string,
    history: ChatMessageItem[] = [],
    contextOptions?: AuraChatContextOptions,
  ): AsyncGenerator<string> {
    const isSummarizeRequest =
      /\b(tóm tắt|summarize|tổng kết|tổng hợp)\b/i.test(userPrompt);

    if (isSummarizeRequest && history.length > 2) {
      const summary = await this.summarizeChat(history);
      for (const chunk of this.chunkString(summary)) {
        yield chunk;
        await new Promise((r) => setTimeout(r, 45));
      }
      return;
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

    // 2. Persona của Aura AI: Giống Meta AI - Cực kỳ ngắn gọn, tự nhiên, thân thiện
    const systemPrompt =
      'Bạn là Aura (@aura) - trợ lý trò chuyện trực tiếp của mạng xã hội ChatApp.\n' +
      'QUY TẮC PHẢN HỒI BẮT BUỘC:\n' +
      '1. Trả lời cực kỳ ngắn gọn, súc tích (1-2 câu ngắn, tối đa 3 câu khi giải thích).\n' +
      '2. Khi người dùng chào hỏi ngắn ("chào", "hi", "hello"), chỉ chào lại thật ngắn và tự nhiên (ví dụ: "Chào bạn! 👋 Có gì vui không nè?").\n' +
      '3. Tuyệt đối không tự giới thiệu dài dòng kiểu văn mẫu "Tôi là Aura AI trợ lý ảo...", không lặp lại câu hỏi của người dùng.\n' +
      '4. Giọng điệu thân thiện, tự nhiên như bạn bè nhắn tin với nhau, dùng emoji tinh tế.';

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
    if (!this.getApiKey() && ragContextData && this.auraRagService) {
      const fallbackRag = this.auraRagService.generateFallbackRagReply(cleanPrompt, ragContextData);
      for (const chunk of this.chunkString(fallbackRag)) {
        yield chunk;
        await new Promise((r) => setTimeout(r, 45));
      }
      return;
    }

    yield* this.streamText(finalPrompt, systemPrompt);
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

    // Fallback cho câu hỏi trò chuyện trực tiếp với Aura (ngắn gọn, tự nhiên chuẩn Meta AI)
    const lower = prompt.toLowerCase();
    if (
      lower.includes('chào') ||
      lower.includes('hi') ||
      lower.includes('hello') ||
      lower.includes('hé lô') ||
      lower.includes('hey')
    ) {
      return 'Chào bạn! Aura đây 👋\nCó gì vui không nè?';
    }

    return 'Chào bạn! Aura đây ✨ Có gì mới hay cần mình giúp không nè?';
  }
}

