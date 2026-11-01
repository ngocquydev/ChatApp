import { describe, expect, it, vi } from 'vitest';
import { AuraRagService, RetrievedRagContext } from './aura-rag.service.js';

describe('AuraRagService', () => {
  const mockUsersService = {
    findById: vi.fn(),
  };
  const mockMessageModel = {
    countDocuments: vi.fn(),
    find: vi.fn(),
  };
  const mockConversationModel = {
    findById: vi.fn(),
  };
  const mockPostModel = {
    find: vi.fn(),
  };

  const service = new AuraRagService(
    mockUsersService as any,
    mockMessageModel as any,
    mockConversationModel as any,
    mockPostModel as any,
  );

  describe('detectIntent', () => {
    it('nhận diện đúng intent "stats" (bóc phốt / ai nhắn nhiều hơn)', () => {
      expect(service.detectIntent('@aura bóc phốt xem ai nhắn nhiều hơn')).toBe('stats');
      expect(service.detectIntent('ai nói nhiều hơn trong đoạn chat này')).toBe('stats');
    });

    it('nhận diện đúng intent "relationship" (chấm điểm cạ cứng / hợp nhau)', () => {
      expect(service.detectIntent('@aura chấm điểm cạ cứng của hai đứa')).toBe('relationship');
      expect(service.detectIntent('tụi mình có hợp nhau không aura')).toBe('relationship');
    });

    it('nhận diện đúng intent "food_plan" (hôm nọ bàn đi ăn gì / chọn quán)', () => {
      expect(service.detectIntent('@aura hôm nọ tụi mình bàn đi ăn gì ấy nhỉ?')).toBe('food_plan');
      expect(service.detectIntent('chọn giúp một quán lẩu hoặc trà sữa')).toBe('food_plan');
    });

    it('nhận diện đúng intent "poem" (làm thơ con cóc)', () => {
      expect(service.detectIntent('@aura làm bài thơ con cóc về hai đứa')).toBe('poem');
    });

    it('nhận diện đúng intent "app_help" (tính năng / hướng dẫn)', () => {
      expect(service.detectIntent('làm sao để chia sẻ live location trên chatapp')).toBe('app_help');
      expect(service.detectIntent('chatapp có gửi file 100mb được không')).toBe('app_help');
    });

    it('mặc định là "general" cho các câu chào hỏi thông thường', () => {
      expect(service.detectIntent('xin chào aura hôm nay bạn khỏe không')).toBe('general');
    });
  });

  describe('buildRagPromptContext & generateFallbackRagReply', () => {
    const sampleContext: RetrievedRagContext = {
      sender: {
        id: 'user1',
        name: 'Nguyễn Văn A',
        school: 'ĐH Bách Khoa',
        relationshipStatus: 'Đang hẹn hò',
        bio: 'Thích công nghệ và du lịch',
      },
      partner: {
        id: 'user2',
        name: 'Trần Thị B',
        school: 'ĐH Ngoại Thương',
        relationshipStatus: 'Độc thân',
      },
      stats: {
        totalMessages: 50,
        senderCount: 35,
        partnerCount: 15,
        mediaCount: 4,
      },
      relevantMessages: [
        { senderName: 'Nguyễn Văn A', text: 'Cuối tuần này đi ăn bún đậu nha!', time: '28/10' },
      ],
      recentMessages: [
        { senderName: 'Trần Thị B', text: 'Ok chốt kèo bún đậu', time: '10:30' },
      ],
      matchedFeatureDocs: [],
      recentPosts: [
        { authorName: 'Nguyễn Văn A', content: 'Hôm nay trời đẹp quá!' },
      ],
      intent: 'stats',
    };

    it('tạo chuỗi prompt context đầy đủ các section RAG', () => {
      const prompt = service.buildRagPromptContext(sampleContext);
      expect(prompt).toContain('=== THÔNG TIN NGƯỜI THAM GIA ===');
      expect(prompt).toContain('Nguyễn Văn A');
      expect(prompt).toContain('ĐH Bách Khoa');
      expect(prompt).toContain('Trần Thị B');
      expect(prompt).toContain('=== SỐ LIỆU ĐOẠN CHAT THỰC TẾ (CHAT STATS) ===');
      expect(prompt).toContain('35 tin');
      expect(prompt).toContain('15 tin');
      expect(prompt).toContain('=== CÁC TIN NHẮN LIÊN QUAN ĐƯỢC TRÍCH XUẤT TỪ QUÁ KHỨ (RAG RETRIEVED CHAT) ===');
      expect(prompt).toContain('Cuối tuần này đi ăn bún đậu nha!');
    });

    it('tạo câu trả lời fallback vui nhộn dựa trên RAG context stats', () => {
      const reply = service.generateFallbackRagReply('ai nhắn nhiều hơn', sampleContext);
      expect(reply).toContain('Hồ sơ bóc phốt độc quyền từ Aura RAG');
      expect(reply).toContain('Nguyễn Văn A');
      expect(reply).toContain('Trần Thị B');
      expect(reply).toContain('35');
      expect(reply).toContain('15');
    });

    it('tạo câu trả lời fallback vui nhộn cho intent food_plan', () => {
      const foodContext = { ...sampleContext, intent: 'food_plan' as const };
      const reply = service.generateFallbackRagReply('đi ăn gì', foodContext);
      expect(reply).toContain('Thám tử Aura đã lật lại hồ sơ chat');
      expect(reply).toContain('Cuối tuần này đi ăn bún đậu nha!');
    });
  });
});

