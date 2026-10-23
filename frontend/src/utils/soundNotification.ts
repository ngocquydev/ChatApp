/**
 * soundNotification.ts
 * Quản lý phát âm thanh thông báo khi có tin nhắn mới.
 * - Hỗ trợ Web Audio API (tạo âm thanh chuông tinh tế, không phụ thuộc mạng).
 * - Hỗ trợ file âm thanh HTML5 Audio (/sounds/notification.wav).
 * - Tự động kích hoạt âm thanh (User gesture unlock) tránh bị trình duyệt chặn Autoplay.
 * - Chống lặp âm thanh (Deduplication theo messageId giữa MQTT & Socket.IO).
 * - Giới hạn tần suất phát (Rate limiting) tránh dồn dập khi nhận nhiều tin nhắn liên tiếp.
 * - Thông báo tiêu đề tab khi người dùng đang ở tab khác.
 */

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
    } catch {
      // Bỏ qua nếu môi trường không hỗ trợ HTMLAudioElement
    }
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

  /**
   * Tự động mở khóa Web Audio API sau tương tác đầu tiên của người dùng
   */
  private initUserGestureUnlock() {
    const unlock = () => {
      const ctx = this.getAudioContext();
      if (ctx && ctx.state === "suspended") {
        ctx.resume().catch(() => {});
      }
      if (this.cachedAudio) {
        // Kích hoạt nạp audio element
        this.cachedAudio.load();
      }
      window.removeEventListener("click", unlock);
      window.removeEventListener("keydown", unlock);
      window.removeEventListener("touchstart", unlock);
    };

    window.addEventListener("click", unlock, { once: true, passive: true });
    window.addEventListener("keydown", unlock, { once: true, passive: true });
    window.addEventListener("touchstart", unlock, { once: true, passive: true });
  }

  /**
   * Lắng nghe khi người dùng quay lại tab để dừng nhấp nháy tiêu đề
   */
  private initVisibilityListener() {
    window.addEventListener("focus", () => {
      this.stopTitleFlash();
    });
  }

  /**
   * Phát chuông bằng Web Audio API (Âm thanh 2 nốt trong trẻo, êm dịu phong cách Messenger / Apple)
   */
  public playSynthesizedChime() {
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;

      // Master Gain
      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(0.5, now);
      masterGain.connect(ctx.destination);

      // Nốt 1: 784 Hz (G5) - Nốt dạo đầu nhẹ nhàng
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

      // Nốt 2: 1046.50 Hz (C6) - Nốt chuông ngân vang chính
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

      // Họa âm cao: 2093 Hz (C7) tạo độ sáng như chuông pha lê
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
      console.warn("[SoundNotification] Không thể phát âm thanh tổng hợp:", err);
    }
  }

  /**
   * Bắt đầu nháy tiêu đề tab nếu người dùng đang ở tab khác
   */
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

  /**
   * Phát âm thanh khi có tin nhắn đến
   * @param messageId ID tin nhắn để tránh phát lặp nhiều lần
   * @param senderName Tên người gửi (nếu có để thông báo tiêu đề tab)
   */
  public playIncomingSound(messageId?: string, senderName?: string) {
    if (typeof window === "undefined") return;

    // Kiểm tra cài đặt tắt âm
    if (this.isMuted) return;

    const now = Date.now();

    // 1. Chống phát lặp cho cùng một ID tin nhắn trong vòng 5 giây
    if (messageId) {
      const prevPlayTime = this.playedMessageIds.get(messageId);
      if (prevPlayTime && now - prevPlayTime < 5000) {
        return;
      }
      this.playedMessageIds.set(messageId, now);

      // Dọn dẹp cache ID cũ
      if (this.playedMessageIds.size > 100) {
        for (const [id, timestamp] of this.playedMessageIds.entries()) {
          if (now - timestamp > 10000) {
            this.playedMessageIds.delete(id);
          }
        }
      }
    }

    // 2. Rate limiting: Giãn cách tối thiểu 250ms giữa các lần phát
    if (now - this.lastPlayTime < 250) {
      return;
    }
    this.lastPlayTime = now;

    // 3. Nhấp nháy tab nếu đang thu nhỏ / chạy nền
    this.flashDocumentTitle(senderName);

    // 4. Phát âm thanh: Thử audio element trước, nếu bị chặn thì fallback sang Web Audio API
    if (this.cachedAudio) {
      try {
        this.cachedAudio.currentTime = 0;
        const playPromise = this.cachedAudio.play();
        if (playPromise !== undefined) {
          playPromise.catch(() => {
            // Autoplay chặn file audio, chuyển sang Web Audio API Synthesizer
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

  /**
   * Bật/tắt âm thanh thông báo
   */
  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (typeof window !== "undefined") {
      localStorage.setItem("chatapp_sound_muted", String(this.isMuted));
    }
    if (!this.isMuted) {
      // Phát âm thanh thử để người dùng kiểm tra khi bật
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

  /**
   * Phát âm thanh thử nghiệm (Ví dụ khi người dùng bấm nút test)
   */
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
