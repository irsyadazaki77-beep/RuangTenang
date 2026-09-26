import React, { Suspense } from 'react';
import { UserSession } from '../types';
import { lazyWithRetry } from '../lib/lazyWithRetry';
import { GlobalOverlays } from './GlobalOverlays';
import { useNavigate } from 'react-router-dom';

const CounselorDashboard = lazyWithRetry(() => import('../features/counselors/CounselorDashboard').then(module => ({ default: module.CounselorDashboard })));
const SettingsPage = lazyWithRetry(() => import('../features/settings/SettingsPage').then(module => ({ default: module.SettingsPage })));

interface CounselorShellProps {
  user: UserSession;
  setUser: (user: UserSession | null) => void;
  isSettingsOpen: boolean;
  setIsSettingsOpen: (open: boolean) => void;
  isAuthModalOpen: boolean;
  setIsAuthModalOpen: (open: boolean) => void;
  isLegalDocsOpen: boolean;
  setIsLegalDocsOpen: (open: boolean) => void;
  isChangelogOpen: boolean;
  setIsChangelogOpen: (open: boolean) => void;
  isNotificationOpen: boolean;
  setIsNotificationOpen: (open: boolean) => void;
  showOnboarding: boolean;
  setShowOnboarding: (show: boolean) => void;
  handleLogout: () => void;
}

export const CounselorShell: React.FC<CounselorShellProps> = ({
  user,
  setUser,
  isSettingsOpen,
  setIsSettingsOpen,
  isAuthModalOpen,
  setIsAuthModalOpen,
  isLegalDocsOpen,
  setIsLegalDocsOpen,
  isChangelogOpen,
  setIsChangelogOpen,
  isNotificationOpen,
  setIsNotificationOpen,
  showOnboarding,
  setShowOnboarding,
  handleLogout
}) => {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-[100dvh] w-full surface-page text-primary font-sans relative overflow-hidden">
      {isSettingsOpen && (
        <div className="fixed inset-0 bg-slate-50 dark:bg-slate-900 z-50 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-default flex items-center surface-card shadow-sm">
            <button 
              onClick={() => setIsSettingsOpen(false)} 
              className="mr-4 text-secondary hover:text-slate-800 dark:hover:text-slate-200" 
              aria-label="Kembali"
            >
              &larr; Kembali
            </button>
            <h2 className="font-bold text-primary">Pengaturan & Profil</h2>
          </div>
          <div className="flex-1 overflow-y-auto">
            <Suspense fallback={<div className="p-4 text-center text-secondary">Memuat pengaturan...</div>}>
              <SettingsPage 
                userSession={user} 
                setUserSession={(u) => setUser(u)} 
                onOpenAuth={() => setIsAuthModalOpen(true)} 
                onOpenChangelog={() => setIsChangelogOpen(true)}
                onOpenScreening={() => {
                  setIsSettingsOpen(false);
                  navigate('/screening');
                }} 
                onOpenLegal={() => {
                  setIsSettingsOpen(false);
                  setIsLegalDocsOpen(true);
                }} 
              />
            </Suspense>
          </div>
        </div>
      )}
      <Suspense fallback={
        <div className="flex h-[100dvh] items-center justify-center surface-page">
          <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      }>
        <CounselorDashboard />
      </Suspense>

      <GlobalOverlays
        user={user}
        setUser={setUser}
        isSettingsOpen={isSettingsOpen}
        setIsSettingsOpen={setIsSettingsOpen}
        isAuthModalOpen={isAuthModalOpen}
        setIsAuthModalOpen={setIsAuthModalOpen}
        isLegalDocsOpen={isLegalDocsOpen}
        setIsLegalDocsOpen={setIsLegalDocsOpen}
        isChangelogOpen={isChangelogOpen}
        setIsChangelogOpen={setIsChangelogOpen}
        isNotificationOpen={isNotificationOpen}
        setIsNotificationOpen={setIsNotificationOpen}
        showOnboarding={showOnboarding}
        setShowOnboarding={setShowOnboarding}
        handleLogout={handleLogout}
        isCounselorView={true}
      />
    </div>
  );
};
