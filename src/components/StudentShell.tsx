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

const SettingsPage = lazyWithRetry(() => import('../features/settings/SettingsPage').then(module => ({ default: module.SettingsPage })));

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
  const shouldReduceMotion = useReducedMotion();

  return (
    <div className="flex w-full h-[100dvh] bg-transparent text-primary font-sans relative overflow-hidden">
      <ChatAuroraBackground />
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
      
      <div className="flex-1 flex flex-col relative min-w-0 h-full overflow-hidden">
        {isOffline && (
          <div className="shrink-0 z-30 bg-amber-500 text-white px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium flex items-center justify-center gap-2 shadow-sm text-center">
            <WifiOff className="w-4 h-4 shrink-0" />
            <span>Koneksi ke server terputus. Beberapa fitur mungkin tidak berfungsi.</span>
          </div>
        )}
        {isSettingsOpen ? (
          <div className="absolute inset-0 bg-slate-50/75 dark:bg-[#0e141b]/80 backdrop-blur-md z-20 flex flex-col overflow-hidden">
            <div className="p-3 sm:p-3.5 border-b border-default flex items-center surface-card shadow-xs shrink-0">
              <button onClick={() => setIsSettingsOpen(false)} className="mr-3 text-secondary hover:text-slate-800 dark:hover:text-slate-200 text-xs sm:text-sm font-medium" aria-label="Kembali">&larr; Kembali</button>
              <h2 className="font-semibold text-xs sm:text-sm text-primary">Pengaturan & Profil</h2>
            </div>
            <div className="flex-1 overflow-y-auto min-w-0">
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
                      onOpenChangelog: () => setIsChangelogOpen(true),
                      onPersisted: () => showToast('Skrining berhasil disimpan ke profil Anda.', 'success'),
                      onTriggerSOS: () => showToast('Sinyal SOS darurat diaktifkan.', 'info'),
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
      </div>

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
    </div>
  );
};
