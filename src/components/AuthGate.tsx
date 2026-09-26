import React, { Suspense } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { lazyWithRetry } from '../lib/lazyWithRetry';

const AuthModal = lazyWithRetry(() => import('../features/authentication/AuthModal').then(module => ({ default: module.AuthModal })));

interface AuthGateProps {
  children: React.ReactNode;
}

export const AuthGate: React.FC<AuthGateProps> = ({ children }) => {
  const { user, setUser, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex flex-col h-[100dvh] items-center justify-center surface-page gap-3 animate-fade-in select-none">
        <div className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-800 border border-teal-200/80 dark:border-teal-800/80 shadow-md flex items-center justify-center p-2 animate-pulse">
          <img src="/favicon.svg" alt="RuangTenang" className="w-full h-full object-contain pointer-events-none" />
        </div>
        <span className="text-xs font-semibold text-teal-600 dark:text-teal-400 tracking-tight">Memuat RuangTenang...</span>
      </div>
    );
  }

  if (!user) {
    return (
      <Suspense fallback={
        <div className="flex flex-col h-[100dvh] items-center justify-center surface-page gap-3 animate-fade-in select-none">
          <div className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-800 border border-teal-200/80 dark:border-teal-800/80 shadow-md flex items-center justify-center p-2 animate-pulse">
            <img src="/favicon.svg" alt="RuangTenang" className="w-full h-full object-contain pointer-events-none" />
          </div>
          <span className="text-xs font-semibold text-teal-600 dark:text-teal-400 tracking-tight">Memuat RuangTenang...</span>
        </div>
      }>
        <AuthModal isOpen={true} onClose={() => {}} currentSession={null as any} onLogin={(u) => setUser(u)} onLogout={() => {}} />
      </Suspense>
    );
  }

  return <>{children}</>;
};
