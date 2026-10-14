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

    service = new FriendsService(
      mockFriendshipModel as any,
      mockUsersService as any,
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

  describe('unfriend', () => {
    it('should delete accepted friendship', async () => {
      mockFriendshipModel.deleteOne.mockResolvedValue({ deletedCount: 1 });

      const result = await service.unfriend(userAId, userBId);
      expect(result.success).toBe(true);
      expect(mockFriendshipModel.deleteOne).toHaveBeenCalled();
    });
  });
});
