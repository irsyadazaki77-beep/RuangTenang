import { useCallback, useEffect, useState } from 'react';
import { mindfulnessAudioEngine } from '../services/mindfulnessAudioEngine';

export function useMindfulnessAudio() {
  const [isPlayingTheta, setIsPlayingTheta] = useState(false);
  const [isPlayingWaves, setIsPlayingWaves] = useState(false);
  const [isPlayingChimes, setIsPlayingChimes] = useState(false);
  const [volume, setVolume] = useState(50);

  useEffect(() => () => mindfulnessAudioEngine.shutdown(), []);

  const toggleTheta = useCallback(() => {
    mindfulnessAudioEngine.init();
    if (isPlayingTheta) mindfulnessAudioEngine.stopThetaBeats();
    else mindfulnessAudioEngine.startThetaBeats();
    setIsPlayingTheta(current => !current);
  }, [isPlayingTheta]);

  const toggleWaves = useCallback(() => {
    mindfulnessAudioEngine.init();
    if (isPlayingWaves) mindfulnessAudioEngine.stopOceanWaves();
    else mindfulnessAudioEngine.startOceanWaves();
    setIsPlayingWaves(current => !current);
  }, [isPlayingWaves]);

  const toggleChimes = useCallback(() => {
    mindfulnessAudioEngine.init();
    if (isPlayingChimes) mindfulnessAudioEngine.stopWindchimes();
    else mindfulnessAudioEngine.startWindchimes();
    setIsPlayingChimes(current => !current);
  }, [isPlayingChimes]);

  const handleVolumeChange = useCallback((value: number) => {
    const nextVolume = Math.max(0, Math.min(100, value));
    setVolume(nextVolume);
    mindfulnessAudioEngine.setMasterVolume(nextVolume / 100);
  }, []);

  return { isPlayingTheta, isPlayingWaves, isPlayingChimes, volume, toggleTheta, toggleWaves, toggleChimes, handleVolumeChange };
}
