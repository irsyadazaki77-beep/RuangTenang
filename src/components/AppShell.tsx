import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { apiClient } from '../lib/apiClient';
import { clientDb } from '../lib/clientDb';
import { safeLocalStorage } from '../lib/storage';
import { Chat } from '../features/chat/types';
import { useToast } from './Toast';
import { Counselor } from '../types';
import { WorkspaceMode } from '../features/workspace/types';
import { AuthGate } from './AuthGate';
import { CounselorShell } from './CounselorShell';
import { StudentShell } from './StudentShell';

export const AppShell: React.FC = () => {
  const { user, setUser, isOffline, logout } = useAuth();
  const { showToast } = useToast();
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isLegalDocsOpen, setIsLegalDocsOpen] = useState(false);
  const [isChangelogOpen, setIsChangelogOpen] = useState(false);
  const [chats, setChats] = useState<Chat[]>([]);
  const [isLoadingChats, setIsLoadingChats] = useState(true);
  const [selectedCounselor, setSelectedCounselor] = useState<Counselor | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode>(() => {
    const saved = safeLocalStorage.getItem('ruangtenang_workspace_mode') as WorkspaceMode;
    return saved === 'RUANG_KERJA' ? 'RUANG_KERJA' : 'RUANG_TENANG';
  });

  const navigate = useNavigate();
  const location = useLocation();

  const handleSwitchMode = (mode: WorkspaceMode) => {
    setWorkspaceMode(mode);
    safeLocalStorage.setItem('ruangtenang_workspace_mode', mode);
    if (mode === 'RUANG_KERJA') {
      navigate('/workspace');
    } else {
      navigate('/');
    }
  };

  // Sync workspace mode state on route change
  useEffect(() => {
    if (location.pathname.startsWith('/workspace')) {
      if (workspaceMode !== 'RUANG_KERJA') {
        setWorkspaceMode('RUANG_KERJA');
        safeLocalStorage.setItem('ruangtenang_workspace_mode', 'RUANG_KERJA');
      }
    }
  }, [location.pathname, workspaceMode]);

  // Check onboarding status
  useEffect(() => {
    let isCancelled = false;
    const checkOnboardingStatus = async () => {
      if (!user?.id || user.role === 'konselor') {
        setShowOnboarding(false);
        return;
      }

      // Check local cache first for instant UX
      const localCompleted = safeLocalStorage.getItem(`rt_onboarding_completed_${user.id}`);
      if (localCompleted === 'true') {
        setShowOnboarding(false);
        return;
      }

      // Check encrypted IndexedDB
      try {
        const encryptedRecord = await clientDb.getDecrypted(`onboarding_${user.id}`);
        if (encryptedRecord) {
          const parsed = JSON.parse(encryptedRecord);
          if (parsed?.completed) {
            safeLocalStorage.setItem(`rt_onboarding_completed_${user.id}`, 'true');
            if (!isCancelled) setShowOnboarding(false);
            return;
          }
        }
      } catch {
        // ignore
      }

      // Check backend
      if (user.role !== 'guest') {
        try {
          const res = await apiClient.get<{ completed: boolean; goals?: string[] }>('/api/v1/user/onboarding');
          if (!isCancelled && res.success && res.data) {
            if (res.data.completed) {
              safeLocalStorage.setItem(`rt_onboarding_completed_${user.id}`, 'true');
              if (Array.isArray(res.data.goals) && res.data.goals.length > 0) {
                safeLocalStorage.setItem(`rt_user_goals_${user.id}`, JSON.stringify(res.data.goals));
              }
              setShowOnboarding(false);
              return;
            }
          }
        } catch {
          // ignore
        }
      }

      if (!isCancelled) {
        setShowOnboarding(true);
      }
    };

    checkOnboardingStatus();
    return () => { isCancelled = true; };
  }, [user?.id, user?.role]);

  // Read selected counselor from location state (for booking sessions)
  useEffect(() => {
    if (location.state && (location.state as any).selectedCounselor) {
      setSelectedCounselor((location.state as any).selectedCounselor);
    }
  }, [location.state]);

  const fetchChats = async () => {
    if (!user || user.role === 'guest') {
      setChats([]);
      setIsLoadingChats(false);
      return;
    }
    setIsLoadingChats(true);
    try {
      const res = await apiClient.get<Chat[]>('/api/v1/chat/history');
      if (res.success && Array.isArray(res.data)) {
        setChats(res.data);
        try {
          await clientDb.saveEncrypted(`chats_${user.id}`, JSON.stringify(res.data));
        } catch {
          // fallback
        }
      } else {
        try {
          const cachedJson = await clientDb.getDecrypted(`chats_${user.id}`);
          if (cachedJson) {
            setChats(JSON.parse(cachedJson));
          } else {
            setChats([]);
          }
        } catch {
          setChats([]);
        }
        if (res.status !== 401) {
          console.warn('Fetch chats failed:', res.error);
        }
      }
    } catch (err) {
      console.warn('Failed to fetch chat history:', err);
      try {
        const cachedJson = await clientDb.getDecrypted(`chats_${user.id}`);
        if (cachedJson) {
          setChats(JSON.parse(cachedJson));
        } else {
          setChats([]);
        }
      } catch {
        setChats([]);
      }
    } finally {
      setIsLoadingChats(false);
    }
  };

  useEffect(() => {
    if (user?.id) {
      fetchChats();
    }
  }, [user?.id]);

  // Automatic Offline Outbox Synchronization
  useEffect(() => {
    let isCancelled = false;
    const handleOnlineSync = async () => {
      try {
        const synced = await clientDb.processOutboxQueue(apiClient);
        if (synced > 0 && !isCancelled) {
          showToast(`Berhasil menyinkronkan ${synced} data offline ke server`, 'success', 'Sinkronisasi Selesai');
          fetchChats();
        }
      } catch (err) {
        console.warn('Background sync error:', err);
      }
    };

    window.addEventListener('online', handleOnlineSync);
    if (navigator.onLine) {
      handleOnlineSync();
    }
    return () => {
      isCancelled = true;
      window.removeEventListener('online', handleOnlineSync);
    };
  }, [user?.id]);

  // Global hotkeys
  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(prev => !prev);
      } else if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'o') {
        e.preventDefault();
        navigate('/');
      }
    };
    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, [navigate]);

  const handleDeleteChat = async (id: string) => {
    const originalChats = [...chats];
    try {
      setChats(prev => prev.filter(c => c.id !== id));
      if (location.pathname === `/c/${id}`) navigate('/');
      const res = await apiClient.delete(`/api/v1/chat/${id}`);
      if (!res.success) {
        throw new Error(res.error || 'Failed to delete chat');
      }
    } catch (err: any) {
      console.error('Failed to delete chat:', err);
      showToast(err?.message || 'Gagal menghapus percakapan', 'error');
      setChats(originalChats);
      fetchChats();
    }
  };

  const handleUpdateTitle = async (id: string, title: string) => {
    const originalChats = [...chats];
    try {
      setChats(prev => prev.map(c => c.id === id ? { ...c, title } : c));
      const res = await apiClient.put(`/api/v1/chat/${id}/title`, { title });
      if (!res.success) {
        throw new Error(res.error || 'Failed to update title');
      }
    } catch (err: any) {
      console.error('Failed to update title:', err);
      showToast(err?.message || 'Gagal mengubah judul percakapan', 'error');
      setChats(originalChats);
      fetchChats();
    }
  };

  const handleTogglePin = async (id: string) => {
    const originalChats = [...chats];
    try {
      setChats(prev => prev.map(c => c.id === id ? { ...c, isPinned: !c.isPinned } : c));
      const res = await apiClient.put(`/api/v1/chat/${id}/pin`);
      if (!res.success) {
        throw new Error(res.error || 'Failed to toggle pin');
      }
    } catch (err: any) {
      console.error('Failed to toggle pin:', err);
      showToast(err?.message || 'Gagal menyematkan percakapan', 'error');
      setChats(originalChats);
      fetchChats();
    }
  };

  const handleToggleArchive = async (id: string) => {
    const chat = chats.find(c => c.id === id);
    if (chat) {
      const originalChats = [...chats];
      try {
        const nextState = !chat.isArchived;
        setChats(prev => prev.map(c => c.id === id ? { ...c, isArchived: nextState } : c));
        const res = await apiClient.put(`/api/v1/chat/${id}/archive`, { isArchived: nextState });
        if (!res.success) {
          throw new Error(res.error || 'Failed to toggle archive');
        }
      } catch (err: any) {
        console.error('Failed to toggle archive:', err);
        showToast(err?.message || 'Gagal mengarsip percakapan', 'error');
        setChats(originalChats);
        fetchChats();
      }
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      setChats([]);
      navigate('/');
      showToast('Anda telah keluar dari akun.', 'info');
    } catch (err: any) {
      console.error('Logout error:', err);
      showToast(err.message || 'Logout gagal.', 'error');
    }
  };

  if (!user) {
    return null; // Renders AuthGate at the App root level
  }

  if (user.role === 'konselor') {
    return (
      <CounselorShell
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
      />
    );
  }

  return (
    <StudentShell
      user={user}
      setUser={setUser}
      chats={chats}
      setChats={setChats}
      isLoadingChats={isLoadingChats}
      isOffline={isOffline}
      isSidebarOpen={isSidebarOpen}
      setIsSidebarOpen={setIsSidebarOpen}
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
      selectedCounselor={selectedCounselor}
      setSelectedCounselor={setSelectedCounselor}
      workspaceMode={workspaceMode}
      handleSwitchMode={handleSwitchMode}
      handleDeleteChat={handleDeleteChat}
      handleUpdateTitle={handleUpdateTitle}
      handleTogglePin={handleTogglePin}
      handleToggleArchive={handleToggleArchive}
      handleLogout={handleLogout}
      showToast={showToast}
    />
  );
};
