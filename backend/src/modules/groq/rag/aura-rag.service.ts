import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { UsersService } from '../../users/users.service.js';
import { Message, MessageDocument } from '../../chat/schemas/message.schema.js';
import { Conversation, ConversationDocument } from '../../chat/schemas/conversation.schema.js';
import { Post, PostDocument } from '../../posts/schemas/post.schema.js';
import { CHATAPP_KNOWLEDGE_BASE, AppFeatureDoc } from './aura-knowledge.constant.js';
import { AURA_BOT_ID } from '../aura-bot.constant.js';

export interface RetrievedParticipant {
  id: string;
  name: string;
  bio?: string;
  school?: string;
  relationshipStatus?: string;
  avatar?: string;
}

export interface ConversationStats {
  totalMessages: number;
  senderCount: number;
  partnerCount: number;
  mediaCount: number;
}

export interface RetrievedRagContext {
  sender: RetrievedParticipant;
  partner?: RetrievedParticipant;
  stats?: ConversationStats;
  relevantMessages: Array<{ senderName: string; text: string; time?: string }>;
  recentMessages: Array<{ senderName: string; text: string; time?: string }>;
  matchedFeatureDocs: AppFeatureDoc[];
  recentPosts: Array<{ authorName: string; content: string }>;
  intent: 'stats' | 'relationship' | 'food_plan' | 'poem' | 'app_help' | 'general';
}

@Injectable()
export class AuraRagService {
  private readonly logger = new Logger(AuraRagService.name);

  constructor(
    private readonly usersService: UsersService,
    @InjectModel(Message.name)
    private readonly messageModel: Model<MessageDocument>,
    @InjectModel(Conversation.name)
    private readonly conversationModel: Model<ConversationDocument>,
    @InjectModel(Post.name)
    private readonly postModel: Model<PostDocument>,
  ) {}

  /**
   * Phân tích ý định người dùng (Intent Detection) từ câu hỏi
   */
  detectIntent(query: string): 'stats' | 'relationship' | 'food_plan' | 'poem' | 'app_help' | 'general' {
    const q = query.toLowerCase();

    if (/(bóc phốt|ai nhắn nhiều hơn|ai nói nhiều hơn|thống kê|soi tin nhắn|ai nhiều chuyện hơn)/i.test(q)) {
      return 'stats';
    }
    if (/(chấm điểm|cạ cứng|hợp nhau|thân thiết|độ thân|tình bạn|bói|tình yêu)/i.test(q)) {
      return 'relationship';
    }
    if (/(ăn gì|ăn uống|đi ăn|đi đâu|kèo|hẹn|quán|lẩu|uống|trà sữa|đi chơi|chốt kèo|hôm nọ|bàn đi)/i.test(q)) {
      return 'food_plan';
    }
    if (/(làm thơ|thơ|rap|bài thơ|thơ con cóc|sáng tác)/i.test(q)) {
      return 'poem';
    }
    if (/(tính năng|chatapp|làm sao|cách|hướng dẫn|app này|location|vị trí|gửi file|gif|theme)/i.test(q)) {
      return 'app_help';
    }

    return 'general';
  }

