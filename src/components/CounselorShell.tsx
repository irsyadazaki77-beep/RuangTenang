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
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2 focus:bg-teal-700 focus:text-white focus:rounded-lg focus:shadow-md focus:outline-none text-xs font-semibold"
      >
        Lewati ke konten utama
      </a>
      {/* Top Counselor Navigation Bar - Responsive 2-tier on mobile, 1-tier on desktop */}
      <header className="border-b border-default surface-card px-3 sm:px-6 py-2.5 sm:py-0 sm:h-14 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4 shrink-0 z-30 shadow-3xs">
        {/* Row 1 on mobile: Brand + Counselor metadata + Quick action buttons */}
        <div className="flex items-center justify-between gap-2 min-w-0 w-full sm:w-auto">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-teal-700 text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
              RT
            </div>
            <div className="min-w-0">
              <span className="text-xs sm:text-sm font-bold text-primary block leading-none truncate">
                RuangTenang Konselor
              </span>
              <span className="text-[10px] text-teal-700 dark:text-teal-400 font-semibold uppercase tracking-wider truncate block mt-0.5 max-w-[170px] sm:max-w-none">
                {user.name} ({user.role})
              </span>
            </div>
          </div>

          {/* Quick Actions (Mobile view) */}
          <div className="flex items-center gap-1.5 shrink-0 sm:hidden">
            <button
              type="button"
              onClick={() => setIsSettingsOpen(true)}
              className="p-2 min-w-[38px] min-h-[38px] flex items-center justify-center rounded-xl border border-default hover:bg-slate-100 dark:hover:bg-slate-800 text-secondary hover:text-primary transition-colors cursor-pointer"
              title="Pengaturan & Profil"
              aria-label="Pengaturan"
            >
              <Settings className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="p-2 min-w-[38px] min-h-[38px] flex items-center justify-center rounded-xl border border-rose-200 dark:border-rose-900/50 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-600 dark:text-rose-400 transition-colors cursor-pointer"
              title="Keluar Akun"
              aria-label="Keluar"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* View Switcher Tabs (Row 2 on mobile, centered/spread evenly) */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-default w-full sm:w-auto justify-center sm:justify-start">
          <NavLink
            to="/counselor/dashboard"
            className={({ isActive }) =>
              `flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                isActive
                  ? 'bg-white dark:bg-slate-700 text-teal-800 dark:text-teal-300 shadow-3xs'
                  : 'text-secondary hover:text-primary'
              }`
            }
          >
            <LayoutDashboard className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Dashboard & Antrean</span>
          </NavLink>
          <NavLink
            to="/counselor/portal"
            className={({ isActive }) =>
              `flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                isActive
                  ? 'bg-white dark:bg-slate-700 text-indigo-800 dark:text-indigo-300 shadow-3xs'
                  : 'text-secondary hover:text-primary'
              }`
            }
          >
            <Stethoscope className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Portal SOAP & Triase</span>
          </NavLink>
        </div>

        {/* Quick Actions (Desktop view) */}
        <div className="hidden sm:flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 min-w-[38px] min-h-[38px] flex items-center justify-center rounded-xl border border-default hover:bg-slate-100 dark:hover:bg-slate-800 text-secondary hover:text-primary transition-colors cursor-pointer"
            title="Pengaturan & Profil"
            aria-label="Pengaturan"
          >
            <Settings className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="p-2 min-w-[38px] min-h-[38px] flex items-center justify-center rounded-xl border border-rose-200 dark:border-rose-900/50 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-600 dark:text-rose-400 transition-colors cursor-pointer"
            title="Keluar Akun"
            aria-label="Keluar"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      <main id="main-content" tabIndex={-1} className="flex-1 overflow-y-auto">
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
      </main>
      {isSettingsOpen && (
        <div className="fixed inset-0 bg-slate-50 dark:bg-slate-900 z-50 flex flex-col overflow-hidden">
          <div className="p-3 sm:p-4 border-b border-default flex items-center surface-card shadow-sm">
            <button
              type="button"
              onClick={() => setIsSettingsOpen(false)}
              className="mr-3 px-3 py-2 min-h-[44px] min-w-[44px] flex items-center gap-1.5 rounded-xl border border-default hover:bg-slate-100 dark:hover:bg-slate-800 text-secondary hover:text-primary transition-colors cursor-pointer text-xs sm:text-sm font-semibold"
              aria-label="Kembali"
            >
              &larr; <span>Kembali</span>
            </button>
            <h2 className="font-bold text-primary text-sm sm:text-base">Pengaturan & Profil</h2>
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
