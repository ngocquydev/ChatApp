/**
 * Quản lý định vị liên tục (Live Location Watcher) theo thời gian thực
 * Dùng cho tính năng chia sẻ vị trí trực tiếp (Live Location) kiểu Zalo / Telegram
 */
class LiveLocationTracker {
  private watchId: number | null = null;
  private activeMessageId: string | null = null;
  private lastUpdate = 0;

  public start(
    messageId: string,
    onPositionUpdate: (lat: number, lng: number) => void,
  ) {
    this.stop();
    this.activeMessageId = messageId;

    if (typeof window === "undefined" || !navigator.geolocation) {
      console.warn("Trình duyệt không hỗ trợ Geolocation cho live tracking");
      return;
    }

    this.watchId = navigator.geolocation.watchPosition(
      (position) => {
        const now = Date.now();
        // Throttle phát sóng mỗi 4 giây để bảo vệ mạng & pin
        if (now - this.lastUpdate < 4000) return;
        this.lastUpdate = now;

        onPositionUpdate(position.coords.latitude, position.coords.longitude);
      },
      (err) => {
        console.warn("Live Geolocation watch error:", err);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 3000,
      },
    );
  }

  public stop(messageId?: string) {
    if (messageId && this.activeMessageId !== messageId) return;

    if (this.watchId !== null && typeof window !== "undefined" && navigator.geolocation) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
    this.activeMessageId = null;
  }

  public getActiveMessageId(): string | null {
    return this.activeMessageId;
  }
}

export const liveLocationTracker = new LiveLocationTracker();

