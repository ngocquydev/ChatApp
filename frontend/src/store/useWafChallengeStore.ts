import { create } from "zustand";

interface Waiter {
  resolve: () => void;
  reject: (reason: Error) => void;
}

interface WafChallengeState {
  open: boolean;
  /** Mở hộp thoại xác minh; Promise hoàn tất khi người dùng xác minh xong (hoặc bị từ chối khi hủy) */
  requestChallenge: () => Promise<void>;
  complete: () => void;
  cancel: () => void;
}

// Nhiều request cùng bị WAF yêu cầu xác minh sẽ dùng chung một lần xác minh
let waiters: Waiter[] = [];

export class WafChallengeCancelledError extends Error {
  constructor() {
    super("Người dùng đã hủy xác minh bảo mật.");
    this.name = "WafChallengeCancelledError";
  }
}

export const useWafChallengeStore = create<WafChallengeState>((set) => ({
  open: false,
  requestChallenge: () =>
    new Promise<void>((resolve, reject) => {
      waiters.push({ resolve, reject });
      set({ open: true });
    }),
  complete: () => {
    const current = waiters;
    waiters = [];
    set({ open: false });
    current.forEach((w) => w.resolve());
  },
  cancel: () => {
    const current = waiters;
    waiters = [];
    set({ open: false });
    current.forEach((w) => w.reject(new WafChallengeCancelledError()));
  },
}));

