import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AdminController } from './admin.controller.js';

describe('AdminController', () => {
  let controller: AdminController;
  let mockAdminService: any;

  beforeEach(() => {
    mockAdminService = {
      getStats: vi.fn().mockResolvedValue({ success: true, stats: {} }),
      getUsers: vi.fn().mockResolvedValue({ success: true, users: [], total: 0 }),
      toggleUserBan: vi.fn().mockResolvedValue({ success: true }),
      updateUserRole: vi.fn().mockResolvedValue({ success: true }),
      deleteUser: vi.fn().mockResolvedValue({ success: true }),
      getPosts: vi.fn().mockResolvedValue({ success: true, posts: [], total: 0 }),
      deletePost: vi.fn().mockResolvedValue({ success: true }),
      testModerationText: vi.fn().mockReturnValue({ success: true, result: {} }),
      testModerationBehavior: vi.fn().mockReturnValue({ success: true, result: {} }),
      getSystemHealth: vi.fn().mockResolvedValue({ success: true, system: {} }),
    };

    controller = new AdminController(mockAdminService);
  });

  it('should call getStats', async () => {
    const res = await controller.getStats();
    expect(res.success).toBe(true);
    expect(mockAdminService.getStats).toHaveBeenCalled();
  });

  it('should call getUsers', async () => {
    const res = await controller.getUsers({ page: 1, limit: 10 });
    expect(res.success).toBe(true);
    expect(mockAdminService.getUsers).toHaveBeenCalled();
  });

  it('should call toggleUserBan', async () => {
    const res = await controller.toggleUserBan('u1', { isBan: true, reason: 'test' });
    expect(res.success).toBe(true);
    expect(mockAdminService.toggleUserBan).toHaveBeenCalledWith('u1', true, 'test');
  });

  it('should call updateUserRole', async () => {
    const res = await controller.updateUserRole('u1', { role: 'admin' });
    expect(res.success).toBe(true);
    expect(mockAdminService.updateUserRole).toHaveBeenCalledWith('u1', 'admin');
  });

  it('should call deleteUser', async () => {
    const res = await controller.deleteUser('u1');
    expect(res.success).toBe(true);
    expect(mockAdminService.deleteUser).toHaveBeenCalledWith('u1');
  });

  it('should call getPosts and deletePost', async () => {
    const resPosts = await controller.getPosts({ page: 1, limit: 10 });
    expect(resPosts.success).toBe(true);
    expect(mockAdminService.getPosts).toHaveBeenCalled();

    const resDel = await controller.deletePost('p1');
    expect(resDel.success).toBe(true);
    expect(mockAdminService.deletePost).toHaveBeenCalledWith('p1');
  });

  it('should call testModerationText and testModerationBehavior', () => {
    const resText = controller.testModerationText({ text: 'hi', language: 'en' });
    expect(resText.success).toBe(true);
    expect(mockAdminService.testModerationText).toHaveBeenCalledWith('hi', 'en');

    const resBehavior = controller.testModerationBehavior({
      friendRequestsPerHour: 1,
      acceptanceRate: 0.5,
      actionIntervalVariance: 10,
      actionRepetitionRatio: 0.1,
      interactionVelocity: 2,
      distinctTargetRatio: 0.7,
    });
    expect(resBehavior.success).toBe(true);
    expect(mockAdminService.testModerationBehavior).toHaveBeenCalled();
  });

  it('should call getSystemHealth', async () => {
    const res = await controller.getSystemHealth();
    expect(res.success).toBe(true);
    expect(mockAdminService.getSystemHealth).toHaveBeenCalled();
  });
});
