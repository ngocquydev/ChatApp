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
});

