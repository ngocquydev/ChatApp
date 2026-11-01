import api from './api';

export interface AdminStats {
  users: {
    total: number;
    active: number;
    banned: number;
    admins: number;
  };
  posts: {
    total: number;
    comments: number;
  };
  security: {
    enabled: boolean;
    underAttack: boolean;
    activeBans: number;
    blockScanners: boolean;
    blockBadUserAgents: boolean;
    challengeForeignAuth: boolean;
    ipAllowlistCount: number;
    ipBlocklistCount: number;
  };
  system: {
    uptimeSeconds: number;
    nodeVersion: string;
    platform: string;
    memory: {
      heapUsedMB: number;
      heapTotalMB: number;
      rssMB: number;
    };
    services: {
      mongo: string;
      redis: string;
      neo4j: string;
    };
  };
}

export interface AdminUser {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
  role: 'admin' | 'user';
  isBan: boolean;
  isDeleted?: boolean;
  createdAt: string;
  updatedAt?: string;
  bio?: string;
  school?: string;
  relationshipStatus?: string;
  photos?: string[];
}

export interface AdminUsersResponse {
  success: boolean;
  users: AdminUser[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AdminPost {
  _id: string;
  authorId?: {
    _id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  content: string;
  images: string[];
  privacy: 'public' | 'friends' | 'only_me';
  likeCount: number;
  commentCount: number;
  shareCount: number;
  createdAt: string;
  updatedAt?: string;
  isDeleted?: boolean;
}

export interface AdminPostsResponse {
  success: boolean;
  posts: AdminPost[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface SystemHealthData {
  serverTime: string;
  uptimeSeconds: number;
  nodeVersion: string;
  platform: string;
  architecture: string;
  pid: number;
  memory: {
    heapUsedBytes: number;
    heapTotalBytes: number;
    rssBytes: number;
    externalBytes: number;
    heapUsedMB: number;
    heapTotalMB: number;
    rssMB: number;
  };
  services: {
    mongo: { status: string; readyState: number };
    redis: { status: string; latencyMs: number };
    neo4j: { status: string };
  };
}

export interface ModerationTextResult {
  isClean: boolean;
  action: 'pass' | 'flag' | 'block';
  toxicityScore: number;
  categories: {
    hateSpeech: boolean;
    harassment: boolean;
    spam: boolean;
    profanity: boolean;
  };
  language: string;
  flaggedKeywords: string[];
}

export interface ModerationBehaviorResult {
  isAnomaly: boolean;
  anomalyScore: number;
  autoencoderAnomaly?: boolean;
  autoencoderError?: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  assessment: string;
}

export interface ModerationQueueItem {
  _id: string;
  authorId?: {
    _id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  content: string;
  images: string[];
  privacy: string;
  isSensitive?: boolean;
  moderationStatus: 'approved' | 'flagged' | 'rejected';
  toxicityScore?: number;
  moderationReason?: string;
  createdAt: string;
}

export interface ModerationQueueResponse {
  success: boolean;
  items: ModerationQueueItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const adminApi = {
  async getStats(): Promise<AdminStats> {
    const res = await api.get<{ success: boolean; stats: AdminStats }>('/admin/stats');
    return res.data.stats;
  },

  async getUsers(params?: {
    search?: string;
    role?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<AdminUsersResponse> {
    const res = await api.get<AdminUsersResponse>('/admin/users', { params });
    return res.data;
  },

  async toggleUserBan(
    userId: string,
    isBan: boolean,
    reason?: string,
  ): Promise<{ success: boolean; message: string; user: AdminUser }> {
    const res = await api.patch<{ success: boolean; message: string; user: AdminUser }>(
      `/admin/users/${userId}/ban`,
      { isBan, reason },
    );
    return res.data;
  },

  async updateUserRole(
    userId: string,
    role: 'admin' | 'user',
  ): Promise<{ success: boolean; message: string; user: AdminUser }> {
    const res = await api.patch<{ success: boolean; message: string; user: AdminUser }>(
      `/admin/users/${userId}/role`,
      { role },
    );
    return res.data;
  },

  async getPosts(params?: {
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<AdminPostsResponse> {
    const res = await api.get<AdminPostsResponse>('/admin/posts', { params });
    return res.data;
  },

  async deletePost(postId: string): Promise<{ success: boolean; message: string }> {
    const res = await api.delete<{ success: boolean; message: string }>(`/admin/posts/${postId}`);
    return res.data;
  },

  async testModerationText(
    text: string,
    language?: 'vi' | 'en' | 'auto',
  ): Promise<ModerationTextResult> {
    const res = await api.post<{ success: boolean; result: ModerationTextResult }>(
      '/admin/moderation/test-text',
      { text, language },
    );
    return res.data.result;
  },

  async testModerationBehavior(sample: {
    friendRequestsPerHour: number;
    acceptanceRate: number;
    actionIntervalVariance: number;
    actionRepetitionRatio: number;
    interactionVelocity: number;
    distinctTargetRatio: number;
  }): Promise<ModerationBehaviorResult> {
    const res = await api.post<{ success: boolean; result: ModerationBehaviorResult }>(
      '/admin/moderation/test-behavior',
      sample,
    );
    return res.data.result;
  },

  async getSystemHealth(): Promise<SystemHealthData> {
    const res = await api.get<{ success: boolean; system: SystemHealthData }>('/admin/system');
    return res.data.system;
  },

  async getModerationQueue(params?: {
    page?: number;
    limit?: number;
    status?: string;
  }): Promise<ModerationQueueResponse> {
    const res = await api.get<ModerationQueueResponse>('/admin/moderation/queue', { params });
    return res.data;
  },

  async resolveModerationQueueItem(
    id: string,
    action: 'approve' | 'hide' | 'warn',
    reason?: string,
  ): Promise<{ success: boolean; message: string }> {
    const res = await api.patch<{ success: boolean; message: string }>(
      `/admin/moderation/queue/${id}/resolve`,
      { action, reason },
    );
    return res.data;
  },
};
