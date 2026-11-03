import {
  Injectable,
  OnModuleInit,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CommunityGroup, CommunityGroupDocument } from './schemas/community-group.schema.js';
import {
  CreateCommunityGroupDto,
  UpdateCommunityGroupDto,
  JoinGroupDto,
  SetDeputyDto,
} from './dto/community-group.dto.js';

export interface GroupViewerPermissions {
  isAdmin: boolean;
  isCreator: boolean;
  isDeputy: boolean;
  canRemoveMembers: boolean;
  canMuteComments: boolean;
  canBlockPosting: boolean;
  isBannedPosting: boolean;
  isMutedComments: boolean;
}

@Injectable()
export class CommunityGroupsService implements OnModuleInit {
  constructor(
    @InjectModel(CommunityGroup.name)
    private readonly groupModel: Model<CommunityGroupDocument>,
  ) {}

  async onModuleInit() {
    try {
      const count = await this.groupModel.countDocuments({ isDeleted: false }).exec();
      if (count === 0) {
        const seedGroups = [
          {
            name: 'ASP.NET Core Việt Nam',
            slug: 'asp-net-core-vn',
            description: 'Cộng đồng giao lưu, chia sẻ kinh nghiệm phát triển phần mềm ASP.NET Core & C# tại Việt Nam.',
            privacy: 'public',
            memberCount: 1240,
            requireApproval: false,
          },
          {
            name: 'AI Việt Nam | Trợ lý AI, ứng dụng AI vào công việc',
            slug: 'ai-viet-nam',
            description: 'Hội thảo luận mô hình ngôn ngữ lớn (LLM), Prompt Engineering và tự động hóa với AI.',
            privacy: 'public',
            memberCount: 3580,
            requireApproval: false,
          },
          {
            name: 'Cộng đồng CNTT cho người mới bắt đầu - IT For Beginners',
            slug: 'cong-dong-cntt',
            description: 'Nơi giải đáp thắc mắc lập trình, định hướng nghề nghiệp CNTT từ cơ bản đến nâng cao.',
            privacy: 'public',
            memberCount: 5200,
            requireApproval: false,
          },
          {
            name: 'Hội Lập trình viên Fullstack Việt Nam',
            slug: 'fullstack-vn',
            description: 'Chia sẻ kiến thức React, Next.js, Node.js, NestJS, Docker và Cloud Architecture.',
            privacy: 'public',
            memberCount: 2890,
            requireApproval: false,
          },
          {
            name: 'Grab Việt Nam VN',
            slug: 'grab-viet-nam',
            description: 'Diễn đàn kết nối tài xế và khách hàng công nghệ.',
            privacy: 'public',
            memberCount: 4120,
            requireApproval: false,
          },
          {
            name: 'Thiết Kế Website Theo Yêu Cầu !',
            slug: 'thiet-ke-website',
            description: 'Cộng đồng Frontend, UI/UX Designer và Freelancer lập trình web.',
            privacy: 'public',
            memberCount: 1850,
            requireApproval: false,
          },
          {
            name: 'Sinh viên HUIT',
            slug: 'sinh-vien-huit',
            description: 'Hội sinh viên năng động, học tập và kết nối hoạt động ngoại khóa.',
            privacy: 'public',
            memberCount: 6700,
            requireApproval: false,
          },
        ] as const;

        const systemId = new Types.ObjectId('000000000000000000000001');
        for (const g of seedGroups) {
          await this.groupModel.create({
            ...g,
            creatorId: systemId,
            adminIds: [systemId],
            moderatorIds: [],
            deputies: [],
            bannedPostingUserIds: [],
            mutedCommentUserIds: [],
            requireJoinReason: false,
            joinQuestion: 'Tại sao bạn muốn tham gia nhóm này?',
            pendingRequests: [],
            members: [systemId],
            pendingMemberIds: [],
            rules: [],
            isDeleted: false,
          });
        }
      }
    } catch {
      // Bỏ qua lỗi seed nếu đã tồn tại
    }
  }

