import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CommunityGroupsService } from './community-groups.service.js';
import { Types } from 'mongoose';
import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';

describe('CommunityGroupsService', () => {
  let service: CommunityGroupsService;
  let mockGroupModel: any;

  beforeEach(() => {
    mockGroupModel = {
      create: vi.fn(),
      findOne: vi.fn(),
      findById: vi.fn(),
      find: vi.fn(),
    };
    service = new CommunityGroupsService(mockGroupModel);
  });

  it('should create a community group successfully', async () => {
    const creatorId = new Types.ObjectId().toString();
    mockGroupModel.findOne.mockReturnValue({
      exec: vi.fn().mockResolvedValue(null),
    });

    const mockCreated = {
      _id: new Types.ObjectId(),
      name: 'Nhóm Lập Trình',
      slug: 'nhom-lap-trinh',
      creatorId: new Types.ObjectId(creatorId),
      members: [new Types.ObjectId(creatorId)],
      memberCount: 1,
    };
    mockGroupModel.create.mockResolvedValue(mockCreated);

    const result = await service.createGroup(creatorId, {
      name: 'Nhóm Lập Trình',
      slug: 'nhom-lap-trinh',
      privacy: 'public',
    });

    expect(result).toBeDefined();
    expect(result.slug).toBe('nhom-lap-trinh');
    expect(mockGroupModel.create).toHaveBeenCalled();
  });

  it('should throw ConflictException if slug already exists', async () => {
    mockGroupModel.findOne.mockReturnValue({
      exec: vi.fn().mockResolvedValue({ _id: new Types.ObjectId() }),
    });

    await expect(
      service.createGroup('123456789012345678901234', {
        name: 'Nhóm Test',
        slug: 'nhom-test',
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('should allow user to join public group', async () => {
    const groupId = new Types.ObjectId().toString();
    const userId = new Types.ObjectId().toString();

    const mockGroup = {
      _id: new Types.ObjectId(groupId),
      members: [],
      pendingMemberIds: [],
      memberCount: 0,
      requireApproval: false,
      isDeleted: false,
      save: vi.fn().mockResolvedValue(true),
    };

    mockGroupModel.findById.mockReturnValue({
      exec: vi.fn().mockResolvedValue(mockGroup),
    });

    const res = await service.joinGroup(groupId, userId);
    expect(res.status).toBe('joined');
    expect(res.memberCount).toBe(1);
    expect(mockGroup.save).toHaveBeenCalled();
  });

  it('should put user into pending list if group requires approval', async () => {
    const groupId = new Types.ObjectId().toString();
    const userId = new Types.ObjectId().toString();

    const mockGroup = {
      _id: new Types.ObjectId(groupId),
      members: [],
      pendingMemberIds: [],
      memberCount: 0,
      requireApproval: true,
      isDeleted: false,
      save: vi.fn().mockResolvedValue(true),
    };

    mockGroupModel.findById.mockReturnValue({
      exec: vi.fn().mockResolvedValue(mockGroup),
    });

    const res = await service.joinGroup(groupId, userId);
    expect(res.status).toBe('pending');
    expect(mockGroup.pendingMemberIds.length).toBe(1);
  });

  it('should require join reason when requireJoinReason is true', async () => {
    const groupId = new Types.ObjectId().toString();
    const userId = new Types.ObjectId().toString();

    const mockGroup = {
      _id: new Types.ObjectId(groupId),
      members: [],
      pendingMemberIds: [],
      pendingRequests: [] as any[],
      requireJoinReason: true,
      isDeleted: false,
      save: vi.fn().mockResolvedValue(true),
    };

    mockGroupModel.findById.mockReturnValue({
      exec: vi.fn().mockResolvedValue(mockGroup),
    });

    await expect(service.joinGroup(groupId, userId)).rejects.toThrow();

    const res = await service.joinGroup(groupId, userId, { reason: 'Tôi muốn học hỏi kinh nghiệm' });
    expect(res.status).toBe('pending');
    expect(mockGroup.pendingRequests.length).toBe(1);
    expect(mockGroup.pendingRequests[0].reason).toBe('Tôi muốn học hỏi kinh nghiệm');
  });

  it('should appoint deputy with granular permissions', async () => {
    const creatorId = new Types.ObjectId().toString();
    const groupId = new Types.ObjectId().toString();
    const targetUserId = new Types.ObjectId().toString();

    const mockGroup = {
      _id: new Types.ObjectId(groupId),
      creatorId: new Types.ObjectId(creatorId),
      adminIds: [new Types.ObjectId(creatorId)],
      members: [new Types.ObjectId(creatorId), new Types.ObjectId(targetUserId)],
      deputies: [] as any[],
      moderatorIds: [],
      isDeleted: false,
      save: vi.fn().mockResolvedValue(true),
    };

    mockGroupModel.findById.mockReturnValue({
      exec: vi.fn().mockResolvedValue(mockGroup),
    });

    const result = await service.setDeputy(creatorId, groupId, {
      userId: targetUserId,
      canRemoveMembers: true,
      canMuteComments: true,
      canBlockPosting: false,
    });

    expect(result.success).toBe(true);
    expect(mockGroup.deputies.length).toBe(1);
    expect(mockGroup.deputies[0].canBlockPosting).toBe(false);
    expect(mockGroup.deputies[0].canRemoveMembers).toBe(true);
  });

  it('should allow deputy with canRemoveMembers to remove regular member', async () => {
    const creatorId = new Types.ObjectId().toString();
    const deputyId = new Types.ObjectId().toString();
    const targetUserId = new Types.ObjectId().toString();
    const groupId = new Types.ObjectId().toString();

    const mockGroup = {
      _id: new Types.ObjectId(groupId),
      creatorId: new Types.ObjectId(creatorId),
      adminIds: [new Types.ObjectId(creatorId)],
      deputies: [
        {
          userId: new Types.ObjectId(deputyId),
          canRemoveMembers: true,
          canMuteComments: true,
          canBlockPosting: true,
        },
      ],
      members: [
        new Types.ObjectId(creatorId),
        new Types.ObjectId(deputyId),
        new Types.ObjectId(targetUserId),
      ],
      memberCount: 3,
      isDeleted: false,
      save: vi.fn().mockResolvedValue(true),
    };

    mockGroupModel.findById.mockReturnValue({
      exec: vi.fn().mockResolvedValue(mockGroup),
    });

    const res = await service.removeMember(deputyId, groupId, targetUserId);
    expect(res.memberCount).toBe(2);
    expect(mockGroup.members.some((m: any) => m.toString() === targetUserId)).toBe(false);
  });

  it('should toggle mute comments for regular member', async () => {
    const creatorId = new Types.ObjectId().toString();
    const targetUserId = new Types.ObjectId().toString();
    const groupId = new Types.ObjectId().toString();

    const mockGroup = {
      _id: new Types.ObjectId(groupId),
      creatorId: new Types.ObjectId(creatorId),
      adminIds: [new Types.ObjectId(creatorId)],
      members: [new Types.ObjectId(creatorId), new Types.ObjectId(targetUserId)],
      mutedCommentUserIds: [],
      isDeleted: false,
      save: vi.fn().mockResolvedValue(true),
    };

    mockGroupModel.findById.mockReturnValue({
      exec: vi.fn().mockResolvedValue(mockGroup),
    });

    const res = await service.toggleMuteComments(creatorId, groupId, targetUserId, true);
    expect(res.muted).toBe(true);
    expect(mockGroup.mutedCommentUserIds.length).toBe(1);
  });
});

