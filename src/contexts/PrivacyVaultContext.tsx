import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { safeLocalStorage } from '../lib/storage';

interface PrivacyVaultContextType {
  isVaultConfigured: boolean;
  isVaultUnlocked: boolean;
  isIncognitoMode: boolean;
  isPanicScreenActive: boolean;
  autoLockMinutes: number;
  setupPin: (pin: string) => Promise<boolean>;
  verifyPin: (pin: string) => Promise<boolean>;
  changePin: (oldPin: string, newPin: string) => Promise<boolean>;
  removePin: (currentPin: string) => Promise<boolean>;
  lockVault: () => void;
  unlockVault: (pin: string) => Promise<boolean>;
  toggleIncognito: () => void;
  setIncognitoMode: (val: boolean) => void;
  triggerPanicScreen: () => void;
  dismissPanicScreen: () => void;
}

const PrivacyVaultContext = createContext<PrivacyVaultContextType | undefined>(undefined);

const VAULT_PIN_HASH_KEY = 'rt_privacy_vault_pin_hash';
const VAULT_SALT_KEY = 'rt_privacy_vault_salt';
const VAULT_AUTOLOCK_KEY = 'rt_privacy_vault_autolock_min';

// Cryptographic hash using SHA-256 Web Crypto API
async function hashPinWithSalt(pin: string, salt: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin + ':' + salt + ':RuangTenangVault2026');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function generateSalt(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
}

