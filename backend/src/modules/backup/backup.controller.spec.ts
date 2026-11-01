import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BackupController } from './backup.controller.js';
import { BackupService } from './backup.service.js';

describe('BackupController', () => {
  let controller: BackupController;
  let service: BackupService;

  const mockService = {
    listBackups: vi.fn().mockResolvedValue({
      backups: [],
      totalBackups: 0,
      nextScheduledAt: '2026-11-02T10:00:00.000Z',
      retentionPolicyDays: 7,
    }),
    createBackup: vi.fn().mockResolvedValue({
      filename: 'backup_test.archive.gz',
      sizeBytes: 1024,
      sizeFormatted: '1 KB',
      createdAt: new Date().toISOString(),
      trigger: 'manual',
      requestedBy: 'admin@chatapp.internal',
      type: 'mongodb',
    }),
    getBackupFilePath: vi.fn().mockReturnValue('test/path'),
    restoreBackup: vi.fn().mockResolvedValue({
      success: true,
      message: 'Restore successful',
    }),
    deleteBackup: vi.fn().mockResolvedValue(true),
  };

  beforeEach(() => {
    service = mockService as unknown as BackupService;
    controller = new BackupController(service);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should return backup list from service', async () => {
    const res = await controller.getBackups();
    expect(res.totalBackups).toBe(0);
    expect(mockService.listBackups).toHaveBeenCalled();
  });

  it('should trigger backup creation', async () => {
    const req = { user: { email: 'admin@test.com', userId: '1', role: 'admin' } };
    const res = await controller.createBackup(req);
    expect(res.filename).toBe('backup_test.archive.gz');
    expect(mockService.createBackup).toHaveBeenCalledWith('manual', 'admin@test.com');
  });

  it('should trigger backup restore', async () => {
    const res = await controller.restoreBackup('backup_test.archive.gz');
    expect(res.success).toBe(true);
    expect(mockService.restoreBackup).toHaveBeenCalledWith('backup_test.archive.gz');
  });

  it('should trigger backup delete', async () => {
    const res = await controller.deleteBackup('backup_test.archive.gz');
    expect(res.success).toBe(true);
    expect(mockService.deleteBackup).toHaveBeenCalledWith('backup_test.archive.gz');
  });
});
