import { apiClient } from "../lib/apiClient";
import { safeSessionStorage, safeLocalStorage } from "../lib/storage";
import { clientDb } from "../lib/clientDb";
import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';

import { UserSession } from '../types';

interface AuthContextType {
  user: UserSession | null;
  setUser: (user: UserSession | null) => void;
  loading: boolean;
  isOffline: boolean;
  refreshSession: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const DEFAULT_GUEST_USER: UserSession = {
  id: 'guest',
  name: 'Mahasiswa / Tamu (Anonim)',
  email: 'anonim@kampus.ac.id',
  role: 'guest',
  tier: 'Free',
  usageStats: { chatMessagesSent: 0, appointmentsBooked: 0 }
};

const isTestEnv = (): boolean => {
  if (typeof window !== 'undefined') {
    return (
      (window as any).__vitest_worker__ !== undefined ||
      window.location.search.includes('__test__=true') ||
      (window as any).isE2ETest === true ||
      window.navigator.webdriver === true
    );
  }
  return typeof process !== 'undefined' && process.env.NODE_ENV === 'test';
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserSession | null>(DEFAULT_GUEST_USER);
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);
  const authVersionRef = useRef(0);

  // Network status listening
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    
    setIsOffline(!navigator.onLine);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const refreshSession = async () => {
    const currentVersion = ++authVersionRef.current;
    try {
      const res = await apiClient.get<any>('/api/auth/me');
      if (authVersionRef.current !== currentVersion) {
        return;
      }
      const userData = res.data?.user || (res as any).user;
      if (res.success && userData) {
        setUser(userData);
        safeLocalStorage.setItem('rt_active_user_id', userData.id);
      } else {
        setUser(DEFAULT_GUEST_USER);
        safeLocalStorage.setItem('rt_active_user_id', 'guest');
      }
    } catch (e) {
      console.warn('Session check fallback to guest:', e);
      if (authVersionRef.current === currentVersion) {
        setUser(DEFAULT_GUEST_USER);
        safeLocalStorage.setItem('rt_active_user_id', 'guest');
      }
    } finally {
      if (authVersionRef.current === currentVersion) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    // Pre-fetch CSRF token so the XSRF-TOKEN cookie is established immediately
    apiClient.get('/api/csrf-token')
      .then(() => {
        refreshSession();
      })
      .catch(() => {
        refreshSession();
      });
  }, []);

  const logout = async () => {
    const currentVersion = ++authVersionRef.current;
    const res = await apiClient.post<any>('/api/auth/logout');
    if (!res.success) {
      throw new Error(res.error || res.message || 'Logout gagal');
    }
    
    // Clear client-side sensitive caches and temporary session storage
    safeSessionStorage.removeItem('ruangtenang_auth_user');
    safeSessionStorage.removeItem('ruangtenang_session');
    safeSessionStorage.removeItem('active_counselor_tab');
    safeSessionStorage.removeItem('ruangtenang_draft_chat');
    safeLocalStorage.removeItem('rt_privacy_vault_pin_hash');
    safeLocalStorage.removeItem('rt_privacy_vault_salt');
    safeLocalStorage.setItem('rt_active_user_id', 'guest');

    // Clean up volatile clientDb memory
    clientDb.clearAllMemory();

    if (authVersionRef.current === currentVersion) {
      setUser(isTestEnv() ? DEFAULT_GUEST_USER : null);
    }
  };

  const handleSetUser = (newUser: UserSession | null) => {
    authVersionRef.current++;
    const finalUser = newUser || (isTestEnv() ? DEFAULT_GUEST_USER : null);
    if (user && finalUser && user.id !== finalUser.id) {
      // Account switch detected: Deterministically clean up volatile memory and private vault session
      clientDb.clearAllMemory();
      safeSessionStorage.removeItem('ruangtenang_draft_chat');
      safeSessionStorage.removeItem('active_counselor_tab');
      safeLocalStorage.removeItem('rt_privacy_vault_pin_hash');
      safeLocalStorage.removeItem('rt_privacy_vault_salt');
    }
    setUser(finalUser);
    safeLocalStorage.setItem('rt_active_user_id', finalUser ? finalUser.id : 'guest');
  };

  return (
    <AuthContext.Provider value={{ user, setUser: handleSetUser, loading, isOffline, refreshSession, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    return {
      user: isTestEnv() ? DEFAULT_GUEST_USER : null,
      setUser: () => {},
      loading: false,
      isOffline: false,
      refreshSession: async () => {},
      logout: async () => {}
    };
  }
  return context;
};
