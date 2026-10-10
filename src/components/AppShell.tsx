import React, { Suspense, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { WorkspaceMode } from '../features/workspace/types';
import { getModeHomePath } from '../features/workspace/utils/workspaceRouting';
import { lazyWithRetry } from '../lib/lazyWithRetry';
import { useAppInitialization } from '../app/hooks/useAppInitialization';
import { useAppModals } from '../app/hooks/useAppModals';
import { useGlobalShortcuts } from '../app/hooks/useGlobalShortcuts';
import { useChatLibrary } from '../features/chat/hooks/useChatLibrary';
import { useOfflineSync } from '../features/offline/useOfflineSync';
import { useToast } from './Toast';
import { LoadingState } from './ui/primitives/Surfaces';

const CounselorShell = lazyWithRetry(() => import('./CounselorShell').then(module => ({ default: module.CounselorShell })));
const StudentShell = lazyWithRetry(() => import('./StudentShell').then(module => ({ default: module.StudentShell })));

const ShellLoadingState: React.FC<{ label: string }> = ({ label }) => (
  <div className="min-h-[100dvh] flex items-center justify-center surface-page" role="status" aria-label={label}>
    <LoadingState message={label} className="p-4" />
  </div>
);

export const AppShell: React.FC = () => {
  const { user, setUser, isOffline, logout, loading: authLoading, authLifecycle, sessionGeneration } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const modals = useAppModals();
  const appState = useAppInitialization(user);
  const chatLibrary = useChatLibrary(user, showToast);
  const { setChats } = chatLibrary;
  const { setIsCommandPaletteOpen } = modals;

  const handleSwitchMode = useCallback((mode: WorkspaceMode) => {
    navigate(getModeHomePath(mode));
  }, [navigate]);

  const handleLogout = useCallback(async () => {
    try {
      await logout();
      setChats([]);
      navigate('/');
      showToast('Anda telah keluar dari akun.', 'info');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Logout gagal.';
      console.error('Logout error:', error);
      showToast(message, 'error');
    }
  }, [logout, navigate, setChats, showToast]);

  const toggleCommandPalette = useCallback(() => {
    setIsCommandPaletteOpen(open => !open);
  }, [setIsCommandPaletteOpen]);
  useGlobalShortcuts(toggleCommandPalette);
  useOfflineSync(user?.id, sessionGeneration, !authLoading && authLifecycle === 'authenticated' && user?.role === 'mahasiswa', chatLibrary.fetchChats, showToast);

  if (authLoading) return <ShellLoadingState label="Memulihkan sesi akun" />;
  if (!user) return null;

  if (user.role === 'konselor') {
    return (
      <Suspense fallback={<ShellLoadingState label="Memuat ruang konselor" />}>
        <CounselorShell
          user={user}
          setUser={setUser}
          isSettingsOpen={modals.isSettingsOpen}
          setIsSettingsOpen={modals.setIsSettingsOpen}
          isAuthModalOpen={modals.isAuthModalOpen}
          setIsAuthModalOpen={modals.setIsAuthModalOpen}
          isLegalDocsOpen={modals.isLegalDocsOpen}
          setIsLegalDocsOpen={modals.setIsLegalDocsOpen}
          isChangelogOpen={modals.isChangelogOpen}
          setIsChangelogOpen={modals.setIsChangelogOpen}
          isNotificationOpen={modals.isNotificationOpen}
          setIsNotificationOpen={modals.setIsNotificationOpen}
          showOnboarding={appState.showOnboarding}
          setShowOnboarding={appState.setShowOnboarding}
          handleLogout={handleLogout}
        />
      </Suspense>
    );
  }

  return (
    <Suspense fallback={<ShellLoadingState label="Memuat ruang mahasiswa" />}>
      <StudentShell
        user={user}
        setUser={setUser}
        chats={chatLibrary.chats}
        setChats={chatLibrary.setChats}
        isLoadingChats={chatLibrary.isLoadingChats}
        isOffline={isOffline}
        isSidebarOpen={modals.isSidebarOpen}
        setIsSidebarOpen={modals.setIsSidebarOpen}
        isSettingsOpen={modals.isSettingsOpen}
        setIsSettingsOpen={modals.setIsSettingsOpen}
        isAuthModalOpen={modals.isAuthModalOpen}
        setIsAuthModalOpen={modals.setIsAuthModalOpen}
        isLegalDocsOpen={modals.isLegalDocsOpen}
        setIsLegalDocsOpen={modals.setIsLegalDocsOpen}
        isChangelogOpen={modals.isChangelogOpen}
        setIsChangelogOpen={modals.setIsChangelogOpen}
        isNotificationOpen={modals.isNotificationOpen}
        setIsNotificationOpen={modals.setIsNotificationOpen}
        isCommandPaletteOpen={modals.isCommandPaletteOpen}
        setIsCommandPaletteOpen={modals.setIsCommandPaletteOpen}
        showOnboarding={appState.showOnboarding}
        setShowOnboarding={appState.setShowOnboarding}
        selectedCounselor={appState.selectedCounselor}
        setSelectedCounselor={appState.setSelectedCounselor}
        workspaceMode={appState.workspaceMode}
        handleSwitchMode={handleSwitchMode}
        handleDeleteChat={chatLibrary.handleDeleteChat}
        handleUpdateTitle={chatLibrary.handleUpdateTitle}
        handleTogglePin={chatLibrary.handleTogglePin}
        handleToggleArchive={chatLibrary.handleToggleArchive}
        handleLogout={handleLogout}
        showToast={showToast}
      />
    </Suspense>
  );
};
