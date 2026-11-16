import api from './api';

export interface SystemMemoryMetrics {
  heapUsedBytes?: number;
  heapTotalBytes?: number;
  rssBytes?: number;
  externalBytes?: number;
  heapUsedMB: number;
  heapTotalMB: number;
  rssMB: number;
  heapLimitMB?: number;
  heapLimitPercent?: number;
  systemTotalMB?: number;
  systemUsedMB?: number;
  systemFreeMB?: number;
  systemUsagePercent?: number;
  status?: 'healthy' | 'warning' | 'critical';
  alertMessage?: string;
  alertMessageEn?: string;
  recommendation?: string;
  recommendationEn?: string;
  upgradePlan?: {
    currentTotalRamGB: number;
    recommendedAddRamGB: number;
    targetTotalRamGB: number;
    suggestedNodeFlag: string;
  };
  cloudBreakdown?: {
    render: {
      name: string;
      usedMB: number;
      totalMB: number;
      percent: number;
    };
    redis: {
      name: string;
      usedMB: number;
      totalMB: number;
      percent: number;
    };
  };
}

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
    memory: SystemMemoryMetrics;
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
  memory: SystemMemoryMetrics;
  services: {
    mongo: { status: string; readyState: number };
    redis: { status: string; latencyMs: number };
    neo4j: { status: string };
  };
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

  async getSystemHealth(): Promise<SystemHealthData> {
    const res = await api.get<{ success: boolean; system: SystemHealthData }>('/admin/system');
    return res.data.system;
  },

  async getCommentReports(params?: {
    target?: 'group_admin' | 'web_admin';
    status?: string;
  }): Promise<AdminCommentReport[]> {
    const res = await api.get<AdminCommentReport[]>('/admin/comment-reports', { params });
    return res.data;
  },

  async resolveCommentReport(
    reportId: string,
    data: {
      action: 'dismiss' | 'delete_comment' | 'mute_user' | 'banned_posting' | 'banned_user';
      note?: string;
    },
  ): Promise<{ success: boolean; message: string }> {
    const res = await api.post<{ success: boolean; message: string }>(
      `/admin/comment-reports/${reportId}/resolve`,
      data,
    );
    return res.data;
  },
};

export interface AdminCommentReport {
  _id: string;
  commentId: string;
  postId: string;
  commentContent: string;
  groupId?: string;
  target: 'group_admin' | 'web_admin';
  reason: string;
  details?: string;
  status: 'pending' | 'resolved' | 'dismissed';
  actionTaken: string;
  resolutionNote?: string;
  reporterId?: {
    _id: string;
    name: string;
    avatar?: string;
  };
  commentAuthorId?: {
    _id: string;
    name: string;
    avatar?: string;
    email?: string;
  };
  resolvedBy?: {
    _id: string;
    name: string;
  };
  createdAt: string;
  updatedAt: string;
}
