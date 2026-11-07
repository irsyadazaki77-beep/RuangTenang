import { describe, expect, it, vi, beforeEach } from 'vitest';
import { biophilicAudioEngine } from '../../features/workspace/services/biophilicAudioEngine';

describe('Biophilic Audio Engine', () => {
  beforeEach(() => {
    biophilicAudioEngine.stop();
  });

  it('initializes in stopped state with default volume', () => {
    const state = biophilicAudioEngine.getState();
    expect(state.isPlaying).toBe(false);
    expect(state.volume).toBe(0.5);
    expect(state.mode).toBe('alpha_focus');
  });

  it('updates volume clamped between 0 and 1', () => {
    biophilicAudioEngine.setVolume(1.5);
    expect(biophilicAudioEngine.getState().volume).toBe(1);

    biophilicAudioEngine.setVolume(-0.5);
    expect(biophilicAudioEngine.getState().volume).toBe(0);

    biophilicAudioEngine.setVolume(0.75);
    expect(biophilicAudioEngine.getState().volume).toBe(0.75);
  });
});
