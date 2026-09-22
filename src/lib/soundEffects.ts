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

/**
 * Plays a gentle, harmonic two-tone audio completion chime (D5: 587.33Hz -> A5: 880Hz)
 * with low gain (~0.08) and ~0.4s exponential decay per note.
 * Pure Web Audio API synthesis - 100% offline, zero external audio assets.
 */
export function playCompletionChime(): void {
  try {
    if (typeof window === 'undefined') return;
    const isEnabled = localStorage.getItem('pref_ai_completion_chime') !== 'false';
    if (!isEnabled) return;

    const ctx = getAudioContext();
    if (!ctx) return;

    if (ctx.state === 'suspended') {
      ctx.resume().then(() => {
        executeChimeSound(ctx);
      }).catch(() => {});
    } else {
      executeChimeSound(ctx);
    }
  } catch {
    // Graceful fallback if audio is blocked
  }
}

function executeChimeSound(ctx: AudioContext): void {
  try {
    const now = ctx.currentTime;

    // Tone 1: D5 (587.33 Hz)
    const osc1 = ctx.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now);

    const gain1 = ctx.createGain();
    gain1.gain.setValueAtTime(0.0001, now);
    gain1.gain.exponentialRampToValueAtTime(0.08, now + 0.02);
    gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);

    osc1.start(now);
    osc1.stop(now + 0.36);

    // Tone 2: A5 (880 Hz) - slightly delayed by 0.12s
    const startTime2 = now + 0.12;
    const osc2 = ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, startTime2);

    const gain2 = ctx.createGain();
    gain2.gain.setValueAtTime(0.0001, startTime2);
    gain2.gain.exponentialRampToValueAtTime(0.07, startTime2 + 0.02);
    gain2.gain.exponentialRampToValueAtTime(0.0001, startTime2 + 0.4);

    osc2.connect(gain2);
    gain2.connect(ctx.destination);

    osc2.start(startTime2);
    osc2.stop(startTime2 + 0.42);
  } catch {
    // Fail silently on audio errors
  }
}

