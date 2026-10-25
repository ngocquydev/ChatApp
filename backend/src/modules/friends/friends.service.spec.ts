import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { FriendsService } from './friends.service.js';

describe('FriendsService', () => {
  let service: FriendsService;
  let mockFriendshipModel: any;
  let mockUsersService: any;

  const userAId = new Types.ObjectId().toString();
  const userBId = new Types.ObjectId().toString();
  const requestId = new Types.ObjectId().toString();

  beforeEach(() => {
    mockFriendshipModel = {
      findOne: vi.fn(),
      find: vi.fn(),
      findById: vi.fn(),
      create: vi.fn(),
      deleteOne: vi.fn(),
    };

    mockUsersService = {
      findById: vi.fn(),
    };

    const mockRedisClient = {
      geoadd: vi.fn().mockResolvedValue(1),
      georadius: vi.fn().mockResolvedValue([]),
      geopos: vi.fn().mockResolvedValue(null),
      sadd: vi.fn().mockResolvedValue(1),
      sinter: vi.fn().mockResolvedValue([]),
      smembers: vi.fn().mockResolvedValue([]),
      del: vi.fn().mockResolvedValue(1),
      expire: vi.fn().mockResolvedValue(1),
      set: vi.fn().mockResolvedValue('OK'),
      get: vi.fn().mockResolvedValue(null),
    };

    const mockRedisService = {
      client: mockRedisClient,
    };

    service = new FriendsService(
      mockFriendshipModel as any,
      mockUsersService as any,
      mockRedisService as any,
    );
  });

  describe('sendFriendRequest', () => {
    it('should throw BadRequestException if sending request to self', async () => {
      await expect(service.sendFriendRequest(userAId, userAId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException if recipient does not exist', async () => {
      mockUsersService.findById.mockResolvedValue(null);

      await expect(service.sendFriendRequest(userAId, userBId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if already friends', async () => {
      mockUsersService.findById.mockResolvedValue({ _id: userBId, name: 'User B' });
      mockFriendshipModel.findOne.mockResolvedValue({
        status: 'accepted',
      });

      await expect(service.sendFriendRequest(userAId, userBId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw ConflictException if request is already pending', async () => {
      mockUsersService.findById.mockResolvedValue({ _id: userBId, name: 'User B' });
      mockFriendshipModel.findOne.mockResolvedValue({
        requesterId: new Types.ObjectId(userAId),
        recipientId: new Types.ObjectId(userBId),
        status: 'pending',
      });

      await expect(service.sendFriendRequest(userAId, userBId)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should auto-accept if recipient had already sent a request to requester', async () => {
      mockUsersService.findById.mockResolvedValue({ _id: userBId, name: 'User B' });
      const reverseRequest = {
        _id: requestId,
        requesterId: new Types.ObjectId(userBId),
        recipientId: new Types.ObjectId(userAId),
        status: 'pending',
        save: vi.fn().mockResolvedValue(true),
      };
      mockFriendshipModel.findOne.mockResolvedValue(reverseRequest);

      const result = await service.sendFriendRequest(userAId, userBId);
      expect(reverseRequest.status).toBe('accepted');
      expect(reverseRequest.save).toHaveBeenCalled();
      expect(result.status).toBe('accepted');
    });

    it('should create new pending request if no existing relation', async () => {
      mockUsersService.findById.mockResolvedValue({ _id: userBId, name: 'User B' });
      mockFriendshipModel.findOne.mockResolvedValue(null);

      const newRequest = {
        _id: requestId,
        requesterId: new Types.ObjectId(userAId),
        recipientId: new Types.ObjectId(userBId),
        status: 'pending',
      };
      mockFriendshipModel.create.mockResolvedValue(newRequest);

      const result = await service.sendFriendRequest(userAId, userBId);
      expect(result).toEqual(newRequest);
      expect(mockFriendshipModel.create).toHaveBeenCalled();
    });
  });

  describe('respondToRequest', () => {
    it('should throw NotFoundException if request not found', async () => {
      mockFriendshipModel.findById.mockResolvedValue(null);

      await expect(
        service.respondToRequest(requestId, userBId, 'accept'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user is not recipient', async () => {
      const mockReq = {
        _id: requestId,
        requesterId: new Types.ObjectId(userAId),
        recipientId: new Types.ObjectId(userBId),
        status: 'pending',
      };
      mockFriendshipModel.findById.mockResolvedValue(mockReq);

      await expect(
        service.respondToRequest(requestId, userAId, 'accept'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should accept request successfully', async () => {
      const mockReq = {
        _id: requestId,
        requesterId: new Types.ObjectId(userAId),
        recipientId: new Types.ObjectId(userBId),
        status: 'pending',
        save: vi.fn().mockResolvedValue(true),
      };
      mockFriendshipModel.findById.mockResolvedValue(mockReq);

      const result = await service.respondToRequest(requestId, userBId, 'accept');
      expect(mockReq.status).toBe('accepted');
      expect(mockReq.save).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });
  });

  describe('realtime friend notifications', () => {
    let emit: ReturnType<typeof vi.fn>;
    let to: ReturnType<typeof vi.fn>;
    let notifying: FriendsService;

    beforeEach(() => {
      emit = vi.fn();
      to = vi.fn().mockReturnValue({ emit });
      const redis = { client: { del: vi.fn(), sadd: vi.fn(), expire: vi.fn() } };
      mockFriendshipModel.find.mockResolvedValue([]);
      notifying = new FriendsService(
        mockFriendshipModel as any,
        mockUsersService as any,
        redis as any,
        { server: { to } } as any,
      );
    });

    it('notifies the requester with the accepter name and avatar when a request is accepted', async () => {
      mockUsersService.findById.mockResolvedValue({
        _id: userBId,
        name: 'User B',
        avatar: 'b.png',
      });
      mockFriendshipModel.findById.mockResolvedValue({
        _id: requestId,
        requesterId: new Types.ObjectId(userAId),
        recipientId: new Types.ObjectId(userBId),
        status: 'pending',
        save: vi.fn().mockResolvedValue(true),
      });

      await notifying.respondToRequest(requestId, userBId, 'accept');

      await vi.waitFor(() => expect(emit).toHaveBeenCalled());
      expect(to).toHaveBeenCalledWith(`user:${userAId}`);
      expect(emit).toHaveBeenCalledWith('friend:accepted', {
        friendshipId: requestId,
        user: { _id: userBId, name: 'User B', avatar: 'b.png' },
      });
    });

    it('notifies the original requester when the other side auto-accepts by sending a request', async () => {
      mockUsersService.findById.mockResolvedValue({ _id: userAId, name: 'User A' });
      // B đã gửi cho A trước; giờ A gửi cho B → tự động chấp nhận, B phải được báo
      mockFriendshipModel.findOne.mockResolvedValue({
        _id: requestId,
        requesterId: new Types.ObjectId(userBId),
        recipientId: new Types.ObjectId(userAId),
        status: 'pending',
        save: vi.fn().mockResolvedValue(true),
      });

      await notifying.sendFriendRequest(userAId, userBId);

      await vi.waitFor(() => expect(emit).toHaveBeenCalled());
      expect(to).toHaveBeenCalledWith(`user:${userBId}`);
      expect(emit).toHaveBeenCalledWith(
        'friend:accepted',
        expect.objectContaining({ user: expect.objectContaining({ _id: userAId, name: 'User A' }) }),
      );
    });

    it('tells the recipient who sent a new friend request', async () => {
      mockUsersService.findById.mockResolvedValue({ _id: userAId, name: 'User A' });
      mockFriendshipModel.findOne.mockResolvedValue(null);
      mockFriendshipModel.create.mockResolvedValue({ _id: requestId, status: 'pending' });

      await notifying.sendFriendRequest(userAId, userBId);

      await vi.waitFor(() => expect(emit).toHaveBeenCalled());
      expect(to).toHaveBeenCalledWith(`user:${userBId}`);
      expect(emit).toHaveBeenCalledWith(
        'friend:request_received',
        expect.objectContaining({ user: expect.objectContaining({ name: 'User A' }) }),
      );
    });

    it('still accepts the request when the socket emit fails', async () => {
      mockUsersService.findById.mockResolvedValue({ _id: userBId, name: 'User B' });
      emit.mockImplementation(() => {
        throw new Error('socket down');
      });
      const mockReq = {
        _id: requestId,
        requesterId: new Types.ObjectId(userAId),
        recipientId: new Types.ObjectId(userBId),
        status: 'pending',
        save: vi.fn().mockResolvedValue(true),
      };
      mockFriendshipModel.findById.mockResolvedValue(mockReq);

      const result = await notifying.respondToRequest(requestId, userBId, 'accept');

      expect(result.success).toBe(true);
      expect(mockReq.status).toBe('accepted');
    });
  });

  describe('unfriend', () => {
    it('should delete accepted friendship', async () => {
      mockFriendshipModel.deleteOne.mockResolvedValue({ deletedCount: 1 });

      const result = await service.unfriend(userAId, userBId);
      expect(result.success).toBe(true);
      expect(mockFriendshipModel.deleteOne).toHaveBeenCalled();
    });
  });
});
