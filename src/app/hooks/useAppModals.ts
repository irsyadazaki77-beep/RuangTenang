import { useState } from 'react';

export function useAppModals() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isLegalDocsOpen, setIsLegalDocsOpen] = useState(false);
  const [isChangelogOpen, setIsChangelogOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  return {
    isSidebarOpen, setIsSidebarOpen,
    isSettingsOpen, setIsSettingsOpen,
    isAuthModalOpen, setIsAuthModalOpen,
    isLegalDocsOpen, setIsLegalDocsOpen,
    isChangelogOpen, setIsChangelogOpen,
    isNotificationOpen, setIsNotificationOpen,
    isCommandPaletteOpen, setIsCommandPaletteOpen,
    showOnboarding, setShowOnboarding
  };
}
