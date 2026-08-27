import { useAuth } from "./contexts/AuthContext";
import { apiClient } from "./lib/apiClient";
import React, { useState, useEffect, Suspense, lazy } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import Sidebar from './components/layout/Sidebar';
import { Menu, WifiOff } from 'lucide-react';
import { Chat } from './features/chat/types';
import MainChat from './features/chat/components/MainChat';
import { WorkspaceLayout } from './components/layout/WorkspaceLayout';

const UserProgressTracker = lazyWithRetry(() => import('./features/mood/UserProgressTracker').then(module => ({ default: module.UserProgressTracker })));
const ScreeningModal = lazyWithRetry(() => import('./features/screening/ScreeningModal').then(module => ({ default: module.ScreeningModal })));
const CounselorDirectory = lazyWithRetry(() => import('./features/counselors/CounselorDirectory').then(module => ({ default: module.CounselorDirectory })));
const AppointmentScheduler = lazyWithRetry(() => import('./features/appointments/AppointmentScheduler').then(module => ({ default: module.AppointmentScheduler })));
const EmergencyCenter = lazyWithRetry(() => import('./components/EmergencyCenter').then(module => ({ default: module.EmergencyCenter })));
import { Counselor } from './types';

// Helper for resilient lazy loading with retry
function lazyWithRetry<T extends React.ComponentType<any>>(factory: () => Promise<{ default: T } | any>) {
  return lazy(() =>
    factory().catch((err) => {
      console.warn('Dynamic import failed, retrying...', err);
      return new Promise((resolve) => setTimeout(resolve, 300)).then(() => factory());
    })
  );
}

const AuthModal = lazyWithRetry(() => import('./features/authentication/AuthModal').then(module => ({ default: module.AuthModal })));
const SettingsPage = lazyWithRetry(() => import('./features/settings/SettingsPage').then(module => ({ default: module.SettingsPage })));
const CounselorDashboard = lazyWithRetry(() => import('./features/counselors/CounselorDashboard').then(module => ({ default: module.CounselorDashboard })));

