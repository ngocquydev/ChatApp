import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Conversation,
  ConversationDocument,
} from './schemas/conversation.schema.js';
import {
  Message,
  MessageDocument,
  CallLogData,
  CallStatus,
  CallType,
  LocationData,
} from './schemas/message.schema.js';
import { UsersService } from '../users/users.service.js';

@Injectable()
export class ChatService {
  constructor(
    @InjectModel(Conversation.name)
    private readonly conversationModel: Model<ConversationDocument>,
    @InjectModel(Message.name)
    private readonly messageModel: Model<MessageDocument>,
    private readonly usersService: UsersService,
  ) {}

  /**
   * Tìm hoặc tạo mới cuộc hội thoại 1-1 giữa 2 người dùng
   */
  async getOrCreateConversation(
    userId1: string,
    userId2: string,
  ): Promise<ConversationDocument> {
    if (userId1 === userId2) {
      throw new BadRequestException('Không thể tạo cuộc hội thoại với chính mình');
    }

    const objId1 = new Types.ObjectId(userId1);
    const objId2 = new Types.ObjectId(userId2);

    let conversation = await this.conversationModel
      .findOne({
        participants: { $all: [objId1, objId2], $size: 2 },
      })
      .populate('participants', 'name email avatar isBan isDeleted');

    if (!conversation) {
      const unreadMap = new Map<string, number>();
      unreadMap.set(userId1, 0);
      unreadMap.set(userId2, 0);

      const created = await this.conversationModel.create({
        participants: [objId1, objId2],
        unreadCounts: unreadMap,
        lastMessage: null,
      });

      conversation = await this.conversationModel
        .findById(created._id)
        .populate('participants', 'name email avatar isBan isDeleted');
    }

    return conversation as ConversationDocument;
  }

  /**
   * Lấy danh sách cuộc hội thoại của một người dùng
   */
  async getUserConversations(userId: string): Promise<ConversationDocument[]> {
    const objId = new Types.ObjectId(userId);
    return this.conversationModel
      .find({
        participants: objId,
      })
      .populate('participants', 'name email avatar')
      .sort({ updatedAt: -1 })
      .exec();
  }

  /**
   * Lưu tin nhắn mới và cập nhật trạng thái cuộc hội thoại
   */
  async saveMessage(
    senderId: string,
    receiverId: string,
    text: string,
    conversationId?: string,
    options?: {
      type?: 'text' | 'call' | 'location';
      callLog?: CallLogData | null;
      location?: LocationData | null;
    },
  ): Promise<MessageDocument> {
    const receiver = await this.usersService.findById(receiverId);
    if (!receiver) {
      throw new NotFoundException('Người nhận không tồn tại');
    }

    let conversation: ConversationDocument;
    if (conversationId) {
      const found = await this.conversationModel.findById(conversationId);
      if (!found) {
        conversation = await this.getOrCreateConversation(senderId, receiverId);
      } else {
        conversation = found;
      }
    } else {
      conversation = await this.getOrCreateConversation(senderId, receiverId);
    }

    if (conversation.blockedBy) {
      throw new BadRequestException('Cuộc hội thoại đã bị chặn');
    }

    const message = await this.messageModel.create({
      conversationId: conversation._id,
      senderId: new Types.ObjectId(senderId),
      receiverId: new Types.ObjectId(receiverId),
      text: text.trim(),
      type: options?.type || 'text',
      callLog: options?.callLog || null,
      location: options?.location || null,
      readAt: null,
      isDeleted: false,
      deletedAt: null,
      deletedBy: null,
    });

    // Cập nhật tin nhắn cuối cùng và số tin chưa đọc cho người nhận
    const lastText =
      options?.type === 'location'
        ? `📍 ${options.location?.address || options.location?.name || 'Vị trí đã ghim'}`
        : text.trim();

    conversation.lastMessage = {
      text: lastText,
      senderId: new Types.ObjectId(senderId),
      createdAt: message.createdAt || new Date(),
      type: options?.type || 'text',
      callLog: options?.callLog || null,
    };

    if (!conversation.unreadCounts) {
      conversation.unreadCounts = new Map<string, number>();
    }
    const currentUnread = conversation.unreadCounts.get(receiverId) || 0;
    conversation.unreadCounts.set(receiverId, currentUnread + 1);

    await conversation.save();

    return message;
  }

