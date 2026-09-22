import { useAuth } from "./contexts/AuthContext";
import { apiClient } from "./lib/apiClient";
import { clientDb } from "./lib/clientDb";
import { safeLocalStorage } from "./lib/storage";
import React, { useState, useEffect, Suspense } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import Sidebar from './components/layout/Sidebar';
import { WifiOff } from 'lucide-react';
import { Chat } from './features/chat/types';
import MainChat from './features/chat/components/MainChat';
import ChatAuroraBackground from './features/chat/components/ChatAuroraBackground';
import { WorkspaceLayout } from './components/layout/WorkspaceLayout';
import { useToast } from './components/Toast';
import { lazyWithRetry } from './lib/lazyWithRetry';
import { GlobalErrorBoundary } from './components/error/GlobalErrorBoundary';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';

const UserProgressTracker = lazyWithRetry(() => import('./features/mood/UserProgressTracker').then(module => ({ default: module.UserProgressTracker })));
const MindfulnessWorkshop = lazyWithRetry(() => import('./features/mood/MindfulnessWorkshop').then(module => ({ default: module.MindfulnessWorkshop })));
const ScreeningModal = lazyWithRetry(() => import('./features/screening/ScreeningModal').then(module => ({ default: module.ScreeningModal })));
const CounselorDirectory = lazyWithRetry(() => import('./features/counselors/CounselorDirectory').then(module => ({ default: module.CounselorDirectory })));
const AppointmentScheduler = lazyWithRetry(() => import('./features/appointments/AppointmentScheduler').then(module => ({ default: module.AppointmentScheduler })));
const EmergencyCenter = lazyWithRetry(() => import('./components/EmergencyCenter').then(module => ({ default: module.EmergencyCenter })));
const LegalDocsModal = lazyWithRetry(() => import('./features/privacy/LegalDocsModal').then(module => ({ default: module.LegalDocsModal })));
const OnboardingFlow = lazyWithRetry(() => import('./features/onboarding/OnboardingFlow').then(module => ({ default: module.OnboardingFlow })));
import { Counselor } from './types';
import { WorkspaceMode } from './features/workspace/types';
const NotificationCenter = lazyWithRetry(() => import('./components/notifications/NotificationCenter').then(module => ({ default: module.NotificationCenter })));

const AuthModal = lazyWithRetry(() => import('./features/authentication/AuthModal').then(module => ({ default: module.AuthModal })));
const SettingsPage = lazyWithRetry(() => import('./features/settings/SettingsPage').then(module => ({ default: module.SettingsPage })));
const CounselorDashboard = lazyWithRetry(() => import('./features/counselors/CounselorDashboard').then(module => ({ default: module.CounselorDashboard })));
const CounselorPortal = lazyWithRetry(() => import('./features/counselor-portal/CounselorPortal').then(module => ({ default: module.CounselorPortal })));
const ChangelogModal = lazyWithRetry(() => import('./components/changelog/ChangelogModal').then(module => ({ default: module.ChangelogModal })));
const NewUpdateToast = lazyWithRetry(() => import('./components/changelog/NewUpdateToast').then(module => ({ default: module.NewUpdateToast })));
const StudentWorkspace = lazyWithRetry(() => import('./features/workspace/StudentWorkspace').then(module => ({ default: module.StudentWorkspace })));

