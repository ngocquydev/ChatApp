import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { ChatService } from './chat.service.js';

describe('ChatService', () => {
  let service: ChatService;
  let mockConversationModel: any;
  let mockMessageModel: any;
  let mockUsersService: any;

  const userAId = new Types.ObjectId().toString();
  const userBId = new Types.ObjectId().toString();
  const conversationId = new Types.ObjectId().toString();

  beforeEach(() => {
    mockConversationModel = {
      findOne: vi.fn(),
      find: vi.fn(),
      findById: vi.fn(),
      create: vi.fn(),
      save: vi.fn(),
    };

    mockMessageModel = {
      find: vi.fn(),
      create: vi.fn(),
      updateMany: vi.fn(),
    };

    mockUsersService = {
      findById: vi.fn(),
    };

    service = new ChatService(
      mockConversationModel as any,
      mockMessageModel as any,
      mockUsersService as any,
    );
  });

  describe('getOrCreateConversation', () => {
    it('should throw BadRequestException if chatting with self', async () => {
      await expect(service.getOrCreateConversation(userAId, userAId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should return existing conversation if one already exists', async () => {
      const existingConv = {
        _id: conversationId,
        participants: [new Types.ObjectId(userAId), new Types.ObjectId(userBId)],
      };
      mockConversationModel.findOne.mockReturnValue({
        populate: vi.fn().mockResolvedValue(existingConv),
      });

      const result = await service.getOrCreateConversation(userAId, userBId);
      expect(result).toEqual(existingConv);
      expect(mockConversationModel.findOne).toHaveBeenCalled();
    });

    it('should create new conversation if none exists', async () => {
      mockConversationModel.findOne.mockReturnValue({
        populate: vi.fn().mockResolvedValue(null),
      });

      const newConv = {
        _id: conversationId,
        participants: [new Types.ObjectId(userAId), new Types.ObjectId(userBId)],
        unreadCounts: new Map(),
      };
      mockConversationModel.create.mockResolvedValue(newConv);
      mockConversationModel.findById.mockReturnValue({
        populate: vi.fn().mockResolvedValue(newConv),
      });

      const result = await service.getOrCreateConversation(userAId, userBId);
      expect(result).toBeDefined();
      expect(mockConversationModel.create).toHaveBeenCalled();
    });
  });

  describe('saveMessage', () => {
    it('should throw NotFoundException if receiver does not exist', async () => {
      mockUsersService.findById.mockResolvedValue(null);

      await expect(
        service.saveMessage(userAId, userBId, 'Xin chào!'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should save message and update conversation lastMessage & unread count', async () => {
      mockUsersService.findById.mockResolvedValue({ _id: userBId, name: 'User B' });

      const mockConv = {
        _id: conversationId,
        participants: [new Types.ObjectId(userAId), new Types.ObjectId(userBId)],
        unreadCounts: new Map<string, number>([[userBId, 0]]),
        lastMessage: null,
        save: vi.fn().mockResolvedValue(true),
      };

      vi.spyOn(service, 'getOrCreateConversation').mockResolvedValue(mockConv as any);

      const createdMsg = {
        _id: new Types.ObjectId(),
        conversationId: new Types.ObjectId(conversationId),
        senderId: new Types.ObjectId(userAId),
        receiverId: new Types.ObjectId(userBId),
        text: 'Xin chào!',
        readAt: null,
        createdAt: new Date(),
      };
      mockMessageModel.create.mockResolvedValue(createdMsg);

      const result = await service.saveMessage(userAId, userBId, 'Xin chào!');
      expect(result).toEqual(createdMsg);
      expect(mockConv.save).toHaveBeenCalled();
      expect(mockConv.lastMessage?.text).toBe('Xin chào!');
    });
  });

  describe('markAsRead', () => {
    it('should update unread messages to read and reset unreadCount', async () => {
      const mockConv = {
        _id: conversationId,
        participants: [new Types.ObjectId(userAId), new Types.ObjectId(userBId)],
        unreadCounts: new Map<string, number>([[userAId, 3]]),
        save: vi.fn().mockResolvedValue(true),
      };
      mockConversationModel.findById.mockResolvedValue(mockConv);
      mockMessageModel.updateMany.mockResolvedValue({ modifiedCount: 3 });

      const result = await service.markAsRead(conversationId, userAId);
      expect(result.success).toBe(true);
      expect(mockMessageModel.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          conversationId: expect.anything(),
          receiverId: expect.anything(),
          readAt: null,
        }),
        expect.objectContaining({
          $set: expect.objectContaining({ readAt: expect.any(Date) }),
        }),
      );
      expect(mockConv.save).toHaveBeenCalled();
    });

    it('should throw ForbiddenException if user is not in conversation', async () => {
      const otherUserId = new Types.ObjectId().toString();
      const mockConv = {
        _id: conversationId,
        participants: [new Types.ObjectId(userAId), new Types.ObjectId(userBId)],
      };
      mockConversationModel.findById.mockResolvedValue(mockConv);

      await expect(service.markAsRead(conversationId, otherUserId)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});
