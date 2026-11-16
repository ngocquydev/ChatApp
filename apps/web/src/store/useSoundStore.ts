import { create } from "zustand";
import { soundNotification } from "../utils/soundNotification";

interface SoundStoreState {
  isMuted: boolean;
  toggleMute: () => boolean;
  setMuted: (muted: boolean) => void;
  playIncomingSound: (messageId?: string, senderName?: string) => void;
  testSound: () => void;
}

export const useSoundStore = create<SoundStoreState>((set) => ({
  isMuted: soundNotification.getIsMuted(),

  toggleMute: () => {
    const newMuted = soundNotification.toggleMute();
    set({ isMuted: newMuted });
    return newMuted;
  },

  setMuted: (muted: boolean) => {
    soundNotification.setMuted(muted);
    set({ isMuted: muted });
  },

  playIncomingSound: (messageId?: string, senderName?: string) => {
    soundNotification.playIncomingSound(messageId, senderName);
  },

  testSound: () => {
    soundNotification.testSound();
  },
}));
