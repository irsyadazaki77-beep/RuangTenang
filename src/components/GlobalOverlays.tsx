import React, { Suspense } from 'react';
import { UserSession } from '../types';
import { Chat } from '../features/chat/types';
import { WorkspaceMode } from '../features/workspace/types';
import { lazyWithRetry } from '../lib/lazyWithRetry';
import { CommandPalette } from './CommandPalette';
import { AmbientSoundscapeWidget } from './soundscape/AmbientSoundscapeWidget';
import { PanicScreen } from '../features/privacy/PanicScreen';

const SettingsPage = lazyWithRetry(() => import('../features/settings/SettingsPage').then(module => ({ default: module.SettingsPage })));
const AuthModal = lazyWithRetry(() => import('../features/authentication/AuthModal').then(module => ({ default: module.AuthModal })));
const LegalDocsModal = lazyWithRetry(() => import('../features/privacy/LegalDocsModal').then(module => ({ default: module.LegalDocsModal })));
const ChangelogModal = lazyWithRetry(() => import('./changelog/ChangelogModal').then(module => ({ default: module.ChangelogModal })));
const OnboardingFlow = lazyWithRetry(() => import('../features/onboarding/OnboardingFlow').then(module => ({ default: module.OnboardingFlow })));
const NotificationCenter = lazyWithRetry(() => import('./notifications/NotificationCenter').then(module => ({ default: module.NotificationCenter })));
const NewUpdateToast = lazyWithRetry(() => import('./changelog/NewUpdateToast').then(module => ({ default: module.NewUpdateToast })));

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

      <Suspense fallback={null}>
        <NewUpdateToast onOpenChangelog={() => setIsChangelogOpen(true)} />
      </Suspense>

      {!isCounselorView && (
        <>
          {setIsCommandPaletteOpen && (
            <CommandPalette 
              isOpen={isCommandPaletteOpen} 
              onClose={() => setIsCommandPaletteOpen(false)} 
              chats={chats} 
            />
          )}

          {/* Module 1: Ambient Soundscape & Focus Timer Floating Widget */}
          <AmbientSoundscapeWidget currentMode={workspaceMode} />

          {/* Module 3: Panic Screen Decoy & Privacy Screen */}
          <PanicScreen />
        </>
      )}
    </>
  );
};
