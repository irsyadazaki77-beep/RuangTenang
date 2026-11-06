import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { safeLocalStorage } from '../lib/storage';

export interface VerifyPinResult {
  valid: boolean;
  isLockedOut?: boolean;
  remainingSeconds?: number;
  remainingAttempts?: number;
}

interface PrivacyVaultContextType {
  isVaultConfigured: boolean;
  isVaultUnlocked: boolean;
  isIncognitoMode: boolean;
  isPanicScreenActive: boolean;
  autoLockMinutes: number;
  failedAttempts: number;
  isLockedOut: boolean;
  lockoutSecondsRemaining: number;
  setupPin: (pin: string) => Promise<boolean>;
  verifyPin: (pin: string) => Promise<boolean>;
  verifyPinDetailed: (pin: string) => Promise<VerifyPinResult>;
  changePin: (oldPin: string, newPin: string) => Promise<boolean>;
  removePin: (currentPin: string) => Promise<boolean>;
  lockVault: () => void;
  unlockVault: (pin: string) => Promise<boolean>;
  toggleIncognito: () => void;
  setIncognitoMode: (val: boolean) => void;
  triggerPanicScreen: () => void;
  dismissPanicScreen: () => void;
  resetLockout: () => void;
}

const PrivacyVaultContext = createContext<PrivacyVaultContextType | undefined>(undefined);

const VAULT_PIN_HASH_KEY = 'rt_privacy_vault_pin_hash';
const VAULT_SALT_KEY = 'rt_privacy_vault_salt';
const VAULT_AUTOLOCK_KEY = 'rt_privacy_vault_autolock_min';
const VAULT_FAILED_ATTEMPTS_KEY = 'rt_privacy_vault_failed_attempts';
const VAULT_LOCK_UNTIL_KEY = 'rt_privacy_vault_lock_until';

// PBKDF2 with 100,000 rounds using Web Crypto API (OWASP A02 Cryptographic Standard)
async function hashPinPBKDF2(pin: string, saltHex: string): Promise<string> {
  const encoder = new TextEncoder();
  const pinData = encoder.encode(pin);

  // Convert salt hex to Uint8Array
  let saltBytes: Uint8Array;
  if (/^[0-9a-fA-F]+$/.test(saltHex) && saltHex.length % 2 === 0) {
    const matches = saltHex.match(/.{1,2}/g) || [];
    saltBytes = new Uint8Array(matches.map(byte => parseInt(byte, 16)));
  } else {
    saltBytes = encoder.encode(saltHex);
  }

  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    pinData,
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );

  const derivedBits = await window.crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltBytes,
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    256
  );

  const hashArray = Array.from(new Uint8Array(derivedBits));
  return 'pbkdf2$' + hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Legacy SHA-256 hash for seamless backward compatibility
async function hashPinLegacy(pin: string, salt: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin + ':' + salt + ':RuangTenangVault2026');
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function generateSalt(): string {
  const array = new Uint8Array(16);
  window.crypto.getRandomValues(array);
  return Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
}

