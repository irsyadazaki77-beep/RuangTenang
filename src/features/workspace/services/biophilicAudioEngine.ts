export type BiophilicMode = 'alpha_focus' | 'theta_grounding' | 'delta_sleep' | 'rain_ambience';

export interface BiophilicAudioState {
  isPlaying: boolean;
  mode: BiophilicMode;
  volume: number;
}

class BiophilicAudioEngine {
  private ctx: AudioContext | null = null;
  private leftOsc: OscillatorNode | null = null;
  private rightOsc: OscillatorNode | null = null;
  private noiseNode: AudioNode | null = null;
  private masterGain: GainNode | null = null;
  private currentMode: BiophilicMode = 'alpha_focus';
  private currentVolume = 0.5;

  private initContext() {
    if (typeof window === 'undefined') return;
    if (!this.ctx || this.ctx.state === 'closed') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.currentVolume, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public start(mode: BiophilicMode = 'alpha_focus', volume = 0.5): boolean {
    if (typeof window === 'undefined') return false;
    this.stop();
    this.initContext();
    if (!this.ctx || !this.masterGain) return false;

    this.currentMode = mode;
    this.currentVolume = volume;
    this.masterGain.gain.setValueAtTime(volume, this.ctx.currentTime);

    const baseFreq = 220; // A3 base tone
    let beatDiff = 10; // Alpha by default

    if (mode === 'theta_grounding') {
      beatDiff = 6;
    } else if (mode === 'delta_sleep') {
      beatDiff = 2.5;
    }

    try {
      if (mode === 'rain_ambience') {
        // Procedural Pink Noise generation
        const bufferSize = this.ctx.sampleRate * 2;
        const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        let b0 = 0, b1 = 0, b2 = 0;
        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          b0 = 0.99886 * b0 + white * 0.0555179;
          b1 = 0.99332 * b1 + white * 0.0750759;
          b2 = 0.96900 * b2 + white * 0.1538520;
          output[i] = (b0 + b1 + b2) * 0.11;
        }

        const whiteNoise = this.ctx.createBufferSource();
        whiteNoise.buffer = noiseBuffer;
        whiteNoise.loop = true;
        whiteNoise.connect(this.masterGain);
        whiteNoise.start();
        this.noiseNode = whiteNoise;
      } else {
        // Binaural Beats: Left channel (base), Right channel (base + beatDiff)
        const merger = this.ctx.createChannelMerger(2);

        this.leftOsc = this.ctx.createOscillator();
        this.leftOsc.type = 'sine';
        this.leftOsc.frequency.setValueAtTime(baseFreq, this.ctx.currentTime);
        this.leftOsc.connect(merger, 0, 0);

        this.rightOsc = this.ctx.createOscillator();
        this.rightOsc.type = 'sine';
        this.rightOsc.frequency.setValueAtTime(baseFreq + beatDiff, this.ctx.currentTime);
        this.rightOsc.connect(merger, 0, 1);

        merger.connect(this.masterGain);
        this.leftOsc.start();
        this.rightOsc.start();
      }
      return true;
    } catch (e) {
      console.warn('[BiophilicAudio] Audio play failed:', e);
      return false;
    }
  }

  public stop(): void {
    if (this.leftOsc) {
      try { this.leftOsc.stop(); } catch {}
      this.leftOsc.disconnect();
      this.leftOsc = null;
    }
    if (this.rightOsc) {
      try { this.rightOsc.stop(); } catch {}
      this.rightOsc.disconnect();
      this.rightOsc = null;
    }
    if (this.noiseNode) {
      try { (this.noiseNode as AudioScheduledSourceNode).stop?.(); } catch {}
      this.noiseNode.disconnect();
      this.noiseNode = null;
    }
  }

  public setVolume(volume: number): void {
    this.currentVolume = Math.max(0, Math.min(1, volume));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.currentVolume, this.ctx.currentTime);
    }
  }

  public getState(): BiophilicAudioState {
    const isPlaying = Boolean(this.leftOsc || this.noiseNode);
    return {
      isPlaying,
      mode: this.currentMode,
      volume: this.currentVolume
    };
  }
}

export const biophilicAudioEngine = new BiophilicAudioEngine();
