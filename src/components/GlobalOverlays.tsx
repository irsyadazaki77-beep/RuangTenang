import React, { Suspense } from 'react';
import { UserSession } from '../types';
import { Chat } from '../features/chat/types';
import { WorkspaceMode } from '../features/workspace/types';
import { lazyWithRetry } from '../lib/lazyWithRetry';
import { CommandPalette } from './CommandPalette';
import { KeyboardShortcutsModal } from './KeyboardShortcutsModal';
import { AmbientSoundscapeWidget } from './soundscape/AmbientSoundscapeWidget';
import { PanicScreen } from '../features/privacy/PanicScreen';

const AuthModal = lazyWithRetry(() => import('../features/authentication/AuthModal').then(module => ({ default: module.AuthModal })));
const LegalDocsModal = lazyWithRetry(() => import('../features/privacy/LegalDocsModal').then(module => ({ default: module.LegalDocsModal })));
const ChangelogModal = lazyWithRetry(() => import('./changelog/ChangelogModal').then(module => ({ default: module.ChangelogModal })));
const OnboardingFlow = lazyWithRetry(() => import('../features/onboarding/OnboardingFlow').then(module => ({ default: module.OnboardingFlow })));
const NotificationCenter = lazyWithRetry(() => import('./notifications/NotificationCenter').then(module => ({ default: module.NotificationCenter })));
const NewUpdateToast = lazyWithRetry(() => import('./changelog/NewUpdateToast').then(module => ({ default: module.NewUpdateToast })));

const isVitest = typeof window !== 'undefined' && Boolean((window as any).__vitest_worker__);

interface GlobalOverlaysProps {
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
  isCommandPaletteOpen?: boolean;
  setIsCommandPaletteOpen?: (open: boolean) => void;
  showOnboarding: boolean;
  setShowOnboarding: (show: boolean) => void;
  chats?: Chat[];
  workspaceMode?: WorkspaceMode;
  handleLogout: () => void;
  onOnboardingComplete?: (starterPrompt?: string) => void;
  isCounselorView?: boolean;
}

export const GlobalOverlays: React.FC<GlobalOverlaysProps> = ({
  user,
  setUser,
  isSettingsOpen: _isSettingsOpen,
  setIsSettingsOpen: _setIsSettingsOpen,
  isAuthModalOpen,
  setIsAuthModalOpen,
  isLegalDocsOpen,
  setIsLegalDocsOpen,
  isChangelogOpen,
  setIsChangelogOpen,
  isNotificationOpen,
  setIsNotificationOpen,
  isCommandPaletteOpen = false,
  setIsCommandPaletteOpen,
  showOnboarding,
  setShowOnboarding,
  chats = [],
  workspaceMode = 'RUANG_TENANG',
  handleLogout,
  onOnboardingComplete,
  isCounselorView = false
}) => {
  const isCoderMode = workspaceMode === 'RUANG_CODER';

  return (
    <>
      {isAuthModalOpen && (
        <Suspense fallback={null}>
          <AuthModal
            isOpen={isAuthModalOpen}
            onClose={() => setIsAuthModalOpen(false)}
            currentSession={user}
            onLogin={(u) => {
              setUser(u);
              setIsAuthModalOpen(false);
            }}
            onLogout={() => {
              handleLogout();
              setIsAuthModalOpen(false);
            }}
          />
        </Suspense>
      )}

      {isLegalDocsOpen && (
        <Suspense fallback={null}>
          <LegalDocsModal isOpen={isLegalDocsOpen} onClose={() => setIsLegalDocsOpen(false)} />
        </Suspense>
      )}

      {isChangelogOpen && (
        <Suspense fallback={null}>
          <ChangelogModal isOpen={isChangelogOpen} onClose={() => setIsChangelogOpen(false)} />
        </Suspense>
      )}

      {showOnboarding && user?.id && (
        <Suspense fallback={null}>
          <OnboardingFlow
            userId={user.id}
            onComplete={(starterPrompt) => {
              if (onOnboardingComplete) {
                onOnboardingComplete(starterPrompt);
              } else {
                setShowOnboarding(false);
              }
            }}
          />
        </Suspense>
      )}

      {isNotificationOpen && (
        <Suspense fallback={null}>
          <NotificationCenter isOpen={isNotificationOpen} onClose={() => setIsNotificationOpen(false)} />
        </Suspense>
      )}

      {!isVitest && (
        <Suspense fallback={null}>
          <NewUpdateToast onOpenChangelog={() => setIsChangelogOpen(true)} />
        </Suspense>
      )}

      {!isCounselorView && (
        <>
          <KeyboardShortcutsModal />
          {setIsCommandPaletteOpen && (
            <CommandPalette
              isOpen={isCommandPaletteOpen}
              onClose={() => setIsCommandPaletteOpen(false)}
              chats={chats}
            />
          )}

          {/* Floating Soundscape & Panic screens hidden in RuangCoder IDE to prevent button overlaps */}
          {!isCoderMode && (
            <>
              <AmbientSoundscapeWidget currentMode={workspaceMode} />
              <PanicScreen />
            </>
          )}
        </>
      )}
    </>
  );
};