export const PrivacyVaultProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isVaultConfigured, setIsVaultConfigured] = useState<boolean>(() => {
    return Boolean(safeLocalStorage.getItem(VAULT_PIN_HASH_KEY));
  });

  const [isVaultUnlocked, setIsVaultUnlocked] = useState<boolean>(false);
  const [isIncognitoMode, setIsIncognitoMode] = useState<boolean>(false);
  const [isPanicScreenActive, setIsPanicScreenActive] = useState<boolean>(false);

  // Progressive Brute-Force Defense State
  const [failedAttempts, setFailedAttempts] = useState<number>(() => {
    const saved = safeLocalStorage.getItem(VAULT_FAILED_ATTEMPTS_KEY);
    return saved ? parseInt(saved, 10) : 0;
  });

  const [lockoutSecondsRemaining, setLockoutSecondsRemaining] = useState<number>(0);

  const [autoLockMinutes] = useState<number>(() => {
    const saved = safeLocalStorage.getItem(VAULT_AUTOLOCK_KEY);
    return saved ? parseInt(saved, 10) : 5; // Default 5 minutes
  });

  const lastActivityRef = useRef<number>(Date.now());

  // Check if vault is configured on mount
  useEffect(() => {
    const storedHash = safeLocalStorage.getItem(VAULT_PIN_HASH_KEY);
    setIsVaultConfigured(Boolean(storedHash));
  }, []);

  // Monitor lockout countdown
  useEffect(() => {
    const checkLockout = () => {
      const lockUntil = safeLocalStorage.getItem(VAULT_LOCK_UNTIL_KEY);
      if (lockUntil) {
        const lockUntilTs = parseInt(lockUntil, 10);
        const diffSeconds = Math.max(0, Math.ceil((lockUntilTs - Date.now()) / 1000));
        setLockoutSecondsRemaining(diffSeconds);
        if (diffSeconds === 0) {
          safeLocalStorage.removeItem(VAULT_LOCK_UNTIL_KEY);
        }
      } else {
        setLockoutSecondsRemaining(0);
      }
    };

    checkLockout();
    const interval = setInterval(checkLockout, 1000);
    return () => clearInterval(interval);
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

    // Check every 15 seconds
    const interval = setInterval(() => {
      const now = Date.now();
      const elapsedMinutes = (now - lastActivityRef.current) / (1000 * 60);
      if (elapsedMinutes >= autoLockMinutes) {
        setIsVaultUnlocked(false);
      }
    }, 15000);

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

  const resetLockout = useCallback(() => {
    safeLocalStorage.removeItem(VAULT_FAILED_ATTEMPTS_KEY);
    safeLocalStorage.removeItem(VAULT_LOCK_UNTIL_KEY);
    setFailedAttempts(0);
    setLockoutSecondsRemaining(0);
  }, []);

  const setupPin = async (pin: string): Promise<boolean> => {
    try {
      const salt = generateSalt();
      const hash = await hashPinPBKDF2(pin, salt);
      safeLocalStorage.setItem(VAULT_SALT_KEY, salt);
      safeLocalStorage.setItem(VAULT_PIN_HASH_KEY, hash);
      resetLockout();
      setIsVaultConfigured(true);
      setIsVaultUnlocked(true);
      lastActivityRef.current = Date.now();
      return true;
    } catch {
      return false;
    }
  };

  const verifyPinDetailed = async (pin: string): Promise<VerifyPinResult> => {
    const lockUntil = safeLocalStorage.getItem(VAULT_LOCK_UNTIL_KEY);
    if (lockUntil) {
      const lockUntilTs = parseInt(lockUntil, 10);
      const diffSeconds = Math.max(0, Math.ceil((lockUntilTs - Date.now()) / 1000));
      if (diffSeconds > 0) {
        return { valid: false, isLockedOut: true, remainingSeconds: diffSeconds };
      }
      safeLocalStorage.removeItem(VAULT_LOCK_UNTIL_KEY);
    }

    const salt = safeLocalStorage.getItem(VAULT_SALT_KEY);
    const storedHash = safeLocalStorage.getItem(VAULT_PIN_HASH_KEY);
    if (!salt || !storedHash) return { valid: false };

    let isMatch: boolean;

    if (storedHash.startsWith('pbkdf2$')) {
      const computed = await hashPinPBKDF2(pin, salt);
      isMatch = computed === storedHash;
    } else {
      // Legacy SHA-256 fallback
      const legacyComputed = await hashPinLegacy(pin, salt);
      isMatch = legacyComputed === storedHash;
      if (isMatch) {
        // Transparent upgrade to PBKDF2
        const upgraded = await hashPinPBKDF2(pin, salt);
        safeLocalStorage.setItem(VAULT_PIN_HASH_KEY, upgraded);
      }
    }

    if (isMatch) {
      resetLockout();
      return { valid: true };
    }

    // Failed attempt handling: progressive lockout
    const newCount = failedAttempts + 1;
    setFailedAttempts(newCount);
    safeLocalStorage.setItem(VAULT_FAILED_ATTEMPTS_KEY, String(newCount));

    let lockSeconds = 0;
    if (newCount >= 7) {
      lockSeconds = 900; // 15 minutes
    } else if (newCount >= 5) {
      lockSeconds = 120; // 2 minutes
    } else if (newCount >= 3) {
      lockSeconds = 30; // 30 seconds
    }

    if (lockSeconds > 0) {
      const lockUntilTime = Date.now() + (lockSeconds * 1000);
      safeLocalStorage.setItem(VAULT_LOCK_UNTIL_KEY, String(lockUntilTime));
      setLockoutSecondsRemaining(lockSeconds);
      return { valid: false, isLockedOut: true, remainingSeconds: lockSeconds };
    }

    return { valid: false, isLockedOut: false, remainingAttempts: Math.max(0, 3 - newCount) };
  };

  const verifyPin = async (pin: string): Promise<boolean> => {
    const result = await verifyPinDetailed(pin);
    return result.valid;
  };

  const unlockVault = async (pin: string): Promise<boolean> => {
    const result = await verifyPinDetailed(pin);
    if (result.valid) {
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
    resetLockout();
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

  const isLockedOut = lockoutSecondsRemaining > 0;

  return (
    <PrivacyVaultContext.Provider
      value={{
        isVaultConfigured,
        isVaultUnlocked,
        isIncognitoMode,
        isPanicScreenActive,
        autoLockMinutes,
        failedAttempts,
        isLockedOut,
        lockoutSecondsRemaining,
        setupPin,
        verifyPin,
        verifyPinDetailed,
        changePin,
        removePin,
        lockVault,
        unlockVault,
        toggleIncognito,
        setIncognitoMode: setIsIncognitoMode,
        triggerPanicScreen,
        dismissPanicScreen,
        resetLockout
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
  failedAttempts: 0,
  isLockedOut: false,
  lockoutSecondsRemaining: 0,
  setupPin: async () => false,
  verifyPin: async () => false,
  verifyPinDetailed: async () => ({ valid: false }),
  changePin: async () => false,
  removePin: async () => false,
  lockVault: () => {},
  unlockVault: async () => false,
  toggleIncognito: () => {},
  setIncognitoMode: () => {},
  triggerPanicScreen: () => {},
  dismissPanicScreen: () => {},
  resetLockout: () => {}
};

export const usePrivacyVault = (): PrivacyVaultContextType => {
  const context = useContext(PrivacyVaultContext);
  if (!context) {
    return defaultPrivacyVault;
  }
  return context;
};