  /**
   * Tạo hội nhóm mới
   */
  async createGroup(creatorId: string, dto: CreateCommunityGroupDto): Promise<CommunityGroupDocument> {
    const slug = dto.slug.trim().toLowerCase();
    const existing = await this.groupModel.findOne({ slug }).exec();
    if (existing) {
      throw new ConflictException('Đường dẫn (slug) của nhóm đã tồn tại, vui lòng chọn tên khác');
    }

    const objCreatorId = new Types.ObjectId(creatorId);

    const group = await this.groupModel.create({
      name: dto.name.trim(),
      slug,
      description: dto.description?.trim() || '',
      privacy: dto.privacy || 'public',
      avatar: dto.avatar || null,
      coverImage: dto.coverImage || null,
      creatorId: objCreatorId,
      adminIds: [objCreatorId],
      moderatorIds: [],
      deputies: [],
      bannedPostingUserIds: [],
      mutedCommentUserIds: [],
      members: [objCreatorId],
      pendingMemberIds: [],
      pendingRequests: [],
      memberCount: 1,
      requireApproval: Boolean(dto.requireApproval || dto.requireJoinReason),
      requireJoinReason: Boolean(dto.requireJoinReason),
      joinQuestion: dto.joinQuestion?.trim() || 'Tại sao bạn muốn tham gia nhóm này?',
      rules: [],
      isDeleted: false,
    });

    return group;
  }

  /**
   * Lấy chi tiết nhóm theo slug
   */
  async getGroupBySlug(slug: string, viewerId?: string): Promise<{
    group: CommunityGroupDocument;
    isMember: boolean;
    isPending: boolean;
    isAdmin: boolean;
    isDeputy: boolean;
    viewerPermissions: GroupViewerPermissions;
  }> {
    const group = await this.groupModel
      .findOne({ slug: slug.toLowerCase(), isDeleted: false })
      .populate('creatorId', 'name avatar')
      .populate('adminIds', 'name avatar')
      .populate('deputies.userId', 'name avatar')
      .exec();

    if (!group) {
      throw new NotFoundException('Không tìm thấy hội nhóm');
    }

    const viewerObjId = viewerId ? new Types.ObjectId(viewerId) : null;
    const isMember = viewerObjId
      ? (group.members || []).some((m) => m.toString() === viewerId)
      : false;
    const isPending = viewerObjId
      ? (group.pendingMemberIds || []).some((p) => p.toString() === viewerId) ||
        (group.pendingRequests || []).some((r) => r.userId.toString() === viewerId)
      : false;
    const isCreator = viewerObjId ? group.creatorId.toString() === viewerId : false;
    const isAdmin = viewerObjId
      ? isCreator || (group.adminIds || []).some((a) => a.toString() === viewerId)
      : false;

    const deputy = viewerObjId
      ? (group.deputies || []).find((d) => d.userId.toString() === viewerId)
      : undefined;
    const isDeputy = Boolean(deputy);

    const canRemoveMembers = isAdmin || Boolean(deputy?.canRemoveMembers);
    const canMuteComments = isAdmin || Boolean(deputy?.canMuteComments);
    const canBlockPosting = isAdmin || Boolean(deputy?.canBlockPosting);

    const isBannedPosting = viewerObjId
      ? (group.bannedPostingUserIds || []).some((b) => b.toString() === viewerId)
      : false;
    const isMutedComments = viewerObjId
      ? (group.mutedCommentUserIds || []).some((m) => m.toString() === viewerId)
      : false;

    const viewerPermissions: GroupViewerPermissions = {
      isAdmin,
      isCreator,
      isDeputy,
      canRemoveMembers,
      canMuteComments,
      canBlockPosting,
      isBannedPosting,
      isMutedComments,
    };

    return {
      group,
      isMember,
      isPending,
      isAdmin,
      isDeputy,
      viewerPermissions,
    };
  }

