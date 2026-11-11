import { create } from "zustand";

interface Waiter {
  resolve: () => void;
  reject: (reason: Error) => void;
}

interface WafChallengeState {
  open: boolean;
  requestChallenge: () => Promise<void>;
  complete: () => void;
  cancel: () => void;
}
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
