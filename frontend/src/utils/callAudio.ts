class CallAudioService {
  private ctx: AudioContext | null = null;
  private ringInterval: NodeJS.Timeout | null = null;

  private getAudioContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    try {
      if (!this.ctx) {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext })
            .webkitAudioContext;
        if (AudioCtx) {
          this.ctx = new AudioCtx();
        }
      }
      if (this.ctx && this.ctx.state === "suspended") {
        this.ctx.resume().catch(() => {});
      }
      return this.ctx;
    } catch {
      return null;
    }
  }

  startOutgoingRingtone() {
    this.stop();
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const playTone = () => {
      try {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(425, ctx.currentTime);

        gain.gain.setValueAtTime(0, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.12, ctx.currentTime + 0.05);
        gain.gain.setValueAtTime(0.12, ctx.currentTime + 1.2);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.3);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start();
        osc.stop(ctx.currentTime + 1.35);
      } catch {}
    };

    playTone();
    this.ringInterval = setInterval(playTone, 3000);
  }

  startIncomingRingtone() {
    this.stop();
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const playMelody = () => {
      try {
        const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const startTime = ctx.currentTime + idx * 0.15;

          osc.type = "triangle";
          osc.frequency.setValueAtTime(freq, startTime);

          gain.gain.setValueAtTime(0, startTime);
          gain.gain.linearRampToValueAtTime(0.15, startTime + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.35);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(startTime);
          osc.stop(startTime + 0.38);
        });
      } catch {}
    };

    playMelody();
    this.ringInterval = setInterval(playMelody, 2200);
  }

  playEndCallTone() {
    this.stop();
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      [0, 0.18].forEach((delay) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const startTime = ctx.currentTime + delay;

        osc.type = "sine";
        osc.frequency.setValueAtTime(440, startTime);

        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(0.12, startTime + 0.02);
        gain.gain.linearRampToValueAtTime(0, startTime + 0.1);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + 0.12);
      });
    } catch {}
  }

  stop() {
    if (this.ringInterval) {
      clearInterval(this.ringInterval);
      this.ringInterval = null;
    }
  }
}

export const callAudio = new CallAudioService();