  /**
   * Tham gia nhóm hoặc gửi yêu cầu tham gia kèm câu trả lời
   */
  async joinGroup(groupId: string, userId: string, dto?: JoinGroupDto): Promise<{
    status: 'joined' | 'pending';
    memberCount: number;
  }> {
    if (!Types.ObjectId.isValid(groupId)) {
      throw new BadRequestException('Mã nhóm không hợp lệ');
    }

    const group = await this.groupModel.findById(groupId).exec();
    if (!group || group.isDeleted) {
      throw new NotFoundException('Hội nhóm không tồn tại');
    }

    const isMember = (group.members || []).some((m) => m.toString() === userId);
    if (isMember) {
      return { status: 'joined', memberCount: group.memberCount };
    }

    const objUserId = new Types.ObjectId(userId);

    // Nếu nhóm yêu cầu phê duyệt hoặc yêu cầu trả lời câu hỏi
    if (group.requireApproval || group.requireJoinReason) {
      const reason = (dto?.reason ?? '').trim();
      if (group.requireJoinReason && !reason) {
        throw new BadRequestException('Vui lòng trả lời câu hỏi lý do tham gia nhóm');
      }

      if (!group.pendingRequests) group.pendingRequests = [];
      if (!group.pendingMemberIds) group.pendingMemberIds = [];

      const existingReqIndex = group.pendingRequests.findIndex((r) => r.userId.toString() === userId);
      if (existingReqIndex >= 0) {
        group.pendingRequests[existingReqIndex].reason = reason;
        group.pendingRequests[existingReqIndex].requestedAt = new Date();
      } else {
        group.pendingRequests.push({
          userId: objUserId,
          reason,
          requestedAt: new Date(),
        });
      }

      if (!group.pendingMemberIds.some((p) => p.toString() === userId)) {
        group.pendingMemberIds.push(objUserId);
      }

      await group.save();
      return { status: 'pending', memberCount: group.memberCount };
    }

    // Tham gia trực tiếp
    if (!group.members) group.members = [];
    group.members.push(objUserId);
    group.memberCount = group.members.length;
    await group.save();

    return { status: 'joined', memberCount: group.memberCount };
  }

  /**
   * Rời khỏi nhóm
   */
  async leaveGroup(groupId: string, userId: string): Promise<{
    memberCount: number;
  }> {
    if (!Types.ObjectId.isValid(groupId)) {
      throw new BadRequestException('Mã nhóm không hợp lệ');
    }

    const group = await this.groupModel.findById(groupId).exec();
    if (!group || group.isDeleted) {
      throw new NotFoundException('Hội nhóm không tồn tại');
    }

    if (group.creatorId.toString() === userId) {
      throw new ForbiddenException('Người tạo nhóm không thể tự rời nhóm');
    }

    group.members = (group.members || []).filter((m) => m.toString() !== userId);
    group.adminIds = (group.adminIds || []).filter((a) => a.toString() !== userId);
    group.moderatorIds = (group.moderatorIds || []).filter((m) => m.toString() !== userId);
    group.deputies = (group.deputies || []).filter((d) => d.userId.toString() !== userId);
    group.memberCount = group.members.length;
    await group.save();

    return { memberCount: group.memberCount };
  }

  /**
   * Lấy danh sách yêu cầu chờ duyệt kèm câu trả lời
   */
  async getPendingRequests(requesterId: string, groupId: string) {
    const group = await this.groupModel
      .findById(groupId)
      .populate('pendingRequests.userId', 'name avatar email')
      .exec();

    if (!group || group.isDeleted) {
      throw new NotFoundException('Hội nhóm không tồn tại');
    }

    const isCreator = group.creatorId.toString() === requesterId;
    const isAdmin = isCreator || (group.adminIds || []).some((a) => a.toString() === requesterId);
    const isDeputy = (group.deputies || []).some((d) => d.userId.toString() === requesterId);

    if (!isAdmin && !isDeputy) {
      throw new ForbiddenException('Chỉ quản trị viên hoặc phó nhóm mới có quyền xem danh sách chờ');
    }

    return {
      requireJoinReason: group.requireJoinReason,
      joinQuestion: group.joinQuestion,
      requests: group.pendingRequests || [],
    };
  }

