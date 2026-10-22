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
import { Message, MessageDocument } from './schemas/message.schema.js';
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

    const message = await this.messageModel.create({
      conversationId: conversation._id,
      senderId: new Types.ObjectId(senderId),
      receiverId: new Types.ObjectId(receiverId),
      text: text.trim(),
      readAt: null,
    });

    // Cập nhật tin nhắn cuối cùng và số tin chưa đọc cho người nhận
    conversation.lastMessage = {
      text: text.trim(),
      senderId: new Types.ObjectId(senderId),
      createdAt: message.createdAt || new Date(),
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

  async getConversationById(id: string): Promise<ConversationDocument | null> {
    try {
      return await this.conversationModel.findById(id).exec();
    } catch {
      return null;
    }
  }
}
