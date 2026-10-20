import React, { Suspense } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { WifiOff } from 'lucide-react';
import { UserSession, Counselor } from '../types';
import { Chat } from '../features/chat/types';
import { WorkspaceMode } from '../features/workspace/types';
import { lazyWithRetry } from '../lib/lazyWithRetry';
import { GlobalErrorBoundary } from './error/GlobalErrorBoundary';
import Sidebar from './layout/Sidebar';
import ChatAuroraBackground from '../features/chat/components/ChatAuroraBackground';
import { GlobalOverlays } from './GlobalOverlays';
import { safeLocalStorage } from '../lib/storage';
import { getChatIdFromPath, getModeChatPath, getModeHomePath, getWorkspaceModeFromPath } from '../features/workspace/utils/workspaceRouting';
import { createStudentRoutes } from '../app/routes/studentRoutes';
import { LoadingState } from './ui/primitives/Surfaces';
import { FeatureErrorBoundary } from './error/FeatureErrorBoundary';
import { trackProductEvent } from '../lib/productAnalytics';
import { apiClient } from '../lib/apiClient';
import { GUEST_AI_CONSENT_CHANGED_EVENT, readGuestAiConsent, writeGuestAiConsent } from '../lib/guestAiConsent';
import { AiConsentPrompt } from '../features/privacy/components/AiConsentPrompt';
import { BRAND_IDENTITIES } from './ui/BrandLogo';

const SettingsPage = lazyWithRetry(() => import('../features/settings/SettingsPage').then(module => ({ default: module.SettingsPage })));
const PrivacyCenterModal = lazyWithRetry(() => import('../features/privacy/PrivacyCenterModal').then(module => ({ default: module.PrivacyCenterModal })));

interface StudentShellProps {
  user: UserSession;
  setUser: (user: UserSession | null) => void;
  chats: Chat[];
  setChats: React.Dispatch<React.SetStateAction<Chat[]>>;
  isLoadingChats: boolean;
  isOffline: boolean;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
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
  isCommandPaletteOpen: boolean;
  setIsCommandPaletteOpen: (open: boolean) => void;
  showOnboarding: boolean;
  setShowOnboarding: (show: boolean) => void;
  selectedCounselor: Counselor | null;
  setSelectedCounselor: (counselor: Counselor | null) => void;
  workspaceMode: WorkspaceMode;
  handleSwitchMode: (mode: WorkspaceMode) => void;
  handleDeleteChat: (id: string) => Promise<void>;
  handleUpdateTitle: (id: string, title: string) => Promise<void>;
  handleTogglePin: (id: string) => Promise<void>;
  handleToggleArchive: (id: string) => Promise<void>;
  handleLogout: () => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info', title?: string) => void;
}