  /**
   * Duyệt thành viên chờ
   */
  async approveMember(
    requesterId: string,
    groupId: string,
    targetUserId: string,
  ): Promise<{ memberCount: number }> {
    const group = await this.groupModel.findById(groupId).exec();
    if (!group || group.isDeleted) {
      throw new NotFoundException('Hội nhóm không tồn tại');
    }

    const isCreator = group.creatorId.toString() === requesterId;
    const isAdmin = isCreator || (group.adminIds || []).some((a) => a.toString() === requesterId);
    const isDeputy = (group.deputies || []).some((d) => d.userId.toString() === requesterId);

    if (!isAdmin && !isDeputy) {
      throw new ForbiddenException('Chỉ quản trị viên hoặc phó nhóm mới có quyền duyệt thành viên');
    }

    group.pendingMemberIds = (group.pendingMemberIds || []).filter(
      (p) => p.toString() !== targetUserId,
    );
    group.pendingRequests = (group.pendingRequests || []).filter(
      (r) => r.userId.toString() !== targetUserId,
    );

    const objTarget = new Types.ObjectId(targetUserId);
    if (!group.members) group.members = [];
    if (!group.members.some((m) => m.toString() === targetUserId)) {
      group.members.push(objTarget);
    }

    group.memberCount = group.members.length;
    await group.save();

    return { memberCount: group.memberCount };
  }

  /**
   * Từ chối thành viên chờ
   */
  async rejectMember(
    requesterId: string,
    groupId: string,
    targetUserId: string,
  ): Promise<{ success: boolean }> {
    const group = await this.groupModel.findById(groupId).exec();
    if (!group || group.isDeleted) {
      throw new NotFoundException('Hội nhóm không tồn tại');
    }

    const isCreator = group.creatorId.toString() === requesterId;
    const isAdmin = isCreator || (group.adminIds || []).some((a) => a.toString() === requesterId);
    const isDeputy = (group.deputies || []).some((d) => d.userId.toString() === requesterId);

    if (!isAdmin && !isDeputy) {
      throw new ForbiddenException('Chỉ quản trị viên hoặc phó nhóm mới có quyền từ chối thành viên');
    }

    group.pendingMemberIds = (group.pendingMemberIds || []).filter(
      (p) => p.toString() !== targetUserId,
    );
    group.pendingRequests = (group.pendingRequests || []).filter(
      (r) => r.userId.toString() !== targetUserId,
    );

    await group.save();
    return { success: true };
  }

  /**
   * Lấy danh sách thành viên nhóm kèm vai trò và quyền hạn
   */
  async getGroupMembers(groupId: string, viewerId?: string) {
    const group = await this.groupModel
      .findById(groupId)
      .populate('members', 'name avatar email')
      .exec();

    if (!group || group.isDeleted) {
      throw new NotFoundException('Hội nhóm không tồn tại');
    }

    const creatorIdStr = group.creatorId.toString();
    const adminIdStrs = new Set((group.adminIds || []).map((a) => a.toString()));
    const deputyMap = new Map<string, { canRemoveMembers: boolean; canMuteComments: boolean; canBlockPosting: boolean }>();
    for (const d of group.deputies || []) {
      deputyMap.set(d.userId.toString(), {
        canRemoveMembers: Boolean(d.canRemoveMembers),
        canMuteComments: Boolean(d.canMuteComments),
        canBlockPosting: Boolean(d.canBlockPosting),
      });
    }
    const mutedCommentStrs = new Set((group.mutedCommentUserIds || []).map((m) => m.toString()));
    const bannedPostingStrs = new Set((group.bannedPostingUserIds || []).map((b) => b.toString()));

    const membersList = (group.members as any[]).map((u) => {
      const uId = u._id ? u._id.toString() : u.toString();
      const isCreator = uId === creatorIdStr;
      const isAdmin = isCreator || adminIdStrs.has(uId);
      const isDeputy = !isAdmin && deputyMap.has(uId);

      return {
        _id: uId,
        name: u.name || 'Người dùng',
        avatar: u.avatar || null,
        role: isCreator ? 'creator' : isAdmin ? 'admin' : isDeputy ? 'deputy' : 'member',
        deputyPermissions: isDeputy ? deputyMap.get(uId) : null,
        isMutedComments: mutedCommentStrs.has(uId),
        isBannedPosting: bannedPostingStrs.has(uId),
      };
    });

    return {
      members: membersList,
      memberCount: membersList.length,
      viewerId,
    };
  }

