export type SoundProfile = 'thock' | 'clack';

class KeyboardSoundEngine {
  private ctx: AudioContext | null = null;
  private noiseBuffer: AudioBuffer | null = null;

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    if (!this.noiseBuffer && this.ctx) {
      const length = Math.floor(this.ctx.sampleRate * 0.14);
      const buffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < length; i += 1) {
        data[i] = Math.random() * 2 - 1;
      }
      this.noiseBuffer = buffer;
    }
    return this.ctx;
  }

  public unlock(): void {
    this.ensureContext();
  }

  /**
   * Plays a procedural mechanical switch downstroke sound.
   * Larger keys (like the 6.25u Spacebar) pitch slightly deeper like real PBT keycaps.
   */
  public playKeyDown(profile: SoundProfile, uWidth = 1, enabled = true): void {
    if (!enabled) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.noiseBuffer) return;

    const now = ctx.currentTime;
    const pitchScale = uWidth >= 6 ? 0.68 : uWidth >= 2 ? 0.84 : 0.96 + Math.random() * 0.08;

    if (profile === 'thock') {
      // Deep marbly PBT bottom-out thock
      const osc = ctx.createOscillator();
      const oscGain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(195 * pitchScale, now);
      osc.frequency.exponentialRampToValueAtTime(68 * pitchScale, now + 0.055);
      oscGain.gain.setValueAtTime(0.32, now);
      oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.068);
      osc.connect(oscGain).connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.072);

      // Warm damped housing thump
      const noise = ctx.createBufferSource();
      noise.buffer = this.noiseBuffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(520 * pitchScale, now);
      filter.Q.setValueAtTime(1.4, now);
      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.28, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.042);
      noise.connect(filter).connect(noiseGain).connect(ctx.destination);
      noise.start(now);
      noise.stop(now + 0.048);
    } else {
      // Crisp bright clack
      const noise = ctx.createBufferSource();
      noise.buffer = this.noiseBuffer;
      const hp = ctx.createBiquadFilter();
      hp.type = 'bandpass';
      hp.frequency.setValueAtTime(2400 * pitchScale, now);
      hp.Q.setValueAtTime(1.8, now);
      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.38, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.028);
      noise.connect(hp).connect(noiseGain).connect(ctx.destination);
      noise.start(now);
      noise.stop(now + 0.032);

      // Sharp polycarbonate top snap
      const osc = ctx.createOscillator();
      const oscGain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1150 * pitchScale, now);
      osc.frequency.exponentialRampToValueAtTime(310 * pitchScale, now + 0.022);
      oscGain.gain.setValueAtTime(0.18, now);
      oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.026);
      osc.connect(oscGain).connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.03);
    }
  }

  /**
   * Subtle upstroke return sound when releasing a key.
   */
  public playKeyUp(profile: SoundProfile, uWidth = 1, enabled = true): void {
    if (!enabled) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.noiseBuffer) return;

    const now = ctx.currentTime;
    const pitchScale = uWidth >= 6 ? 0.8 : 1.0 + Math.random() * 0.06;

    const noise = ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime((profile === 'thock' ? 920 : 3100) * pitchScale, now);
    filter.Q.setValueAtTime(2.0, now);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(profile === 'thock' ? 0.08 : 0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.02);
    noise.connect(filter).connect(gain).connect(ctx.destination);
    noise.start(now);
    noise.stop(now + 0.024);
  }

  /**
   * Soft toy-like pop for UI layer selection or switch hover feedback.
   */
  public playUiPop(enabled = true, high = false): void {
    if (!enabled) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    const startFreq = high ? 520 : 360;
    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(startFreq * 1.42, now + 0.045);
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.055);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.06);
  }
}

export const soundEngine = new KeyboardSoundEngine();
