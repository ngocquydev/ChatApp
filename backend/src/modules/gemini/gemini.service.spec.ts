import { describe, it, expect, beforeEach } from 'vitest';
import { ConfigService } from '@nestjs/config';
import { GeminiService } from './gemini.service.js';

describe('GeminiService', () => {
  let service: GeminiService;
  let configService: ConfigService;

  beforeEach(() => {
    configService = new ConfigService();
    service = new GeminiService(configService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('summarizeComments', () => {
    it('should return empty notice if no comments', async () => {
      const result = await service.summarizeComments('Post content', []);
      expect(result).toContain('chưa có bình luận');
    });

    it('should return single comment note if only 1 comment', async () => {
      const result = await service.summarizeComments('Post content', [
        { authorName: 'Nguyễn Văn A', text: 'Tuyệt vời!' },
      ]);
      expect(result).toContain('Nguyễn Văn A');
      expect(result).toContain('Tuyệt vời!');
    });

    it('should produce structured summary for multiple comments', async () => {
      const result = await service.summarizeComments('Chia sẻ về du lịch Đà Nẵng', [
        { authorName: 'An', text: 'Cảnh đẹp lắm mọi người ơi, nên đi cầu Vàng' },
        { authorName: 'Bình', text: 'Đồ ăn ngon và giá cả rất hợp lý' },
        { authorName: 'Cúc', text: 'Thời tiết mùa này đi có bị mưa không ạ?' },
      ]);
      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(20);
    });
  });

  describe('summarizeChat', () => {
    it('should return notice for empty chat messages', async () => {
      const result = await service.summarizeChat([]);
      expect(result).toContain('chưa có tin nhắn');
    });

    it('should return notice for very short chat', async () => {
      const result = await service.summarizeChat([
        { senderName: 'An', text: 'Alo' },
        { senderName: 'Bình', text: 'Ơi nghe' },
      ]);
      expect(result).toContain('quá ngắn');
    });

    it('should produce structured chat summary for longer conversations', async () => {
      const result = await service.summarizeChat([
        { senderName: 'An', text: 'Mai mấy giờ họp nhóm thế mọi người?' },
        { senderName: 'Bình', text: 'Chốt 9h sáng nhé, online qua Google Meet' },
        { senderName: 'Cúc', text: 'Ok mình sẽ chuẩn bị slide báo cáo phần UI' },
        { senderName: 'An', text: 'Nhất trí, mai gặp lại nhé!' },
      ]);
      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(20);
    });
  });

  describe('generateAuraChatReply', () => {
    it('should return helpful response for user query', async () => {
      const reply = await service.generateAuraChatReply('@aura Xin chào, bạn là ai?');
      expect(reply).toBeDefined();
      expect(reply).toContain('Aura');
    });

    it('should handle summarize request via @aura mention', async () => {
      const reply = await service.generateAuraChatReply('@aura tóm tắt giúp tôi', [
        { senderName: 'An', text: 'Dự án đã hoàn thành các mục chính' },
        { senderName: 'Bình', text: 'Chuẩn bị tiến hành kiểm thử và triển khai' },
        { senderName: 'Cúc', text: 'Đã sẵn sàng rồi nhé' },
      ]);
      expect(reply).toBeDefined();
      expect(reply.length).toBeGreaterThan(20);
    });
  });
});

