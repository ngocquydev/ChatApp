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

  getFollowedPages: async (): Promise<PageItem[]> => {
    const res = await api.get("/pages/following");
    return res.data;
  },

  getExploreCategories: async (): Promise<string[]> => {
    const res = await api.get("/pages/categories");
    return res.data;
  },

  explorePages: async (params: {
    q?: string;
    category?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<PageItem[]> => {
    const res = await api.get("/pages/explore", { params });
    return res.data;
  },

  getPageBySlug: async (
    slug: string
  ): Promise<{ page: PageItem; isFollowing: boolean; isAdmin: boolean }> => {
    const res = await api.get(`/pages/${slug}`);
    return res.data;
  },

  setFollowPage: async (
    pageId: string,
    shouldFollow: boolean
  ): Promise<{ isFollowing: boolean; followerCount: number }> => {
    const res = shouldFollow
      ? await api.put(`/pages/${pageId}/follow`)
      : await api.delete(`/pages/${pageId}/follow`);
    return res.data;
  },
};

