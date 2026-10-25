import { Injectable, Optional } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Notification,
  NotificationDocument,
} from './schemas/notification.schema.js';
import { UsersService } from '../users/users.service.js';
import { ChatGateway } from '../chat/chat.gateway.js';
import type {
  CreateNotificationInput,
  GetNotificationsQueryDto,
  NotificationActorView,
  NotificationView,
} from './dto/notifications.dto.js';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectModel(Notification.name)
    private readonly notificationModel: Model<NotificationDocument>,
    private readonly usersService: UsersService,
    @Optional()
    private readonly chatGateway?: ChatGateway,
  ) {}

  /**
   * Tạo thông báo lưu vào DB và phát socket thời gian thực tới người nhận nếu đang online.
   */
  async createNotification(input: CreateNotificationInput): Promise<NotificationView> {
    const recipientObjId = new Types.ObjectId(input.recipientId);
    const actorObjId = new Types.ObjectId(input.actorId);

    const created = await this.notificationModel.create({
      recipientId: recipientObjId,
      actorId: actorObjId,
      type: input.type,
      title: input.title,
      content: input.content,
      link: input.link,
      metadata: input.metadata,
      isRead: false,
    });

    const actor = await this.usersService.findById(input.actorId);
    const actorView: NotificationActorView = {
      _id: input.actorId,
      name: actor?.name || 'Người dùng',
      avatar: actor?.avatar ?? undefined,
    };

    const view: NotificationView = {
      _id: created._id.toString(),
      type: created.type,
      title: created.title,
      content: created.content,
      link: created.link,
      isRead: created.isRead,
      actor: actorView,
      createdAt: created.createdAt,
    };

    // Phát socket realtime kèm unreadCount
    try {
      const server = this.chatGateway?.server;
      if (server) {
        const unreadCount = await this.getUnreadCount(input.recipientId);
        server.to(`user:${input.recipientId}`).emit('notification:new', {
          notification: view,
          unreadCount,
        });
      }
    } catch {
      // Nuốt lỗi nếu socket gián đoạn
    }

    return view;
  }

  /**
   * Lấy danh sách thông báo của người dùng với phân trang cursor.
   * Dùng findByIds để load hàng loạt thông tin actor, tránh lỗi N+1 query.
   */
  async getNotifications(
    userId: string,
    query: GetNotificationsQueryDto,
  ): Promise<{
    notifications: NotificationView[];
    unreadCount: number;
    hasMore: boolean;
    nextCursor: string | null;
  }> {
    const userObjId = new Types.ObjectId(userId);
    const limit = Math.min(Math.max(query.limit || 20, 1), 50);

    const filter: Record<string, unknown> = { recipientId: userObjId };
    if (query.before && Types.ObjectId.isValid(query.before)) {
      filter._id = { $lt: new Types.ObjectId(query.before) };
    }

    const [rows, unreadCount] = await Promise.all([
      this.notificationModel
        .find(filter)
        .sort({ _id: -1 })
        .limit(limit + 1)
        .lean()
        .exec(),
      this.getUnreadCount(userId),
    ]);

    const hasMore = rows.length > limit;
    const pageRows = hasMore ? rows.slice(0, limit) : rows;

    // Load batch actors
    const actorIds = Array.from(new Set(pageRows.map((r) => r.actorId.toString())));
    const actorUsers = actorIds.length > 0 ? await this.usersService.findByIds(actorIds) : [];
    const actorMap = new Map<string, NotificationActorView>(
      actorUsers.map((u) => [
        u._id.toString(),
        {
          _id: u._id.toString(),
          name: u.name,
          avatar: u.avatar ?? undefined,
        },
      ]),
    );

    const notifications: NotificationView[] = pageRows.map((r) => {
      const actorIdStr = r.actorId.toString();
      const actor = actorMap.get(actorIdStr) || {
        _id: actorIdStr,
        name: 'Người dùng',
      };
      return {
        _id: r._id.toString(),
        type: r.type,
        title: r.title,
        content: r.content,
        link: r.link,
        isRead: r.isRead,
        actor,
        createdAt: r.createdAt,
      };
    });

    const nextCursor = hasMore && notifications.length > 0
      ? notifications[notifications.length - 1]._id
      : null;

    return {
      notifications,
      unreadCount,
      hasMore,
      nextCursor,
    };
  }

  /**
   * Đếm số lượng thông báo chưa đọc.
   */
  async getUnreadCount(userId: string): Promise<number> {
    const userObjId = new Types.ObjectId(userId);
    return this.notificationModel.countDocuments({
      recipientId: userObjId,
      isRead: false,
    }).exec();
  }

  /**
   * Đánh dấu 1 thông báo là đã đọc.
   */
  async markAsRead(userId: string, notificationId: string): Promise<{ success: boolean }> {
    if (!Types.ObjectId.isValid(notificationId)) return { success: false };
    await this.notificationModel.updateOne(
      {
        _id: new Types.ObjectId(notificationId),
        recipientId: new Types.ObjectId(userId),
      },
      { $set: { isRead: true } },
    ).exec();
    return { success: true };
  }

  /**
   * Đánh dấu tất cả thông báo của người dùng là đã đọc.
   */
  async markAllAsRead(userId: string): Promise<{ success: boolean }> {
    await this.notificationModel.updateMany(
      {
        recipientId: new Types.ObjectId(userId),
        isRead: false,
      },
      { $set: { isRead: true } },
    ).exec();
    return { success: true };
  }

  /**
   * Xóa 1 thông báo.
   */
  async deleteNotification(userId: string, notificationId: string): Promise<{ success: boolean }> {
    if (!Types.ObjectId.isValid(notificationId)) return { success: false };
    await this.notificationModel.deleteOne({
      _id: new Types.ObjectId(notificationId),
      recipientId: new Types.ObjectId(userId),
    }).exec();
    return { success: true };
  }
}
