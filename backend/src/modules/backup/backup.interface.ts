export interface BackupFileInfo {
  filename: string;
  sizeBytes: number;
  sizeFormatted: string;
  createdAt: string;
  trigger: 'manual' | 'scheduled';
  requestedBy: string;
  sha256?: string;
  type: 'mongodb' | 'full';
}

export interface BackupListResponse {
  backups: BackupFileInfo[];
  totalBackups: number;
  nextScheduledAt: string;
  retentionPolicyDays: number;
}
