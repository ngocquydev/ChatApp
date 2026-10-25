import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Types } from 'mongoose';
import { NotificationsService } from './notifications.service.js';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let mockNotificationModel: any;
  let mockUsersService: any;
  let mockChatGateway: any;
  let emitMock: any;
  let toMock: any;

  const recipientId = new Types.ObjectId().toString();
  const actorId = new Types.ObjectId().toString();

  beforeEach(() => {
    emitMock = vi.fn();
    toMock = vi.fn().mockReturnValue({ emit: emitMock });

    mockNotificationModel = {
      create: vi.fn(),
      find: vi.fn(),
      countDocuments: vi.fn(),
      updateOne: vi.fn(),
      updateMany: vi.fn(),
      deleteOne: vi.fn(),
    };

    mockUsersService = {
      findById: vi.fn(),
      findByIds: vi.fn(),
    };

    mockChatGateway = {
      server: {
        to: toMock,
      },
    };

    service = new NotificationsService(
      mockNotificationModel as any,
      mockUsersService as any,
      mockChatGateway as any,
    );
  });

  describe('createNotification', () => {
    it('creates notification and emits socket to recipient', async () => {
      const createdDoc = {
        _id: new Types.ObjectId(),
        recipientId: new Types.ObjectId(recipientId),
        actorId: new Types.ObjectId(actorId),
        type: 'friend_accepted',
        title: 'Lời mời kết bạn đã được chấp nhận',
        content: 'đã chấp nhận lời mời kết bạn của bạn.',
        link: `/profile/${actorId}`,
        isRead: false,
        createdAt: new Date(),
      };
      mockNotificationModel.create.mockResolvedValue(createdDoc);
      mockNotificationModel.countDocuments.mockReturnValue({
        exec: vi.fn().mockResolvedValue(1),
      });
      mockUsersService.findById.mockResolvedValue({
        _id: actorId,
        name: 'Actor User',
        avatar: 'avatar.png',
      });

      const res = await service.createNotification({
        recipientId,
        actorId,
        type: 'friend_accepted',
        title: 'Lời mời kết bạn đã được chấp nhận',
        content: 'đã chấp nhận lời mời kết bạn của bạn.',
        link: `/profile/${actorId}`,
      });

      expect(res._id).toBe(createdDoc._id.toString());
      expect(res.actor.name).toBe('Actor User');
      expect(mockNotificationModel.create).toHaveBeenCalled();
      expect(toMock).toHaveBeenCalledWith(`user:${recipientId}`);
      expect(emitMock).toHaveBeenCalledWith('notification:new', expect.objectContaining({
        unreadCount: 1,
        notification: expect.objectContaining({
          type: 'friend_accepted',
          title: 'Lời mời kết bạn đã được chấp nhận',
        }),
      }));
    });
  });

  describe('getNotifications', () => {
    it('returns notifications with loaded actors and unreadCount', async () => {
      const notif1 = {
        _id: new Types.ObjectId(),
        recipientId: new Types.ObjectId(recipientId),
        actorId: new Types.ObjectId(actorId),
        type: 'friend_accepted',
        title: 'Title',
        content: 'Content',
        link: '/profile/123',
        isRead: false,
        createdAt: new Date(),
      };

      const execFind = vi.fn().mockResolvedValue([notif1]);
      const leanFind = vi.fn().mockReturnValue({ exec: execFind });
      const limitFind = vi.fn().mockReturnValue({ lean: leanFind });
      const sortFind = vi.fn().mockReturnValue({ limit: limitFind });
      mockNotificationModel.find.mockReturnValue({ sort: sortFind });

      mockNotificationModel.countDocuments.mockReturnValue({
        exec: vi.fn().mockResolvedValue(1),
      });

      mockUsersService.findByIds.mockResolvedValue([
        { _id: new Types.ObjectId(actorId), name: 'Actor User', avatar: 'a.png' },
      ]);

      const result = await service.getNotifications(recipientId, { limit: 10 });
      expect(result.notifications.length).toBe(1);
      expect(result.notifications[0].actor.name).toBe('Actor User');
      expect(result.unreadCount).toBe(1);
      expect(result.hasMore).toBe(false);
    });
  });

  describe('markAsRead & markAllAsRead & deleteNotification', () => {
    it('markAsRead updates isRead to true', async () => {
      const notifId = new Types.ObjectId().toString();
      mockNotificationModel.updateOne.mockReturnValue({
        exec: vi.fn().mockResolvedValue({ modifiedCount: 1 }),
      });

      const res = await service.markAsRead(recipientId, notifId);
      expect(res.success).toBe(true);
      expect(mockNotificationModel.updateOne).toHaveBeenCalledWith(
        { _id: new Types.ObjectId(notifId), recipientId: new Types.ObjectId(recipientId) },
        { $set: { isRead: true } },
      );
    });

    it('markAllAsRead updates all unread notifications to true', async () => {
      mockNotificationModel.updateMany.mockReturnValue({
        exec: vi.fn().mockResolvedValue({ modifiedCount: 2 }),
      });

      const res = await service.markAllAsRead(recipientId);
      expect(res.success).toBe(true);
      expect(mockNotificationModel.updateMany).toHaveBeenCalledWith(
        { recipientId: new Types.ObjectId(recipientId), isRead: false },
        { $set: { isRead: true } },
      );
    });

    it('deleteNotification deletes target notification', async () => {
      const notifId = new Types.ObjectId().toString();
      mockNotificationModel.deleteOne.mockReturnValue({
        exec: vi.fn().mockResolvedValue({ deletedCount: 1 }),
      });

      const res = await service.deleteNotification(recipientId, notifId);
      expect(res.success).toBe(true);
      expect(mockNotificationModel.deleteOne).toHaveBeenCalledWith(
        { _id: new Types.ObjectId(notifId), recipientId: new Types.ObjectId(recipientId) },
      );
    });
  });
});
