import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Friendship,
  FriendshipDocument,
} from './schemas/friendship.schema.js';
import { UsersService } from '../users/users.service.js';
import { ChatGateway } from '../chat/chat.gateway.js';

export interface UserRelationResult {
  _id: string;
  name: string;
  email: string;
  avatar?: string;
  bio?: string;
  relationStatus: 'none' | 'pending_sent' | 'pending_received' | 'friends';
  requestId?: string;
}

@Injectable()
export class FriendsService {
  constructor(
    @InjectModel(Friendship.name)
    private readonly friendshipModel: Model<FriendshipDocument>,
    private readonly usersService: UsersService,
    @Optional()
    private readonly chatGateway?: ChatGateway,
  ) {}

  /**
   * Gửi lời mời kết bạn tới một người dùng
   */
  async sendFriendRequest(
    requesterId: string,
    recipientId: string,
  ): Promise<FriendshipDocument> {
    if (requesterId === recipientId) {
      throw new BadRequestException('Không thể gửi lời mời kết bạn cho chính mình');
    }

    const recipient = await this.usersService.findById(recipientId);
    if (!recipient) {
      throw new NotFoundException('Người dùng nhận lời mời không tồn tại');
    }

    const reqObjId = new Types.ObjectId(requesterId);
    const recObjId = new Types.ObjectId(recipientId);

    // Kiểm tra mối quan hệ hiện tại giữa 2 người (hai chiều)
    const existing = await this.friendshipModel.findOne({
      $or: [
        { requesterId: reqObjId, recipientId: recObjId },
        { requesterId: recObjId, recipientId: reqObjId },
      ],
    });

    if (existing) {
      if (existing.status === 'accepted') {
        throw new BadRequestException('Hai người đã là bạn bè');
      }

      // Đã gửi trước đó và đang chờ duyệt
      if (
        existing.status === 'pending' &&
        existing.requesterId.toString() === requesterId
      ) {
        throw new ConflictException('Lời mời kết bạn đã được gửi trước đó');
      }

      // Đối phương đã gửi cho mình trước đó -> Tự động chấp nhận kết bạn
      if (
        existing.status === 'pending' &&
        existing.recipientId.toString() === requesterId
      ) {
        existing.status = 'accepted';
        await existing.save();
        return existing;
      }

      // Nếu trước đó bị từ chối, cho phép mở lại lời mời mới
      if (existing.status === 'rejected') {
        existing.requesterId = reqObjId;
        existing.recipientId = recObjId;
        existing.status = 'pending';
        await existing.save();
        return existing;
      }
    }

    // Tạo lời mời mới
    const created = await this.friendshipModel.create({
      requesterId: reqObjId,
      recipientId: recObjId,
      status: 'pending',
    });

    try {
      this.chatGateway?.server
        ?.to(`user:${recipientId}`)
        .emit('friend:request_received', {
          request: created,
        });
    } catch {
      // Bỏ qua nếu socket chưa sẵn sàng
    }

    return created;
  }

  /**
   * Phản hồi lời mời kết bạn (Chấp nhận hoặc Từ chối)
   */
  async respondToRequest(
    requestId: string,
    userId: string,
    action: 'accept' | 'reject',
  ): Promise<{ success: boolean; message: string }> {
    const request = await this.friendshipModel.findById(requestId);
    if (!request) {
      throw new NotFoundException('Không tìm thấy lời mời kết bạn');
    }

    if (request.recipientId.toString() !== userId) {
      throw new ForbiddenException('Bạn không có quyền phản hồi lời mời này');
    }

    if (request.status !== 'pending') {
      throw new BadRequestException('Lời mời này không ở trạng thái chờ duyệt');
    }

    if (action === 'accept') {
      request.status = 'accepted';
      await request.save();

      try {
        this.chatGateway?.server
          ?.to(`user:${request.requesterId.toString()}`)
          .emit('friend:accepted', {
            friendshipId: request._id,
            user: { _id: userId },
          });
      } catch {
        // Bỏ qua
      }

      return { success: true, message: 'Đã chấp nhận lời mời kết bạn' };
    } else {
      await this.friendshipModel.deleteOne({ _id: request._id });
      return { success: true, message: 'Đã từ chối lời mời kết bạn' };
    }
  }

