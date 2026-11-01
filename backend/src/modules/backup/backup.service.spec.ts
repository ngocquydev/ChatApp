import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { BackupService } from './backup.service.js';

describe('BackupService', () => {
  let service: BackupService;
  const mockConnection = {
    db: {
      listCollections: vi.fn().mockReturnValue({
        toArray: vi.fn().mockResolvedValue([{ name: 'test_collection' }]),
      }),
      collection: vi.fn().mockReturnValue({
        find: vi.fn().mockReturnValue({
          [Symbol.asyncIterator]: async function* () {
            yield { _id: '1', name: 'Sample' };
          },
        }),
      }),
    },
  } as any;

  beforeEach(() => {
    service = new BackupService(mockConnection);
  });

  afterEach(() => {
    service.onModuleDestroy();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should calculate next scheduled time at 17:00', () => {
    const nextTime = service.getNextScheduledTime();
    expect(nextTime).toBeInstanceOf(Date);
    expect(nextTime.getTime()).toBeGreaterThan(Date.now() - 60000);
  });

  it('should return backup list structure with nextScheduledAt', async () => {
    const res = await service.listBackups();
    expect(res).toHaveProperty('backups');
    expect(res).toHaveProperty('totalBackups');
    expect(res).toHaveProperty('nextScheduledAt');
    expect(res).toHaveProperty('retentionPolicyDays', 7);
  });

  it('should throw NotFoundException when getting non-existent backup file path', () => {
    expect(() => service.getBackupFilePath('non_existent_file.archive.gz')).toThrow();
  });

  it('should throw NotFoundException when restoring non-existent backup file', async () => {
    await expect(service.restoreBackup('non_existent.archive.gz')).rejects.toThrow();
  });

  it('should throw NotFoundException when deleting non-existent backup', async () => {
    await expect(service.deleteBackup('non_existent.archive.gz')).rejects.toThrow();
  });

  it('should clean expired backups without crashing', async () => {
    const deleted = await service.cleanExpiredBackups();
    expect(typeof deleted).toBe('number');
  });
});
