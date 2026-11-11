class SoundNotificationService {
  private audioContext: AudioContext | null = null;
  private playedMessageIds = new Map<string, number>();
  private lastPlayTime = 0;
  private cachedAudio: HTMLAudioElement | null = null;
  private originalTitle = "";
  private titleFlashInterval: NodeJS.Timeout | null = null;
  private isMuted = false;

  constructor() {
    if (typeof window !== "undefined") {
      this.originalTitle = document.title || "ChatApp";
      this.isMuted = localStorage.getItem("chatapp_sound_muted") === "true";
      this.initUserGestureUnlock();
      this.preloadAudio();
      this.initVisibilityListener();
    }
  }

  private preloadAudio() {
    try {
      this.cachedAudio = new Audio("/sounds/notification.wav");
      this.cachedAudio.volume = 0.75;
      this.cachedAudio.preload = "auto";
    } catch {}
  }

  private getAudioContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    try {
      if (!this.audioContext) {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext })
            .webkitAudioContext;
        if (AudioCtx) {
          this.audioContext = new AudioCtx();
        }
      }
      if (this.audioContext && this.audioContext.state === "suspended") {
        this.audioContext.resume().catch(() => {});
      }
      return this.audioContext;
    } catch {
      return null;
    }
  }

  private initUserGestureUnlock() {
    const unlock = () => {
      const ctx = this.getAudioContext();
      if (ctx && ctx.state === "suspended") {
        ctx.resume().catch(() => {});
      }
      if (this.cachedAudio) {
        this.cachedAudio.load();
      }
      window.removeEventListener("click", unlock);
      window.removeEventListener("keydown", unlock);
      window.removeEventListener("touchstart", unlock);
    };

    window.addEventListener("click", unlock, { once: true, passive: true });
    window.addEventListener("keydown", unlock, { once: true, passive: true });
    window.addEventListener("touchstart", unlock, {
      once: true,
      passive: true,
    });
  }

  private initVisibilityListener() {
    window.addEventListener("focus", () => {
      this.stopTitleFlash();
    });
  }

  public playSynthesizedChime() {
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;

      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(0.5, now);
      masterGain.connect(ctx.destination);

      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(784, now);
      gain1.gain.setValueAtTime(0.3, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      osc1.connect(gain1);
      gain1.connect(masterGain);
      osc1.start(now);
      osc1.stop(now + 0.16);

      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(1046.5, now + 0.07);
      gain2.gain.setValueAtTime(0.001, now);
      gain2.gain.setValueAtTime(0.45, now + 0.07);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.42);
      osc2.connect(gain2);
      gain2.connect(masterGain);
      osc2.start(now + 0.07);
      osc2.stop(now + 0.45);
      const osc3 = ctx.createOscillator();
      const gain3 = ctx.createGain();
      osc3.type = "sine";
      osc3.frequency.setValueAtTime(2093, now + 0.07);
      gain3.gain.setValueAtTime(0.001, now);
      gain3.gain.setValueAtTime(0.12, now + 0.07);
      gain3.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);
      osc3.connect(gain3);
      gain3.connect(masterGain);
      osc3.start(now + 0.07);
      osc3.stop(now + 0.32);
    } catch (err) {
      console.warn(
        "[SoundNotification] Không thể phát âm thanh tổng hợp:",
        err,
      );
    }
  }

  public flashDocumentTitle(senderName?: string) {
    if (typeof document === "undefined" || !document.hidden) return;

    this.stopTitleFlash();
    const notice = senderName
      ? `💬 ${senderName} đã nhắn cho bạn!`
      : "💬 Bạn có tin nhắn mới!";

    let isFlashing = false;
    this.originalTitle = document.title.includes("💬")
      ? this.originalTitle || "ChatApp"
      : document.title;

    this.titleFlashInterval = setInterval(() => {
      document.title = isFlashing ? notice : this.originalTitle;
      isFlashing = !isFlashing;
    }, 1200);
  }

  public stopTitleFlash() {
    if (this.titleFlashInterval) {
      clearInterval(this.titleFlashInterval);
      this.titleFlashInterval = null;
    }
    if (this.originalTitle && typeof document !== "undefined") {
      document.title = this.originalTitle;
    }
  }

  public playIncomingSound(messageId?: string, senderName?: string) {
    if (typeof window === "undefined") return;

    if (this.isMuted) return;

    const now = Date.now();

    if (messageId) {
      const prevPlayTime = this.playedMessageIds.get(messageId);
      if (prevPlayTime && now - prevPlayTime < 5000) {
        return;
      }
      this.playedMessageIds.set(messageId, now);

      if (this.playedMessageIds.size > 100) {
        for (const [id, timestamp] of this.playedMessageIds.entries()) {
          if (now - timestamp > 10000) {
            this.playedMessageIds.delete(id);
          }
        }
      }
    }

    if (now - this.lastPlayTime < 250) {
      return;
    }
    this.lastPlayTime = now;

    this.flashDocumentTitle(senderName);
    if (this.cachedAudio) {
      try {
        this.cachedAudio.currentTime = 0;
        const playPromise = this.cachedAudio.play();
        if (playPromise !== undefined) {
          playPromise.catch(() => {
            this.playSynthesizedChime();
          });
        }
      } catch {
        this.playSynthesizedChime();
      }
    } else {
      this.playSynthesizedChime();
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (typeof window !== "undefined") {
      localStorage.setItem("chatapp_sound_muted", String(this.isMuted));
    }
    if (!this.isMuted) {
      this.playSynthesizedChime();
    }
    return this.isMuted;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (typeof window !== "undefined") {
      localStorage.setItem("chatapp_sound_muted", String(muted));
    }
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  public testSound() {
    if (this.cachedAudio) {
      this.cachedAudio.currentTime = 0;
      this.cachedAudio.play().catch(() => {
        this.playSynthesizedChime();
      });
    } else {
      this.playSynthesizedChime();
    }
  }
}

export const soundNotification = new SoundNotificationService();