  /**
   * Hủy lời mời kết bạn đã gửi
   */
  async cancelRequest(
    requestId: string,
    userId: string,
  ): Promise<{ success: boolean; message: string }> {
    const request = await this.friendshipModel.findById(requestId);
    if (!request) {
      throw new NotFoundException('Không tìm thấy lời mời kết bạn');
    }

    if (request.requesterId.toString() !== userId) {
      throw new ForbiddenException('Bạn không có quyền hủy lời mời này');
    }

    await this.friendshipModel.deleteOne({ _id: request._id });
    return { success: true, message: 'Đã hủy lời mời kết bạn' };
  }

  /**
   * Hủy kết bạn (Unfriend)
   */
  async unfriend(
    userId: string,
    friendId: string,
  ): Promise<{ success: boolean; message: string }> {
    const userObjId = new Types.ObjectId(userId);
    const friendObjId = new Types.ObjectId(friendId);

    const result = await this.friendshipModel.deleteOne({
      status: 'accepted',
      $or: [
        { requesterId: userObjId, recipientId: friendObjId },
        { requesterId: friendObjId, recipientId: userObjId },
      ],
    });

    if (result.deletedCount === 0) {
      return { success: false, message: 'Không tìm thấy quan hệ bạn bè để hủy' };
    }

    return { success: true, message: 'Đã hủy kết bạn thành công' };
  }

  /**
   * Lấy danh sách bạn bè chính thức
   */
  async getFriendsList(userId: string): Promise<any[]> {
    const userObjId = new Types.ObjectId(userId);

    const friendships = await this.friendshipModel
      .find({
        status: 'accepted',
        $or: [{ requesterId: userObjId }, { recipientId: userObjId }],
      })
      .populate('requesterId', 'name email avatar phone bio')
      .populate('recipientId', 'name email avatar phone bio')
      .exec();

    return friendships.map((f) => {
      const requester = f.requesterId as any;
      const recipient = f.recipientId as any;
      const friend =
        requester?._id?.toString() === userId ? recipient : requester;
      return {
        friendshipId: f._id,
        friend,
        createdAt: f.createdAt,
      };
    });
  }

  /**
   * Lấy danh sách lời mời kết bạn (Đã nhận & Đã gửi)
   */
  async getFriendRequests(userId: string): Promise<{
    received: any[];
    sent: any[];
  }> {
    const userObjId = new Types.ObjectId(userId);

    const [received, sent] = await Promise.all([
      this.friendshipModel
        .find({ recipientId: userObjId, status: 'pending' })
        .populate('requesterId', 'name email avatar bio')
        .sort({ createdAt: -1 })
        .exec(),
      this.friendshipModel
        .find({ requesterId: userObjId, status: 'pending' })
        .populate('recipientId', 'name email avatar bio')
        .sort({ createdAt: -1 })
        .exec(),
    ]);

    return { received, sent };
  }

  /**
   * Tìm kiếm người dùng kèm trạng thái quan hệ bạn bè đối với user hiện tại
   */
  async searchUsersWithRelation(
    keyword: string,
    currentUserId: string,
  ): Promise<UserRelationResult[]> {
    const users = await this.usersService.searchUsers(keyword, currentUserId);
    if (!users || users.length === 0) return [];

    const userObjId = new Types.ObjectId(currentUserId);
    const targetIds = users.map((u) => new Types.ObjectId(u._id.toString()));

    const relations = await this.friendshipModel.find({
      $or: [
        { requesterId: userObjId, recipientId: { $in: targetIds } },
        { requesterId: { $in: targetIds }, recipientId: userObjId },
      ],
    });

    const relationMap = new Map<
      string,
      { status: 'none' | 'pending_sent' | 'pending_received' | 'friends'; requestId?: string }
    >();

    for (const rel of relations) {
      const reqId = rel.requesterId.toString();
      const recId = rel.recipientId.toString();
      const otherId = reqId === currentUserId ? recId : reqId;

      if (rel.status === 'accepted') {
        relationMap.set(otherId, { status: 'friends', requestId: rel._id.toString() });
      } else if (rel.status === 'pending') {
        if (reqId === currentUserId) {
          relationMap.set(otherId, { status: 'pending_sent', requestId: rel._id.toString() });
        } else {
          relationMap.set(otherId, { status: 'pending_received', requestId: rel._id.toString() });
        }
      }
    }

    return users.map((u) => {
      const uId = u._id.toString();
      const relInfo = relationMap.get(uId) || { status: 'none' };
      return {
        _id: uId,
        name: u.name,
        email: u.email,
        avatar: u.avatar,
        bio: u.bio,
        relationStatus: relInfo.status,
        requestId: relInfo.requestId,
      };
    });
  }
}
