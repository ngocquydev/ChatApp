import { describe, expect, it } from 'vitest';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import {
  SummarizeCommentsDto,
  SummarizeChatDto,
  AskAuraDto,
} from './gemini.dto.js';

describe('Gemini DTOs Validation', () => {
  describe('SummarizeCommentsDto', () => {
    it('chấp nhận payload hợp lệ với postId chuẩn MongoId', async () => {
      const dto = plainToInstance(SummarizeCommentsDto, {
        postId: '507f1f77bcf86cd799439011',
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('báo lỗi khi thiếu postId', async () => {
      const dto = plainToInstance(SummarizeCommentsDto, {});
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('báo lỗi khi postId không phải MongoId', async () => {
      const dto = plainToInstance(SummarizeCommentsDto, {
        postId: 'invalid-id-123',
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('SummarizeChatDto', () => {
    it('chấp nhận payload hợp lệ với conversationId chuẩn MongoId', async () => {
      const dto = plainToInstance(SummarizeChatDto, {
        conversationId: '507f1f77bcf86cd799439011',
        limit: 25,
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('báo lỗi khi thiếu conversationId', async () => {
      const dto = plainToInstance(SummarizeChatDto, { limit: 20 });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('báo lỗi khi limit vượt quá 50 hoặc nhỏ hơn 5', async () => {
      const dtoOver = plainToInstance(SummarizeChatDto, {
        conversationId: '507f1f77bcf86cd799439011',
        limit: 100,
      });
      const errorsOver = await validate(dtoOver);
      expect(errorsOver.length).toBeGreaterThan(0);

      const dtoUnder = plainToInstance(SummarizeChatDto, {
        conversationId: '507f1f77bcf86cd799439011',
        limit: 2,
      });
      const errorsUnder = await validate(dtoUnder);
      expect(errorsUnder.length).toBeGreaterThan(0);
    });
  });

  describe('AskAuraDto', () => {
    it('chấp nhận payload hợp lệ có prompt', async () => {
      const dto = plainToInstance(AskAuraDto, {
        prompt: 'Xin chào Aura',
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('báo lỗi khi prompt để trống', async () => {
      const dto = plainToInstance(AskAuraDto, {
        prompt: '',
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });
});