export const PrivacyVaultProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isVaultConfigured, setIsVaultConfigured] = useState<boolean>(() => {
    return Boolean(safeLocalStorage.getItem(VAULT_PIN_HASH_KEY));
  });

  const [isVaultUnlocked, setIsVaultUnlocked] = useState<boolean>(false);
  const [isIncognitoMode, setIsIncognitoMode] = useState<boolean>(false);
  const [isPanicScreenActive, setIsPanicScreenActive] = useState<boolean>(false);
  const [autoLockMinutes, setAutoLockMinutes] = useState<number>(() => {
    const saved = safeLocalStorage.getItem(VAULT_AUTOLOCK_KEY);
    return saved ? parseInt(saved, 10) : 5; // Default 5 minutes
  });

  const lastActivityRef = useRef<number>(Date.now());
  const autoLockTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Check if vault is configured on mount
  useEffect(() => {
    const storedHash = safeLocalStorage.getItem(VAULT_PIN_HASH_KEY);
    setIsVaultConfigured(Boolean(storedHash));
  }, []);

  // 5-Minute Inactivity Auto-Lock Monitor
  useEffect(() => {
    if (!isVaultUnlocked || !isVaultConfigured) return;

    const handleUserActivity = () => {
      lastActivityRef.current = Date.now();
    };

    window.addEventListener('mousemove', handleUserActivity, { passive: true });
    window.addEventListener('keydown', handleUserActivity, { passive: true });
    window.addEventListener('touchstart', handleUserActivity, { passive: true });
    window.addEventListener('scroll', handleUserActivity, { passive: true });

    // Check every 30 seconds
    const interval = setInterval(() => {
      const now = Date.now();
      const elapsedMinutes = (now - lastActivityRef.current) / (1000 * 60);
      if (elapsedMinutes >= autoLockMinutes) {
        setIsVaultUnlocked(false);
      }
    }, 30000);

    return () => {
      window.removeEventListener('mousemove', handleUserActivity);
      window.removeEventListener('keydown', handleUserActivity);
      window.removeEventListener('touchstart', handleUserActivity);
      window.removeEventListener('scroll', handleUserActivity);
      clearInterval(interval);
    };
  }, [isVaultUnlocked, isVaultConfigured, autoLockMinutes]);

  // Global Keyboard Shortcuts (Alt+X or Ctrl+Shift+L for Panic Button, double Escape)
  useEffect(() => {
    let lastEscapePress = 0;

    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. Alt + X or Ctrl + Shift + L -> Instant Panic / Conceal Screen
      if ((e.altKey && e.key.toLowerCase() === 'x') || (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'l')) {
        e.preventDefault();
        setIsPanicScreenActive(prev => !prev);
      }

      // 2. Double Escape within 400ms -> Instant Panic Screen
      if (e.key === 'Escape') {
        const now = Date.now();
        if (now - lastEscapePress < 400) {
          setIsPanicScreenActive(true);
        }
        lastEscapePress = now;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const setupPin = async (pin: string): Promise<boolean> => {
    try {
      const salt = generateSalt();
      const hash = await hashPinWithSalt(pin, salt);
      safeLocalStorage.setItem(VAULT_SALT_KEY, salt);
      safeLocalStorage.setItem(VAULT_PIN_HASH_KEY, hash);
      setIsVaultConfigured(true);
      setIsVaultUnlocked(true);
      lastActivityRef.current = Date.now();
      return true;
    } catch {
      return false;
    }
  };

  const verifyPin = async (pin: string): Promise<boolean> => {
    const salt = safeLocalStorage.getItem(VAULT_SALT_KEY);
    const storedHash = safeLocalStorage.getItem(VAULT_PIN_HASH_KEY);
    if (!salt || !storedHash) return false;

    const computedHash = await hashPinWithSalt(pin, salt);
    return computedHash === storedHash;
  };

  const unlockVault = async (pin: string): Promise<boolean> => {
    const valid = await verifyPin(pin);
    if (valid) {
      setIsVaultUnlocked(true);
      lastActivityRef.current = Date.now();
      return true;
    }
    return false;
  };

  const lockVault = () => {
    setIsVaultUnlocked(false);
  };

  const changePin = async (oldPin: string, newPin: string): Promise<boolean> => {
    const valid = await verifyPin(oldPin);
    if (!valid) return false;
    return setupPin(newPin);
  };

  const removePin = async (currentPin: string): Promise<boolean> => {
    const valid = await verifyPin(currentPin);
    if (!valid) return false;
    safeLocalStorage.removeItem(VAULT_SALT_KEY);
    safeLocalStorage.removeItem(VAULT_PIN_HASH_KEY);
    setIsVaultConfigured(false);
    setIsVaultUnlocked(false);
    return true;
  };

  const toggleIncognito = () => {
    setIsIncognitoMode(prev => !prev);
  };

  const triggerPanicScreen = () => {
    setIsPanicScreenActive(true);
  };

  const dismissPanicScreen = () => {
    setIsPanicScreenActive(false);
  };

  return (
    <PrivacyVaultContext.Provider
      value={{
        isVaultConfigured,
        isVaultUnlocked,
        isIncognitoMode,
        isPanicScreenActive,
        autoLockMinutes,
        setupPin,
        verifyPin,
        changePin,
        removePin,
        lockVault,
        unlockVault,
        toggleIncognito,
        setIncognitoMode: setIsIncognitoMode,
        triggerPanicScreen,
        dismissPanicScreen
      }}
    >
      {children}
    </PrivacyVaultContext.Provider>
  );
};

const defaultPrivacyVault: PrivacyVaultContextType = {
  isVaultConfigured: false,
  isVaultUnlocked: false,
  isIncognitoMode: false,
  isPanicScreenActive: false,
  autoLockMinutes: 5,
  setupPin: async () => false,
  verifyPin: async () => false,
  changePin: async () => false,
  removePin: async () => false,
  lockVault: () => {},
  unlockVault: async () => false,
  toggleIncognito: () => {},
  setIncognitoMode: () => {},
  triggerPanicScreen: () => {},
  dismissPanicScreen: () => {}
};

export const usePrivacyVault = (): PrivacyVaultContextType => {
  const context = useContext(PrivacyVaultContext);
  if (!context) {
    return defaultPrivacyVault;
  }
  return context;
};
