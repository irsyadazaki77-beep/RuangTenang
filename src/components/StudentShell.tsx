import React, { Suspense } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { WifiOff } from 'lucide-react';
import { UserSession, Counselor } from '../types';
import { Chat } from '../features/chat/types';
import { WorkspaceMode } from '../features/workspace/types';
import { lazyWithRetry } from '../lib/lazyWithRetry';
import { GlobalErrorBoundary } from './error/GlobalErrorBoundary';
import Sidebar from './layout/Sidebar';
import ChatAuroraBackground from '../features/chat/components/ChatAuroraBackground';
import { WorkspaceLayout } from './layout/WorkspaceLayout';
import { PrivacyGuard } from '../features/privacy/PrivacyGuard';
import { GlobalOverlays } from './GlobalOverlays';
import MainChat from '../features/chat/components/MainChat';
import { safeLocalStorage } from '../lib/storage';

const UserProgressTracker = lazyWithRetry(() => import('../features/mood/UserProgressTracker').then(module => ({ default: module.UserProgressTracker })));
const MindfulnessWorkshop = lazyWithRetry(() => import('../features/mood/MindfulnessWorkshop').then(module => ({ default: module.MindfulnessWorkshop })));
const ScreeningModal = lazyWithRetry(() => import('../features/screening/ScreeningModal').then(module => ({ default: module.ScreeningModal })));
const CounselorDirectory = lazyWithRetry(() => import('../features/counselors/CounselorDirectory').then(module => ({ default: module.CounselorDirectory })));
const AppointmentScheduler = lazyWithRetry(() => import('../features/appointments/AppointmentScheduler').then(module => ({ default: module.AppointmentScheduler })));
const EmergencyCenter = lazyWithRetry(() => import('./EmergencyCenter').then(module => ({ default: module.EmergencyCenter })));
const SettingsPage = lazyWithRetry(() => import('../features/settings/SettingsPage').then(module => ({ default: module.SettingsPage })));
const StudentWorkspace = lazyWithRetry(() => import('../features/workspace/StudentWorkspace').then(module => ({ default: module.StudentWorkspace })));
const CounselorDashboard = lazyWithRetry(() => import('../features/counselors/CounselorDashboard').then(module => ({ default: module.CounselorDashboard })));
const CounselorPortal = lazyWithRetry(() => import('../features/counselor-portal/CounselorPortal').then(module => ({ default: module.CounselorPortal })));

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
  const shouldReduceMotion = useReducedMotion();

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
        currentChatId={
          location.pathname.startsWith('/c/') 
            ? location.pathname.split('/c/')[1] 
            : (location.pathname.startsWith('/workspace/c/') 
              ? location.pathname.split('/workspace/c/')[1] 
              : undefined)
        }
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
                          <PrivacyGuard
                            title="Bilik Catatan Suasana Hati Terkunci"
                            description="Jurnal mood dan catatan emosional Anda dilindungi dengan PIN keamanan terenkripsi."
                          >
                            <UserProgressTracker
                              onOpenScreening={() => navigate('/screening')}
                              onNavigateToSchedule={() => navigate('/counselors')}
                            />
                          </PrivacyGuard>
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
                          <PrivacyGuard
                            title="Riwayat Skrining Terkunci"
                            description="Hasil evaluasi mandiri PHQ-9 & GAD-7 Anda dilindungi dengan PIN keamanan terenkripsi."
                          >
                            <ScreeningModal
                              isOpen={true}
                              isPageMode={true}
                              onClose={() => navigate('/mood')}
                              onComplete={() => {}}
                              onPersisted={() => {
                                showToast('Skrining berhasil disimpan ke profil Anda.', 'success');
                              }}
                            />
                          </PrivacyGuard>
                        </WorkspaceLayout>
                      }
                    />
                    <Route
                      path="/counselors"
                      element={
                        <WorkspaceLayout
                          title="Jadwal & Direktori Konselor"
                          subtitle="Temui konselor atau psikolog berlisensi untuk pendampingan rahasia & aman."
                          badge="Terverifikasi"
                          onOpenSidebar={() => setIsSidebarOpen(true)}
                          onOpenChangelog={() => setIsChangelogOpen(true)}
                        >
                          <div className="max-w-7xl mx-auto p-3 sm:p-4 md:p-5 w-full space-y-4">
                            <div className="surface-card rounded-2xl p-3 sm:p-4 border border-teal-200/60 dark:border-teal-900/60 bg-teal-50/40 dark:bg-teal-950/20 flex flex-col md:flex-row items-center justify-between gap-3 shadow-3xs">
                              <div className="flex items-center gap-3 w-full md:w-auto">
                                <div className="w-8 h-8 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-3xs">
                                  1-2-3
                                </div>
                                <div>
                                  <h3 className="text-xs sm:text-sm font-bold text-teal-900 dark:text-teal-200">
                                    Alur Pemesanan Sesi Konseling Terstruktur
                                  </h3>
                                  <p className="text-[11px] text-teal-700 dark:text-teal-400">
                                    1. Pilih Konselor → 2. Pilih Slot & Waktu → 3. Konfirmasi Jadwal
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 text-[11px] font-semibold text-teal-800 dark:text-teal-300 shrink-0">
                                <span className="px-2.5 py-1 rounded-lg bg-teal-100/80 dark:bg-teal-900/50 border border-teal-200/80 dark:border-teal-800">
                                  {selectedCounselor ? `Konselor Terpilih: ${selectedCounselor.name}` : 'Pilih konselor dari direktori di bawah'}
                                </span>
                              </div>
                            </div>

                            <div className="flex flex-col xl:flex-row gap-3.5 sm:gap-4.5">
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
                    <Route path="*" element={<Navigate to="/" replace />} />
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
