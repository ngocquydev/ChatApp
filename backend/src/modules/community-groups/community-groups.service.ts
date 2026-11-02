import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CommunityGroup, CommunityGroupDocument } from './schemas/community-group.schema.js';
import { CreateCommunityGroupDto, UpdateCommunityGroupDto } from './dto/community-group.dto.js';

@Injectable()
export class CommunityGroupsService {
  constructor(
    @InjectModel(CommunityGroup.name)
    private readonly groupModel: Model<CommunityGroupDocument>,
  ) {}

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
      members: [objCreatorId],
      pendingMemberIds: [],
      memberCount: 1,
      requireApproval: Boolean(dto.requireApproval),
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
  }> {
    const group = await this.groupModel
      .findOne({ slug: slug.toLowerCase(), isDeleted: false })
      .populate('creatorId', 'name avatar')
      .populate('adminIds', 'name avatar')
      .exec();

    if (!group) {
      throw new NotFoundException('Không tìm thấy hội nhóm');
    }

    const viewerObjId = viewerId ? new Types.ObjectId(viewerId) : null;
    const isMember = viewerObjId
      ? group.members.some((m) => m.toString() === viewerId)
      : false;
    const isPending = viewerObjId
      ? group.pendingMemberIds.some((p) => p.toString() === viewerId)
      : false;
    const isAdmin = viewerObjId
      ? group.adminIds.some((a) => a.toString() === viewerId) || group.creatorId.toString() === viewerId
      : false;

    return { group, isMember, isPending, isAdmin };
  }

  /**
   * Tham gia nhóm hoặc gửi yêu cầu tham gia
   */
  async joinGroup(groupId: string, userId: string): Promise<{
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

    const isMember = group.members.some((m) => m.toString() === userId);
    if (isMember) {
      return { status: 'joined', memberCount: group.memberCount };
    }

    const objUserId = new Types.ObjectId(userId);

    // Nếu nhóm yêu cầu phê duyệt
    if (group.requireApproval) {
      if (!group.pendingMemberIds.some((p) => p.toString() === userId)) {
        group.pendingMemberIds.push(objUserId);
        await group.save();
      }
      return { status: 'pending', memberCount: group.memberCount };
    }

    // Tham gia trực tiếp
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

    group.members = group.members.filter((m) => m.toString() !== userId);
    group.adminIds = group.adminIds.filter((a) => a.toString() !== userId);
    group.moderatorIds = group.moderatorIds.filter((m) => m.toString() !== userId);
    group.memberCount = group.members.length;
    await group.save();

    return { memberCount: group.memberCount };
  }

  /**
   * Duyệt thành viên chờ
   */
  async approveMember(
    adminId: string,
    groupId: string,
    targetUserId: string,
  ): Promise<{ memberCount: number }> {
    const group = await this.groupModel.findById(groupId).exec();
    if (!group || group.isDeleted) {
      throw new NotFoundException('Hội nhóm không tồn tại');
    }

    const isAdmin =
      group.creatorId.toString() === adminId ||
      group.adminIds.some((a) => a.toString() === adminId);

    if (!isAdmin) {
      throw new ForbiddenException('Chỉ quản trị viên mới có quyền duyệt thành viên');
    }

    group.pendingMemberIds = group.pendingMemberIds.filter(
      (p) => p.toString() !== targetUserId,
    );

    const objTarget = new Types.ObjectId(targetUserId);
    if (!group.members.some((m) => m.toString() === targetUserId)) {
      group.members.push(objTarget);
    }

    group.memberCount = group.members.length;
    await group.save();

    return { memberCount: group.memberCount };
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
      group.adminIds.some((a) => a.toString() === userId);

    if (!isAdmin) {
      throw new ForbiddenException('Bạn không có quyền chỉnh sửa nhóm này');
    }

    if (dto.name) group.name = dto.name.trim();
    if (dto.description !== undefined) group.description = dto.description.trim();
    if (dto.privacy) group.privacy = dto.privacy;
    if (dto.avatar !== undefined) group.avatar = dto.avatar;
    if (dto.coverImage !== undefined) group.coverImage = dto.coverImage;
    if (dto.requireApproval !== undefined) group.requireApproval = dto.requireApproval;

    group.updatedAt = new Date();
    await group.save();

    return group;
  }
}

