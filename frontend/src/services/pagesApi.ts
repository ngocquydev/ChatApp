import api from "@/services/api";

export interface PageItem {
  _id: string;
  name: string;
  slug: string;
  bio?: string;
  category: string;
  avatar?: string;
  coverImage?: string;
  creatorId: { _id: string; name: string; avatar?: string } | string;
  adminIds: Array<{ _id: string; name: string; avatar?: string } | string>;
  followers: string[];
  followerCount: number;
  isVerified: boolean;
  createdAt: string;
}

export interface CreatePageInput {
  name: string;
  slug: string;
  bio?: string;
  category?: string;
  avatar?: string;
  coverImage?: string;
}

export const pagesApi = {
  createPage: async (data: CreatePageInput): Promise<PageItem> => {
    const res = await api.post("/pages", data);
    return res.data;
  },

  getMyPages: async (): Promise<PageItem[]> => {
    const res = await api.get("/pages/my");
    return res.data;
  },

  explorePages: async (q?: string): Promise<PageItem[]> => {
    const res = await api.get("/pages/explore", { params: { q } });
    return res.data;
  },

  getPageBySlug: async (
    slug: string
  ): Promise<{ page: PageItem; isFollowing: boolean; isAdmin: boolean }> => {
    const res = await api.get(`/pages/${slug}`);
    return res.data;
  },

  toggleFollowPage: async (
    pageId: string
  ): Promise<{ isFollowing: boolean; followerCount: number }> => {
    const res = await api.post(`/pages/${pageId}/follow`);
    return res.data;
  },
};

