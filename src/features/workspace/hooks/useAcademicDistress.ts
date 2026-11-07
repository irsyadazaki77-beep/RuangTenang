import { useState, useEffect, useCallback } from 'react';
import { detectAcademicDistress, DistressDetectionResult } from '../utils/distressDetector';

export function useAcademicDistress(inputText: string) {
  const [distressResult, setDistressResult] = useState<DistressDetectionResult>({
    isDistressed: false,
    triggerKeywords: [],
    suggestedAction: ''
  });
  const [isDistressDismissed, setIsDistressDismissed] = useState<boolean>(false);
  const [isBreathingModalOpen, setIsBreathingModalOpen] = useState<boolean>(false);

  useEffect(() => {
    if (!inputText.trim()) {
      setIsDistressDismissed(false);
      return;
    }

    if (isDistressDismissed) return;

    const detected = detectAcademicDistress(inputText);
    if (detected.isDistressed) {
      setDistressResult(detected);
    } else {
      const now = new Date();
      const currentHour = now.getHours();
      const isLateNight = currentHour >= 23 || currentHour < 5;
      if (isLateNight && inputText.trim().length > 100) {
        setDistressResult({
          isDistressed: true,
          distressType: 'exhaustion',
          triggerKeywords: ['larut malam'],
          suggestedAction: 'Istirahat sejenak 1 menit untuk menjaga ketajaman berpikirmu.'
        });
      }
    }
  }, [inputText, isDistressDismissed]);

  const dismissDistress = useCallback(() => {
    setIsDistressDismissed(true);
  }, []);

  const openBreathingModal = useCallback(() => {
    setIsBreathingModalOpen(true);
  }, []);

  const closeBreathingModal = useCallback(() => {
    setIsBreathingModalOpen(false);
  }, []);

  return {
    distressResult,
    isDistressDismissed,
    isBreathingModalOpen,
    dismissDistress,
    openBreathingModal,
    closeBreathingModal
  };
}
