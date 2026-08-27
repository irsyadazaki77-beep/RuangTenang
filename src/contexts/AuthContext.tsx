import { apiClient } from "../lib/apiClient";
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

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

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserSession | null>(DEFAULT_GUEST_USER);
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);

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
    try {
      const res = await apiClient.get<any>('/api/v1/auth/me');
      if (res.success && res.data?.user) {
        setUser(res.data.user);
      } else {
        setUser(DEFAULT_GUEST_USER);
      }
    } catch (e) {
      console.warn('Session check fallback to guest:', e);
      setUser(DEFAULT_GUEST_USER);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshSession();
  }, []);

  const logout = async () => {
    try {
      await apiClient.post('/api/v1/auth/logout');
    } catch (err) {
      console.error('Logout failed:', err);
    } finally {
      setUser(DEFAULT_GUEST_USER);
    }
  };

  return (
    <AuthContext.Provider value={{ user, setUser, loading, isOffline, refreshSession, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
