/**
 * Web Audio API Soundscape & Binaural Beats Synthesizer Engine
 * 100% Client-side, zero external assets, no copyright restrictions, infinite non-looping audio.
 * Provides clean memory lifecycle with AudioContext release on unmount.
 */

export type SoundscapeTrackId = 
  | 'rain' 
  | 'waves' 
  | 'forest' 
  | 'brownNoise' 
  | 'whiteNoise' 
  | 'binaural' 
  | 'lofi' 
  | 'cafe';

export interface SoundscapeTrackConfig {
  id: SoundscapeTrackId;
  name: string;
  category: 'RUANG_TENANG' | 'RUANG_KERJA';
  description: string;
  icon: string;
  defaultVolume: number; // 0.0 to 1.0
  color: string;
}

export const SOUNDSCAPE_TRACKS: SoundscapeTrackConfig[] = [
  // RuangTenang Tracks
  {
    id: 'rain',
    name: 'Hujan Tropis Malam',
    category: 'RUANG_TENANG',
    description: 'Rintik hujan malam menenangkan di atas dedaunan',
    icon: 'CloudRain',
    defaultVolume: 0.65,
    color: 'from-blue-500 to-cyan-500'
  },
  {
    id: 'waves',
    name: 'Gelombang Ombak Tenang',
    category: 'RUANG_TENANG',
    description: 'Deburan ombak pantai ritmis dengan frekuensi rendah',
    icon: 'Waves',
    defaultVolume: 0.6,
    color: 'from-teal-500 to-emerald-500'
  },
  {
    id: 'forest',
    name: 'Hutan & Angin Semilir',
    category: 'RUANG_TENANG',
    description: 'Semilir angin sejuk pepohonan dengan kicau burung halus',
    icon: 'Trees',
    defaultVolume: 0.5,
    color: 'from-emerald-500 to-green-600'
  },
  {
    id: 'brownNoise',
    name: 'Deep Brown Noise',
    category: 'RUANG_TENANG',
    description: 'Kebisingan hangat frekuensi rendah untuk redakan overthinking',
    icon: 'Volume2',
    defaultVolume: 0.5,
    color: 'from-amber-600 to-stone-600'
  },
  // RuangKerja Tracks
  {
    id: 'binaural',
    name: '40Hz Binaural Beats',
    category: 'RUANG_KERJA',
    description: 'Gelombang Gamma (200Hz/240Hz) untuk fokus kognitif mendalam',
    icon: 'Headphones',
    defaultVolume: 0.55,
    color: 'from-indigo-500 to-purple-600'
  },
  {
    id: 'lofi',
    name: 'Lofi Study Beat (75 BPM)',
    category: 'RUANG_KERJA',
    description: 'Progresi akord elektrik Rhodes hangat + vinyl crackle',
    icon: 'Music',
    defaultVolume: 0.6,
    color: 'from-violet-500 to-pink-500'
  },
  {
    id: 'cafe',
    name: 'Kafe & Perpustakaan Santai',
    category: 'RUANG_KERJA',
    description: 'Suasana akustik ruang kerja santai & perpustakaan',
    icon: 'Coffee',
    defaultVolume: 0.45,
    color: 'from-amber-500 to-orange-500'
  }
];

export type TimerMode = 'none' | 'pomodoro' | 'sleep';

export interface SoundscapeState {
  isPlaying: boolean;
  masterVolume: number; // 0 to 1
  trackVolumes: Record<SoundscapeTrackId, number>; // 0 to 1
  activeTracks: Set<SoundscapeTrackId>;
  timerMode: TimerMode;
  timerTotalSeconds: number;
  timerRemainingSeconds: number;
  pomodoroPhase: 'work' | 'break';
}

class SoundscapeSynthesizer {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private analyser: AnalyserNode | null = null;
  private activeGenerators: Map<SoundscapeTrackId, {
    gainNode: GainNode;
    stop: () => void;
  }> = new Map();