  /**
   * Bổ nhiệm / cập nhật quyền hạn phó nhóm
   */
  async setDeputy(
    adminId: string,
    groupId: string,
    dto: SetDeputyDto,
  ): Promise<{ success: boolean; deputy: any }> {
    const group = await this.groupModel.findById(groupId).exec();
    if (!group || group.isDeleted) {
      throw new NotFoundException('Hội nhóm không tồn tại');
    }

    const isCreator = group.creatorId.toString() === adminId;
    const isAdmin = isCreator || (group.adminIds || []).some((a) => a.toString() === adminId);
    if (!isAdmin) {
      throw new ForbiddenException('Chỉ quản trị viên mới có quyền bổ nhiệm hoặc chỉnh sửa quyền phó nhóm');
    }

    const targetUserId = dto.userId;
    if (targetUserId === group.creatorId.toString() || (group.adminIds || []).some((a) => a.toString() === targetUserId)) {
      throw new BadRequestException('Quản trị viên đã có toàn quyền, không thể bổ nhiệm làm phó nhóm');
    }

    const isMember = (group.members || []).some((m) => m.toString() === targetUserId);
    if (!isMember) {
      throw new BadRequestException('Người dùng phải là thành viên của nhóm trước khi được bổ nhiệm');
    }

    const objTargetId = new Types.ObjectId(targetUserId);
    if (!group.deputies) group.deputies = [];
    if (!group.moderatorIds) group.moderatorIds = [];

    const existingIndex = group.deputies.findIndex((d) => d.userId.toString() === targetUserId);
    const newDeputy = {
      userId: objTargetId,
      canRemoveMembers: dto.canRemoveMembers ?? true,
      canMuteComments: dto.canMuteComments ?? true,
      canBlockPosting: dto.canBlockPosting ?? true,
    };

    if (existingIndex >= 0) {
      group.deputies[existingIndex] = newDeputy;
    } else {
      group.deputies.push(newDeputy);
    }

    if (!group.moderatorIds.some((m) => m.toString() === targetUserId)) {
      group.moderatorIds.push(objTargetId);
    }

    await group.save();
    return { success: true, deputy: newDeputy };
  }

  /**
   * Thu hồi vai trò phó nhóm
   */
  async removeDeputy(
    adminId: string,
    groupId: string,
    targetUserId: string,
  ): Promise<{ success: boolean }> {
    const group = await this.groupModel.findById(groupId).exec();
    if (!group || group.isDeleted) {
      throw new NotFoundException('Hội nhóm không tồn tại');
    }

    const isCreator = group.creatorId.toString() === adminId;
    const isAdmin = isCreator || (group.adminIds || []).some((a) => a.toString() === adminId);
    if (!isAdmin) {
      throw new ForbiddenException('Chỉ quản trị viên mới có quyền thu hồi vai trò phó nhóm');
    }

    group.deputies = (group.deputies || []).filter((d) => d.userId.toString() !== targetUserId);
    group.moderatorIds = (group.moderatorIds || []).filter((m) => m.toString() !== targetUserId);

    await group.save();
    return { success: true };
  }

