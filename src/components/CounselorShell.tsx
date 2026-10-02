import React, { Suspense } from 'react';
import { UserSession } from '../types';
import { lazyWithRetry } from '../lib/lazyWithRetry';
import { GlobalOverlays } from './GlobalOverlays';
import { NavLink, Route, Routes, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Stethoscope, Settings, LogOut } from 'lucide-react';
import { counselorRoutes } from '../app/routes/counselorRoutes';
import { LoadingState } from './ui/primitives/Surfaces';
import { FeatureErrorBoundary } from './error/FeatureErrorBoundary';

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
    <div className="flex flex-col min-h-[100dvh] w-full surface-page text-primary font-sans relative overflow-hidden">
      {/* Top Counselor Navigation Bar */}
      <header className="h-14 border-b border-default surface-card px-4 sm:px-6 flex items-center justify-between shrink-0 z-30 shadow-3xs">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
            RT
          </div>
          <div>
            <span className="text-sm font-bold text-primary block leading-none">RuangTenang Konselor</span>
            <span className="text-[10px] text-teal-600 dark:text-teal-400 font-semibold uppercase tracking-wider">
              {user.name} ({user.role})
            </span>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-default">
          <NavLink to="/counselor/dashboard" className={({ isActive }) => `flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${isActive ? 'bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-300 shadow-3xs' : 'text-secondary hover:text-primary'}`}>
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span>Dashboard & Antrean</span>
          </NavLink>
          <NavLink to="/counselor/portal" className={({ isActive }) => `flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${isActive ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-3xs' : 'text-secondary hover:text-primary'}`}>
            <Stethoscope className="w-3.5 h-3.5" />
            <span>Portal SOAP & Triase</span>
          </NavLink>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 rounded-xl border border-default hover:bg-slate-100 dark:hover:bg-slate-800 text-secondary hover:text-primary transition-colors cursor-pointer"
            title="Pengaturan & Profil"
            aria-label="Pengaturan"
          >
            <Settings className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="p-2 rounded-xl border border-rose-200 dark:border-rose-900/50 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-600 dark:text-rose-400 transition-colors cursor-pointer"
            title="Keluar Akun"
            aria-label="Keluar"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        <Suspense fallback={
          <div className="h-64 flex items-center justify-center surface-page" role="status">
            <LoadingState message="Memuat layanan konselor" className="p-4" />
          </div>
        }>
          <Routes>
            {counselorRoutes.map(route => (
              <Route key={route.path} path={route.path} element={<FeatureErrorBoundary featureName="Ruang konselor">{route.element}</FeatureErrorBoundary>} />
            ))}
          </Routes>
        </Suspense>
      </div>
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

      {/* Global Overlays */}

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
