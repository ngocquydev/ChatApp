import { create } from "zustand";

interface PostModalState {
  postId: string | null;
  openPostModal: (postId: string) => void;
  closePostModal: () => void;
}

export const usePostModalStore = create<PostModalState>((set) => ({
  postId: null,
  openPostModal: (postId: string) => set({ postId }),
  closePostModal: () => set({ postId: null }),
}));