  /**
   * Xóa thành viên khỏi nhóm
   */
  async removeMember(
    requesterId: string,
    groupId: string,
    targetUserId: string,
  ): Promise<{ memberCount: number }> {
    const group = await this.groupModel.findById(groupId).exec();
    if (!group || group.isDeleted) {
      throw new NotFoundException('Hội nhóm không tồn tại');
    }

    if (targetUserId === group.creatorId.toString()) {
      throw new ForbiddenException('Không thể xóa người sáng lập nhóm');
    }

    const isCreator = group.creatorId.toString() === requesterId;
    const isAdmin = isCreator || (group.adminIds || []).some((a) => a.toString() === requesterId);
    const deputy = (group.deputies || []).find((d) => d.userId.toString() === requesterId);

    const isTargetAdmin = (group.adminIds || []).some((a) => a.toString() === targetUserId);
    const isTargetDeputy = (group.deputies || []).some((d) => d.userId.toString() === targetUserId);

    if (isTargetAdmin && !isCreator) {
      throw new ForbiddenException('Chỉ người sáng lập mới có thể xóa quản trị viên');
    }

    if (isTargetDeputy && !isAdmin) {
      throw new ForbiddenException('Chỉ quản trị viên mới có thể xóa phó nhóm');
    }

    if (!isAdmin) {
      if (!deputy || !deputy.canRemoveMembers) {
        throw new ForbiddenException('Bạn không có quyền xóa thành viên khỏi nhóm');
      }
    }

    group.members = (group.members || []).filter((m) => m.toString() !== targetUserId);
    group.adminIds = (group.adminIds || []).filter((a) => a.toString() !== targetUserId);
    group.moderatorIds = (group.moderatorIds || []).filter((m) => m.toString() !== targetUserId);
    group.deputies = (group.deputies || []).filter((d) => d.userId.toString() !== targetUserId);
    group.bannedPostingUserIds = (group.bannedPostingUserIds || []).filter((b) => b.toString() !== targetUserId);
    group.mutedCommentUserIds = (group.mutedCommentUserIds || []).filter((m) => m.toString() !== targetUserId);

    group.memberCount = group.members.length;
    await group.save();

    return { memberCount: group.memberCount };
  }

  /**
   * Khóa / mở khóa bình luận của thành viên
   */
  async toggleMuteComments(
    requesterId: string,
    groupId: string,
    targetUserId: string,
    muted: boolean,
  ): Promise<{ muted: boolean }> {
    const group = await this.groupModel.findById(groupId).exec();
    if (!group || group.isDeleted) {
      throw new NotFoundException('Hội nhóm không tồn tại');
    }

    if (targetUserId === group.creatorId.toString() || (group.adminIds || []).some((a) => a.toString() === targetUserId)) {
      throw new ForbiddenException('Không thể khóa bình luận của quản trị viên');
    }

    const isCreator = group.creatorId.toString() === requesterId;
    const isAdmin = isCreator || (group.adminIds || []).some((a) => a.toString() === requesterId);
    const deputy = (group.deputies || []).find((d) => d.userId.toString() === requesterId);

    if (!isAdmin) {
      if (!deputy || !deputy.canMuteComments) {
        throw new ForbiddenException('Bạn không có quyền khóa bình luận của thành viên');
      }
    }

    if (!group.mutedCommentUserIds) group.mutedCommentUserIds = [];

    if (muted) {
      if (!group.mutedCommentUserIds.some((m) => m.toString() === targetUserId)) {
        group.mutedCommentUserIds.push(new Types.ObjectId(targetUserId));
      }
    } else {
      group.mutedCommentUserIds = group.mutedCommentUserIds.filter((m) => m.toString() !== targetUserId);
    }

    await group.save();
    return { muted };
  }

