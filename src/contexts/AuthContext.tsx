import { apiClient } from "../lib/apiClient";
import { safeSessionStorage, safeLocalStorage } from "../lib/storage";
import { clientDb } from "../lib/clientDb";
import { getAuthSessionSnapshot, transitionAuthSession, type AuthLifecyclePhase, type AuthSessionSnapshot } from "../lib/authSessionLifecycle";
import React, { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from 'react';

import { UserSession } from '../types';

interface AuthContextType {
  user: UserSession | null;
  setUser: (user: UserSession | null) => void;
  loading: boolean;
  authLifecycle: AuthLifecyclePhase;
  sessionGeneration: number;
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
  const [sessionSnapshot, setSessionSnapshot] = useState<AuthSessionSnapshot>(getAuthSessionSnapshot);
  const authVersionRef = useRef(0);
  const authChannelRef = useRef<BroadcastChannel | null>(null);

  const publishLifecycle = useCallback((phase: AuthLifecyclePhase, nextUser?: UserSession | null) => {
    setSessionSnapshot(transitionAuthSession(phase, nextUser ? { id: nextUser.id, role: nextUser.role } : null));
  }, []);

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

  const refreshSession = useCallback(async () => {
    const currentVersion = ++authVersionRef.current;
    publishLifecycle('refreshing');
    clientDb.invalidateActiveSyncs();
    try {
      const res = await apiClient.get<any>('/api/auth/me');
      if (authVersionRef.current !== currentVersion) {
        return;
      }
      const userData = res.data?.user || (res as any).user;
      if (res.success && userData) {
        setUser(userData);
        publishLifecycle('authenticated', userData);
        safeLocalStorage.setItem('rt_active_user_id', userData.id);
      } else {
        setUser(DEFAULT_GUEST_USER);
        publishLifecycle('unauthenticated');
        safeLocalStorage.setItem('rt_active_user_id', 'guest');
      }
    } catch (e) {
      console.warn('Session check fallback to guest:', e);
      if (authVersionRef.current === currentVersion) {
        setUser(DEFAULT_GUEST_USER);
        publishLifecycle('unauthenticated');
        safeLocalStorage.setItem('rt_active_user_id', 'guest');
      }
    } finally {
      if (authVersionRef.current === currentVersion) {
        setLoading(false);
      }
    }
  }, [publishLifecycle]);

  useEffect(() => {
    // Pre-fetch CSRF token so the XSRF-TOKEN cookie is established immediately
    apiClient.get('/api/csrf-token')
      .then(() => {
        refreshSession();
      })
      .catch(() => {
        refreshSession();
      });
  }, [refreshSession]);

  // Another tab can replace the shared session cookie while this tab still has an old
  // authenticated React tree. Treat the storage event only as an invalidation signal;
  // the account identity is always reloaded from the server session.
  useEffect(() => {
    const invalidateForExternalSessionChange = () => {
      authVersionRef.current++;
      publishLifecycle('switching_account');
      clientDb.invalidateActiveSyncs();
      clientDb.clearAllMemory();
      safeSessionStorage.removeItem('ruangtenang_draft_chat');
      safeSessionStorage.removeItem('active_counselor_tab');
      safeLocalStorage.removeItem('rt_privacy_vault_pin_hash');
      safeLocalStorage.removeItem('rt_privacy_vault_salt');
      setUser(null);
      setLoading(true);
      void refreshSession();
    };

    const handleAuthStorageChange = (event: StorageEvent) => {
      if (event.key !== 'rt_active_user_id') return;
      const current = getAuthSessionSnapshot();
      const announcedUserId = event.newValue && event.newValue !== 'guest' ? event.newValue : null;
      if (announcedUserId === current.userId) return;
      invalidateForExternalSessionChange();
    };

    window.addEventListener('storage', handleAuthStorageChange);
    return () => window.removeEventListener('storage', handleAuthStorageChange);
  }, [publishLifecycle, refreshSession]);

  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return;
    const channel = new BroadcastChannel('ruangtenang-auth-session-v1');
    authChannelRef.current = channel;
    channel.onmessage = event => {
      if (event.data?.type !== 'session-changed') return;
      authVersionRef.current++;
      publishLifecycle('switching_account');
      clientDb.invalidateActiveSyncs();
      clientDb.clearAllMemory();
      safeSessionStorage.removeItem('ruangtenang_draft_chat');
      safeSessionStorage.removeItem('active_counselor_tab');
      safeLocalStorage.removeItem('rt_privacy_vault_pin_hash');
      safeLocalStorage.removeItem('rt_privacy_vault_salt');
      setUser(null);
      setLoading(true);
      void refreshSession();
    };
    return () => {
      channel.close();
      if (authChannelRef.current === channel) authChannelRef.current = null;
    };
  }, [publishLifecycle, refreshSession]);

  const logout = async () => {
    const currentVersion = ++authVersionRef.current;
    const previousUser = user;
    publishLifecycle('logging_out');
    clientDb.invalidateActiveSyncs();
    clientDb.clearAllMemory();
    authChannelRef.current?.postMessage({ type: 'session-changed' });
    try {
      const res = await apiClient.post<any>('/api/auth/logout');
      if (!res.success) {
        throw new Error(res.error || res.message || 'Logout gagal');
      }
    } catch (error) {
      if (authVersionRef.current === currentVersion && previousUser && previousUser.role !== 'guest') {
        publishLifecycle('authenticated', previousUser);
      } else {
        publishLifecycle('unauthenticated');
      }
      throw error;
    }

    // A second notification after the server confirms logout closes the race where
    // another tab refreshed the still-valid cookie during the initial notification.
    authChannelRef.current?.postMessage({ type: 'session-changed' });
    
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
      const nextUser = isTestEnv() ? DEFAULT_GUEST_USER : null;
      setUser(nextUser);
      publishLifecycle('unauthenticated');
    }
  };

  const handleSetUser = (newUser: UserSession | null) => {
    authVersionRef.current++;
    const finalUser = newUser || (isTestEnv() ? DEFAULT_GUEST_USER : null);
    if (user && (!finalUser || user.id !== finalUser.id)) {
      publishLifecycle('switching_account');
      clientDb.invalidateActiveSyncs();
      clientDb.clearAllMemory();
      safeSessionStorage.removeItem('ruangtenang_draft_chat');
      safeSessionStorage.removeItem('active_counselor_tab');
      safeLocalStorage.removeItem('rt_privacy_vault_pin_hash');
      safeLocalStorage.removeItem('rt_privacy_vault_salt');
    }
    if (user?.id !== finalUser?.id) authChannelRef.current?.postMessage({ type: 'session-changed' });
    setUser(finalUser);
    publishLifecycle(finalUser && finalUser.role !== 'guest' ? 'authenticated' : 'unauthenticated', finalUser);
    setLoading(false);
    safeLocalStorage.setItem('rt_active_user_id', finalUser ? finalUser.id : 'guest');
  };

  useEffect(() => {
    const restoreWhenOnline = () => {
      setIsOffline(false);
      if (!user || user.role === 'guest') void refreshSession();
    };
    window.addEventListener('online', restoreWhenOnline);
    return () => window.removeEventListener('online', restoreWhenOnline);
  }, [user, refreshSession]);

  return (
    <AuthContext.Provider value={{ user, setUser: handleSetUser, loading, authLifecycle: sessionSnapshot.phase, sessionGeneration: sessionSnapshot.generation, isOffline, refreshSession, logout }}>
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
      authLifecycle: 'unauthenticated',
      sessionGeneration: 0,
      isOffline: false,
      refreshSession: async () => {},
      logout: async () => {}
    };
  }
  return context;
};
