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
    updateOne: ReturnType<typeof vi.fn>;
    deleteOne: ReturnType<typeof vi.fn>;
  };
  let mockMessageModel: {
    find: ReturnType<typeof vi.fn>;
    findOne: ReturnType<typeof vi.fn>;
    findById: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    updateMany: ReturnType<typeof vi.fn>;
    deleteMany: ReturnType<typeof vi.fn>;
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
      updateOne: vi.fn().mockReturnValue({ exec: vi.fn().mockResolvedValue({}) }),
      deleteOne: vi.fn().mockReturnValue({ exec: vi.fn().mockResolvedValue({}) }),
    };

    mockMessageModel = {
      find: vi.fn(),
      findOne: vi.fn(),
      findById: vi.fn(),
      create: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn().mockReturnValue({ exec: vi.fn().mockResolvedValue({}) }),
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

  describe('getMessagesPage', () => {
    it('returns the newest page in chronological order with an older cursor', async () => {
      const ids = Array.from({ length: 4 }, () => new Types.ObjectId());
      const messages = ids.map((id, index) => ({
        _id: id,
        createdAt: new Date(2026, 0, 1, 0, index),
      }));
      mockConversationModel.findById.mockResolvedValue({
        participants: [new Types.ObjectId(userAId)],
      });
      const exec = vi.fn().mockResolvedValue([...messages].reverse());
      const limit = vi.fn().mockReturnValue({ exec });
      const sort = vi.fn().mockReturnValue({ limit });
      mockMessageModel.find.mockReturnValue({ sort });

      const page = await service.getMessagesPage(conversationId, userAId, 3);

      expect(sort).toHaveBeenCalledWith({ createdAt: -1, _id: -1 });
      expect(limit).toHaveBeenCalledWith(4);
      expect(page.messages.map((message) => message._id)).toEqual(ids.slice(1));
      expect(page.nextCursor).toBe(ids[1].toString());
      expect(page.hasMore).toBe(true);
    });

    it('returns only messages older than the selected cursor', async () => {
      const cursorId = new Types.ObjectId();
      const cursorTime = new Date('2026-11-13T12:00:00.000Z');
      mockConversationModel.findById.mockResolvedValue({
        participants: [new Types.ObjectId(userAId)],
      });
      const execCursor = vi.fn().mockResolvedValue({ _id: cursorId, createdAt: cursorTime });
      mockMessageModel.findOne.mockReturnValue({ select: vi.fn().mockReturnValue({ exec: execCursor }) });
      const exec = vi.fn().mockResolvedValue([]);
      mockMessageModel.find.mockReturnValue({
        sort: vi.fn().mockReturnValue({ limit: vi.fn().mockReturnValue({ exec }) }),
      });

      await service.getMessagesPage(conversationId, userAId, 20, cursorId.toString());

      expect(mockMessageModel.find).toHaveBeenCalledWith({
        conversationId: new Types.ObjectId(conversationId),
        $or: [
          { createdAt: { $lt: cursorTime } },
          { createdAt: cursorTime, _id: { $lt: cursorId } },
        ],
      });
    });
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

  describe('deleteConversation', () => {
    it('should throw BadRequestException if conversationId is invalid', async () => {
      await expect(service.deleteConversation('invalid-id', userAId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException if conversation does not exist', async () => {
      mockConversationModel.findById.mockReturnValue({
        exec: vi.fn().mockResolvedValue(null),
      });
      await expect(service.deleteConversation(conversationId, userAId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException if user is not a participant', async () => {
      const outsiderId = new Types.ObjectId().toString();
      mockConversationModel.findById.mockReturnValue({
        exec: vi.fn().mockResolvedValue({
          _id: new Types.ObjectId(conversationId),
          participants: [new Types.ObjectId(userAId), new Types.ObjectId(userBId)],
        }),
      });
      await expect(service.deleteConversation(conversationId, outsiderId)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should completely delete conversation and messages if chatting with Aura AI bot', async () => {
      const auraBotId = '666666666666666666666666';
      mockConversationModel.findById.mockReturnValue({
        exec: vi.fn().mockResolvedValue({
          _id: new Types.ObjectId(conversationId),
          participants: [new Types.ObjectId(userAId), new Types.ObjectId(auraBotId)],
        }),
      });

      await service.deleteConversation(conversationId, userAId);
      expect(mockConversationModel.deleteOne).toHaveBeenCalled();
      expect(mockMessageModel.deleteMany).toHaveBeenCalled();
    });

    it('should mark conversation as deleted for user if normal conversation', async () => {
      mockConversationModel.findById
        .mockReturnValueOnce({
          exec: vi.fn().mockResolvedValue({
            _id: new Types.ObjectId(conversationId),
            participants: [new Types.ObjectId(userAId), new Types.ObjectId(userBId)],
            deletedByUsers: [],
          }),
        })
        .mockReturnValueOnce({
          exec: vi.fn().mockResolvedValue({
            _id: new Types.ObjectId(conversationId),
            participants: [new Types.ObjectId(userAId), new Types.ObjectId(userBId)],
            deletedByUsers: [new Types.ObjectId(userAId)],
          }),
        });

      await service.deleteConversation(conversationId, userAId);
      expect(mockConversationModel.updateOne).toHaveBeenCalledWith(
        { _id: new Types.ObjectId(conversationId) },
        { $addToSet: { deletedByUsers: new Types.ObjectId(userAId) } },
      );
    });
  });

  describe('Group Chat Features', () => {
    const userCId = new Types.ObjectId().toString();
    const groupConvId = new Types.ObjectId().toString();

    it('should throw BadRequestException if fewer than 2 other members are provided', async () => {
      await expect(
        service.createGroupConversation(userAId, {
          name: 'Nhóm Game',
          memberIds: [userBId], // Only 1 other member
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create group conversation successfully with creator as admin and system message', async () => {
      mockUsersService.findById
        .mockResolvedValueOnce({ _id: new Types.ObjectId(userBId), name: 'User B' })
        .mockResolvedValueOnce({ _id: new Types.ObjectId(userCId), name: 'User C' })
        .mockResolvedValueOnce({ _id: new Types.ObjectId(userAId), name: 'User A' });

      const mockGroup = {
        _id: new Types.ObjectId(groupConvId),
        type: 'group',
        name: 'Nhóm Anh Em',
        creatorId: new Types.ObjectId(userAId),
        adminIds: [new Types.ObjectId(userAId)],
        participants: [
          new Types.ObjectId(userAId),
          new Types.ObjectId(userBId),
          new Types.ObjectId(userCId),
        ],
        save: vi.fn().mockResolvedValue(true),
      };

      mockConversationModel.create.mockResolvedValue(mockGroup);
      mockMessageModel.create.mockResolvedValue({
        _id: new Types.ObjectId(),
        text: 'User A đã tạo nhóm "Nhóm Anh Em"',
        senderId: new Types.ObjectId(userAId),
        type: 'system',
      });

      const execPopulated = vi.fn().mockResolvedValue(mockGroup);
      const mockPopulate3 = vi.fn().mockReturnValue({ exec: execPopulated });
      const mockPopulate2 = vi.fn().mockReturnValue({ populate: mockPopulate3 });
      const mockPopulate1 = vi.fn().mockReturnValue({ populate: mockPopulate2 });
      mockConversationModel.findById.mockReturnValue({ populate: mockPopulate1 });

      const result = await service.createGroupConversation(userAId, {
        name: 'Nhóm Anh Em',
        memberIds: [userBId, userCId],
      });

      expect(result).toBeDefined();
      expect(mockConversationModel.create).toHaveBeenCalled();
      expect(mockMessageModel.create).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'system' }),
      );
    });

    it('should save group message and update unread count for other participants', async () => {
      const unreadMap = new Map<string, number>([
        [userAId, 0],
        [userBId, 0],
        [userCId, 0],
      ]);

      const mockGroup = {
        _id: new Types.ObjectId(groupConvId),
        type: 'group',
        participants: [
          new Types.ObjectId(userAId),
          new Types.ObjectId(userBId),
          new Types.ObjectId(userCId),
        ],
        unreadCounts: unreadMap,
        save: vi.fn().mockResolvedValue(true),
      };

      mockConversationModel.findById.mockResolvedValue(mockGroup);
      mockMessageModel.create.mockResolvedValue({
        _id: new Types.ObjectId(),
        conversationId: mockGroup._id,
        senderId: new Types.ObjectId(userAId),
        text: 'Hello anh em',
        type: 'text',
      });

      const msg = await service.saveGroupMessage(userAId, groupConvId, 'Hello anh em');
      expect(msg.text).toBe('Hello anh em');
      expect(unreadMap.get(userBId)).toBe(1);
      expect(unreadMap.get(userCId)).toBe(1);
      expect(unreadMap.get(userAId)).toBe(0);
      expect(mockGroup.save).toHaveBeenCalled();
    });

    it('should allow admin to remove a member', async () => {
      const mockGroup = {
        _id: new Types.ObjectId(groupConvId),
        type: 'group',
        adminIds: [new Types.ObjectId(userAId)],
        participants: [
          new Types.ObjectId(userAId),
          new Types.ObjectId(userBId),
          new Types.ObjectId(userCId),
        ],
        unreadCounts: new Map(),
        save: vi.fn().mockResolvedValue(true),
      };

      mockConversationModel.findById
        .mockResolvedValueOnce(mockGroup)
        .mockReturnValueOnce({
          populate: vi.fn().mockReturnValue({
            populate: vi.fn().mockReturnValue({
              populate: vi.fn().mockReturnValue({
                exec: vi.fn().mockResolvedValue(mockGroup),
              }),
            }),
          }),
        });

      mockUsersService.findById
        .mockResolvedValueOnce({ _id: new Types.ObjectId(userBId), name: 'User B' })
        .mockResolvedValueOnce({ _id: new Types.ObjectId(userAId), name: 'User A' });

      mockMessageModel.create.mockResolvedValue({
        _id: new Types.ObjectId(),
        text: 'User A đã xóa User B khỏi nhóm',
        type: 'system',
      });

      await service.removeGroupMember(userAId, groupConvId, userBId);
      expect(mockGroup.participants.map((p) => p.toString())).not.toContain(userBId);
      expect(mockGroup.save).toHaveBeenCalled();
    });

    it('should throw ForbiddenException if non-admin attempts to kick another member', async () => {
      const mockGroup = {
        _id: new Types.ObjectId(groupConvId),
        type: 'group',
        adminIds: [new Types.ObjectId(userAId)], // User A is admin, User B is not
        participants: [
          new Types.ObjectId(userAId),
          new Types.ObjectId(userBId),
          new Types.ObjectId(userCId),
        ],
      };

      mockConversationModel.findById.mockResolvedValue(mockGroup);

      await expect(
        service.removeGroupMember(userBId, groupConvId, userCId),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
