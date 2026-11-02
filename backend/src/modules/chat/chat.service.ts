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
  MessageReaction,
  CallLogData,
  CallStatus,
  CallType,
  LocationData,
} from './schemas/message.schema.js';
import { UsersService } from '../users/users.service.js';
import { AURA_BOT_ID } from '../groq/aura-bot.constant.js';
import {
  CreateGroupDto,
  UpdateGroupDto,
} from './dto/group-chat.dto.js';

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
        type: { $ne: 'group' },
        participants: { $all: [objId1, objId2], $size: 2 },
      })
      .populate('participants', 'name email avatar isBan isDeleted');

    if (!conversation) {
      const unreadMap = new Map<string, number>();
      unreadMap.set(userId1, 0);
      unreadMap.set(userId2, 0);

      const created = await this.conversationModel.create({
        type: 'direct',
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
   * Lấy danh sách cuộc hội thoại của một người dùng (loại trừ các hội thoại người dùng đã xóa)
   */
  async getUserConversations(userId: string): Promise<ConversationDocument[]> {
    const objId = new Types.ObjectId(userId);
    return this.conversationModel
      .find({
        participants: objId,
        deletedByUsers: { $ne: objId },
      })
      .populate('participants', 'name email avatar isBan isDeleted')
      .populate('adminIds', 'name avatar')
      .populate('creatorId', 'name avatar')
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
      customMessageId?: string;
    },
  ): Promise<MessageDocument> {
    const [receiver, foundConv] = await Promise.all([
      this.usersService.findById(receiverId),
      conversationId
        ? this.conversationModel.findById(conversationId)
        : Promise.resolve(null),
    ]);
    if (!receiver) {
      throw new NotFoundException('Người nhận không tồn tại');
    }

    let conversation: ConversationDocument;
    if (foundConv) {
      conversation = foundConv;
    } else {
      conversation = await this.getOrCreateConversation(senderId, receiverId);
    }

    if (conversation.blockedBy) {
      throw new BadRequestException('Cuộc hội thoại đã bị chặn');
    }

    const message = await this.messageModel.create({
      ...(options?.customMessageId
        ? { _id: new Types.ObjectId(options.customMessageId) }
        : {}),
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
        ? options.location?.isLive
          ? '🛰️ Đang chia sẻ vị trí trực tiếp'
          : `📍 ${options.location?.address || options.location?.name || 'Vị trí đã ghim'}`
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

    // Khôi phục hội thoại nếu người gửi hoặc người nhận trước đó đã từng xóa hội thoại
    await this.conversationModel
      .updateOne(
        { _id: conversation._id },
        {
          $pull: {
            deletedByUsers: {
              $in: [
                new Types.ObjectId(senderId),
                new Types.ObjectId(receiverId),
              ],
            },
          },
        },
      )
      .exec();

    return message;
  }

 
  async updateLiveLocation(
    messageId: string,
    senderId: string,
    update: {
      latitude?: number;
      longitude?: number;
      address?: string;
      name?: string;
      isLiveActive?: boolean;
    },
  ): Promise<MessageDocument | null> {
    const message = await this.messageModel.findById(messageId);
    if (!message) return null;

    if (String(message.senderId) !== senderId) {
      throw new BadRequestException('Chỉ người gửi mới có quyền cập nhật vị trí trực tiếp');
    }

    if (message.type !== 'location' || !message.location) {
      return null;
    }
    const { latitude, longitude } = update;
    if (
      typeof latitude === 'number' &&
      typeof longitude === 'number' &&
      Number.isFinite(latitude) &&
      Number.isFinite(longitude)
    ) {
      message.location.latitude = latitude;
      message.location.longitude = longitude;
    }
    if (update.address) message.location.address = update.address;
    if (update.name) message.location.name = update.name;
    if (typeof update.isLiveActive === 'boolean') {
      message.location.isLiveActive = update.isLiveActive;
    }

    message.markModified('location');
    await message.save();

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
   * Xóa cuộc hội thoại:
   * - Nếu là hội thoại với Aura AI (bot): Xóa vĩnh viễn cuộc hội thoại và toàn bộ tin nhắn khỏi DB.
   * - Nếu là người dùng: Thêm userId vào deletedByUsers (ẩn vĩnh viễn với user này).
   *   Nếu tất cả thành viên đều đã xóa, dọn dẹp triệt để hội thoại và tin nhắn khỏi MongoDB.
   */
  async deleteConversation(
    conversationId: string,
    userId: string,
  ): Promise<void> {
    if (!Types.ObjectId.isValid(conversationId)) {
      throw new BadRequestException('Mã cuộc hội thoại không hợp lệ');
    }
    const objConvId = new Types.ObjectId(conversationId);
    const objUserId = new Types.ObjectId(userId);
    const conversation = await this.conversationModel.findById(objConvId).exec();
    if (!conversation) {
      throw new NotFoundException('Cuộc hội thoại không tồn tại');
    }
    const isParticipant = conversation.participants.some(
      (p) => p.toString() === userId,
    );
    if (!isParticipant) {
      throw new ForbiddenException(
        'Bạn không có quyền xóa cuộc hội thoại này',
      );
    }

    const isAuraChat = conversation.participants.some(
      (p) => p.toString() === AURA_BOT_ID,
    );

    if (isAuraChat) {
      await Promise.all([
        this.conversationModel.deleteOne({ _id: objConvId }).exec(),
        this.messageModel.deleteMany({ conversationId: objConvId }).exec(),
      ]);
      return;
    }

    await this.conversationModel
      .updateOne(
        { _id: objConvId },
        { $addToSet: { deletedByUsers: objUserId } },
      )
      .exec();

    const updated = await this.conversationModel.findById(objConvId).exec();
    if (
      updated &&
      updated.participants.every((p) =>
        (updated.deletedByUsers || []).some(
          (d) => d.toString() === p.toString(),
        ),
      )
    ) {
      await Promise.all([
        this.conversationModel.deleteOne({ _id: objConvId }).exec(),
        this.messageModel.deleteMany({ conversationId: objConvId }).exec(),
      ]);
    }
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

  /**
   * Thả cảm xúc / xóa cảm xúc vào tin nhắn (Reaction)
   */
  async reactToMessage(
    messageId: string,
    userId: string,
    type: string,
  ): Promise<{
    messageId: string;
    conversationId: string;
    reactions: MessageReaction[];
  }> {
    const validTypes = ['like', 'love', 'care', 'haha', 'wow', 'sad', 'angry'];
    if (!validTypes.includes(type)) {
      throw new BadRequestException('Loại cảm xúc không hợp lệ');
    }

    const message = await this.messageModel.findById(messageId);
    if (!message) {
      throw new NotFoundException('Không tìm thấy tin nhắn');
    }

    const isSender = message.senderId.toString() === userId;
    const isReceiver = message.receiverId
      ? message.receiverId.toString() === userId
      : false;
    let isMember = isSender || isReceiver;
    if (!isMember) {
      const conv = await this.conversationModel.findById(message.conversationId);
      isMember = Boolean(
        conv?.participants.some((p) => p.toString() === userId),
      );
    }
    if (!isMember) {
      throw new ForbiddenException('Bạn không thuộc cuộc hội thoại này');
    }

    if (!message.reactions) {
      message.reactions = [];
    }

    const existingIdx = message.reactions.findIndex(
      (r) => r.userId.toString() === userId,
    );

    if (existingIdx > -1) {
      if (message.reactions[existingIdx].type === type) {
        // Đã thả cùng loại -> Hủy cảm xúc (toggle off)
        message.reactions.splice(existingIdx, 1);
      } else {
        // Đổi loại cảm xúc
        message.reactions[existingIdx].type = type;
        message.reactions[existingIdx].createdAt = new Date();
      }
    } else {
      // Thêm mới
      message.reactions.push({
        userId: new Types.ObjectId(userId),
        type,
        createdAt: new Date(),
      });
    }

    await message.save();

    return {
      messageId: message._id.toString(),
      conversationId: message.conversationId.toString(),
      reactions: message.reactions,
    };
  }

  async getConversationById(id: string): Promise<ConversationDocument | null> {
    try {
      return await this.conversationModel.findById(id).exec();
    } catch {
      return null;
    }
  }

  /**
   * Tạo cuộc trò chuyện nhóm mới
   */
  async createGroupConversation(
    creatorId: string,
    dto: CreateGroupDto,
  ): Promise<ConversationDocument> {
    const creatorObjId = new Types.ObjectId(creatorId);
    // Loại trừ trùng lặp ID và bỏ chính creatorId nếu lỡ truyền vào
    const rawMemberIds = Array.from(
      new Set(dto.memberIds.filter((id) => id !== creatorId)),
    );
    if (rawMemberIds.length < 2) {
      throw new BadRequestException(
        'Nhóm trò chuyện cần tối thiểu 3 thành viên (bao gồm bạn)',
      );
    }

    // Kiểm tra các thành viên có tồn tại và hợp lệ không
    const validUsers = await Promise.all(
      rawMemberIds.map((id) => this.usersService.findById(id)),
    );
    const validMemberIds = validUsers
      .filter((u) => u && !u.isDeleted && !u.isBan)
      .map((u) => u?._id.toString())
      .filter((id): id is string => Boolean(id));

    if (validMemberIds.length < 2) {
      throw new BadRequestException(
        'Các thành viên được chọn không hợp lệ hoặc đã bị vô hiệu hóa',
      );
    }

    const allMemberIds = [creatorId, ...validMemberIds];
    const allParticipantObjIds = allMemberIds.map((id) => new Types.ObjectId(id));

    const unreadMap = new Map<string, number>();
    allMemberIds.forEach((id) => unreadMap.set(id, 0));

    const conversation = await this.conversationModel.create({
      type: 'group',
      name: dto.name.trim(),
      avatar: dto.avatar || null,
      creatorId: creatorObjId,
      adminIds: [creatorObjId],
      participants: allParticipantObjIds,
      unreadCounts: unreadMap,
      theme: 'default',
      restrictedBy: [],
      deletedByUsers: [],
    });

    const creator = await this.usersService.findById(creatorId);
    const creatorName = creator?.name || 'Thành viên';

    // Tạo tin nhắn hệ thống thông báo tạo nhóm
    const systemMessage = await this.messageModel.create({
      conversationId: conversation._id,
      senderId: creatorObjId,
      receiverId: null,
      text: `${creatorName} đã tạo nhóm "${dto.name.trim()}"`,
      type: 'system',
      readAt: new Date(),
    });

    conversation.lastMessage = {
      text: systemMessage.text,
      senderId: systemMessage.senderId,
      createdAt: systemMessage.createdAt || new Date(),
      type: 'system',
    };
    await conversation.save();

    const populated = await this.conversationModel
      .findById(conversation._id)
      .populate('participants', 'name email avatar isBan isDeleted')
      .populate('adminIds', 'name avatar')
      .populate('creatorId', 'name avatar')
      .exec();

    return populated as ConversationDocument;
  }

  /**
   * Lưu tin nhắn nhóm (gửi tới conversationId thay vì receiverId đơn lẻ)
   */
  async saveGroupMessage(
    senderId: string,
    conversationId: string,
    text: string,
    options?: {
      type?: 'text' | 'call' | 'location' | 'system';
      callLog?: CallLogData | null;
      location?: LocationData | null;
      customMessageId?: string;
    },
  ): Promise<MessageDocument> {
    const conversation = await this.conversationModel.findById(conversationId);
    if (!conversation) {
      throw new NotFoundException('Cuộc hội thoại nhóm không tồn tại');
    }
    if (conversation.type !== 'group') {
      throw new BadRequestException('Cuộc hội thoại này không phải là nhóm');
    }

    const isMember = conversation.participants.some(
      (p) => p.toString() === senderId,
    );
    if (!isMember) {
      throw new ForbiddenException('Bạn không phải thành viên của nhóm này');
    }

    const message = await this.messageModel.create({
      ...(options?.customMessageId
        ? { _id: new Types.ObjectId(options.customMessageId) }
        : {}),
      conversationId: conversation._id,
      senderId: new Types.ObjectId(senderId),
      receiverId: null,
      text: text.trim(),
      type: options?.type || 'text',
      callLog: options?.callLog || null,
      location: options?.location || null,
      readAt: null,
      isDeleted: false,
    });

    // Cập nhật số tin nhắn chưa đọc cho tất cả thành viên khác trong nhóm
    conversation.participants.forEach((p) => {
      const pid = p.toString();
      if (pid !== senderId) {
        const cur = conversation.unreadCounts.get(pid) || 0;
        conversation.unreadCounts.set(pid, cur + 1);
      }
    });

    conversation.lastMessage = {
      text: message.text,
      senderId: message.senderId,
      createdAt: message.createdAt || new Date(),
      type: message.type || 'text',
    };
    conversation.updatedAt = new Date();
    await conversation.save();

    return message;
  }

  /**
   * Lưu bản ghi tin nhắn cuộc gọi nhóm
   */
  async saveGroupCallMessage(
    callerId: string,
    conversationId: string,
    callType: CallType = 'video',
    status: CallStatus = 'completed',
    duration = 0,
    participantCount = 1,
  ): Promise<MessageDocument> {
    const formatDuration = (sec: number) => {
      const m = Math.floor(sec / 60);
      const s = sec % 60;
      return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const isVideo = callType === 'video';
    const text = isVideo
      ? `📹 Cuộc gọi video nhóm (${participantCount} người, ${formatDuration(duration)})`
      : `📞 Cuộc gọi thoại nhóm (${participantCount} người, ${formatDuration(duration)})`;

    return this.saveGroupMessage(callerId, conversationId, text, {
      type: 'call',
      callLog: {
        callType,
        status,
        duration,
      },
    });
  }

  /**
   * Thêm thành viên mới vào nhóm
   */
  async addGroupMembers(
    callerId: string,
    conversationId: string,
    newMemberIds: string[],
  ): Promise<ConversationDocument> {
    const conversation = await this.conversationModel.findById(conversationId);
    if (!conversation || conversation.type !== 'group') {
      throw new NotFoundException('Nhóm không tồn tại');
    }

    const isCallerMember = conversation.participants.some(
      (p) => p.toString() === callerId,
    );
    if (!isCallerMember) {
      throw new ForbiddenException('Bạn không phải thành viên của nhóm này');
    }

    const currentMemberSet = new Set(
      conversation.participants.map((p) => p.toString()),
    );
    const toAdd = Array.from(new Set(newMemberIds)).filter(
      (id) => !currentMemberSet.has(id),
    );

    if (toAdd.length === 0) {
      return conversation;
    }

    // Kiểm tra người dùng hợp lệ
    const validUsers = await Promise.all(
      toAdd.map((id) => this.usersService.findById(id)),
    );
    const addedUsers = validUsers.filter(
      (u): u is NonNullable<typeof u> => Boolean(u && !u.isDeleted && !u.isBan),
    );
    if (addedUsers.length === 0) {
      return conversation;
    }

    addedUsers.forEach((u) => {
      const uid = u._id.toString();
      conversation.participants.push(new Types.ObjectId(uid));
      conversation.unreadCounts.set(uid, 0);
    });

    const caller = await this.usersService.findById(callerId);
    const callerName = caller?.name || 'Thành viên';
    const addedNames = addedUsers.map((u) => u.name).join(', ');

    const systemMsg = await this.messageModel.create({
      conversationId: conversation._id,
      senderId: new Types.ObjectId(callerId),
      receiverId: null,
      text: `${callerName} đã thêm ${addedNames} vào nhóm`,
      type: 'system',
      readAt: new Date(),
    });

    conversation.lastMessage = {
      text: systemMsg.text,
      senderId: systemMsg.senderId,
      createdAt: systemMsg.createdAt || new Date(),
      type: 'system',
    };
    conversation.updatedAt = new Date();
    await conversation.save();

    const populated = await this.conversationModel
      .findById(conversation._id)
      .populate('participants', 'name email avatar isBan isDeleted')
      .populate('adminIds', 'name avatar')
      .populate('creatorId', 'name avatar')
      .exec();

    return populated as ConversationDocument;
  }

  /**
   * Xóa thành viên hoặc thành viên tự rời nhóm
   */
  async removeGroupMember(
    callerId: string,
    conversationId: string,
    targetMemberId: string,
  ): Promise<ConversationDocument> {
    const conversation = await this.conversationModel.findById(conversationId);
    if (!conversation || conversation.type !== 'group') {
      throw new NotFoundException('Nhóm không tồn tại');
    }

    const isCallerMember = conversation.participants.some(
      (p) => p.toString() === callerId,
    );
    if (!isCallerMember) {
      throw new ForbiddenException('Bạn không phải thành viên của nhóm này');
    }

    const callerIsAdmin = conversation.adminIds.some(
      (a) => a.toString() === callerId,
    );
    const isSelfLeaving = callerId === targetMemberId;

    if (!isSelfLeaving && !callerIsAdmin) {
      throw new ForbiddenException(
        'Chỉ quản trị viên mới có quyền xóa thành viên khỏi nhóm',
      );
    }

    const targetUser = await this.usersService.findById(targetMemberId);
    const targetName = targetUser?.name || 'Thành viên';
    const caller = await this.usersService.findById(callerId);
    const callerName = caller?.name || 'Thành viên';

    // Xóa target khỏi participants và adminIds
    conversation.participants = conversation.participants.filter(
      (p) => p.toString() !== targetMemberId,
    );
    conversation.adminIds = conversation.adminIds.filter(
      (a) => a.toString() !== targetMemberId,
    );
    conversation.unreadCounts.delete(targetMemberId);

    // Nếu người rời đi là admin và nhóm không còn admin nào, tự động thăng cấp thành viên đầu tiên còn lại
    if (
      conversation.adminIds.length === 0 &&
      conversation.participants.length > 0
    ) {
      conversation.adminIds.push(conversation.participants[0]);
    }

    const messageText = isSelfLeaving
      ? `${callerName} đã rời khỏi nhóm`
      : `${callerName} đã xóa ${targetName} khỏi nhóm`;

    const systemMsg = await this.messageModel.create({
      conversationId: conversation._id,
      senderId: new Types.ObjectId(callerId),
      receiverId: null,
      text: messageText,
      type: 'system',
      readAt: new Date(),
    });

    conversation.lastMessage = {
      text: systemMsg.text,
      senderId: systemMsg.senderId,
      createdAt: systemMsg.createdAt || new Date(),
      type: 'system',
    };
    conversation.updatedAt = new Date();
    await conversation.save();

    const populated = await this.conversationModel
      .findById(conversation._id)
      .populate('participants', 'name email avatar isBan isDeleted')
      .populate('adminIds', 'name avatar')
      .populate('creatorId', 'name avatar')
      .exec();

    return populated as ConversationDocument;
  }

  /**
   * Cập nhật thông tin nhóm (Tên, Ảnh đại diện)
   */
  async updateGroupInfo(
    callerId: string,
    conversationId: string,
    dto: UpdateGroupDto,
  ): Promise<ConversationDocument> {
    const conversation = await this.conversationModel.findById(conversationId);
    if (!conversation || conversation.type !== 'group') {
      throw new NotFoundException('Nhóm không tồn tại');
    }

    const isCallerMember = conversation.participants.some(
      (p) => p.toString() === callerId,
    );
    if (!isCallerMember) {
      throw new ForbiddenException('Bạn không phải thành viên của nhóm này');
    }

    const caller = await this.usersService.findById(callerId);
    const callerName = caller?.name || 'Thành viên';
    let systemText = '';

    if (dto.name && dto.name.trim() !== conversation.name) {
      conversation.name = dto.name.trim();
      systemText = `${callerName} đã đổi tên nhóm thành "${dto.name.trim()}"`;
    }
    if (dto.avatar !== undefined) {
      conversation.avatar = dto.avatar || null;
      if (!systemText) {
        systemText = `${callerName} đã cập nhật ảnh đại diện của nhóm`;
      }
    }

    if (systemText) {
      const systemMsg = await this.messageModel.create({
        conversationId: conversation._id,
        senderId: new Types.ObjectId(callerId),
        receiverId: null,
        text: systemText,
        type: 'system',
        readAt: new Date(),
      });

      conversation.lastMessage = {
        text: systemMsg.text,
        senderId: systemMsg.senderId,
        createdAt: systemMsg.createdAt || new Date(),
        type: 'system',
      };
    }

    conversation.updatedAt = new Date();
    await conversation.save();

    const populated = await this.conversationModel
      .findById(conversation._id)
      .populate('participants', 'name email avatar isBan isDeleted')
      .populate('adminIds', 'name avatar')
      .populate('creatorId', 'name avatar')
      .exec();

    return populated as ConversationDocument;
  }

  /**
   * Bổ nhiệm Quản trị viên nhóm
   */
  async promoteGroupAdmin(
    callerId: string,
    conversationId: string,
    targetUserId: string,
  ): Promise<ConversationDocument> {
    const conversation = await this.conversationModel.findById(conversationId);
    if (!conversation || conversation.type !== 'group') {
      throw new NotFoundException('Nhóm không tồn tại');
    }

    const callerIsAdmin = conversation.adminIds.some(
      (a) => a.toString() === callerId,
    );
    if (!callerIsAdmin) {
      throw new ForbiddenException(
        'Chỉ quản trị viên mới có quyền bổ nhiệm quản trị viên khác',
      );
    }

    const isTargetMember = conversation.participants.some(
      (p) => p.toString() === targetUserId,
    );
    if (!isTargetMember) {
      throw new BadRequestException(
        'Người dùng được chọn không phải thành viên của nhóm',
      );
    }

    const isAlreadyAdmin = conversation.adminIds.some(
      (a) => a.toString() === targetUserId,
    );
    if (isAlreadyAdmin) {
      return conversation;
    }

    conversation.adminIds.push(new Types.ObjectId(targetUserId));

    const caller = await this.usersService.findById(callerId);
    const targetUser = await this.usersService.findById(targetUserId);
    const callerName = caller?.name || 'Quản trị viên';
    const targetName = targetUser?.name || 'Thành viên';

    const systemMsg = await this.messageModel.create({
      conversationId: conversation._id,
      senderId: new Types.ObjectId(callerId),
      receiverId: null,
      text: `${callerName} đã bổ nhiệm ${targetName} làm quản trị viên`,
      type: 'system',
      readAt: new Date(),
    });

    conversation.lastMessage = {
      text: systemMsg.text,
      senderId: systemMsg.senderId,
      createdAt: systemMsg.createdAt || new Date(),
      type: 'system',
    };
    conversation.updatedAt = new Date();
    await conversation.save();

    const populated = await this.conversationModel
      .findById(conversation._id)
      .populate('participants', 'name email avatar isBan isDeleted')
      .populate('adminIds', 'name avatar')
      .populate('creatorId', 'name avatar')
      .exec();

    return populated as ConversationDocument;
  }

  /**
   * Lấy chi tiết nhóm trò chuyện kèm danh sách thành viên đầy đủ
   */
  async getGroupDetails(
    userId: string,
    conversationId: string,
  ): Promise<ConversationDocument> {
    const conversation = await this.conversationModel
      .findById(conversationId)
      .populate('participants', 'name email avatar bio isOnline lastActiveAt role')
      .populate('adminIds', 'name email avatar role')
      .populate('creatorId', 'name email avatar')
      .exec();

    if (!conversation || conversation.type !== 'group') {
      throw new NotFoundException('Nhóm không tồn tại');
    }

    const isMember = conversation.participants.some(
      (p: { _id?: Types.ObjectId | string }) =>
        p._id?.toString() === userId,
    );
    if (!isMember) {
      throw new ForbiddenException('Bạn không thuộc nhóm này');
    }

    return conversation;
  }
}