  private isRunning = false;
  private timerInterval: NodeJS.Timeout | null = null;
  private lofiInterval: NodeJS.Timeout | null = null;
  private birdInterval: NodeJS.Timeout | null = null;
  private rainDropletInterval: NodeJS.Timeout | null = null;

  private stateListeners: Set<(state: SoundscapeState) => void> = new Set();
  private visualizerDataArray: Uint8Array | null = null;

  public state: SoundscapeState = {
    isPlaying: false,
    masterVolume: 0.7,
    trackVolumes: {
      rain: 0.65,
      waves: 0.6,
      forest: 0.5,
      brownNoise: 0.5,
      whiteNoise: 0.3,
      binaural: 0.55,
      lofi: 0.6,
      cafe: 0.45
    },
    activeTracks: new Set<SoundscapeTrackId>(['rain']),
    timerMode: 'none',
    timerTotalSeconds: 0,
    timerRemainingSeconds: 0,
    pomodoroPhase: 'work'
  };

  constructor() {
    // Lazy initialization of audio context upon user interaction
  }

  private getAudioContext(): AudioContext {
    if (!this.ctx || this.ctx.state === 'closed') {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtxClass();
      
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.state.masterVolume, this.ctx.currentTime);

      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 64;
      this.analyser.smoothingTimeConstant = 0.8;
      this.visualizerDataArray = new Uint8Array(this.analyser.frequencyBinCount);

      this.masterGain.connect(this.analyser);
      this.analyser.connect(this.ctx.destination);
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }

    return this.ctx;
  }

  public subscribe(callback: (state: SoundscapeState) => void): () => void {
    this.stateListeners.add(callback);
    callback({ ...this.state, activeTracks: new Set(this.state.activeTracks) });
    return () => {
      this.stateListeners.delete(callback);
    };
  }

  private notify() {
    const snapshot: SoundscapeState = {
      ...this.state,
      activeTracks: new Set(this.state.activeTracks)
    };
    this.stateListeners.forEach(listener => listener(snapshot));
  }

  // --- AUDIO GENERATORS ---

  // 1. White & Pink Noise Buffer Generator (5 seconds loop)
  private createNoiseBuffer(ctx: AudioContext, type: 'white' | 'pink' | 'brown'): AudioBuffer {
    const bufferSize = ctx.sampleRate * 5;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = buffer.getChannelData(0);

    if (type === 'white') {
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }
    } else if (type === 'pink') {
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
        b6 = white * 0.115926;
      }
    } else {
      // Brown noise
      let lastOut = 0.0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        output[i] = (lastOut + (0.02 * white)) / 1.02;
        lastOut = output[i];
        output[i] *= 3.5; // Gain compensation
      }
    }

    return buffer;
  }

  // 2. Start Tropical Night Rain
  private startRain(ctx: AudioContext, dest: GainNode): () => void {
    const noiseBuffer = this.createNoiseBuffer(ctx, 'pink');
    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;
    noiseSource.loop = true;

    // Dual-stage filters for rain hiss & water rumble
    const bandpass = ctx.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.setValueAtTime(1000, ctx.currentTime);
    bandpass.Q.setValueAtTime(0.7, ctx.currentTime);

    const lowpass = ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.setValueAtTime(4500, ctx.currentTime);

    noiseSource.connect(bandpass);
    bandpass.connect(lowpass);
    lowpass.connect(dest);

    noiseSource.start();

    // Occasional gentle water drops
    const dropletInterval = setInterval(() => {
      if (!this.isRunning) return;
      try {
        const dropOsc = ctx.createOscillator();
        const dropGain = ctx.createGain();
        const now = ctx.currentTime;
        const startFreq = 1200 + Math.random() * 1400;
        dropOsc.type = 'sine';
        dropOsc.frequency.setValueAtTime(startFreq, now);
        dropOsc.frequency.exponentialRampToValueAtTime(startFreq * 0.4, now + 0.08);

        dropGain.gain.setValueAtTime(0.0001, now);
        dropGain.gain.linearRampToValueAtTime(0.04 + Math.random() * 0.04, now + 0.01);
        dropGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);

        dropOsc.connect(dropGain);
        dropGain.connect(dest);
        dropOsc.start(now);
        dropOsc.stop(now + 0.1);
      } catch {}
    }, 380);

    return () => {
      clearInterval(dropletInterval);
      try {
        noiseSource.stop();
        noiseSource.disconnect();
      } catch {}
    };
  }

  // 3. Start Calm Ocean Waves (Swell modulated brown noise)
  private startWaves(ctx: AudioContext, dest: GainNode): () => void {
    const noiseBuffer = this.createNoiseBuffer(ctx, 'brown');
    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;
    noiseSource.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(400, ctx.currentTime);

    // LFO to modulate wave swell every ~8-12 seconds
    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(0.09, ctx.currentTime); // ~11s period

    const lfoGain = ctx.createGain();
    lfoGain.gain.setValueAtTime(320, ctx.currentTime); // Sweeps between 80Hz and 720Hz

    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);

    const waveGain = ctx.createGain();
    const lfoAmp = ctx.createOscillator();
    lfoAmp.type = 'sine';
    lfoAmp.frequency.setValueAtTime(0.09, ctx.currentTime);

    const lfoAmpGain = ctx.createGain();
    lfoAmpGain.gain.setValueAtTime(0.35, ctx.currentTime);
    lfoAmp.connect(lfoAmpGain);
    lfoAmpGain.connect(waveGain.gain);

    noiseSource.connect(filter);
    filter.connect(waveGain);
    waveGain.connect(dest);

    noiseSource.start();
    lfo.start();
    lfoAmp.start();

    return () => {
      try {
        noiseSource.stop();
        lfo.stop();
        lfoAmp.stop();
        noiseSource.disconnect();
      } catch {}
    };
  }

  // 4. Start Forest Breeze & Algorithmic Birdsong
  private startForest(ctx: AudioContext, dest: GainNode): () => void {
    const noiseBuffer = this.createNoiseBuffer(ctx, 'pink');
    const windSource = ctx.createBufferSource();
    windSource.buffer = noiseBuffer;
    windSource.loop = true;

    const windFilter = ctx.createBiquadFilter();
    windFilter.type = 'bandpass';
    windFilter.frequency.setValueAtTime(500, ctx.currentTime);
    windFilter.Q.setValueAtTime(1.2, ctx.currentTime);

    // Subtle wind oscillation
    const windLfo = ctx.createOscillator();
    windLfo.frequency.setValueAtTime(0.15, ctx.currentTime);
    const windLfoGain = ctx.createGain();
    windLfoGain.gain.setValueAtTime(250, ctx.currentTime);
    windLfo.connect(windLfoGain);
    windLfoGain.connect(windFilter.frequency);

    windSource.connect(windFilter);
    windFilter.connect(dest);

    windSource.start();
    windLfo.start();

    // Occasional subtle procedural birdsong chirp
    const birdInterval = setInterval(() => {
      if (!this.isRunning || Math.random() > 0.65) return;
      try {
        const now = ctx.currentTime;
        const birdOsc = ctx.createOscillator();
        const birdGain = ctx.createGain();
        const baseFreq = 2400 + Math.random() * 800;

        birdOsc.type = 'sine';
        birdOsc.frequency.setValueAtTime(baseFreq, now);
        birdOsc.frequency.linearRampToValueAtTime(baseFreq + 600, now + 0.05);
        birdOsc.frequency.linearRampToValueAtTime(baseFreq - 200, now + 0.12);

        birdGain.gain.setValueAtTime(0.0001, now);
        birdGain.gain.linearRampToValueAtTime(0.035, now + 0.02);
        birdGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);

        birdOsc.connect(birdGain);
        birdGain.connect(dest);
        birdOsc.start(now);
        birdOsc.stop(now + 0.2);
      } catch {}
    }, 2800);

    return () => {
      clearInterval(birdInterval);
      try {
        windSource.stop();
        windLfo.stop();
        windSource.disconnect();
      } catch {}
    };
  }

  // 5. Start Deep Brown Noise
  private startBrownNoise(ctx: AudioContext, dest: GainNode): () => void {
    const buffer = this.createNoiseBuffer(ctx, 'brown');
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, ctx.currentTime);

    source.connect(filter);
    filter.connect(dest);
    source.start();

    return () => {
      try {
        source.stop();
        source.disconnect();
      } catch {}
    };
  }

  // 6. Start 40Hz Binaural Beats (Gamma frequency for cognitive focus)
  private startBinaural(ctx: AudioContext, dest: GainNode): () => void {
    const carrierFreq = 200; // Base carrier 200 Hz
    const beatFreq = 40; // 40 Hz Gamma difference

    // Left Ear = 200 Hz, Right Ear = 240 Hz
    const leftOsc = ctx.createOscillator();
    const rightOsc = ctx.createOscillator();
    leftOsc.type = 'sine';
    rightOsc.type = 'sine';
    leftOsc.frequency.setValueAtTime(carrierFreq, ctx.currentTime);
    rightOsc.frequency.setValueAtTime(carrierFreq + beatFreq, ctx.currentTime);

    // Channel merger / stereo panner
    let leftNode: AudioNode = leftOsc;
    let rightNode: AudioNode = rightOsc;

    if (typeof ctx.createStereoPanner === 'function') {
      const leftPanner = ctx.createStereoPanner();
      leftPanner.pan.setValueAtTime(-1, ctx.currentTime);
      const rightPanner = ctx.createStereoPanner();
      rightPanner.pan.setValueAtTime(1, ctx.currentTime);

      leftOsc.connect(leftPanner);
      rightOsc.connect(rightPanner);
      leftNode = leftPanner;
      rightNode = rightPanner;
    }

    // Warm undertone sub-bass (100Hz)
    const subOsc = ctx.createOscillator();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(100, ctx.currentTime);
    const subGain = ctx.createGain();
    subGain.gain.setValueAtTime(0.3, ctx.currentTime);
    subOsc.connect(subGain);

    leftNode.connect(dest);
    rightNode.connect(dest);
    subGain.connect(dest);

    leftOsc.start();
    rightOsc.start();
    subOsc.start();

    return () => {
      try {
        leftOsc.stop();
        rightOsc.stop();
        subOsc.stop();
        leftOsc.disconnect();
        rightOsc.disconnect();
      } catch {}
    };
  }

  // 7. Start Lofi Study Beats (75 BPM Procedural Rhodes Chord Sequence + Vinyl Crackle)
  private startLofi(ctx: AudioContext, dest: GainNode): () => void {
    // 1. Vinyl crackle generator
    const vinylBuffer = this.createNoiseBuffer(ctx, 'pink');
    const vinylSource = ctx.createBufferSource();
    vinylSource.buffer = vinylBuffer;
    vinylSource.loop = true;

    const vinylFilter = ctx.createBiquadFilter();
    vinylFilter.type = 'bandpass';
    vinylFilter.frequency.setValueAtTime(2500, ctx.currentTime);
    vinylFilter.Q.setValueAtTime(2.5, ctx.currentTime);

    const vinylGain = ctx.createGain();
    vinylGain.gain.setValueAtTime(0.08, ctx.currentTime);

    vinylSource.connect(vinylFilter);
    vinylFilter.connect(vinylGain);
    vinylGain.connect(dest);
    vinylSource.start();

    // 2. Chill Rhodes Chord Progression: Dmaj9 -> Bm7 -> Em7 -> A13
    const chordProgressions = [
      [293.66, 369.99, 440.00, 554.37, 659.25], // Dmaj9 (D4, F#4, A4, C#5, E5)
      [246.94, 293.66, 369.99, 440.00, 587.33], // Bm7 (B3, D4, F#4, A4, D5)
      [329.63, 392.00, 493.88, 587.33, 659.25], // Em7 (E4, G4, B4, D5, E5)
      [220.00, 277.18, 369.99, 440.00, 554.37]  // A13 (A3, C#4, F#4, A4, C#5)
    ];

    let chordIndex = 0;
    const playChord = () => {
      if (!this.isRunning) return;
      try {
        const chord = chordProgressions[chordIndex];
        chordIndex = (chordIndex + 1) % chordProgressions.length;
        const now = ctx.currentTime;
        const chordDuration = 3.2; // 75 BPM, 4 beats

        chord.forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const filter = ctx.createBiquadFilter();

          // Mellow electric piano timbre (sine with gentle warm overtone)
          osc.type = i === 0 ? 'sine' : 'triangle';
          osc.frequency.setValueAtTime(freq, now);

          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(1400, now);
          filter.frequency.exponentialRampToValueAtTime(600, now + chordDuration);

          gain.gain.setValueAtTime(0.0001, now);
          // Soft Rhodes attack
          gain.gain.linearRampToValueAtTime(0.06 / chord.length, now + 0.08);
          // Slow organic decay
          gain.gain.exponentialRampToValueAtTime(0.0001, now + chordDuration);

          osc.connect(filter);
          filter.connect(gain);
          gain.connect(dest);

          osc.start(now);
          osc.stop(now + chordDuration);
        });
      } catch {}
    };

    playChord();
    const lofiInterval = setInterval(playChord, 3200);

    return () => {
      clearInterval(lofiInterval);
      try {
        vinylSource.stop();
        vinylSource.disconnect();
      } catch {}
    };
  }

  // 8. Start Cafe & Library Ambience
  private startCafe(ctx: AudioContext, dest: GainNode): () => void {
    const pinkBuffer = this.createNoiseBuffer(ctx, 'pink');
    const cafeMurmur = ctx.createBufferSource();
    cafeMurmur.buffer = pinkBuffer;
    cafeMurmur.loop = true;

    // Filter simulating distant warm cafe chatter & library reverberance
    const lowpass = ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.setValueAtTime(650, ctx.currentTime);

    const cafeGain = ctx.createGain();
    cafeGain.gain.setValueAtTime(0.25, ctx.currentTime);

    cafeMurmur.connect(lowpass);
    lowpass.connect(cafeGain);
    cafeGain.connect(dest);
    cafeMurmur.start();

    // Occasional gentle porcelain cup clink or book page turn
    const clinkInterval = setInterval(() => {
      if (!this.isRunning || Math.random() > 0.45) return;
      try {
        const now = ctx.currentTime;
        const clinkOsc = ctx.createOscillator();
        const clinkGain = ctx.createGain();
        const clinkFreq = 3200 + Math.random() * 800;

        clinkOsc.type = 'sine';
        clinkOsc.frequency.setValueAtTime(clinkFreq, now);

        clinkGain.gain.setValueAtTime(0.0001, now);
        clinkGain.gain.linearRampToValueAtTime(0.02, now + 0.005);
        clinkGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);

        clinkOsc.connect(clinkGain);
        clinkGain.connect(dest);
        clinkOsc.start(now);
        clinkOsc.stop(now + 0.1);
      } catch {}
    }, 4500);

    return () => {
      clearInterval(clinkInterval);
      try {
        cafeMurmur.stop();
        cafeMurmur.disconnect();
      } catch {}
    };
  }

  // --- PLAYBACK CONTROLS ---

  public startTrack(trackId: SoundscapeTrackId): void {
    if (this.activeGenerators.has(trackId)) return;

    const ctx = this.getAudioContext();
    if (!this.masterGain) return;

    const trackGain = ctx.createGain();
    const targetVol = (this.state.trackVolumes[trackId] ?? 0.5) * this.state.masterVolume;
    trackGain.gain.setValueAtTime(0.0001, ctx.currentTime);
    trackGain.gain.exponentialRampToValueAtTime(Math.max(0.0001, targetVol), ctx.currentTime + 0.4);
    trackGain.connect(this.masterGain);

    let stopFn: () => void = () => {};
    switch (trackId) {
      case 'rain': stopFn = this.startRain(ctx, trackGain); break;
      case 'waves': stopFn = this.startWaves(ctx, trackGain); break;
      case 'forest': stopFn = this.startForest(ctx, trackGain); break;
      case 'brownNoise': stopFn = this.startBrownNoise(ctx, trackGain); break;
      case 'binaural': stopFn = this.startBinaural(ctx, trackGain); break;
      case 'lofi': stopFn = this.startLofi(ctx, trackGain); break;
      case 'cafe': stopFn = this.startCafe(ctx, trackGain); break;
      default: stopFn = this.startBrownNoise(ctx, trackGain); break;
    }

    this.activeGenerators.set(trackId, {
      gainNode: trackGain,
      stop: stopFn
    });

    this.state.activeTracks.add(trackId);
    this.state.isPlaying = true;
    this.isRunning = true;
    this.notify();
  }

  public stopTrack(trackId: SoundscapeTrackId): void {
    const gen = this.activeGenerators.get(trackId);
    if (!gen) {
      this.state.activeTracks.delete(trackId);
      this.notify();
      return;
    }

    const ctx = this.ctx;
    if (ctx) {
      gen.gainNode.gain.setValueAtTime(gen.gainNode.gain.value, ctx.currentTime);
      gen.gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.3);
      setTimeout(() => {
        gen.stop();
        this.activeGenerators.delete(trackId);
      }, 350);
    } else {
      gen.stop();
      this.activeGenerators.delete(trackId);
    }

    this.state.activeTracks.delete(trackId);
    if (this.state.activeTracks.size === 0) {
      this.state.isPlaying = false;
      this.isRunning = false;
    }
    this.notify();
  }

  public toggleTrack(trackId: SoundscapeTrackId): void {
    if (this.state.activeTracks.has(trackId)) {
      this.stopTrack(trackId);
    } else {
      this.startTrack(trackId);
    }
  }

  public setTrackVolume(trackId: SoundscapeTrackId, volume: number): void {
    const clamped = Math.max(0, Math.min(1, volume));
    this.state.trackVolumes[trackId] = clamped;

    const gen = this.activeGenerators.get(trackId);
    if (gen && this.ctx) {
      const effVol = clamped * this.state.masterVolume;
      gen.gainNode.gain.setValueAtTime(Math.max(0.0001, effVol), this.ctx.currentTime);
    }
    this.notify();
  }

  public setMasterVolume(volume: number): void {
    const clamped = Math.max(0, Math.min(1, volume));
    this.state.masterVolume = clamped;

    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(Math.max(0.0001, clamped), this.ctx.currentTime);
    }
    this.notify();
  }

  public playAllActive(): void {
    if (this.state.activeTracks.size === 0) {
      this.state.activeTracks.add('rain');
    }
    this.state.activeTracks.forEach(t => this.startTrack(t));
    this.state.isPlaying = true;
    this.isRunning = true;
    this.notify();
  }

  public pauseAll(): void {
    const ctx = this.ctx;
    if (ctx && this.masterGain) {
      this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, ctx.currentTime);
      this.masterGain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.3);
    }

    setTimeout(() => {
      this.activeGenerators.forEach((gen) => {
        gen.stop();
      });
      this.activeGenerators.clear();
      this.state.isPlaying = false;
      this.isRunning = false;
      if (this.masterGain && ctx) {
        this.masterGain.gain.setValueAtTime(this.state.masterVolume, ctx.currentTime);
      }
      this.notify();
    }, 320);
  }

  public togglePlay(): void {
    if (this.state.isPlaying) {
      this.pauseAll();
    } else {
      this.playAllActive();
    }
  }

  // --- TIMER & POMODORO SYSTEM ---

  public startPomodoroTimer(): void {
    this.clearTimers();
    this.state.timerMode = 'pomodoro';
    this.state.pomodoroPhase = 'work';
    this.state.timerTotalSeconds = 25 * 60; // 25 min focus
    this.state.timerRemainingSeconds = 25 * 60;
    
    if (!this.state.isPlaying) {
      this.playAllActive();
    }

    this.runTimerTick();
    this.notify();
  }

  public startSleepTimer(minutes: number): void {
    this.clearTimers();
    this.state.timerMode = 'sleep';
    this.state.timerTotalSeconds = minutes * 60;
    this.state.timerRemainingSeconds = minutes * 60;

    if (!this.state.isPlaying) {
      this.playAllActive();
    }

    this.runTimerTick();
    this.notify();
  }

  public stopTimer(): void {
    this.clearTimers();
    this.state.timerMode = 'none';
    this.state.timerTotalSeconds = 0;
    this.state.timerRemainingSeconds = 0;
    this.notify();
  }

  private runTimerTick(): void {
    this.timerInterval = setInterval(() => {
      if (this.state.timerRemainingSeconds <= 0) {
        this.handleTimerComplete();
        return;
      }

      this.state.timerRemainingSeconds -= 1;

      // Sleep timer gradual fade-out in last 60 seconds
      if (this.state.timerMode === 'sleep' && this.state.timerRemainingSeconds <= 60 && this.state.timerRemainingSeconds > 0) {
        const factor = this.state.timerRemainingSeconds / 60;
        if (this.masterGain && this.ctx) {
          this.masterGain.gain.setValueAtTime(Math.max(0.0001, this.state.masterVolume * factor), this.ctx.currentTime);
        }
      }

      this.notify();
    }, 1000);
  }

  private handleTimerComplete(): void {
    this.clearTimers();

    if (this.state.timerMode === 'pomodoro') {
      if (this.state.pomodoroPhase === 'work') {
        // Switch to 5 min break
        this.state.pomodoroPhase = 'break';
        this.state.timerTotalSeconds = 5 * 60;
        this.state.timerRemainingSeconds = 5 * 60;
        this.playChimeTone(659.25); // E5 break chime
        this.runTimerTick();
      } else {
        // Break finished -> switch back to focus or pause
        this.state.pomodoroPhase = 'work';
        this.state.timerTotalSeconds = 25 * 60;
        this.state.timerRemainingSeconds = 25 * 60;
        this.playChimeTone(523.25); // C5 focus chime
        this.runTimerTick();
      }
    } else if (this.state.timerMode === 'sleep') {
      this.pauseAll();
      this.state.timerMode = 'none';
    }
    this.notify();
  }

  private playChimeTone(freq: number): void {
    try {
      const ctx = this.getAudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const now = ctx.currentTime;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(0.12, now + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 1.3);
    } catch {}
  }

  private clearTimers(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  // --- AUDIO ANALYSER / VISUALIZER ---
  public getVisualizerLevel(): number {
    if (!this.isRunning || !this.analyser || !this.visualizerDataArray) return 0;
    this.analyser.getByteFrequencyData(this.visualizerDataArray);
    let sum = 0;
    for (let i = 0; i < this.visualizerDataArray.length; i++) {
      sum += this.visualizerDataArray[i];
    }
    return sum / (this.visualizerDataArray.length * 255);
  }

  // Preset switchers
  public applyPreset(preset: 'RUANG_TENANG' | 'RUANG_KERJA' | 'NATURE_RAIN' | 'DEEP_FOCUS'): void {
    this.state.activeTracks.clear();
    if (preset === 'RUANG_TENANG' || preset === 'NATURE_RAIN') {
      this.state.activeTracks.add('rain');
      this.state.activeTracks.add('waves');
      this.setTrackVolume('rain', 0.65);
      this.setTrackVolume('waves', 0.5);
    } else if (preset === 'RUANG_KERJA' || preset === 'DEEP_FOCUS') {
      this.state.activeTracks.add('binaural');
      this.state.activeTracks.add('lofi');
      this.setTrackVolume('binaural', 0.6);
      this.setTrackVolume('lofi', 0.55);
    }
    this.playAllActive();
  }

  public destroy(): void {
    this.clearTimers();
    this.activeGenerators.forEach(gen => gen.stop());
    this.activeGenerators.clear();
    if (this.ctx && this.ctx.state !== 'closed') {
      this.ctx.close().catch(() => {});
    }
  }
}

// Global Singleton Soundscape Engine
export const soundscapeEngine = new SoundscapeSynthesizer();