export default function App() {
  const { user, setUser, loading, isOffline, logout } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [chats, setChats] = useState<Chat[]>([]);
  const [isLoadingChats, setIsLoadingChats] = useState(true);
  const [selectedCounselor, setSelectedCounselor] = useState<Counselor | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

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
      } else {
        setChats([]);
        if (res.status !== 401) {
          console.warn('Fetch chats failed:', res.error);
        }
      }
    } catch (err) {
      console.warn('Failed to fetch chat history:', err);
      setChats([]);
    } finally {
      setIsLoadingChats(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchChats();
    }
  }, [user]);

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
    } catch (err) {
      console.error('Failed to delete chat:', err);
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
    } catch (err) {
      console.error('Failed to update title:', err);
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
    } catch (err) {
      console.error('Failed to toggle pin:', err);
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
      } catch (err) {
        console.error('Failed to toggle archive:', err);
        setChats(originalChats);
        fetchChats();
      }
    }
  };

  const handleLogout = async () => {
    try {
      await apiClient.post('/api/v1/auth/logout');
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setUser({
    id: 'guest',
    name: 'Mahasiswa / Tamu (Anonim)',
    email: 'anonim@kampus.ac.id',
    role: 'guest',
    tier: 'Free',
    usageStats: { chatMessagesSent: 0, appointmentsBooked: 0 }
  } as any);
      setChats([]);
    }
  };

  if (loading) {
    return <div className="flex h-[100dvh] items-center justify-center bg-white"><div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div></div>;
  }

  if (!user) {
    return (
      <Suspense fallback={<div className="flex h-[100dvh] items-center justify-center bg-white"><div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div></div>}>
        <AuthModal isOpen={true} onClose={() => {}} currentSession={null as any} onLogin={(u) => setUser(u)} onLogout={() => {}} />
      </Suspense>
    );
  }

  if (user.role === 'konselor') {
    return (
      <div className="flex min-h-[100dvh] w-full bg-white text-slate-900 font-sans">
        {isSettingsOpen && (
          <div className="fixed inset-0 bg-slate-50 z-50 flex flex-col overflow-hidden">
            <div className="p-4 border-b flex items-center bg-white shadow-sm">
              <button onClick={() => setIsSettingsOpen(false)} className="mr-4 text-slate-500 hover:text-slate-800" aria-label="Kembali">&larr; Kembali</button>
              <h2 className="font-bold">Pengaturan & Profil</h2>
            </div>
            <div className="flex-1 overflow-y-auto">
               <Suspense fallback={<div className="p-4 text-center text-slate-500">Memuat pengaturan...</div>}>
                 <SettingsPage userSession={user} setUserSession={(u) => setUser(u)} onOpenAuth={() => setIsAuthModalOpen(true)} onOpenScreening={() => {}} onOpenLegal={() => {}} />
               </Suspense>
            </div>
          </div>
        )}
        <Suspense fallback={<div className="flex h-[100dvh] items-center justify-center bg-white"><div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div></div>}>
          <CounselorDashboard />
        </Suspense>
      </div>
    );
  }

  return (
    <div className="flex w-full h-[100dvh] bg-white text-slate-900 font-sans relative overflow-hidden">
      {isOffline && (
        <div className="absolute top-0 left-0 right-0 z-50 bg-amber-500 text-white px-4 py-2 text-sm font-medium flex items-center justify-center gap-2 shadow-md animate-in slide-in-from-top">
          <WifiOff size={16} />
          Koneksi ke server terputus. Beberapa fitur mungkin tidak berfungsi.
        </div>
      )}
      <Sidebar 
        isOpen={isSidebarOpen} 
        setIsOpen={setIsSidebarOpen} 
        onNewChat={() => navigate('/')}
        chats={chats}
        currentChatId={location.pathname.startsWith('/c/') ? location.pathname.split('/c/')[1] : undefined}
        onSelectChat={(id) => navigate(`/c/${id}`)}
        onDeleteChat={handleDeleteChat}
        onUpdateTitle={handleUpdateTitle}
        onTogglePin={handleTogglePin}
        onToggleArchive={handleToggleArchive}
        onLogout={handleLogout}
        onOpenSettings={() => setIsSettingsOpen(true)}
        isLoading={isLoadingChats}
      />
      
      <div className="flex-1 flex flex-col relative min-w-0">
        {isSettingsOpen ? (
          <div className="absolute inset-0 bg-slate-50 z-20 flex flex-col overflow-hidden">
            <div className="p-4 border-b flex items-center bg-white shadow-sm shrink-0">
              <button onClick={() => setIsSettingsOpen(false)} className="mr-4 text-slate-500 hover:text-slate-800" aria-label="Kembali">&larr; Kembali</button>
              <h2 className="font-bold">Pengaturan & Profil</h2>
            </div>
            <div className="flex-1 overflow-y-auto min-w-0">
               <Suspense fallback={<div className="p-4 text-center text-slate-500">Memuat pengaturan...</div>}>
                 <SettingsPage userSession={user} setUserSession={(u) => setUser(u)} onOpenAuth={() => setIsAuthModalOpen(true)} onOpenScreening={() => {}} onOpenLegal={() => {}} />
               </Suspense>
            </div>
          </div>
        ) : (
          <Suspense fallback={<div className="flex h-full items-center justify-center bg-white"><div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div></div>}>
            <Routes>
              <Route path="/" element={<MainChat user={user} setChats={setChats} onOpenSidebar={() => setIsSidebarOpen(true)} onOpenSettings={() => setIsSettingsOpen(true)} />} />
              <Route path="/c/:chatId" element={<MainChat user={user} setChats={setChats} onOpenSidebar={() => setIsSidebarOpen(true)} onOpenSettings={() => setIsSettingsOpen(true)} />} />
              <Route
                path="/mood"
                element={
                  <WorkspaceLayout
                    title="Mood Tracker & Progress"
                    subtitle="Pantau perkembangan kesehatan mental dan emosi Anda secara berkala"
                    badge="Lokal & Privat"
                    onOpenSidebar={() => setIsSidebarOpen(true)}
                  >
                    <UserProgressTracker
                      onOpenScreening={() => navigate('/screening')}
                      onNavigateToSchedule={() => navigate('/counselors')}
                    />
                  </WorkspaceLayout>
                }
              />
              <Route
                path="/screening"
                element={
                  <WorkspaceLayout
                    title="Skrining Mandiri (PHQ-9 & GAD-7)"
                    subtitle="Instrumen skrining awal mandiri. BUKAN alat diagnosis medis."
                    badge="UNVERIFIED"
                    onOpenSidebar={() => setIsSidebarOpen(true)}
                  >
                    <ScreeningModal
                      isOpen={true}
                      isPageMode={true}
                      onClose={() => navigate('/')}
                      onComplete={() => {}}
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
                  >
                    <div className="max-w-7xl mx-auto flex flex-col xl:flex-row gap-6 p-3 sm:p-6 w-full">
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
                path="/emergency"
                element={
                  <WorkspaceLayout
                    title="Pusat Bantuan Krisis & Darurat"
                    subtitle="Layanan tanggap cepat, tele-konseling krisis, dan tombol darurat SOS 24 jam"
                    badge="24 Jam"
                    onOpenSidebar={() => setIsSidebarOpen(true)}
                  >
                    <div className="max-w-4xl mx-auto p-3 sm:p-6 w-full">
                      <EmergencyCenter onTriggerSOS={() => {}} />
                    </div>
                  </WorkspaceLayout>
                }
              />
              {/* Fallback route */}
              <Route path="*" element={<MainChat user={user} setChats={setChats} onOpenSidebar={() => setIsSidebarOpen(true)} onOpenSettings={() => setIsSettingsOpen(true)} />} />
            </Routes>
          </Suspense>
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
              setUser(null);
              setIsAuthModalOpen(false);
            }} 
          />
        </Suspense>
      )}
    </div>
  );
}