export default function App() {
  const { user, setUser, loading, isOffline, logout } = useAuth();
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
  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode>(() => {
    const saved = safeLocalStorage.getItem('ruangtenang_workspace_mode') as WorkspaceMode;
    return saved === 'RUANG_KERJA' ? 'RUANG_KERJA' : 'RUANG_TENANG';
  });
  const navigate = useNavigate();
  const location = useLocation();
  const shouldReduceMotion = useReducedMotion();

  const handleSwitchMode = (mode: WorkspaceMode) => {
    setWorkspaceMode(mode);
    safeLocalStorage.setItem('ruangtenang_workspace_mode', mode);
    if (mode === 'RUANG_KERJA') {
      navigate('/workspace');
    } else {
      navigate('/');
    }
  };

  useEffect(() => {
    if (location.pathname.startsWith('/workspace')) {
      if (workspaceMode !== 'RUANG_KERJA') {
        setWorkspaceMode('RUANG_KERJA');
        safeLocalStorage.setItem('ruangtenang_workspace_mode', 'RUANG_KERJA');
      }
    }
  }, [location.pathname]);

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
        // Persist to encrypted IndexedDB for security
        try {
          await clientDb.saveEncrypted(`chats_${user.id}`, JSON.stringify(res.data));
        } catch {
          // fallback
        }
      } else {
        // Fallback to decrypted IndexedDB cache
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
    const handleOnlineSync = async () => {
      try {
        const synced = await clientDb.processOutboxQueue(apiClient);
        if (synced > 0) {
          showToast(`Berhasil menyinkronkan ${synced} data offline ke server`, 'success', 'Sinkronisasi Selesai');
          fetchChats();
        }
      } catch (err) {
        console.warn('Background sync error:', err);
      }
    };

    window.addEventListener('online', handleOnlineSync);
    // Also trigger on mount if online
    if (navigator.onLine) {
      handleOnlineSync();
    }
    return () => window.removeEventListener('online', handleOnlineSync);
  }, [user?.id]);

  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'o') {
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

  if (loading) {
    return (
      <div className="flex flex-col h-[100dvh] items-center justify-center surface-page gap-3 animate-fade-in select-none">
        <div className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-800 border border-teal-200/80 dark:border-teal-800/80 shadow-md flex items-center justify-center p-2 animate-pulse">
          <img src="/favicon.svg" alt="RuangTenang" className="w-full h-full object-contain pointer-events-none" />
        </div>
        <span className="text-xs font-semibold text-teal-600 dark:text-teal-400 tracking-tight">Memuat RuangTenang...</span>
      </div>
    );
  }

  if (!user) {
    return (
      <Suspense fallback={
        <div className="flex flex-col h-[100dvh] items-center justify-center surface-page gap-3 animate-fade-in select-none">
          <div className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-800 border border-teal-200/80 dark:border-teal-800/80 shadow-md flex items-center justify-center p-2 animate-pulse">
            <img src="/favicon.svg" alt="RuangTenang" className="w-full h-full object-contain pointer-events-none" />
          </div>
          <span className="text-xs font-semibold text-teal-600 dark:text-teal-400 tracking-tight">Memuat RuangTenang...</span>
        </div>
      }>
        <AuthModal isOpen={true} onClose={() => {}} currentSession={null as any} onLogin={(u) => setUser(u)} onLogout={() => {}} />
      </Suspense>
    );
  }

  if (user.role === 'konselor') {
    return (
      <div className="flex min-h-[100dvh] w-full surface-page text-primary font-sans relative overflow-hidden">
        {isSettingsOpen && (
          <div className="fixed inset-0 bg-slate-50 dark:bg-slate-900 z-50 flex flex-col overflow-hidden">
            <div className="p-4 border-b border-default flex items-center surface-card shadow-sm">
              <button onClick={() => setIsSettingsOpen(false)} className="mr-4 text-secondary hover:text-slate-800 dark:hover:text-slate-200" aria-label="Kembali">&larr; Kembali</button>
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
        <Suspense fallback={<div className="flex h-[100dvh] items-center justify-center surface-page"><div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div></div>}>
          <CounselorDashboard />
        </Suspense>

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
            <OnboardingFlow userId={user.id} onComplete={() => setShowOnboarding(false)} />
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
      </div>
    );
  }

  return (
    <div className="flex w-full h-[100dvh] bg-transparent text-primary font-sans relative overflow-hidden">
      <ChatAuroraBackground />
      <Sidebar 
        isOpen={isSidebarOpen} 
        setIsOpen={setIsSidebarOpen} 
        onNewChat={() => {
          if (workspaceMode === 'RUANG_KERJA') {
            navigate('/workspace');
          } else {
            navigate('/');
          }
        }}
        chats={chats}
        currentChatId={location.pathname.startsWith('/c/') ? location.pathname.split('/c/')[1] : (location.pathname.startsWith('/workspace/c/') ? location.pathname.split('/workspace/c/')[1] : undefined)}
        currentMode={workspaceMode}
        onSwitchMode={handleSwitchMode}
        onSelectChat={(id) => {
          if (workspaceMode === 'RUANG_KERJA') {
            navigate(`/workspace/c/${id}`);
          } else {
            navigate(`/c/${id}`);
          }
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
            <Suspense fallback={<div className="flex h-full items-center justify-center surface-page"><div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div></div>}>
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={
                    location.pathname.startsWith('/workspace')
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
                    <Route path="/" element={<MainChat user={user} chats={chats} setChats={setChats} onOpenSidebar={() => setIsSidebarOpen(true)} onOpenSettings={() => setIsSettingsOpen(true)} onOpenChangelog={() => setIsChangelogOpen(true)} />} />
                    <Route path="/c/:chatId" element={<MainChat user={user} chats={chats} setChats={setChats} onOpenSidebar={() => setIsSidebarOpen(true)} onOpenSettings={() => setIsSettingsOpen(true)} onOpenChangelog={() => setIsChangelogOpen(true)} />} />
                    <Route 
                      path="/workspace" 
                      element={
                        <StudentWorkspace 
                          user={user} 
                          chats={chats} 
                          setChats={setChats} 
                          onOpenSidebar={() => setIsSidebarOpen(true)} 
                          onOpenSettings={() => setIsSettingsOpen(true)} 
                          onOpenChangelog={() => setIsChangelogOpen(true)} 
                          onSwitchMode={handleSwitchMode} 
                        />
                      } 
                    />
                    <Route 
                      path="/workspace/c/:chatId" 
                      element={
                        <StudentWorkspace 
                          user={user} 
                          chats={chats} 
                          setChats={setChats} 
                          onOpenSidebar={() => setIsSidebarOpen(true)} 
                          onOpenSettings={() => setIsSettingsOpen(true)} 
                          onOpenChangelog={() => setIsChangelogOpen(true)} 
                          onSwitchMode={handleSwitchMode} 
                        />
                      } 
                    />
                    <Route
                      path="/mood"
                      element={
                        <WorkspaceLayout
                          title="Mood Tracker & Progress"
                          subtitle="Pantau perkembangan kesehatan mental dan emosi Anda secara berkala"
                          badge="Lokal & Privat"
                          onOpenSidebar={() => setIsSidebarOpen(true)}
                          onOpenChangelog={() => setIsChangelogOpen(true)}
                        >
                          <UserProgressTracker
                            onOpenScreening={() => navigate('/screening')}
                            onNavigateToSchedule={() => navigate('/counselors')}
                          />
                        </WorkspaceLayout>
                      }
                    />
                    <Route
                      path="/mindfulness"
                      element={
                        <WorkspaceLayout
                          title="Workshop Meditasi & Tenang Mandiri"
                          subtitle="Latih ketenangan diri, atasi panik, dan catat jurnal syukur harian"
                          badge="Lokakarya Batin"
                          onOpenSidebar={() => setIsSidebarOpen(true)}
                          onOpenChangelog={() => setIsChangelogOpen(true)}
                        >
                          <MindfulnessWorkshop />
                        </WorkspaceLayout>
                      }
                    />
                    <Route
                      path="/screening"
                      element={
                        <WorkspaceLayout
                          title="Cek Kondisi Mental"
                          subtitle="Instrumen cek kondisi awal mandiri. BUKAN alat diagnosis medis."
                          badge="Cek Kondisi"
                          onOpenSidebar={() => setIsSidebarOpen(true)}
                          onOpenChangelog={() => setIsChangelogOpen(true)}
                        >
                          <ScreeningModal
                            isOpen={true}
                            isPageMode={true}
                            onClose={() => navigate('/mood')}
                            onComplete={() => {
                              // Local completion
                            }}
                            onPersisted={() => {
                              showToast('Skrining berhasil disimpan ke profil Anda.', 'success');
                            }}
                          />
                        </WorkspaceLayout>
                      }
                    />
                    <Route
                      path="/counselors"
                      element={
                        <WorkspaceLayout
                          title="Jadwal & Direktori Konselor"
                          subtitle="Temui konselor atau psikolog berlisensi untuk pendampingan."
                          badge="Terverifikasi"
                          onOpenSidebar={() => setIsSidebarOpen(true)}
                          onOpenChangelog={() => setIsChangelogOpen(true)}
                        >
                          <div className="max-w-7xl mx-auto flex flex-col xl:flex-row gap-3.5 sm:gap-4.5 p-3 sm:p-4 md:p-5 w-full">
                            <div className="flex-1 xl:w-2/3">
                              <CounselorDirectory onSelectCounselorForBooking={(c) => setSelectedCounselor(c)} />
                            </div>
                            <div className="xl:w-1/3">
                              <AppointmentScheduler 
                                 selectedCounselorFromDir={selectedCounselor}
                                 userSession={user}
                                 setUserSession={setUser}
                              />
                            </div>
                          </div>
                        </WorkspaceLayout>
                      }
                    />
                    <Route
                      path="/counselor-portal"
                      element={
                        <WorkspaceLayout
                          title="Portal Layanan Konselor & Rekam Medis SOAP"
                          subtitle="Triase kasus klinis, catatan SOAP terenkripsi AES-256-GCM, dan analitik kampus"
                          badge="Konselor"
                          onOpenSidebar={() => setIsSidebarOpen(true)}
                          onOpenChangelog={() => setIsChangelogOpen(true)}
                        >
                          <CounselorPortal />
                        </WorkspaceLayout>
                      }
                    />
                    <Route
                      path="/counselordashboard"
                      element={
                        <WorkspaceLayout
                          title="Dashboard Konselor"
                          subtitle="Kelola jadwal sesi dan antrean konsultasi mahasiswa"
                          badge="Konselor"
                          onOpenSidebar={() => setIsSidebarOpen(true)}
                          onOpenChangelog={() => setIsChangelogOpen(true)}
                        >
                          <CounselorDashboard />
                        </WorkspaceLayout>
                      }
                    />
                    <Route
                      path="/emergency"
                      element={
                        <WorkspaceLayout
                          title="Pusat Bantuan Krisis & Darurat"
                          subtitle="Layanan tanggap cepat, tele-konseling krisis, dan tombol darurat SOS 24 jam"
                          badge="24 Jam"
                          onOpenSidebar={() => setIsSidebarOpen(true)}
                          onOpenChangelog={() => setIsChangelogOpen(true)}
                        >
                          <div className="max-w-4xl mx-auto p-3 sm:p-4 md:p-5 w-full">
                            <EmergencyCenter onTriggerSOS={() => showToast('Sinyal SOS darurat diaktifkan.', 'info')} />
                          </div>
                        </WorkspaceLayout>
                      }
                    />
                    {/* Fallback route */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </motion.div>
              </AnimatePresence>
            </Suspense>
          </GlobalErrorBoundary>
        )}
      </div>

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
              setShowOnboarding(false);
              if (starterPrompt) {
                safeLocalStorage.setItem('draft_new', starterPrompt);
                navigate('/');
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
    </div>
  );
}
