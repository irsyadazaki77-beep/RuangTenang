import { useState, useCallback, useEffect } from 'react';

export function usePrivacyShield() {
  const [isPrivacyMode, setIsPrivacyMode] = useState(false);

  const handleTogglePrivacy = useCallback(() => {
    setIsPrivacyMode(prev => {
      const next = !prev;
      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        try {
          navigator.vibrate(next ? [30, 40] : 25);
        } catch {
          // Graceful fallback
        }
      }
      return next;
    });
  }, []);

  // Quick unlock with Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isPrivacyMode) {
        setIsPrivacyMode(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPrivacyMode]);

  return {
    isPrivacyMode,
    setIsPrivacyMode,
    handleTogglePrivacy
  };
}
