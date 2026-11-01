import api from "./api";

export interface BackupFileInfo {
  filename: string;
  sizeBytes: number;
  sizeFormatted: string;
  createdAt: string;
  trigger: "manual" | "scheduled";
  requestedBy: string;
  sha256?: string;
  type: "mongodb" | "full";
}

export interface BackupListResponse {
  backups: BackupFileInfo[];
  totalBackups: number;
  nextScheduledAt: string;
  retentionPolicyDays: number;
}

export const backupApi = {
  async getBackups(): Promise<BackupListResponse> {
    const res = await api.get<BackupListResponse>("/admin/backup");
    return res.data;
  },

  async createBackup(): Promise<BackupFileInfo> {
    const res = await api.post<BackupFileInfo>("/admin/backup");
    return res.data;
  },

  async restoreBackup(filename: string): Promise<{ success: boolean; message: string }> {
    const res = await api.post<{ success: boolean; message: string }>(`/admin/backup/restore/${encodeURIComponent(filename)}`);
    return res.data;
  },

  async deleteBackup(filename: string): Promise<{ success: boolean; message: string }> {
    const res = await api.delete<{ success: boolean; message: string }>(`/admin/backup/${encodeURIComponent(filename)}`);
    return res.data;
  },

  getDownloadUrl(filename: string): string {
    const base = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";
    return `${base}/admin/backup/download/${encodeURIComponent(filename)}`;
  },
};

