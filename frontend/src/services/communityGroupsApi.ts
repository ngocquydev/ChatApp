import api from "@/services/api";

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
  members: string[];
  pendingMemberIds: string[];
  memberCount: number;
  requireApproval: boolean;
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
  }> => {
    const res = await api.get(`/community-groups/${slug}`);
    return res.data;
  },

  joinGroup: async (
    groupId: string
  ): Promise<{ status: "joined" | "pending"; memberCount: number }> => {
    const res = await api.post(`/community-groups/${groupId}/join`);
    return res.data;
  },

  leaveGroup: async (
    groupId: string
  ): Promise<{ memberCount: number }> => {
    const res = await api.post(`/community-groups/${groupId}/leave`);
    return res.data;
  },
};