  /**
   * Lưu bản ghi cuộc gọi (Call log) dưới dạng một tin nhắn trong đoạn chat
   */
  async saveCallMessage(
    callerId: string,
    calleeId: string,
    callType: CallType = 'audio',
    status: CallStatus = 'completed',
    duration = 0,
    conversationId?: string,
  ): Promise<MessageDocument> {
    const formatDuration = (sec: number) => {
      const m = Math.floor(sec / 60);
      const s = sec % 60;
      return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    let text = '';
    const isVideo = callType === 'video';
    if (status === 'completed') {
      text = isVideo
        ? `📹 Cuộc gọi video (${formatDuration(duration)})`
        : `📞 Cuộc gọi thoại (${formatDuration(duration)})`;
    } else if (status === 'missed') {
      text = isVideo ? '📹 Cuộc gọi video nhỡ' : '📞 Cuộc gọi thoại nhỡ';
    } else if (status === 'declined') {
      text = isVideo ? '📹 Cuộc gọi video bị từ chối' : '📞 Cuộc gọi thoại bị từ chối';
    } else if (status === 'busy') {
      text = isVideo ? '📹 Cuộc gọi video máy bận' : '📞 Cuộc gọi thoại máy bận';
    } else {
      text = isVideo ? '📹 Cuộc gọi video đã hủy' : '📞 Cuộc gọi thoại đã hủy';
    }

    return this.saveMessage(callerId, calleeId, text, conversationId, {
      type: 'call',
      callLog: {
        callType,
        status,
        duration,
      },
    });
  }

  /**
   * Lấy lịch sử tin nhắn của một cuộc hội thoại
   */
  async getMessages(
    conversationId: string,
    userId: string,
    limit = 50,
  ): Promise<MessageDocument[]> {
    const conv = await this.conversationModel.findById(conversationId);
    if (!conv) {
      throw new NotFoundException('Không tìm thấy cuộc hội thoại');
    }

    const isParticipant = conv.participants.some(
      (p) => p.toString() === userId,
    );
    if (!isParticipant) {
      throw new ForbiddenException('Bạn không thuộc cuộc hội thoại này');
    }

    return this.messageModel
      .find({ conversationId: new Types.ObjectId(conversationId) })
      .sort({ createdAt: 1 })
      .limit(limit)
      .exec();
  }

  /**
   * Đánh dấu đã đọc các tin nhắn trong cuộc hội thoại
   */
  async markAsRead(
    conversationId: string,
    userId: string,
  ): Promise<{ success: boolean; modifiedCount: number }> {
    const conv = await this.conversationModel.findById(conversationId);
    if (!conv) {
      throw new NotFoundException('Không tìm thấy cuộc hội thoại');
    }

    const isParticipant = conv.participants.some(
      (p) => p.toString() === userId,
    );
    if (!isParticipant) {
      throw new ForbiddenException('Bạn không thuộc cuộc hội thoại này');
    }

    const updateResult = await this.messageModel.updateMany(
      {
        conversationId: new Types.ObjectId(conversationId),
        receiverId: new Types.ObjectId(userId),
        readAt: null,
      },
      {
        $set: { readAt: new Date() },
      },
    );

    if (conv.unreadCounts) {
      conv.unreadCounts.set(userId, 0);
      await conv.save();
    }

    return {
      success: true,
      modifiedCount: updateResult.modifiedCount || 0,
    };
  }

  /**
   * Chặn cuộc hội thoại
   */
  async blockConversation(
    conversationId: string,
    userId: string,
  ): Promise<ConversationDocument> {
    const conv = await this.conversationModel.findById(conversationId);
    if (!conv) {
      throw new NotFoundException('Không tìm thấy cuộc hội thoại');
    }
    const isParticipant = conv.participants.some(
      (p) => p.toString() === userId,
    );
    if (!isParticipant) {
      throw new ForbiddenException('Bạn không thuộc cuộc hội thoại này');
    }

    conv.blockedBy = new Types.ObjectId(userId);
    await conv.save();
    return conv;
  }

  /**
   * Bỏ chặn cuộc hội thoại
   */
  async unblockConversation(
    conversationId: string,
    userId: string,
  ): Promise<ConversationDocument> {
    const conv = await this.conversationModel.findById(conversationId);
    if (!conv) {
      throw new NotFoundException('Không tìm thấy cuộc hội thoại');
    }
    const isParticipant = conv.participants.some(
      (p) => p.toString() === userId,
    );
    if (!isParticipant) {
      throw new ForbiddenException('Bạn không thuộc cuộc hội thoại này');
    }

    if (conv.blockedBy && conv.blockedBy.toString() !== userId) {
      throw new ForbiddenException('Chỉ người đã chặn mới có quyền bỏ chặn');
    }

    conv.blockedBy = null;
    await conv.save();
    return conv;
  }

  /**
   * Bật/Tắt tính năng Hạn chế (Restrict) giống Facebook Messenger
   */
  async restrictConversation(
    conversationId: string,
    userId: string,
    restrict: boolean,
  ): Promise<ConversationDocument> {
    const conv = await this.conversationModel.findById(conversationId);
    if (!conv) {
      throw new NotFoundException('Không tìm thấy cuộc hội thoại');
    }
    const isParticipant = conv.participants.some(
      (p) => p.toString() === userId,
    );
    if (!isParticipant) {
      throw new ForbiddenException('Bạn không thuộc cuộc hội thoại này');
    }

    if (!conv.restrictedBy) {
      conv.restrictedBy = [];
    }
    const userObjId = new Types.ObjectId(userId);
    if (restrict) {
      const alreadyRestricted = conv.restrictedBy.some(
        (id) => id.toString() === userId,
      );
      if (!alreadyRestricted) {
        conv.restrictedBy.push(userObjId);
      }
    } else {
      conv.restrictedBy = conv.restrictedBy.filter(
        (id) => id.toString() !== userId,
      );
    }

    await conv.save();
    return conv;
  }

  /**
   * Thay đổi chủ đề / hình nền cuộc hội thoại (Hẹn hò, Bầu trời, Bóng đêm, Biển cả...)
   */
  async updateConversationTheme(
    conversationId: string,
    userId: string,
    theme: string,
  ): Promise<ConversationDocument> {
    const conv = await this.conversationModel.findById(conversationId);
    if (!conv) {
      throw new NotFoundException('Không tìm thấy cuộc hội thoại');
    }
    const isParticipant = conv.participants.some(
      (p) => p.toString() === userId,
    );
    if (!isParticipant) {
      throw new ForbiddenException('Bạn không thuộc cuộc hội thoại này');
    }

    const validThemes = ['default', 'dating', 'sky', 'midnight', 'ocean', 'sunset'];
    if (!validThemes.includes(theme)) {
      throw new BadRequestException('Chủ đề không hợp lệ');
    }

    conv.theme = theme;
    await conv.save();
    return conv;
  }

  /**
   * Thu hồi / Xóa tin nhắn (Unsend message)
   */
  async deleteMessage(
    messageId: string,
    userId: string,
  ): Promise<MessageDocument> {
    const message = await this.messageModel.findById(messageId);
    if (!message) {
      throw new NotFoundException('Không tìm thấy tin nhắn');
    }
    if (message.senderId.toString() !== userId) {
      throw new ForbiddenException('Bạn chỉ có thể thu hồi tin nhắn của chính mình');
    }

    message.isDeleted = true;
    message.deletedAt = new Date();
    message.deletedBy = new Types.ObjectId(userId);
    message.text = 'Tin nhắn đã bị thu hồi';
    await message.save();

    // Nếu tin này là tin nhắn cuối của hội thoại, cập nhật lại lastMessage
    const conv = await this.conversationModel.findById(message.conversationId);
    if (conv && conv.lastMessage) {
      const lastCreated = conv.lastMessage.createdAt
        ? new Date(conv.lastMessage.createdAt).getTime()
        : 0;
      const msgCreated = message.createdAt
        ? new Date(message.createdAt).getTime()
        : 0;
      if (Math.abs(lastCreated - msgCreated) < 1500) {
        conv.lastMessage.text = 'Tin nhắn đã bị thu hồi';
        await conv.save();
      }
    }

    return message;
  }

  async getConversationById(id: string): Promise<ConversationDocument | null> {
    try {
      return await this.conversationModel.findById(id).exec();
    } catch {
      return null;
    }
  }
}