export const StudentShell: React.FC<StudentShellProps> = ({
  user,
  setUser,
  chats,
  setChats,
  isLoadingChats,
  isOffline,
  isSidebarOpen,
  setIsSidebarOpen,
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
  isCommandPaletteOpen,
  setIsCommandPaletteOpen,
  showOnboarding,
  setShowOnboarding,
  selectedCounselor,
  setSelectedCounselor,
  workspaceMode,
  handleSwitchMode,
  handleDeleteChat,
  handleUpdateTitle,
  handleTogglePin,
  handleToggleArchive,
  handleLogout,
  showToast
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const currentMode = getWorkspaceModeFromPath(location.pathname);
  React.useEffect(() => {
    const brand = BRAND_IDENTITIES[currentMode];
    const previousTitle = document.title;
    const favicon = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    const previousIcon = favicon?.getAttribute('href');
    document.title = currentMode === 'RUANG_KERJA'
      ? 'RuangKerja — RuangTenang'
      : 'RuangTenang - Pendamping Refleksi & Ruang Kerja Mahasiswa';
    favicon?.setAttribute('href', brand.src);
    return () => {
      document.title = previousTitle;
      if (previousIcon) favicon?.setAttribute('href', previousIcon);
    };
  }, [currentMode]);
  const shouldReduceMotion = useReducedMotion();
  const [isPrivacyCenterOpen, setIsPrivacyCenterOpen] = React.useState(false);
  const [aiConsentAllowed, setAiConsentAllowed] = React.useState<boolean | null>(null);
  const [isAiConsentPromptOpen, setIsAiConsentPromptOpen] = React.useState(false);
  const [isSavingAiConsent, setIsSavingAiConsent] = React.useState(false);
  const [aiConsentError, setAiConsentError] = React.useState<string | null>(null);
  const pendingConsentCancelRef = React.useRef<(() => void) | null>(null);

  const openPrivacyCenter = React.useCallback(() => {
    setIsSettingsOpen(false);
    setIsPrivacyCenterOpen(true);
  }, [setIsSettingsOpen]);

  const requestAiConsent = React.useCallback((cancelPendingSend?: () => void) => {
    setAiConsentError(null);
    setAiConsentAllowed(false);
    pendingConsentCancelRef.current = cancelPendingSend || null;
    setIsAiConsentPromptOpen(true);
  }, []);

  React.useEffect(() => {
    setIsAiConsentPromptOpen(false);
    setAiConsentError(null);
    setIsPrivacyCenterOpen(false);
    if (user.role === 'guest') {
      const guestConsent = readGuestAiConsent();
      setAiConsentAllowed(guestConsent);
      if (guestConsent) setIsAiConsentPromptOpen(false);
      const syncGuestConsent = () => setAiConsentAllowed(readGuestAiConsent());
      window.addEventListener(GUEST_AI_CONSENT_CHANGED_EVENT, syncGuestConsent);
      return () => window.removeEventListener(GUEST_AI_CONSENT_CHANGED_EVENT, syncGuestConsent);
    }

    const controller = new AbortController();
    let active = true;
    setAiConsentAllowed(null);
    void apiClient.get<any>('/api/v1/privacy/consent', { signal: controller.signal }).then(response => {
      if (!active) return;
      if (!response.success) {
        setAiConsentAllowed(false);
        return;
      }
      const consent = response.data?.consent;
      const allowed = consent?.consentForAI === true;
      setAiConsentAllowed(allowed);
      if (allowed) setIsAiConsentPromptOpen(false);
    }).catch(() => {
      if (active) setAiConsentAllowed(false);
    });

    return () => {
      active = false;
      controller.abort();
    };
  }, [user.id, user.role]);

  const handleGrantAiConsent = React.useCallback(async () => {
    if (isSavingAiConsent) return;
    setIsSavingAiConsent(true);
    setAiConsentError(null);
    try {
      if (user.role === 'guest') {
        writeGuestAiConsent(true);
      } else {
        const response = await apiClient.post<any>('/api/v1/privacy/consent', { consentForAI: true });
        if (!response.success) throw new Error(response.error || 'Izin belum dapat disimpan. Coba lagi.');
      }
      pendingConsentCancelRef.current = null;
      setAiConsentAllowed(true);
      setIsAiConsentPromptOpen(false);
    } catch (error) {
      setAiConsentError(error instanceof Error ? error.message : 'Izin belum dapat disimpan. Coba lagi.');
    } finally {
      setIsSavingAiConsent(false);
    }
  }, [isSavingAiConsent, user.role]);

  const closeAiConsentPrompt = React.useCallback(() => {
    pendingConsentCancelRef.current?.();
    pendingConsentCancelRef.current = null;
    setIsAiConsentPromptOpen(false);
  }, []);

  React.useEffect(() => {
    if (user.role === 'mahasiswa' && user.campusId) trackProductEvent('repeat_visit');
  }, [user.campusId, user.id, user.role]);

  return (
    <div className="flex w-full h-dvh bg-transparent text-primary font-sans relative overflow-hidden">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2 focus:bg-teal-700 focus:text-white focus:rounded-lg focus:shadow-md focus:outline-none text-xs font-semibold"
      >
        Lewati ke konten utama
      </a>
      <ChatAuroraBackground
        variant={currentMode === 'RUANG_KERJA' ? 'kerja' : 'tenang'}
        intensity={((safeLocalStorage.getItem('aurora_intensity') as 'subtle' | 'normal' | 'vivid' | null) || 'normal')}
      />
      <Sidebar
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
        onNewChat={() => {
          navigate(currentMode === 'RUANG_KERJA' ? '/workspace/new' : getModeHomePath(currentMode));
        }}
        chats={chats}
        currentChatId={getChatIdFromPath(location.pathname)}
        currentMode={currentMode}
        onSwitchMode={handleSwitchMode}
        onSelectChat={(id) => {
          navigate(getModeChatPath(currentMode, id));
        }}
        onDeleteChat={handleDeleteChat}
        onUpdateTitle={handleUpdateTitle}
        onTogglePin={handleTogglePin}
        onToggleArchive={handleToggleArchive}
        onLogout={handleLogout}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onOpenChangelog={() => setIsChangelogOpen(true)}
        onOpenNotifications={() => setIsNotificationOpen(true)}
        user={user}
        isLoading={isLoadingChats}
      />

      <main id="main-content" tabIndex={-1} className="flex-1 flex flex-col relative min-w-0 h-full overflow-hidden">
        {isOffline && (
          <div role="status" aria-live="polite" className="shrink-0 z-30 bg-amber-600 dark:bg-amber-700 text-white px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium flex items-center justify-center gap-2 shadow-sm text-center">
            <WifiOff className="w-4 h-4 shrink-0 animate-pulse" />
            <span>Mode Offline: sebagian fitur memerlukan koneksi. Hanya data yang terkonfirmasi masuk antrean offline yang akan dicoba sinkron saat online.</span>
          </div>
        )}
        {isSettingsOpen ? (
          <div className="absolute inset-0 bg-slate-50/75 dark:bg-[#0e141b]/80 backdrop-blur-md z-20 flex flex-col overflow-hidden">
            <div className="p-3 sm:p-3.5 border-b border-default flex items-center surface-card shadow-xs shrink-0">
              <button
                type="button"
                onClick={() => setIsSettingsOpen(false)}
                className="mr-3 px-3 py-2 min-h-[44px] min-w-[44px] flex items-center gap-1.5 rounded-xl border border-default hover:bg-slate-100 dark:hover:bg-slate-800 text-secondary hover:text-primary transition-colors cursor-pointer text-xs sm:text-sm font-semibold"
                aria-label="Kembali dari pengaturan"
              >
                &larr; <span>Kembali</span>
              </button>
              <h2 className="font-semibold text-xs sm:text-sm text-primary">Pengaturan & Profil</h2>
            </div>
            <div className="flex-1 overflow-y-auto min-w-0">
               <Suspense fallback={<div className="p-4 text-center text-secondary">Memuat pengaturan...</div>}>
                 <SettingsPage
                   userSession={user}
                   setUserSession={(u) => setUser(u)}
                   onOpenAuth={() => setIsAuthModalOpen(true)}
                   onOpenChangelog={() => setIsChangelogOpen(true)}
                   onOpenPrivacyCenter={openPrivacyCenter}
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
        ) : (
          <GlobalErrorBoundary>
            <Suspense fallback={<div className="h-full flex items-center justify-center surface-page" role="status"><LoadingState message="Memuat ruang" className="p-4" /></div>}>
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={
                    currentMode === 'RUANG_KERJA'
                      ? 'workspace-mode'
                      : (location.pathname === '/' || location.pathname.startsWith('/c/'))
                      ? 'tenang-mode'
                      : location.pathname
                  }
                  initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={shouldReduceMotion ? { opacity: 1 } : { opacity: 0 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                  className="h-full w-full flex-1 flex flex-col min-h-0 overflow-hidden"
                >
                  <Routes location={location}>
                    {createStudentRoutes({
                      user,
                      setUser,
                      chats,
                      setChats,
                      isLoadingChats,
                      selectedCounselor,
                      setSelectedCounselor,
                      onSwitchMode: handleSwitchMode,
                      onOpenSidebar: () => setIsSidebarOpen(true),
                      onOpenSettings: () => setIsSettingsOpen(true),
                      onOpenPrivacyCenter: openPrivacyCenter,
                      onOpenChangelog: () => setIsChangelogOpen(true),
                      aiConsentAllowed,
                      aiConsentPromptOpen: isAiConsentPromptOpen,
                      onRequestAiConsent: requestAiConsent,
                      onPersisted: () => showToast('Skrining berhasil disimpan ke profil Anda.', 'success'),
                      navigate
                    }).map(route => (
                      <Route
                        key={route.path}
                        path={route.path}
                        element={<FeatureErrorBoundary featureName={route.sidebarSection === 'tools' ? 'Layanan' : 'Ruang'}>{route.element}</FeatureErrorBoundary>}
                      />
                    ))}
                  </Routes>
                </motion.div>
              </AnimatePresence>
            </Suspense>
          </GlobalErrorBoundary>
        )}
      </main>

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
        isCommandPaletteOpen={isCommandPaletteOpen}
        setIsCommandPaletteOpen={setIsCommandPaletteOpen}
        showOnboarding={showOnboarding}
        setShowOnboarding={setShowOnboarding}
        chats={chats}
        workspaceMode={workspaceMode}
        handleLogout={handleLogout}
        onOnboardingComplete={(starterPrompt) => {
          setShowOnboarding(false);
          if (starterPrompt) {
            safeLocalStorage.setItem('draft_new', starterPrompt);
            navigate('/');
          }
        }}
      />
      {isPrivacyCenterOpen && (
        <Suspense fallback={<div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 text-sm font-medium text-white">Memuat Pusat Persetujuan…</div>}>
          <PrivacyCenterModal
            isOpen
            onClose={() => setIsPrivacyCenterOpen(false)}
            userSession={user}
            setUserSession={session => setUser(session)}
            onAiConsentChange={setAiConsentAllowed}
          />
        </Suspense>
      )}
      <AiConsentPrompt
        isOpen={isAiConsentPromptOpen}
        isSaving={isSavingAiConsent}
        error={aiConsentError}
        isGuest={user.role === 'guest'}
        onApprove={handleGrantAiConsent}
        onClose={closeAiConsentPrompt}
      />
    </div>
  );
};
