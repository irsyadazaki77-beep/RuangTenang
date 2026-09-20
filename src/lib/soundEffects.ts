// Web Audio API Synthesizer Helper for Meditation Bells & Ambience
// 100% offline-ready, no external MP3 dependencies.

let sharedAudioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return null;

  if (!sharedAudioCtx) {
    try {
      sharedAudioCtx = new AudioContextClass();
    } catch {
      return null;
    }
  }

  // If the audio context was suspended due to autoplay policy, resume it
  if (sharedAudioCtx.state === 'suspended') {
    sharedAudioCtx.resume().catch(() => {
      // Ignored if user hasn't interacted yet
    });
  }

  return sharedAudioCtx;
}

/**
 * Plays a resonant Tibetan singing bowl sound at a target frequency (default: 432 Hz healing tone).
 * Uses an OscillatorNode (sine wave) and GainNode with a gentle exponential decay curve (~2.5s).
 */
export function playTibetanBowlSound(freq = 432): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    if (ctx.state === 'suspended') {
      ctx.resume().then(() => {
        executeBellSound(ctx, freq);
      }).catch(() => {});
    } else {
      executeBellSound(ctx, freq);
    }
  } catch {
    // Graceful fallback if Web Audio API fails
  }
}

function executeBellSound(ctx: AudioContext, freq: number): void {
  try {
    const now = ctx.currentTime;

    // Primary fundamental oscillator
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);

    // Subtle harmonic overtone (1.5x fifth or 2.76x singing bowl overtone)
    const overtone = ctx.createOscillator();
    overtone.type = 'sine';
    overtone.frequency.setValueAtTime(freq * 2.76, now);

    // Gain nodes for volume shaping and soft decay
    const mainGain = ctx.createGain();
    mainGain.gain.setValueAtTime(0.0001, now);
    // Soft attack (80ms)
    mainGain.gain.exponentialRampToValueAtTime(0.28, now + 0.08);
    // Gentle exponential fade-out (~2.5s)
    mainGain.gain.exponentialRampToValueAtTime(0.0001, now + 2.5);

    const overtoneGain = ctx.createGain();
    overtoneGain.gain.setValueAtTime(0.0001, now);
    overtoneGain.gain.exponentialRampToValueAtTime(0.08, now + 0.05);
    overtoneGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.8);

    // Connect nodes
    osc.connect(mainGain);
    overtone.connect(overtoneGain);

    mainGain.connect(ctx.destination);
    overtoneGain.connect(ctx.destination);

    // Start and stop
    osc.start(now);
    overtone.start(now);

    osc.stop(now + 2.6);
    overtone.stop(now + 2.6);
  } catch {
    // Fail silently on audio context disposal
  }
}
