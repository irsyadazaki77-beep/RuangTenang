// Web Audio engine is isolated from the mindfulness screen so the UI owns only session state.
class MindfulnessAudioEngine {
  private ctx: AudioContext | null = null;
  
  // Binaural Beats Nodes
  private oscL: OscillatorNode | null = null;
  private oscR: OscillatorNode | null = null;
  private gainOsc: GainNode | null = null;
  private pannerL: StereoPannerNode | null = null;
  private pannerR: StereoPannerNode | null = null;

  // Ocean Wave Nodes
  private noiseNode: AudioWorkletNode | ScriptProcessorNode | null = null;
  private noiseGain: GainNode | null = null;
  private noiseFilter: BiquadFilterNode | null = null;
  private lfo: OscillatorNode | null = null;
  private lfoGain: GainNode | null = null;

  // Windchime Nodes & Interval
  private chimeTimer: number | null = null;
  private masterGain: GainNode | null = null;

  constructor() {
    // Lazy initialized on user click due to browser policies
  }

  public init() {
    if (this.ctx) return;
    const AudioContextClass = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) {
      console.warn('Web Audio API is not supported in this browser.');
      return;
    }
    this.ctx = new AudioContextClass();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(0.5, this.ctx.currentTime);
    this.masterGain.connect(this.ctx.destination);
  }

  public setMasterVolume(val: number) {
    if (!this.ctx || !this.masterGain) return;
    this.masterGain.gain.linearRampToValueAtTime(val, this.ctx.currentTime + 0.1);
  }

  // --- BINAURAL THETA BEAT SYNTHESIS (150Hz & 156Hz -> 6Hz calming state) ---
  public startThetaBeats() {
    this.init();
    if (!this.ctx || !this.masterGain) return;
    if (this.oscL) return; // Already running

    // Left oscillator at 150Hz
    this.oscL = this.ctx.createOscillator();
    this.oscL.type = 'sine';
    this.oscL.frequency.setValueAtTime(150, this.ctx.currentTime);

    // Right oscillator at 156Hz
    this.oscR = this.ctx.createOscillator();
    this.oscR.type = 'sine';
    this.oscR.frequency.setValueAtTime(156, this.ctx.currentTime);

    // Pan nodes to separate Left & Right channels explicitly
    this.pannerL = this.ctx.createStereoPanner();
    this.pannerL.pan.setValueAtTime(-1, this.ctx.currentTime);

    this.pannerR = this.ctx.createStereoPanner();
    this.pannerR.pan.setValueAtTime(1, this.ctx.currentTime);

    // Gain node for comfortable listening level
    this.gainOsc = this.ctx.createGain();
    this.gainOsc.gain.setValueAtTime(0.08, this.ctx.currentTime);

    // Routing
    this.oscL.connect(this.pannerL);
    this.pannerL.connect(this.gainOsc);

    this.oscR.connect(this.pannerR);
    this.pannerR.connect(this.gainOsc);

    this.gainOsc.connect(this.masterGain);

    // Start
    this.oscL.start();
    this.oscR.start();
  }

  public stopThetaBeats() {
    if (this.oscL) {
      try { this.oscL.stop(); } catch {}
      this.oscL.disconnect();
      this.oscL = null;
    }
    if (this.oscR) {
      try { this.oscR.stop(); } catch {}
      this.oscR.disconnect();
      this.oscR = null;
    }
    if (this.gainOsc) {
      this.gainOsc.disconnect();
      this.gainOsc = null;
    }
  }

  // --- OCEAN WAVE SOUND GENERATION ---
  public startOceanWaves() {
    this.init();
    if (!this.ctx || !this.masterGain) return;
    if (this.noiseGain) return; // Already running

    // Create White Noise buffer manually
    const bufferSize = 2 * this.ctx.sampleRate;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;

    // Filter to shape noise (lowpass to make it sound like wind or water)
    this.noiseFilter = this.ctx.createBiquadFilter();
    this.noiseFilter.type = 'lowpass';
    this.noiseFilter.Q.setValueAtTime(1.2, this.ctx.currentTime);
    this.noiseFilter.frequency.setValueAtTime(350, this.ctx.currentTime);

    // Gain for waves
    this.noiseGain = this.ctx.createGain();
    this.noiseGain.gain.setValueAtTime(0.18, this.ctx.currentTime);

    // LFO to modulate filter frequency slowly (ocean swell cycle approx 8 seconds)
    this.lfo = this.ctx.createOscillator();
    this.lfo.type = 'sine';
    this.lfo.frequency.setValueAtTime(0.12, this.ctx.currentTime); // ~8.3 seconds wave period

    this.lfoGain = this.ctx.createGain();
    this.lfoGain.gain.setValueAtTime(250, this.ctx.currentTime); // Sweeps frequency up & down by 250Hz

    // Routing
    this.lfo.connect(this.lfoGain);
    if (this.lfoGain && this.noiseFilter) {
      this.lfoGain.connect(this.noiseFilter.frequency);
    }

    whiteNoise.connect(this.noiseFilter);
    this.noiseFilter.connect(this.noiseGain);
    this.noiseGain.connect(this.masterGain);

    whiteNoise.start();
    this.lfo.start();

    // Store reference to close properly later (cast to keep track)
    (this as any)._waveSource = whiteNoise;
  }

  public stopOceanWaves() {
    if ((this as any)._waveSource) {
      try { (this as any)._waveSource.stop(); } catch {}
      (this as any)._waveSource.disconnect();
      (this as any)._waveSource = null;
    }
    if (this.lfo) {
      try { this.lfo.stop(); } catch {}
      this.lfo.disconnect();
      this.lfo = null;
    }
    if (this.lfoGain) {
      this.lfoGain.disconnect();
      this.lfoGain = null;
    }
    if (this.noiseFilter) {
      this.noiseFilter.disconnect();
      this.noiseFilter = null;
    }
    if (this.noiseGain) {
      this.noiseGain.disconnect();
      this.noiseGain = null;
    }
  }

  // --- FM WINDCHIME SYNTHESIS (Gentle resonant chimes triggered on timer) ---
  public startWindchimes() {
    this.init();
    if (!this.ctx || !this.masterGain) return;
    if (this.chimeTimer) return;

    const triggerSingleChime = () => {
      if (!this.ctx || !this.masterGain) return;
      
      // Chime note selection (Pentatonic scale for guaranteed harmony: F4, G4, A4, C5, D5, F5)
      const scale = [349.23, 392.00, 440.00, 523.25, 587.33, 698.46];
      const frequency = scale[Math.floor(Math.random() * scale.length)];
      
      // Oscillator 1: Carrier
      const carrier = this.ctx.createOscillator();
      carrier.type = 'triangle';
      carrier.frequency.setValueAtTime(frequency, this.ctx.currentTime);

      // Oscillator 2: Modulator (metal chime resonance)
      const modulator = this.ctx.createOscillator();
      modulator.type = 'sine';
      modulator.frequency.setValueAtTime(frequency * 2.13, this.ctx.currentTime);

      // Modulator gain
      const modGain = this.ctx.createGain();
      modGain.gain.setValueAtTime(300, this.ctx.currentTime);

      // Envelope for natural fade out
      const gainNode = this.ctx.createGain();
      gainNode.gain.setValueAtTime(0.0, this.ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.04 + Math.random() * 0.04, this.ctx.currentTime + 0.05); // Attack
      // Long beautiful release decay
      const duration = 2.5 + Math.random() * 2;
      gainNode.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);

      // Stereo panning for immersive chimes
      const panner = this.ctx.createStereoPanner();
      panner.pan.setValueAtTime(Math.random() * 1.6 - 0.8, this.ctx.currentTime);

      // Routing
      modulator.connect(modGain);
      modGain.connect(carrier.frequency);
      
      carrier.connect(panner);
      panner.connect(gainNode);
      gainNode.connect(this.masterGain);

      // Start & Stop triggers
      modulator.start();
      carrier.start();
      
      modulator.stop(this.ctx.currentTime + duration);
      carrier.stop(this.ctx.currentTime + duration);

      // Clean up connections when finished
      setTimeout(() => {
        try {
          modulator.disconnect();
          modGain.disconnect();
          carrier.disconnect();
          panner.disconnect();
          gainNode.disconnect();
        } catch {}
      }, (duration + 0.2) * 1000);
    };

    // Run first chime immediately, then schedule random occurrences every 3-7 seconds
    triggerSingleChime();
    
    const scheduleNext = () => {
      const delay = 3000 + Math.random() * 4500;
      this.chimeTimer = window.setTimeout(() => {
        triggerSingleChime();
        scheduleNext();
      }, delay);
    };

    scheduleNext();
  }

  public stopWindchimes() {
    if (this.chimeTimer) {
      clearTimeout(this.chimeTimer);
      this.chimeTimer = null;
    }
  }

  public shutdown() {
    this.stopThetaBeats();
    this.stopOceanWaves();
    this.stopWindchimes();
    if (this.ctx) {
      this.ctx.close();
      this.ctx = null;
    }
  }
}

// Global engine instance to control across component life
export const mindfulnessAudioEngine = new MindfulnessAudioEngine();

// ============================================================================
