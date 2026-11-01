import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { ChatService } from './chat.service.js';

describe('ChatService', () => {
  let service: ChatService;
  let mockConversationModel: {
    findOne: ReturnType<typeof vi.fn>;
    find: ReturnType<typeof vi.fn>;
    findById: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
  };
  let mockMessageModel: {
    find: ReturnType<typeof vi.fn>;
    findById: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    updateMany: ReturnType<typeof vi.fn>;
  };
  let mockUsersService: {
    findById: ReturnType<typeof vi.fn>;
  };

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
      findById: vi.fn(),
      create: vi.fn(),
      updateMany: vi.fn(),
    };

    mockUsersService = {
      findById: vi.fn(),
    };

    service = new ChatService(
      mockConversationModel as unknown as never,
      mockMessageModel as unknown as never,
      mockUsersService as unknown as never,
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

    it('should throw BadRequestException if conversation is blocked', async () => {
      mockUsersService.findById.mockResolvedValue({ _id: userBId, name: 'User B' });
      const mockConv = {
        _id: conversationId,
        participants: [new Types.ObjectId(userAId), new Types.ObjectId(userBId)],
        blockedBy: new Types.ObjectId(userBId),
      };
      vi.spyOn(service, 'getOrCreateConversation').mockResolvedValue(mockConv as unknown as never);

      await expect(
        service.saveMessage(userAId, userBId, 'Xin chào!'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should save message and update conversation lastMessage & unread count', async () => {
      mockUsersService.findById.mockResolvedValue({ _id: userBId, name: 'User B' });

      const mockConv = {
        _id: conversationId,
        participants: [new Types.ObjectId(userAId), new Types.ObjectId(userBId)],
        unreadCounts: new Map<string, number>([[userBId, 0]]),
        lastMessage: null as unknown as { text?: string },
        save: vi.fn().mockResolvedValue(true),
      };

      vi.spyOn(service, 'getOrCreateConversation').mockResolvedValue(mockConv as unknown as never);

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

    it('should save location message with coordinates and address', async () => {
      mockUsersService.findById.mockResolvedValue({ _id: userBId, name: 'User B' });
      const mockConv = {
        _id: conversationId,
        participants: [new Types.ObjectId(userAId), new Types.ObjectId(userBId)],
        unreadCounts: new Map<string, number>([[userBId, 0]]),
        lastMessage: null as unknown as { text?: string; type?: string },
        save: vi.fn().mockResolvedValue(true),
      };
      vi.spyOn(service, 'getOrCreateConversation').mockResolvedValue(mockConv as unknown as never);

      const locationData = {
        latitude: 21.0285,
        longitude: 105.8542,
        address: 'Hà Nội, Việt Nam',
        name: 'Hồ Hoàn Kiếm',
      };

      const createdLocationMsg = {
        _id: new Types.ObjectId(),
        conversationId: new Types.ObjectId(conversationId),
        senderId: new Types.ObjectId(userAId),
        receiverId: new Types.ObjectId(userBId),
        text: '📍 Hồ Hoàn Kiếm',
        type: 'location',
        location: locationData,
      };
      mockMessageModel.create.mockResolvedValue(createdLocationMsg);

      const result = await service.saveMessage(
        userAId,
        userBId,
        '📍 Hồ Hoàn Kiếm',
        conversationId,
        {
          type: 'location',
          location: locationData,
        },
      );

      expect(result.type).toBe('location');
      expect(result.location?.latitude).toBe(21.0285);
      expect(mockMessageModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'location',
          location: locationData,
        }),
      );
      expect(mockConv.lastMessage).toEqual(
        expect.objectContaining({
          type: 'location',
          text: '📍 Hà Nội, Việt Nam',
        }),
      );
    });

    it('should update live location coordinates and active state', async () => {
      const msgId = new Types.ObjectId().toString();
      const mockLiveMsg = {
        _id: msgId,
        senderId: new Types.ObjectId(userAId),
        type: 'location',
        location: {
          latitude: 10.82,
          longitude: 106.63,
          address: 'Gò Vấp, TP.HCM',
          isLive: true,
          isLiveActive: true,
        },
        markModified: vi.fn(),
        save: vi.fn().mockResolvedValue(true),
      };
      mockMessageModel.findById.mockResolvedValue(mockLiveMsg);

      const res = await service.updateLiveLocation(msgId, userAId, {
        latitude: 10.825,
        longitude: 106.635,
        address: 'Bình Thạnh, TP.HCM',
        isLiveActive: true,
      });

      expect(res?.location?.latitude).toBe(10.825);
      expect(res?.location?.longitude).toBe(106.635);
      expect(mockLiveMsg.markModified).toHaveBeenCalledWith('location');
      expect(mockLiveMsg.save).toHaveBeenCalled();
    });

    it('should keep last coordinates when stopping live location without coordinates', async () => {
      const msgId = new Types.ObjectId().toString();
      const mockLiveMsg = {
        _id: msgId,
        senderId: new Types.ObjectId(userAId),
        type: 'location',
        location: {
          latitude: 10.82,
          longitude: 106.63,
          isLive: true,
          isLiveActive: true,
        },
        markModified: vi.fn(),
        save: vi.fn().mockResolvedValue(true),
      };
      mockMessageModel.findById.mockResolvedValue(mockLiveMsg);

      const res = await service.updateLiveLocation(msgId, userAId, { isLiveActive: false });

      expect(res?.location?.latitude).toBe(10.82);
      expect(res?.location?.longitude).toBe(106.63);
      expect(res?.location?.isLiveActive).toBe(false);
    });

    it('should save call message with callLog metadata and formatted text', async () => {
      mockUsersService.findById.mockResolvedValue({ _id: userBId, name: 'User B' });
      const mockConv = {
        _id: conversationId,
        participants: [new Types.ObjectId(userAId), new Types.ObjectId(userBId)],
        unreadCounts: new Map<string, number>([[userBId, 0]]),
        lastMessage: null as unknown as { text?: string },
        save: vi.fn().mockResolvedValue(true),
      };
      vi.spyOn(service, 'getOrCreateConversation').mockResolvedValue(mockConv as unknown as never);

      const createdCallMsg = {
        _id: new Types.ObjectId(),
        conversationId: new Types.ObjectId(conversationId),
        senderId: new Types.ObjectId(userAId),
        receiverId: new Types.ObjectId(userBId),
        text: '📞 Cuộc gọi thoại (02:15)',
        type: 'call',
        callLog: {
          callType: 'audio',
          status: 'completed',
          duration: 135,
        },
      };
      mockMessageModel.create.mockResolvedValue(createdCallMsg);

      const result = await service.saveCallMessage(
        userAId,
        userBId,
        'audio',
        'completed',
        135,
      );

      expect(result).toEqual(createdCallMsg);
      expect(mockMessageModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'call',
          callLog: {
            callType: 'audio',
            status: 'completed',
            duration: 135,
          },
        }),
      );
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

  describe('block & unblock conversation', () => {
    it('should block conversation successfully', async () => {
      const mockConv = {
        _id: conversationId,
        participants: [new Types.ObjectId(userAId), new Types.ObjectId(userBId)],
        blockedBy: null as unknown,
        save: vi.fn().mockResolvedValue(true),
      };
      mockConversationModel.findById.mockResolvedValue(mockConv);

      const result = await service.blockConversation(conversationId, userAId);
      expect(result.blockedBy?.toString()).toBe(userAId);
      expect(mockConv.save).toHaveBeenCalled();
    });

    it('should unblock conversation successfully if requested by blocker', async () => {
      const mockConv = {
        _id: conversationId,
        participants: [new Types.ObjectId(userAId), new Types.ObjectId(userBId)],
        blockedBy: new Types.ObjectId(userAId),
        save: vi.fn().mockResolvedValue(true),
      };
      mockConversationModel.findById.mockResolvedValue(mockConv);

      const result = await service.unblockConversation(conversationId, userAId);
      expect(result.blockedBy).toBeNull();
      expect(mockConv.save).toHaveBeenCalled();
    });

    it('should throw ForbiddenException if non-blocker attempts unblock', async () => {
      const mockConv = {
        _id: conversationId,
        participants: [new Types.ObjectId(userAId), new Types.ObjectId(userBId)],
        blockedBy: new Types.ObjectId(userAId),
        save: vi.fn().mockResolvedValue(true),
      };
      mockConversationModel.findById.mockResolvedValue(mockConv);

      await expect(service.unblockConversation(conversationId, userBId)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('restrictConversation', () => {
    it('should restrict conversation', async () => {
      const mockConv = {
        _id: conversationId,
        participants: [new Types.ObjectId(userAId), new Types.ObjectId(userBId)],
        restrictedBy: [] as Types.ObjectId[],
        save: vi.fn().mockResolvedValue(true),
      };
      mockConversationModel.findById.mockResolvedValue(mockConv);

      const result = await service.restrictConversation(conversationId, userAId, true);
      expect(result.restrictedBy.some((id) => id.toString() === userAId)).toBe(true);
      expect(mockConv.save).toHaveBeenCalled();
    });

    it('should unrestrict conversation', async () => {
      const mockConv = {
        _id: conversationId,
        participants: [new Types.ObjectId(userAId), new Types.ObjectId(userBId)],
        restrictedBy: [new Types.ObjectId(userAId)],
        save: vi.fn().mockResolvedValue(true),
      };
      mockConversationModel.findById.mockResolvedValue(mockConv);

      const result = await service.restrictConversation(conversationId, userAId, false);
      expect(result.restrictedBy.some((id) => id.toString() === userAId)).toBe(false);
      expect(mockConv.save).toHaveBeenCalled();
    });
  });

  describe('updateConversationTheme', () => {
    it('should update theme successfully', async () => {
      const mockConv = {
        _id: conversationId,
        participants: [new Types.ObjectId(userAId), new Types.ObjectId(userBId)],
        theme: 'default',
        save: vi.fn().mockResolvedValue(true),
      };
      mockConversationModel.findById.mockResolvedValue(mockConv);

      const result = await service.updateConversationTheme(conversationId, userAId, 'dating');
      expect(result.theme).toBe('dating');
      expect(mockConv.save).toHaveBeenCalled();
    });

    it('should throw BadRequestException if theme is invalid', async () => {
      const mockConv = {
        _id: conversationId,
        participants: [new Types.ObjectId(userAId), new Types.ObjectId(userBId)],
        theme: 'default',
        save: vi.fn().mockResolvedValue(true),
      };
      mockConversationModel.findById.mockResolvedValue(mockConv);

      await expect(
        service.updateConversationTheme(conversationId, userAId, 'invalid-theme'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('deleteMessage', () => {
    it('should mark message as deleted', async () => {
      const msgId = new Types.ObjectId().toString();
      const mockMsg = {
        _id: msgId,
        conversationId: new Types.ObjectId(conversationId),
        senderId: new Types.ObjectId(userAId),
        text: 'Xin chào',
        isDeleted: false,
        save: vi.fn().mockResolvedValue(true),
      };
      mockMessageModel.findById.mockResolvedValue(mockMsg);
      mockConversationModel.findById.mockResolvedValue(null);

      const result = await service.deleteMessage(msgId, userAId);
      expect(result.isDeleted).toBe(true);
      expect(result.text).toBe('Tin nhắn đã bị thu hồi');
      expect(mockMsg.save).toHaveBeenCalled();
    });

    it('should throw ForbiddenException if user deletes message sent by someone else', async () => {
      const msgId = new Types.ObjectId().toString();
      const mockMsg = {
        _id: msgId,
        conversationId: new Types.ObjectId(conversationId),
        senderId: new Types.ObjectId(userAId),
        text: 'Tin nhắn người khác',
        save: vi.fn().mockResolvedValue(true),
      };
      mockMessageModel.findById.mockResolvedValue(mockMsg);

      await expect(service.deleteMessage(msgId, userBId)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('reactToMessage', () => {
    it('should add reaction to message successfully', async () => {
      const msgId = new Types.ObjectId().toString();
      const mockMsg = {
        _id: new Types.ObjectId(msgId),
        conversationId: new Types.ObjectId(conversationId),
        senderId: new Types.ObjectId(userAId),
        receiverId: new Types.ObjectId(userBId),
        reactions: [] as { userId: Types.ObjectId; type: string }[],
        save: vi.fn().mockResolvedValue(true),
      };
      mockMessageModel.findById.mockResolvedValue(mockMsg);

      const result = await service.reactToMessage(msgId, userBId, 'haha');
      expect(result.reactions.length).toBe(1);
      expect(result.reactions[0].type).toBe('haha');
      expect(mockMsg.save).toHaveBeenCalled();
    });

    it('should toggle off reaction when reacting with same type', async () => {
      const msgId = new Types.ObjectId().toString();
      const mockMsg = {
        _id: new Types.ObjectId(msgId),
        conversationId: new Types.ObjectId(conversationId),
        senderId: new Types.ObjectId(userAId),
        receiverId: new Types.ObjectId(userBId),
        reactions: [
          { userId: new Types.ObjectId(userBId), type: 'haha' },
        ],
        save: vi.fn().mockResolvedValue(true),
      };
      mockMessageModel.findById.mockResolvedValue(mockMsg);

      const result = await service.reactToMessage(msgId, userBId, 'haha');
      expect(result.reactions.length).toBe(0);
      expect(mockMsg.save).toHaveBeenCalled();
    });

    it('should switch reaction when reacting with different type', async () => {
      const msgId = new Types.ObjectId().toString();
      const mockMsg = {
        _id: new Types.ObjectId(msgId),
        conversationId: new Types.ObjectId(conversationId),
        senderId: new Types.ObjectId(userAId),
        receiverId: new Types.ObjectId(userBId),
        reactions: [
          { userId: new Types.ObjectId(userBId), type: 'like' },
        ],
        save: vi.fn().mockResolvedValue(true),
      };
      mockMessageModel.findById.mockResolvedValue(mockMsg);

      const result = await service.reactToMessage(msgId, userBId, 'love');
      expect(result.reactions.length).toBe(1);
      expect(result.reactions[0].type).toBe('love');
      expect(mockMsg.save).toHaveBeenCalled();
    });

    it('should throw BadRequestException for invalid reaction type', async () => {
      const msgId = new Types.ObjectId().toString();
      await expect(service.reactToMessage(msgId, userAId, 'unknown_emotion')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw ForbiddenException if user is not in conversation', async () => {
      const msgId = new Types.ObjectId().toString();
      const outsiderId = new Types.ObjectId().toString();
      const mockMsg = {
        _id: new Types.ObjectId(msgId),
        conversationId: new Types.ObjectId(conversationId),
        senderId: new Types.ObjectId(userAId),
        receiverId: new Types.ObjectId(userBId),
        reactions: [],
        save: vi.fn(),
      };
      mockMessageModel.findById.mockResolvedValue(mockMsg);

      await expect(service.reactToMessage(msgId, outsiderId, 'like')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});
