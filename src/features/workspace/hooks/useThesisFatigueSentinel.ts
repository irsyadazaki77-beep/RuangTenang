import { useState, useEffect, useRef, useCallback } from 'react';
import { safeLocalStorage } from '../../../lib/storage';

export interface FatigueSentinelState {
  continuousMinutes: number;
  isLateNight: boolean;
  shouldPrompt: boolean;
  promptType: 'fatigue' | 'latenight' | 'writer_block';
  snoozedUntil: number;
}

const STORAGE_KEY = 'ruangkerja_fatigue_snooze_until';

export function useThesisFatigueSentinel(isEditingActive = true) {
  const [continuousMinutes, setContinuousMinutes] = useState(0);
  const [isLateNight, setIsLateNight] = useState(false);
  const [shouldPrompt, setShouldPrompt] = useState(false);
  const [promptType, setPromptType] = useState<'fatigue' | 'latenight' | 'writer_block'>('fatigue');

  const lastActiveTimestampRef = useRef(Date.now());
  const activeMinutesRef = useRef(0);

  // Check late-night hours (23:00 - 05:00)
  const checkLateNight = useCallback(() => {
    const hour = new Date().getHours();
    return hour >= 23 || hour < 5;
  }, []);

  // Check snooze status
  const isSnoozed = useCallback(() => {
    const raw = safeLocalStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const until = Number(raw);
    return Date.now() < until;
  }, []);

  const snooze = useCallback((minutes = 30) => {
    safeLocalStorage.setItem(STORAGE_KEY, String(Date.now() + minutes * 60 * 1000));
    setShouldPrompt(false);
  }, []);

  const dismiss = useCallback(() => {
    snooze(45);
  }, [snooze]);

  useEffect(() => {
    if (!isEditingActive) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const elapsedMinutes = (now - lastActiveTimestampRef.current) / (60 * 1000);

      // If user was idle for > 10 minutes, reset continuous session
      if (elapsedMinutes > 10) {
        activeMinutesRef.current = 0;
      } else {
        activeMinutesRef.current += 1;
      }
      lastActiveTimestampRef.current = now;

      const currentActive = activeMinutesRef.current;
      setContinuousMinutes(currentActive);

      const late = checkLateNight();
      setIsLateNight(late);

      if (!isSnoozed()) {
        if (late && currentActive >= 25) {
          setPromptType('latenight');
          setShouldPrompt(true);
        } else if (currentActive >= 45) {
          setPromptType('fatigue');
          setShouldPrompt(true);
        }
      }
    }, 60 * 1000); // Check every minute

    return () => clearInterval(interval);
  }, [isEditingActive, checkLateNight, isSnoozed]);

  return {
    continuousMinutes,
    isLateNight,
    shouldPrompt,
    promptType,
    snooze,
    dismiss
  };
}
