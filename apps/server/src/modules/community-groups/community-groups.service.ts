import {
  Injectable,
  OnModuleInit,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
  Optional,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  CommunityGroup,
  CommunityGroupDocument,
} from './schemas/community-group.schema.js';
import {
  CommentReport,
  CommentReportDocument,
} from '../posts/schemas/comment-report.schema.js';
import {
  PostComment,
  PostCommentDocument,
} from '../posts/schemas/post-comment.schema.js';
import { Post, PostDocument } from '../posts/schemas/post.schema.js';
import { ResolveCommentReportDto } from '../posts/dto/report-comment.dto.js';
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

function toIdString(val: any): string {
  if (!val) return '';
  if (typeof val === 'string') return val;
  if (val._id) return val._id.toString();
  return val.toString();
}

@Injectable()
export class CommunityGroupsService implements OnModuleInit {
  constructor(
    @InjectModel(CommunityGroup.name)
    private readonly groupModel: Model<CommunityGroupDocument>,
    @Optional()
    @InjectModel(CommentReport.name)
    private readonly reportModel?: Model<CommentReportDocument>,
    @Optional()
    @InjectModel(PostComment.name)
    private readonly commentModel?: Model<PostCommentDocument>,
    @Optional()
    @InjectModel(Post.name)
    private readonly postModel?: Model<PostDocument>,
  ) {}

  async onModuleInit() {
    try {
      const systemId = new Types.ObjectId('000000000000000000000001');
      await this.groupModel.deleteMany({ creatorId: systemId }).exec();
    } catch {}
  }

  async createGroup(
    creatorId: string,
    dto: CreateCommunityGroupDto,
  ): Promise<CommunityGroupDocument> {
    if (!creatorId || !Types.ObjectId.isValid(creatorId)) {
      throw new BadRequestException(
        'ID người tạo nhóm không hợp lệ hoặc phiên đăng nhập đã hết hạn',
      );
    }

    const slug = dto.slug.trim().toLowerCase();
    const existing = await this.groupModel.findOne({ slug }).exec();
    if (existing) {
      throw new ConflictException(
        'Đường dẫn (slug) của nhóm đã tồn tại, vui lòng chọn tên khác',
      );
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
      joinQuestion:
        dto.joinQuestion?.trim() || 'Tại sao bạn muốn tham gia nhóm này?',
      rules: [],
      isDeleted: false,
    });

