import api from "@/services/api";

export interface DeputyPermissions {
  canRemoveMembers: boolean;
  canMuteComments: boolean;
  canBlockPosting: boolean;
}

export interface GroupViewerPermissions {
  isAdmin: boolean;
  isCreator: boolean;
  isDeputy: boolean;
  canRemoveMembers: boolean;
  canMuteComments: boolean;
  canBlockPosting: boolean;
  isBannedPosting: boolean;
  isMutedComments: boolean;
}

export interface GroupMemberItem {
  _id: string;
  name: string;
  avatar?: string | null;
  role: "creator" | "admin" | "deputy" | "member";
  deputyPermissions?: DeputyPermissions | null;
  isMutedComments: boolean;
  isBannedPosting: boolean;
}

export interface PendingMemberRequest {
  userId: {
    _id: string;
    name: string;
    avatar?: string | null;
    email?: string;
  };
  reason: string;
  requestedAt: string;
}

export interface CommunityGroupItem {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  privacy: "public" | "private";
  avatar?: string;
  coverImage?: string;
  creatorId: { _id: string; name: string; avatar?: string } | string;
  adminIds: Array<{ _id: string; name: string; avatar?: string } | string>;
  moderatorIds?: string[];
  deputies?: Array<{
    userId: { _id: string; name: string; avatar?: string } | string;
    canRemoveMembers: boolean;
    canMuteComments: boolean;
    canBlockPosting: boolean;
  }>;
  members: string[];
  pendingMemberIds: string[];
  memberCount: number;
  requireApproval: boolean;
  requireJoinReason?: boolean;
  joinQuestion?: string;
  createdAt: string;
}

export interface CreateCommunityGroupInput {
  name: string;
  slug: string;
  description?: string;
  privacy?: "public" | "private";
  avatar?: string;
  coverImage?: string;
  requireApproval?: boolean;
  requireJoinReason?: boolean;
  joinQuestion?: string;
}

export const communityGroupsApi = {
  createGroup: async (data: CreateCommunityGroupInput): Promise<CommunityGroupItem> => {
    const res = await api.post("/community-groups", data);
    return res.data;
  },

  getMyGroups: async (): Promise<CommunityGroupItem[]> => {
    const res = await api.get("/community-groups/my");
    return res.data;
  },

  exploreGroups: async (q?: string): Promise<CommunityGroupItem[]> => {
    const res = await api.get("/community-groups/explore", { params: { q } });
    return res.data;
  },

  getGroupBySlug: async (
    slug: string
  ): Promise<{
    group: CommunityGroupItem;
    isMember: boolean;
    isPending: boolean;
    isAdmin: boolean;
    isDeputy: boolean;
    viewerPermissions: GroupViewerPermissions;
  }> => {
    const res = await api.get(`/community-groups/${slug}`);
    return res.data;
  },

  joinGroup: async (
    groupId: string,
    reason?: string
  ): Promise<{ status: "joined" | "pending"; memberCount: number }> => {
    const res = await api.post(`/community-groups/${groupId}/join`, { reason });
    return res.data;
  },

  leaveGroup: async (
    groupId: string
  ): Promise<{ memberCount: number }> => {
    const res = await api.post(`/community-groups/${groupId}/leave`);
    return res.data;
  },

  getMembers: async (groupId: string): Promise<{ members: GroupMemberItem[]; memberCount: number }> => {
    const res = await api.get(`/community-groups/${groupId}/members`);
    return res.data;
  },

  getPendingRequests: async (
    groupId: string
  ): Promise<{
    requireJoinReason: boolean;
    joinQuestion: string;
    requests: PendingMemberRequest[];
  }> => {
    const res = await api.get(`/community-groups/${groupId}/pending-requests`);
    return res.data;
  },

  approveMember: async (groupId: string, userId: string): Promise<{ memberCount: number }> => {
    const res = await api.post(`/community-groups/${groupId}/members/${userId}/approve`);
    return res.data;
  },

  rejectMember: async (groupId: string, userId: string): Promise<{ success: boolean }> => {
    const res = await api.post(`/community-groups/${groupId}/members/${userId}/reject`);
    return res.data;
  },

  removeMember: async (groupId: string, userId: string): Promise<{ memberCount: number }> => {
    const res = await api.delete(`/community-groups/${groupId}/members/${userId}`);
    return res.data;
  },

  setDeputy: async (
    groupId: string,
    data: {
      userId: string;
      canRemoveMembers?: boolean;
      canMuteComments?: boolean;
      canBlockPosting?: boolean;
    }
  ): Promise<{ success: boolean }> => {
    const res = await api.post(`/community-groups/${groupId}/deputies`, data);
    return res.data;
  },

  removeDeputy: async (groupId: string, userId: string): Promise<{ success: boolean }> => {
    const res = await api.delete(`/community-groups/${groupId}/deputies/${userId}`);
    return res.data;
  },

  toggleMuteComments: async (
    groupId: string,
    userId: string,
    muted: boolean
  ): Promise<{ muted: boolean }> => {
    const res = await api.post(`/community-groups/${groupId}/members/${userId}/mute-comments`, { muted });
    return res.data;
  },

  toggleBlockPosting: async (
    groupId: string,
    userId: string,
    blocked: boolean
  ): Promise<{ blocked: boolean }> => {
    const res = await api.post(`/community-groups/${groupId}/members/${userId}/block-posting`, { blocked });
    return res.data;
  },

  updateGroup: async (
    groupId: string,
    data: {
      name?: string;
      description?: string;
      privacy?: "public" | "private";
      avatar?: string;
      coverImage?: string;
      requireApproval?: boolean;
      requireJoinReason?: boolean;
      joinQuestion?: string;
    }
  ): Promise<CommunityGroupItem> => {
    const res = await api.patch(`/community-groups/${groupId}`, data);
    return res.data;
  },
};


