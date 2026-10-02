import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mindfulnessAudioEngine } from '../../features/mood/services/mindfulnessAudioEngine';
import { useMindfulnessAudio } from '../../features/mood/hooks/useMindfulnessAudio';

describe('useMindfulnessAudio', () => {
  afterEach(() => vi.restoreAllMocks());

  it('starts and stops a soundscape through the audio service', () => {
    const init = vi.spyOn(mindfulnessAudioEngine, 'init').mockImplementation(() => undefined);
    const start = vi.spyOn(mindfulnessAudioEngine, 'startThetaBeats').mockImplementation(() => undefined);
    const stop = vi.spyOn(mindfulnessAudioEngine, 'stopThetaBeats').mockImplementation(() => undefined);
    const { result, unmount } = renderHook(() => useMindfulnessAudio());

    act(() => result.current.toggleTheta());
    expect(result.current.isPlayingTheta).toBe(true);
    expect(init).toHaveBeenCalledOnce();
    expect(start).toHaveBeenCalledOnce();

    act(() => result.current.toggleTheta());
    expect(result.current.isPlayingTheta).toBe(false);
    expect(stop).toHaveBeenCalledOnce();
    unmount();
  });

  it('updates master volume within the supported range', () => {
    const setMasterVolume = vi.spyOn(mindfulnessAudioEngine, 'setMasterVolume').mockImplementation(() => undefined);
    const { result } = renderHook(() => useMindfulnessAudio());

    act(() => result.current.handleVolumeChange(125));
    expect(result.current.volume).toBe(100);
    expect(setMasterVolume).toHaveBeenCalledWith(1);
  });
});