    return group;
  }

  async getGroupBySlug(
    slug: string,
    viewerId?: string,
  ): Promise<{
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
      .populate('members', 'name avatar email')
      .exec();

    if (!group) {
      throw new NotFoundException('Không tìm thấy hội nhóm');
    }

    const viewerObjId =
      viewerId && Types.ObjectId.isValid(viewerId)
        ? new Types.ObjectId(viewerId)
        : null;
    const viewerIdStr = viewerId ? String(viewerId) : '';

    const currentCreatorIdStr = toIdString(group.creatorId);
    if (
      (!currentCreatorIdStr || currentCreatorIdStr === 'undefined') &&
      viewerObjId
    ) {
      await this.groupModel
        .updateOne(
          { _id: group._id },
          {
            $set: {
              creatorId: viewerObjId,
              adminIds: [viewerObjId],
              memberCount: Math.max(group.memberCount || 1, 1),
            },
            $addToSet: { members: viewerObjId },
          },
        )
        .exec();
      group.creatorId = viewerObjId as any;
      group.adminIds = [viewerObjId as any];
      if (!group.members) group.members = [];
      if (!group.members.some((m) => toIdString(m) === viewerIdStr)) {
        group.members.push(viewerObjId as any);
      }
    }

    const validMembers = (group.members as any[]).filter(
      (m) => m && (m._id || m.name),
    );
    const validMemberIds = validMembers.map(
      (m) => new Types.ObjectId(m._id ? m._id.toString() : m.toString()),
    );

    const count = Math.max(validMemberIds.length, 1);
    if (
      group.memberCount !== count ||
      (group as any).members?.length !== validMemberIds.length
    ) {
      await this.groupModel
        .updateOne(
          { _id: group._id },
          {
            $set: {
              members:
                validMemberIds.length > 0
                  ? validMemberIds
                  : viewerObjId
                    ? [viewerObjId]
                    : [],
              memberCount: count,
            },
          },
        )
        .exec();
      group.memberCount = count;
    }

    let isMember = viewerObjId
      ? validMemberIds.some((m) => toIdString(m) === viewerIdStr)
      : false;
    const isPending = viewerObjId
      ? (group.pendingMemberIds || []).some(
          (p) => toIdString(p) === viewerIdStr,
        ) ||
        (group.pendingRequests || []).some(
          (r) => toIdString(r.userId) === viewerIdStr,
        )
      : false;
    const isCreator = viewerObjId
      ? toIdString(group.creatorId) === viewerIdStr
      : false;
    const isAdmin = viewerObjId
      ? isCreator ||
        (group.adminIds || []).some((a) => toIdString(a) === viewerIdStr)
      : false;
    if (isAdmin && viewerObjId && !isMember) {
      await this.groupModel
        .updateOne({ _id: group._id }, { $addToSet: { members: viewerObjId } })
        .exec();
      if (!group.members) group.members = [];
      group.members.push(viewerObjId as any);
      isMember = true;
    }

    const deputy = viewerObjId
      ? (group.deputies || []).find((d) => toIdString(d.userId) === viewerIdStr)
      : undefined;
    const isDeputy = Boolean(deputy);

    const canRemoveMembers = isAdmin || Boolean(deputy?.canRemoveMembers);
    const canMuteComments = isAdmin || Boolean(deputy?.canMuteComments);
    const canBlockPosting = isAdmin || Boolean(deputy?.canBlockPosting);

    const isBannedPosting = viewerObjId
      ? (group.bannedPostingUserIds || []).some(
          (b) => toIdString(b) === viewerIdStr,
        )
      : false;
    const isMutedComments = viewerObjId
      ? (group.mutedCommentUserIds || []).some(
          (m) => toIdString(m) === viewerIdStr,
        )
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

  async joinGroup(
    groupId: string,
    userId: string,
    dto?: JoinGroupDto,
  ): Promise<{
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

    const isMember = (group.members || []).some(
      (m) => toIdString(m) === userId,
    );
    if (isMember) {
      return { status: 'joined', memberCount: group.memberCount };
    }

    const objUserId = new Types.ObjectId(userId);
    if (group.requireApproval || group.requireJoinReason) {
      const reason = (dto?.reason ?? '').trim();
      if (group.requireJoinReason && !reason) {
        throw new BadRequestException(
          'Vui lòng trả lời câu hỏi lý do tham gia nhóm',
        );
      }

      if (!group.pendingRequests) group.pendingRequests = [];
      if (!group.pendingMemberIds) group.pendingMemberIds = [];

      const existingReqIndex = group.pendingRequests.findIndex(
        (r) => toIdString(r.userId) === userId,
      );
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

      if (!group.pendingMemberIds.some((p) => toIdString(p) === userId)) {
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

  async leaveGroup(
    groupId: string,
    userId: string,
  ): Promise<{
    memberCount: number;
  }> {
    if (!Types.ObjectId.isValid(groupId)) {
      throw new BadRequestException('Mã nhóm không hợp lệ');
    }

    const group = await this.groupModel.findById(groupId).exec();
    if (!group || group.isDeleted) {
      throw new NotFoundException('Hội nhóm không tồn tại');
    }

    if (toIdString(group.creatorId) === userId) {
      throw new ForbiddenException('Người tạo nhóm không thể tự rời nhóm');
    }

    group.members = (group.members || []).filter(
      (m) => toIdString(m) !== userId,
    );
    group.adminIds = (group.adminIds || []).filter(
      (a) => toIdString(a) !== userId,
    );
    group.moderatorIds = (group.moderatorIds || []).filter(
      (m) => toIdString(m) !== userId,
    );
    group.deputies = (group.deputies || []).filter(
      (d) => toIdString(d.userId) !== userId,
    );
    group.memberCount = group.members.length;
    await group.save();

    return { memberCount: group.memberCount };
  }

  async getPendingRequests(requesterId: string, groupId: string) {
    const group = await this.groupModel
      .findById(groupId)
      .populate('pendingRequests.userId', 'name avatar email')
      .exec();

    if (!group || group.isDeleted) {
      throw new NotFoundException('Hội nhóm không tồn tại');
    }

    const isCreator = toIdString(group.creatorId) === requesterId;
    const isAdmin =
      isCreator ||
      (group.adminIds || []).some((a) => toIdString(a) === requesterId);
    const isDeputy = (group.deputies || []).some(
      (d) => toIdString(d.userId) === requesterId,
    );

    if (!isAdmin && !isDeputy) {
      throw new ForbiddenException(
        'Chỉ quản trị viên hoặc phó nhóm mới có quyền xem danh sách chờ',
      );
    }

    return {
      requireJoinReason: group.requireJoinReason,
      joinQuestion: group.joinQuestion,
      requests: group.pendingRequests || [],
    };
  }

  async approveMember(
    requesterId: string,
    groupId: string,
    targetUserId: string,
  ): Promise<{ memberCount: number }> {
    const group = await this.groupModel.findById(groupId).exec();
    if (!group || group.isDeleted) {
      throw new NotFoundException('Hội nhóm không tồn tại');
    }

    const isCreator = toIdString(group.creatorId) === requesterId;
    const isAdmin =
      isCreator ||
      (group.adminIds || []).some((a) => toIdString(a) === requesterId);
    const isDeputy = (group.deputies || []).some(
      (d) => toIdString(d.userId) === requesterId,
    );

    if (!isAdmin && !isDeputy) {
      throw new ForbiddenException(
        'Chỉ quản trị viên hoặc phó nhóm mới có quyền duyệt thành viên',
      );
    }

    group.pendingMemberIds = (group.pendingMemberIds || []).filter(
      (p) => toIdString(p) !== targetUserId,
    );
    group.pendingRequests = (group.pendingRequests || []).filter(
      (r) => toIdString(r.userId) !== targetUserId,
    );

    const objTarget = new Types.ObjectId(targetUserId);
    if (!group.members) group.members = [];
    if (!group.members.some((m) => toIdString(m) === targetUserId)) {
      group.members.push(objTarget);
    }

    group.memberCount = group.members.length;
    await group.save();

    return { memberCount: group.memberCount };
  }

  async rejectMember(
    requesterId: string,
    groupId: string,
    targetUserId: string,
  ): Promise<{ success: boolean }> {
    const group = await this.groupModel.findById(groupId).exec();
    if (!group || group.isDeleted) {
      throw new NotFoundException('Hội nhóm không tồn tại');
    }

    const isCreator = toIdString(group.creatorId) === requesterId;
    const isAdmin =
      isCreator ||
      (group.adminIds || []).some((a) => toIdString(a) === requesterId);
    const isDeputy = (group.deputies || []).some(
      (d) => toIdString(d.userId) === requesterId,
    );

    if (!isAdmin && !isDeputy) {
      throw new ForbiddenException(
        'Chỉ quản trị viên hoặc phó nhóm mới có quyền từ chối thành viên',
      );
    }

    group.pendingMemberIds = (group.pendingMemberIds || []).filter(
      (p) => toIdString(p) !== targetUserId,
    );
    group.pendingRequests = (group.pendingRequests || []).filter(
      (r) => toIdString(r.userId) !== targetUserId,
    );

    await group.save();
    return { success: true };
  }

  async getGroupMembers(groupId: string, viewerId?: string) {
    const group = await this.groupModel
      .findById(groupId)
      .populate('members', 'name avatar email')
      .exec();

    if (!group || group.isDeleted) {
      throw new NotFoundException('Hội nhóm không tồn tại');
    }

    const creatorIdStr = toIdString(group.creatorId);
    const adminIdStrs = new Set(
      (group.adminIds || []).map((a) => toIdString(a)),
    );
    const deputyMap = new Map<
      string,
      {
        canRemoveMembers: boolean;
        canMuteComments: boolean;
        canBlockPosting: boolean;
      }
    >();
    for (const d of group.deputies || []) {
      deputyMap.set(toIdString(d.userId), {
        canRemoveMembers: Boolean(d.canRemoveMembers),
        canMuteComments: Boolean(d.canMuteComments),
        canBlockPosting: Boolean(d.canBlockPosting),
      });
    }
    const mutedCommentStrs = new Set(
      (group.mutedCommentUserIds || []).map((m) => toIdString(m)),
    );
    const bannedPostingStrs = new Set(
      (group.bannedPostingUserIds || []).map((b) => toIdString(b)),
    );

    const rawMembers = (group.members as any[]).filter(
      (u) => u && (u._id || u.name),
    );
    const membersList = rawMembers.map((u) => {
      const uId = u._id ? u._id.toString() : u.toString();
      const isCreator = uId === creatorIdStr;
      const isAdmin = isCreator || adminIdStrs.has(uId);
      const isDeputy = !isAdmin && deputyMap.has(uId);

      return {
        _id: uId,
        name: u.name || 'Người dùng',
        avatar: u.avatar || null,
        role: isCreator
          ? 'creator'
          : isAdmin
            ? 'admin'
            : isDeputy
              ? 'deputy'
              : 'member',
        deputyPermissions: isDeputy ? deputyMap.get(uId) : null,
        isMutedComments: mutedCommentStrs.has(uId),
        isBannedPosting: bannedPostingStrs.has(uId),
      };
    });
    const actualMemberCount = Math.max(membersList.length, 1);
    if (group.memberCount !== actualMemberCount) {
      await this.groupModel
        .updateOne(
          { _id: group._id },
          { $set: { memberCount: actualMemberCount } },
        )
        .exec();
    }

    return {
      members: membersList,
      memberCount: membersList.length,
      viewerId,
    };
  }

  async setDeputy(
    adminId: string,
    groupId: string,
    dto: SetDeputyDto,
  ): Promise<{ success: boolean; deputy: any }> {
    const group = await this.groupModel.findById(groupId).exec();
    if (!group || group.isDeleted) {
      throw new NotFoundException('Hội nhóm không tồn tại');
    }

    const isCreator = toIdString(group.creatorId) === adminId;
    const isAdmin =
      isCreator ||
      (group.adminIds || []).some((a) => toIdString(a) === adminId);
    if (!isAdmin) {
      throw new ForbiddenException(
        'Chỉ quản trị viên mới có quyền bổ nhiệm hoặc chỉnh sửa quyền phó nhóm',
      );
    }

    const targetUserId = dto.userId;
    if (
      targetUserId === toIdString(group.creatorId) ||
      (group.adminIds || []).some((a) => toIdString(a) === targetUserId)
    ) {
      throw new BadRequestException(
        'Quản trị viên đã có toàn quyền, không thể bổ nhiệm làm phó nhóm',
      );
    }

    const isMember = (group.members || []).some(
      (m) => toIdString(m) === targetUserId,
    );
    if (!isMember) {
      throw new BadRequestException(
        'Người dùng phải là thành viên của nhóm trước khi được bổ nhiệm',
      );
    }

    const objTargetId = new Types.ObjectId(targetUserId);
    if (!group.deputies) group.deputies = [];
    if (!group.moderatorIds) group.moderatorIds = [];

    const existingIndex = group.deputies.findIndex(
      (d) => toIdString(d.userId) === targetUserId,
    );
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

    if (!group.moderatorIds.some((m) => toIdString(m) === targetUserId)) {
      group.moderatorIds.push(objTargetId);
    }

    await group.save();
    return { success: true, deputy: newDeputy };
  }

  async removeDeputy(
    adminId: string,
    groupId: string,
    targetUserId: string,
  ): Promise<{ success: boolean }> {
    const group = await this.groupModel.findById(groupId).exec();
    if (!group || group.isDeleted) {
      throw new NotFoundException('Hội nhóm không tồn tại');
    }

    const isCreator = toIdString(group.creatorId) === adminId;
    const isAdmin =
      isCreator ||
      (group.adminIds || []).some((a) => toIdString(a) === adminId);
    if (!isAdmin) {
      throw new ForbiddenException(
        'Chỉ quản trị viên mới có quyền thu hồi vai trò phó nhóm',
      );
    }

    group.deputies = (group.deputies || []).filter(
      (d) => toIdString(d.userId) !== targetUserId,
    );
    group.moderatorIds = (group.moderatorIds || []).filter(
      (m) => toIdString(m) !== targetUserId,
    );

    await group.save();
    return { success: true };
  }

  async removeMember(
    requesterId: string,
    groupId: string,
    targetUserId: string,
  ): Promise<{ memberCount: number }> {
    const group = await this.groupModel.findById(groupId).exec();
    if (!group || group.isDeleted) {
      throw new NotFoundException('Hội nhóm không tồn tại');
    }

    if (targetUserId === toIdString(group.creatorId)) {
      throw new ForbiddenException('Không thể xóa người sáng lập nhóm');
    }

    const isCreator = toIdString(group.creatorId) === requesterId;
    const isAdmin =
      isCreator ||
      (group.adminIds || []).some((a) => toIdString(a) === requesterId);
    const deputy = (group.deputies || []).find(
      (d) => toIdString(d.userId) === requesterId,
    );

    const isTargetAdmin = (group.adminIds || []).some(
      (a) => toIdString(a) === targetUserId,
    );
    const isTargetDeputy = (group.deputies || []).some(
      (d) => toIdString(d.userId) === targetUserId,
    );

    if (isTargetAdmin && !isCreator) {
      throw new ForbiddenException(
        'Chỉ người sáng lập mới có thể xóa quản trị viên',
      );
    }

    if (isTargetDeputy && !isAdmin) {
      throw new ForbiddenException('Chỉ quản trị viên mới có thể xóa phó nhóm');
    }

    if (!isAdmin) {
      if (!deputy || !deputy.canRemoveMembers) {
        throw new ForbiddenException(
          'Bạn không có quyền xóa thành viên khỏi nhóm',
        );
      }
    }

    group.members = (group.members || []).filter(
      (m) => toIdString(m) !== targetUserId,
    );
    group.adminIds = (group.adminIds || []).filter(
      (a) => toIdString(a) !== targetUserId,
    );
    group.moderatorIds = (group.moderatorIds || []).filter(
      (m) => toIdString(m) !== targetUserId,
    );
    group.deputies = (group.deputies || []).filter(
      (d) => toIdString(d.userId) !== targetUserId,
    );
    group.bannedPostingUserIds = (group.bannedPostingUserIds || []).filter(
      (b) => toIdString(b) !== targetUserId,
    );
    group.mutedCommentUserIds = (group.mutedCommentUserIds || []).filter(
      (m) => toIdString(m) !== targetUserId,
    );

    group.memberCount = group.members.length;
    await group.save();

    return { memberCount: group.memberCount };
  }

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

    if (
      targetUserId === toIdString(group.creatorId) ||
      (group.adminIds || []).some((a) => toIdString(a) === targetUserId)
    ) {
      throw new ForbiddenException(
        'Không thể khóa bình luận của quản trị viên',
      );
    }

    const isCreator = toIdString(group.creatorId) === requesterId;
    const isAdmin =
      isCreator ||
      (group.adminIds || []).some((a) => toIdString(a) === requesterId);
    const deputy = (group.deputies || []).find(
      (d) => toIdString(d.userId) === requesterId,
    );

    if (!isAdmin) {
      if (!deputy || !deputy.canMuteComments) {
        throw new ForbiddenException(
          'Bạn không có quyền khóa bình luận của thành viên',
        );
      }
    }

    if (!group.mutedCommentUserIds) group.mutedCommentUserIds = [];

    if (muted) {
      if (
        !group.mutedCommentUserIds.some((m) => toIdString(m) === targetUserId)
      ) {
        group.mutedCommentUserIds.push(new Types.ObjectId(targetUserId));
      }
    } else {
      group.mutedCommentUserIds = group.mutedCommentUserIds.filter(
        (m) => toIdString(m) !== targetUserId,
      );
    }

    await group.save();
    return { muted };
  }

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

    if (
      targetUserId === toIdString(group.creatorId) ||
      (group.adminIds || []).some((a) => toIdString(a) === targetUserId)
    ) {
      throw new ForbiddenException('Không thể cấm đăng bài của quản trị viên');
    }

    const isCreator = toIdString(group.creatorId) === requesterId;
    const isAdmin =
      isCreator ||
      (group.adminIds || []).some((a) => toIdString(a) === requesterId);
    const deputy = (group.deputies || []).find(
      (d) => toIdString(d.userId) === requesterId,
    );

    if (!isAdmin) {
      if (!deputy || !deputy.canBlockPosting) {
        throw new ForbiddenException(
          'Bạn không có quyền cấm đăng bài của thành viên',
        );
      }
    }

    if (!group.bannedPostingUserIds) group.bannedPostingUserIds = [];

    if (blocked) {
      if (
        !group.bannedPostingUserIds.some((b) => toIdString(b) === targetUserId)
      ) {
        group.bannedPostingUserIds.push(new Types.ObjectId(targetUserId));
      }
    } else {
      group.bannedPostingUserIds = group.bannedPostingUserIds.filter(
        (b) => toIdString(b) !== targetUserId,
      );
    }

    await group.save();
    return { blocked };
  }

  async getMyGroups(userId: string): Promise<CommunityGroupDocument[]> {
    const objUserId = new Types.ObjectId(userId);
    const groups = await this.groupModel
      .find({
        $or: [{ creatorId: objUserId }, { members: objUserId }],
        isDeleted: false,
      })
      .sort({ updatedAt: -1 })
      .exec();
    for (const g of groups) {
      if (Array.isArray(g.members) && g.members.length > 0) {
        g.memberCount = g.members.length;
      }
    }
    return groups;
  }

  async exploreGroups(
    keyword?: string,
    limit = 20,
    offset = 0,
    viewerId?: string,
  ): Promise<any[]> {
    const query: Record<string, unknown> = {
      isDeleted: false,
      privacy: 'public',
    };
    if (keyword?.trim()) {
      const escapedKeyword = keyword.trim().slice(0, 100).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.$or = [
        { name: { $regex: escapedKeyword, $options: 'i' } },
        { description: { $regex: escapedKeyword, $options: 'i' } },
      ];
    }

    const groups = await this.groupModel
      .find(query)
      .sort({ memberCount: -1, createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .maxTimeMS(2000)
      .lean()
      .exec();

    const viewerIdStr = viewerId ? String(viewerId) : '';
    return groups.map((g: any) => {
      const creatorStr = toIdString(g.creatorId);
      const isCreator = viewerIdStr ? creatorStr === viewerIdStr : false;
      const isAdmin = viewerIdStr
        ? isCreator ||
          (g.adminIds || []).some((a: any) => toIdString(a) === viewerIdStr)
        : false;
      const isMember = viewerIdStr
        ? isAdmin ||
          (g.members || []).some((m: any) => toIdString(m) === viewerIdStr)
        : false;
      const isPending = viewerIdStr
        ? (g.pendingMemberIds || []).some(
            (p: any) => toIdString(p) === viewerIdStr,
          ) ||
          (g.pendingRequests || []).some(
            (r: any) => toIdString(r.userId) === viewerIdStr,
          )
        : false;

      return {
        ...g,
        memberCount:
          Array.isArray(g.members) && g.members.length > 0
            ? g.members.length
            : g.memberCount || 1,
        isMember,
        isAdmin,
        isPending,
      };
    });
  }

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
      toIdString(group.creatorId) === userId ||
      (group.adminIds || []).some((a) => toIdString(a) === userId);

    if (!isAdmin) {
      throw new ForbiddenException('Bạn không có quyền chỉnh sửa nhóm này');
    }

    if (dto.name) group.name = dto.name.trim();
    if (dto.description !== undefined)
      group.description = dto.description.trim();
    if (dto.privacy) group.privacy = dto.privacy;
    if (dto.avatar !== undefined) group.avatar = dto.avatar;
    if (dto.coverImage !== undefined) group.coverImage = dto.coverImage;
    if (dto.requireApproval !== undefined)
      group.requireApproval = dto.requireApproval;
    if (dto.requireJoinReason !== undefined)
      group.requireJoinReason = dto.requireJoinReason;
    if (dto.joinQuestion !== undefined)
      group.joinQuestion = dto.joinQuestion.trim();

    group.updatedAt = new Date();
    await group.save();

    return group;
  }

  async deleteGroup(
    groupId: string,
    userId: string,
  ): Promise<{ success: boolean; message: string }> {
    if (!Types.ObjectId.isValid(groupId)) {
      throw new BadRequestException('Mã nhóm không hợp lệ');
    }

    const group = await this.groupModel.findById(groupId).exec();
    if (!group || group.isDeleted) {
      throw new NotFoundException('Hội nhóm không tồn tại');
    }

    const isAdmin =
      toIdString(group.creatorId) === userId ||
      (group.adminIds || []).some((a) => toIdString(a) === userId);

    if (!isAdmin) {
      throw new ForbiddenException(
        'Chỉ quản trị viên mới có quyền xóa hội nhóm này',
      );
    }

    group.isDeleted = true;
    group.updatedAt = new Date();
    await group.save();

    if (this.postModel) {
      await this.postModel
        .updateMany({ groupId: group._id }, { $set: { isDeleted: true } })
        .exec();
    }

    return {
      success: true,
      message: 'Đã xóa hội nhóm thành công',
    };
  }

  async getGroupCommentReports(
    groupId: string,
    viewerId: string,
    status?: string,
  ) {
    if (!Types.ObjectId.isValid(groupId)) {
      throw new BadRequestException('Mã nhóm không hợp lệ');
    }

    const group = await this.groupModel.findById(groupId).exec();
    if (!group || group.isDeleted) {
      throw new NotFoundException('Hội nhóm không tồn tại');
    }

    const isCreator = toIdString(group.creatorId) === viewerId;
    const isAdmin =
      isCreator ||
      (group.adminIds || []).some((a) => toIdString(a) === viewerId);
    const isDeputy = (group.deputies || []).some(
      (d) => toIdString(d.userId) === viewerId,
    );

    if (!isAdmin && !isDeputy) {
      throw new ForbiddenException(
        'Chỉ quản trị viên hoặc phó nhóm mới có quyền xem báo cáo',
      );
    }

    if (!this.reportModel) return [];

    const query: any = {
      groupId: new Types.ObjectId(groupId),
      target: 'group_admin',
    };

    if (status && status !== 'all') {
      query.status = status;
    }

    const reports = await this.reportModel
      .find(query)
      .populate('reporterId', 'name avatar')
      .populate('commentAuthorId', 'name avatar email')
      .populate('resolvedBy', 'name avatar')
      .sort({ createdAt: -1 })
      .lean()
      .exec();

    return reports;
  }

  async resolveGroupCommentReport(
    groupId: string,
    reportId: string,
    viewerId: string,
    dto: ResolveCommentReportDto,
  ) {
    if (!Types.ObjectId.isValid(groupId) || !Types.ObjectId.isValid(reportId)) {
      throw new BadRequestException('Mã không hợp lệ');
    }

    const group = await this.groupModel.findById(groupId).exec();
    if (!group || group.isDeleted) {
      throw new NotFoundException('Hội nhóm không tồn tại');
    }

    const isCreator = toIdString(group.creatorId) === viewerId;
    const isAdmin =
      isCreator ||
      (group.adminIds || []).some((a) => toIdString(a) === viewerId);
    const deputy = (group.deputies || []).find(
      (d) => toIdString(d.userId) === viewerId,
    );
    const isDeputy = Boolean(deputy);

    if (!isAdmin && !isDeputy) {
      throw new ForbiddenException(
        'Chỉ quản trị viên hoặc phó nhóm mới có quyền xử lý báo cáo',
      );
    }

    if (isDeputy && !isAdmin) {
      if (dto.action === 'mute_user' && !deputy?.canMuteComments) {
        throw new ForbiddenException(
          'Bạn không có quyền khóa bình luận thành viên',
        );
      }
      if (dto.action === 'banned_posting' && !deputy?.canBlockPosting) {
        throw new ForbiddenException(
          'Bạn không có quyền khóa đăng bài thành viên',
        );
      }
      if (dto.action === 'banned_user' && !deputy?.canRemoveMembers) {
        throw new ForbiddenException(
          'Bạn không có quyền xóa thành viên khỏi nhóm',
        );
      }
    }

    if (!this.reportModel) {
      throw new BadRequestException('Mô hình báo cáo chưa được cấu hình');
    }

    const report = await this.reportModel.findById(reportId).exec();
    if (!report || toIdString(report.groupId) !== groupId) {
      throw new NotFoundException('Báo cáo không tồn tại trong nhóm này');
    }

    const viewerObjId = new Types.ObjectId(viewerId);

    if (dto.action === 'dismiss') {
      report.status = 'dismissed';
      report.actionTaken = 'dismissed';
      report.resolvedBy = viewerObjId;
      report.resolvedAt = new Date();
      report.resolutionNote = dto.note || 'Bỏ qua báo cáo';
      await report.save();
      return { success: true, message: 'Đã bỏ qua báo cáo', report };
    }

    if (
      ['delete_comment', 'mute_user', 'banned_posting', 'banned_user'].includes(
        dto.action,
      )
    ) {
      if (this.commentModel) {
        const comment = await this.commentModel
          .findById(report.commentId)
          .exec();
        if (comment) {
          await this.commentModel.deleteOne({ _id: comment._id }).exec();
          if (this.postModel) {
            await this.postModel
              .updateOne(
                { _id: comment.postId, commentCount: { $gt: 0 } },
                { $inc: { commentCount: -1 } },
              )
              .exec();
          }
        }
      }

      if (dto.action === 'mute_user' && report.commentAuthorId) {
        const authorObjId = new Types.ObjectId(
          report.commentAuthorId.toString(),
        );
        if (!group.mutedCommentUserIds) group.mutedCommentUserIds = [];
        if (
          !group.mutedCommentUserIds.some(
            (id) => toIdString(id) === authorObjId.toString(),
          )
        ) {
          group.mutedCommentUserIds.push(authorObjId);
          await group.save();
        }
      }

      if (dto.action === 'banned_posting' && report.commentAuthorId) {
        const authorObjId = new Types.ObjectId(
          report.commentAuthorId.toString(),
        );
        if (!group.bannedPostingUserIds) group.bannedPostingUserIds = [];
        if (
          !group.bannedPostingUserIds.some(
            (id) => toIdString(id) === authorObjId.toString(),
          )
        ) {
          group.bannedPostingUserIds.push(authorObjId);
          await group.save();
        }
      }

      if (dto.action === 'banned_user' && report.commentAuthorId) {
        const authorStr = report.commentAuthorId.toString();
        group.members = (group.members || []).filter(
          (m) => toIdString(m) !== authorStr,
        );
        group.adminIds = (group.adminIds || []).filter(
          (a) => toIdString(a) !== authorStr,
        );
        group.moderatorIds = (group.moderatorIds || []).filter(
          (m) => toIdString(m) !== authorStr,
        );
        group.deputies = (group.deputies || []).filter(
          (d) => toIdString(d.userId) !== authorStr,
        );
        group.memberCount = Math.max((group.members || []).length, 1);
        await group.save();
      }

      const actionMap: Record<string, any> = {
        delete_comment: 'deleted_comment',
        mute_user: 'muted_user',
        banned_posting: 'banned_posting',
        banned_user: 'banned_user',
      };

      report.status = 'resolved';
      report.actionTaken = actionMap[dto.action] || 'none';
      report.resolvedBy = viewerObjId;
      report.resolvedAt = new Date();
      report.resolutionNote = dto.note || 'Đã xử lý vi phạm';
      await report.save();

      return {
        success: true,
        message:
          dto.action === 'delete_comment'
            ? 'Đã xóa bình luận vi phạm'
            : dto.action === 'mute_user'
              ? 'Đã xóa bình luận và khóa quyền bình luận của người dùng'
              : dto.action === 'banned_posting'
                ? 'Đã xóa bình luận và chặn người dùng đăng bài trong nhóm'
                : 'Đã xóa bình luận và loại người dùng khỏi nhóm',
        report,
      };
    }

    throw new BadRequestException('Hành động không hợp lệ');
  }
}