  /**
   * Khóa / mở khóa đăng bài của thành viên
   */
  async toggleBlockPosting(
    requesterId: string,
    groupId: string,
    targetUserId: string,
    blocked: boolean,
  ): Promise<{ blocked: boolean }> {
    const group = await this.groupModel.findById(groupId).exec();
    if (!group || group.isDeleted) {
      throw new NotFoundException('Hội nhóm không tồn tại');
    }

    if (targetUserId === group.creatorId.toString() || (group.adminIds || []).some((a) => a.toString() === targetUserId)) {
      throw new ForbiddenException('Không thể cấm đăng bài của quản trị viên');
    }

    const isCreator = group.creatorId.toString() === requesterId;
    const isAdmin = isCreator || (group.adminIds || []).some((a) => a.toString() === requesterId);
    const deputy = (group.deputies || []).find((d) => d.userId.toString() === requesterId);

    if (!isAdmin) {
      if (!deputy || !deputy.canBlockPosting) {
        throw new ForbiddenException('Bạn không có quyền cấm đăng bài của thành viên');
      }
    }

    if (!group.bannedPostingUserIds) group.bannedPostingUserIds = [];

    if (blocked) {
      if (!group.bannedPostingUserIds.some((b) => b.toString() === targetUserId)) {
        group.bannedPostingUserIds.push(new Types.ObjectId(targetUserId));
      }
    } else {
      group.bannedPostingUserIds = group.bannedPostingUserIds.filter((b) => b.toString() !== targetUserId);
    }

    await group.save();
    return { blocked };
  }

  /**
   * Danh sách nhóm của tôi
   */
  async getMyGroups(userId: string): Promise<CommunityGroupDocument[]> {
    const objUserId = new Types.ObjectId(userId);
    return this.groupModel
      .find({
        $or: [{ creatorId: objUserId }, { members: objUserId }],
        isDeleted: false,
      })
      .sort({ updatedAt: -1 })
      .exec();
  }

  /**
   * Khám phá các hội nhóm
   */
  async exploreGroups(keyword?: string, limit = 20, offset = 0): Promise<CommunityGroupDocument[]> {
    const query: Record<string, unknown> = {
      isDeleted: false,
      privacy: 'public',
    };
    if (keyword?.trim()) {
      query.$or = [
        { name: { $regex: keyword.trim(), $options: 'i' } },
        { description: { $regex: keyword.trim(), $options: 'i' } },
      ];
    }

    return this.groupModel
      .find(query)
      .sort({ memberCount: -1, createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .exec();
  }

  /**
   * Cập nhật thông tin hội nhóm
   */
  async updateGroup(
    groupId: string,
    userId: string,
    dto: UpdateCommunityGroupDto,
  ): Promise<CommunityGroupDocument> {
    if (!Types.ObjectId.isValid(groupId)) {
      throw new BadRequestException('Mã nhóm không hợp lệ');
    }

    const group = await this.groupModel.findById(groupId).exec();
    if (!group || group.isDeleted) {
      throw new NotFoundException('Hội nhóm không tồn tại');
    }

    const isAdmin =
      group.creatorId.toString() === userId ||
      (group.adminIds || []).some((a) => a.toString() === userId);

    if (!isAdmin) {
      throw new ForbiddenException('Bạn không có quyền chỉnh sửa nhóm này');
    }

    if (dto.name) group.name = dto.name.trim();
    if (dto.description !== undefined) group.description = dto.description.trim();
    if (dto.privacy) group.privacy = dto.privacy;
    if (dto.avatar !== undefined) group.avatar = dto.avatar;
    if (dto.coverImage !== undefined) group.coverImage = dto.coverImage;
    if (dto.requireApproval !== undefined) group.requireApproval = dto.requireApproval;
    if (dto.requireJoinReason !== undefined) group.requireJoinReason = dto.requireJoinReason;
    if (dto.joinQuestion !== undefined) group.joinQuestion = dto.joinQuestion.trim();

    group.updatedAt = new Date();
    await group.save();

    return group;
  }
}