  /**
   * Truy xuất toàn bộ tri thức & ngữ cảnh (Retrieval Phase) cho RAG
   */
  async retrieveContext(options: {
    conversationId?: string;
    senderId: string;
    partnerId?: string;
    query: string;
  }): Promise<RetrievedRagContext> {
    const { conversationId, senderId, partnerId, query } = options;
    const intent = this.detectIntent(query);

    // 1. Truy xuất thông tin người dùng (Sender & Partner Profiles)
    const senderUser = await this.usersService.findById(senderId);
    const sender: RetrievedParticipant = {
      id: senderId,
      name: senderUser?.name || 'Người dùng',
      bio: senderUser?.bio,
      school: senderUser?.school,
      relationshipStatus: senderUser?.relationshipStatus,
      avatar: senderUser?.avatar,
    };

    let partner: RetrievedParticipant | undefined;
    const effectivePartnerId = partnerId && partnerId !== AURA_BOT_ID ? partnerId : undefined;
    if (effectivePartnerId) {
      const partnerUser = await this.usersService.findById(effectivePartnerId);
      if (partnerUser) {
        partner = {
          id: effectivePartnerId,
          name: partnerUser.name || 'Bạn bè',
          bio: partnerUser.bio,
          school: partnerUser.school,
          relationshipStatus: partnerUser.relationshipStatus,
          avatar: partnerUser.avatar,
        };
      }
    }

    // 2. Truy xuất thống kê & tin nhắn trong đoạn chat nếu có conversationId
    let stats: ConversationStats | undefined;
    const relevantMessages: Array<{ senderName: string; text: string; time?: string }> = [];
    const recentMessages: Array<{ senderName: string; text: string; time?: string }> = [];

    if (conversationId && Types.ObjectId.isValid(conversationId)) {
      const convObjectId = new Types.ObjectId(conversationId);

      // Thống kê số lượng tin nhắn giữa 2 bên
      const [totalCount, senderMsgCount, mediaMsgCount] = await Promise.all([
        this.messageModel.countDocuments({ conversationId: convObjectId }),
        this.messageModel.countDocuments({ conversationId: convObjectId, senderId: new Types.ObjectId(senderId) }),
        this.messageModel.countDocuments({
          conversationId: convObjectId,
          $or: [{ mediaUrl: { $ne: null } }, { type: { $in: ['location', 'call'] } }],
        }),
      ]);

      const partnerMsgCount = Math.max(0, totalCount - senderMsgCount);
      stats = {
        totalMessages: totalCount,
        senderCount: senderMsgCount,
        partnerCount: partnerMsgCount,
        mediaCount: mediaMsgCount,
      };

      // Tên hiển thị người gửi
      const getSenderName = (id: string) => {
        if (id === senderId) return sender.name;
        if (partner && id === partner.id) return partner.name;
        if (id === AURA_BOT_ID) return 'Aura AI';
        return 'Người dùng';
      };

      // Lấy 15 tin nhắn gần nhất (Temporal Context)
      const rawRecent = await this.messageModel
        .find({ conversationId: convObjectId })
        .sort({ createdAt: -1 })
        .limit(15)
        .lean()
        .exec();

      for (const m of rawRecent.reverse()) {
        recentMessages.push({
          senderName: getSenderName(m.senderId.toString()),
          text: m.text,
          time: m.createdAt ? new Date(m.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : undefined,
        });
      }

      // Truy xuất theo từ khóa ngữ nghĩa (Lexical Search) nếu người dùng tìm món ăn / kế hoạch / câu chuyện
      if (intent === 'food_plan' || intent === 'general') {
        const searchRegex = /(ăn|uống|quán|lẩu|hẹn|đi đâu|kèo|hứa|chốt|trà sữa|phở|bún|cà phê|xem phim)/i;
        const matched = await this.messageModel
          .find({ conversationId: convObjectId, text: searchRegex })
          .sort({ createdAt: -1 })
          .limit(8)
          .lean()
          .exec();

        for (const m of matched.reverse()) {
          relevantMessages.push({
            senderName: getSenderName(m.senderId.toString()),
            text: m.text,
            time: m.createdAt ? new Date(m.createdAt).toLocaleDateString('vi-VN') : undefined,
          });
        }
      }
    }

    // 3. Truy xuất kho tri thức ChatApp (Knowledge Base Matching)
    const matchedFeatureDocs: AppFeatureDoc[] = [];
    const queryLower = query.toLowerCase();
    for (const doc of CHATAPP_KNOWLEDGE_BASE) {
      if (doc.keywords.some((kw) => queryLower.includes(kw))) {
        matchedFeatureDocs.push(doc);
      }
    }

    // 4. Truy xuất bài viết mạng xã hội gần nhất của người hỏi
    const recentPosts: Array<{ authorName: string; content: string }> = [];
    try {
      const posts = await this.postModel
        .find({ authorId: new Types.ObjectId(senderId), deletedAt: null })
        .sort({ createdAt: -1 })
        .limit(2)
        .lean()
        .exec();

      for (const p of posts) {
        if (p.content) {
          recentPosts.push({ authorName: sender.name, content: p.content.slice(0, 150) });
        }
      }
    } catch {
      // Bỏ qua nếu lỗi truy vấn post
    }

    return {
      sender,
      partner,
      stats,
      relevantMessages,
      recentMessages,
      matchedFeatureDocs,
      recentPosts,
      intent,
    };
  }

  /**
   * Tạo văn bản ngữ cảnh có cấu trúc (RAG Prompt Augmentation) nạp cho LLM
   */
  buildRagPromptContext(rag: RetrievedRagContext): string {
    const sections: string[] = [];

    // Phần 1: Thông tin người tham gia
    const senderInfo = [
      `- Người hỏi (${rag.sender.name}):`,
      rag.sender.school ? `  • Học vấn / Trường: ${rag.sender.school}` : null,
      rag.sender.relationshipStatus ? `  • Tình trạng mối quan hệ: ${rag.sender.relationshipStatus}` : null,
      rag.sender.bio ? `  • Tiểu sử (Bio): "${rag.sender.bio}"` : null,
    ].filter(Boolean).join('\n');

    let partnerInfo = '';
    if (rag.partner) {
      partnerInfo = [
        `- Bạn cùng chat (${rag.partner.name}):`,
        rag.partner.school ? `  • Học vấn / Trường: ${rag.partner.school}` : null,
        rag.partner.relationshipStatus ? `  • Tình trạng mối quan hệ: ${rag.partner.relationshipStatus}` : null,
        rag.partner.bio ? `  • Tiểu sử (Bio): "${rag.partner.bio}"` : null,
      ].filter(Boolean).join('\n');
    }

    sections.push(`=== THÔNG TIN NGƯỜI THAM GIA ===\n${senderInfo}\n${partnerInfo}`);

    // Phần 2: Thống kê hội thoại (dành cho bóc phốt, so sánh tương tác)
    if (rag.stats && rag.stats.totalMessages > 0) {
      const partnerName = rag.partner?.name || 'Bạn cùng chat';
      sections.push(
        `=== SỐ LIỆU ĐOẠN CHAT THỰC TẾ (CHAT STATS) ===\n` +
        `• Tổng số tin nhắn: ${rag.stats.totalMessages} tin\n` +
        `• ${rag.sender.name} đã gửi: ${rag.stats.senderCount} tin\n` +
        `• ${partnerName} đã gửi: ${rag.stats.partnerCount} tin\n` +
        `• Tệp tin & Media & Vị trí đã trao đổi: ${rag.stats.mediaCount}`
      );
    }

    // Phần 3: Tin nhắn liên quan được trích xuất (Lexical/Semantic Matches)
    if (rag.relevantMessages.length > 0) {
      const msgs = rag.relevantMessages.map((m) => `[${m.time || 'Ngày trước'}] ${m.senderName}: "${m.text}"`).join('\n');
      sections.push(`=== CÁC TIN NHẮN LIÊN QUAN ĐƯỢC TRÍCH XUẤT TỪ QUÁ KHỨ (RAG RETRIEVED CHAT) ===\n${msgs}`);
    }

    // Phần 4: Tin nhắn gần đây nhất
    if (rag.recentMessages.length > 0) {
      const msgs = rag.recentMessages.map((m) => `[${m.time || 'Gần đây'}] ${m.senderName}: "${m.text}"`).join('\n');
      sections.push(`=== CÁC TIN NHẮN GẦN ĐÂY NHẤT ===\n${msgs}`);
    }

    // Phần 5: Tri thức ứng dụng nếu khớp
    if (rag.matchedFeatureDocs.length > 0) {
      const docs = rag.matchedFeatureDocs.map((d) => `• [${d.title}]: ${d.description}. Mẹo: ${d.usageTips}`).join('\n');
      sections.push(`=== TÍNH NĂNG CHATAPP LIÊN QUAN ===\n${docs}`);
    }

    // Phần 6: Bài viết gần đây
    if (rag.recentPosts.length > 0) {
      const posts = rag.recentPosts.map((p) => `• Bài viết của ${p.authorName}: "${p.content}"`).join('\n');
      sections.push(`=== BÀI VIẾT MẠNG XÃ HỘI GẦN ĐÂY ===\n${posts}`);
    }

    return sections.join('\n\n');
  }

  /**
   * Tạo câu trả lời thông minh dự phòng (Rule-based RAG Fallback) khi LLM offline
   */
  generateFallbackRagReply(query: string, rag: RetrievedRagContext): string {
    const pName = rag.partner?.name || 'bạn của bạn';
    const sName = rag.sender.name;

    switch (rag.intent) {
      case 'stats':
        if (rag.stats) {
          const winner = rag.stats.senderCount >= rag.stats.partnerCount ? sName : pName;
          const diff = Math.abs(rag.stats.senderCount - rag.stats.partnerCount);
          return (
            `📊 **Hồ sơ bóc phốt độc quyền từ Aura RAG:**\n\n` +
            `• **${sName}:** đã bắn phá **${rag.stats.senderCount}** tin nhắn 🚀\n` +
            `• **${pName}:** góp vui **${rag.stats.partnerCount}** tin nhắn 🐢\n` +
            `• **Tổng cộng:** ${rag.stats.totalMessages} tin nhắn kèm ${rag.stats.mediaCount} tệp/ảnh.\n\n` +
            `👉 Quán quân 'nói nhiều và nhiệt tình nhất' thuộc về **${winner}** (hơn đối phương tận ${diff} tin)! Mau mau khao trà sữa đền bù đi nha! 😜`
          );
        }
        return `📊 Trong đoạn chat này hai bạn trò chuyện rất rôm rả! Hãy nhắn thêm vài tin nữa để Aura làm báo cáo chi tiết hơn nha! 😉`;

      case 'relationship':
        return (
          `💯 **Bảng điểm cạ cứng từ Aura AI:**\n\n` +
          `• 🎯 **Độ ăn ý:** 9.8 / 10 (tần số trò chuyện cực kỳ đồng điệu)\n` +
          `• ⚡ **Tốc độ rep:** 9.0 / 10 (seen là rep liền, chuẩn bạn thân)\n` +
          `• 🌟 **Đánh giá chung:** Đỉnh nóc kịch trần, 10 điểm không có nhưng!\n\n` +
          `Lời khuyên từ Aura: Giữ chắc tình bạn với ${pName} nha, bạn tốt thời nay khó tìm lắm đó! 🥰`
        );

      case 'food_plan':
        if (rag.relevantMessages.length > 0) {
          const lastMsg = rag.relevantMessages[rag.relevantMessages.length - 1];
          return (
            `🍜 **Thám tử Aura đã lật lại hồ sơ chat:**\n\n` +
            `Hôm trước có tin nhắn nhắc đến: *"${lastMsg.text}"*.\n` +
            `👉 Kèo này còn nợ chưa đi đó nha! Cuối tuần này hai bạn xách balo lên và triển luôn đi thôi! 😋`
          );
        }
        return `🍜 Aura gợi ý hôm nay hai bạn làm chầu lẩu Thái chua cay hoặc trà sữa full topping chém gió đi! Kèo này đảm bảo thơm phức! 🍲🧋`;

      case 'poem':
        return (
          `📜 **Thơ con cóc tặng ${sName} & ${pName}:**\n\n` +
          `ChatApp gặp gỡ chuyện râm ran,\n` +
          `Hai đứa tâm sự suốt cả ngày.\n` +
          `Dù cho bão táp hay mưa gió,\n` +
          `Tình bạn keo sơn mãi đong đầy! 🌸✨`
        );

      case 'app_help':
        if (rag.matchedFeatureDocs.length > 0) {
          const doc = rag.matchedFeatureDocs[0];
          return (
            `⚡ **Mẹo ChatApp cực xịn từ Aura:**\n\n` +
            `• **${doc.title}**: ${doc.description}\n` +
            `👉 **Cách dùng:** ${doc.usageTips} 🚀`
          );
        }
        return `⚡ ChatApp hỗ trợ chia sẻ vị trí trực tiếp, gửi file 100MB, thả 7 cảm xúc Facebook và kho GIF GIPHY triệu view! Bạn muốn Aura chỉ mẹo nào trước nè? 🌟`;

      default:
        return (
          `👋 Chào ${sName}! Aura AI (@aura) luôn đồng hành cùng cuộc trò chuyện của bạn và ${pName}.\n\n` +
          `Bạn có thể gõ các câu vui như:\n` +
          `• \`@aura bóc phốt ai nhắn nhiều hơn\`\n` +
          `• \`@aura chấm điểm cạ cứng\`\n` +
          `• \`@aura hôm nọ tụi mình bàn đi ăn gì?\`\n` +
          `• \`@aura làm bài thơ về hai đứa\` 😜`
        );
    }
  }
}
