import React, { type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { UserSession, Counselor } from '../../types';
import { Chat } from '../../features/chat/types';
import { WorkspaceMode } from '../../features/workspace/types';
import { lazyWithRetry } from '../../lib/lazyWithRetry';
import { WorkspaceLayout } from '../../components/layout/WorkspaceLayout';
import { PrivacyGuard } from '../../features/privacy/PrivacyGuard';

const MainChat = lazyWithRetry(() => import('../../features/chat/components/MainChat'));
const UserProgressTracker = lazyWithRetry(() => import('../../features/mood/UserProgressTracker').then(module => ({ default: module.UserProgressTracker })));
const MindfulnessWorkshop = lazyWithRetry(() => import('../../features/mood/MindfulnessWorkshop').then(module => ({ default: module.MindfulnessWorkshop })));
const ScreeningModal = lazyWithRetry(() => import('../../features/screening/ScreeningModal').then(module => ({ default: module.ScreeningModal })));
const CounselorDirectory = lazyWithRetry(() => import('../../features/counselors/CounselorDirectory').then(module => ({ default: module.CounselorDirectory })));
const AppointmentScheduler = lazyWithRetry(() => import('../../features/appointments/AppointmentScheduler').then(module => ({ default: module.AppointmentScheduler })));
const EmergencyCenter = lazyWithRetry(() => import('../../components/EmergencyCenter').then(module => ({ default: module.EmergencyCenter })));
const StudentWorkspace = lazyWithRetry(() => import('../../features/workspace/StudentWorkspace').then(module => ({ default: module.StudentWorkspace })));
const WorkspaceHome = lazyWithRetry(() => import('../../features/workspace/WorkspaceHome').then(module => ({ default: module.WorkspaceHome })));
const WorkspaceEntry = lazyWithRetry(() => import('../../features/workspace/WorkspaceEntry').then(module => ({ default: module.WorkspaceEntry })));
const RuangCoderIDE = lazyWithRetry(() => import('../../features/coder/RuangCoderIDE').then(module => ({ default: module.RuangCoderIDE })));
const CounselorDashboard = lazyWithRetry(() => import('../../features/counselors/CounselorDashboard').then(module => ({ default: module.CounselorDashboard })));
const CounselorPortal = lazyWithRetry(() => import('../../features/counselor-portal/CounselorPortal').then(module => ({ default: module.CounselorPortal })));

export interface AppRoute {
  path: string;
  element: ReactNode;
  mode?: 'ruangtenang' | 'ruangkerja' | 'ruangcoder';
  sidebarSection?: string;
  requiresAuth?: boolean;
}

export interface StudentRouteContext {
  user: UserSession;
  setUser: (user: UserSession | null) => void;
  chats: Chat[];
  setChats: React.Dispatch<React.SetStateAction<Chat[]>>;
  isLoadingChats?: boolean;
  selectedCounselor: Counselor | null;
  setSelectedCounselor: (counselor: Counselor | null) => void;
  onSwitchMode: (mode: WorkspaceMode) => void;
  onOpenSidebar: () => void;
  onOpenSettings: () => void;
  onOpenPrivacyCenter?: () => void;
  onOpenChangelog: () => void;
  aiConsentAllowed?: boolean | null;
  aiConsentPromptOpen?: boolean;
  onRequestAiConsent?: (cancelPendingSend?: () => void) => void;
  onPersisted: () => void;
  navigate: (path: string) => void;
}

const canAccessCounselorTools = (role: string) => role === 'konselor' || role === 'admin' || role === 'peer_counselor';

export function createStudentRoutes(context: StudentRouteContext): AppRoute[] {
  const {
    user, setUser, chats, setChats, isLoadingChats = false, selectedCounselor, setSelectedCounselor,
    onSwitchMode, onOpenSidebar, onOpenSettings, onOpenPrivacyCenter, onOpenChangelog,
    aiConsentAllowed, aiConsentPromptOpen, onRequestAiConsent, onPersisted, navigate
  } = context;
  const openProps = { onOpenSidebar, onOpenSettings, onOpenChangelog };
  const consentProps = { aiConsentAllowed, onRequestAiConsent };
  const mainChat = <MainChat key={`${user.id}:${user.role}`} user={user} chats={chats} setChats={setChats} onOpenPrivacyCenter={onOpenPrivacyCenter} {...openProps} {...consentProps} aiConsentPromptOpen={aiConsentPromptOpen} />;
  const workspace = <StudentWorkspace user={user} chats={chats} setChats={setChats} {...openProps} {...consentProps} onSwitchMode={onSwitchMode} />;
  const layout = (title: string, subtitle: string, badge: string, children: ReactNode) => (
    <WorkspaceLayout title={title} subtitle={subtitle} badge={badge} onOpenSidebar={onOpenSidebar} onOpenChangelog={onOpenChangelog}>
      {children}
    </WorkspaceLayout>
  );

  return [
    { path: '/', element: mainChat, mode: 'ruangtenang', sidebarSection: 'primary' },
    { path: '/c/:chatId', element: mainChat, mode: 'ruangtenang', sidebarSection: 'history' },
    { path: '/workspace', element: <WorkspaceHome key={`${user.id}:${user.role}`} chats={chats} isLoading={isLoadingChats} isGuest={user.role === 'guest'} onOpenSidebar={onOpenSidebar} />, mode: 'ruangkerja', sidebarSection: 'primary' },
    { path: '/workspace/new', element: <WorkspaceEntry user={user} chats={chats} setChats={setChats} {...openProps} {...consentProps} onSwitchMode={onSwitchMode} />, mode: 'ruangkerja', sidebarSection: 'primary' },
    { path: '/workspace/c/:chatId', element: workspace, mode: 'ruangkerja', sidebarSection: 'history' },
    { path: '/coder', element: <RuangCoderIDE onOpenSidebar={onOpenSidebar} onSwitchMode={onSwitchMode} />, mode: 'ruangcoder', sidebarSection: 'primary' },
    { path: '/ruang-coder', element: <RuangCoderIDE onOpenSidebar={onOpenSidebar} onSwitchMode={onSwitchMode} />, mode: 'ruangcoder', sidebarSection: 'primary' },
    {
      path: '/mood', sidebarSection: 'tools',
      element: layout('Mood Tracker & Progress', 'Catat perasaanmu hari ini dan kenali polanya dari waktu ke waktu dengan tenang.', 'Mood & Jurnal',
        <PrivacyGuard title="Bilik Catatan Suasana Hati Terkunci" description="Ruang pribadi ini dikunci dengan PIN demi kenyamanan privasimu di sesi browser ini.">
          <UserProgressTracker key={`${user.id}:${user.role}`} onOpenScreening={() => navigate('/screening')} onNavigateToSchedule={() => navigate('/counselors')} onOpenPrivacyCenter={onOpenPrivacyCenter} />
        </PrivacyGuard>)
    },
    {
      path: '/mindfulness', sidebarSection: 'tools',
      element: layout('Workshop Meditasi & Tenang Mandiri', 'Ambil jeda sejenak untuk latihan napas, audio penenang, dan refleksi diri.', 'Lokakarya Batin',
        <PrivacyGuard title="Lokakarya Pribadi Terkunci" description="Ruang pribadi ini dikunci dengan PIN demi kenyamanan privasimu di sesi browser ini.">
          <MindfulnessWorkshop key={`${user.id}:${user.role}`} userId={user.id} />
        </PrivacyGuard>)
    },
    {
      path: '/screening', sidebarSection: 'tools',
      element: layout('Cek Kondisi Mental', 'Refleksi kondisi emosional mandiri secara berkala (bukan diagnosis medis).', 'Cek Kondisi',
        <PrivacyGuard title="Riwayat Skrining Terkunci" description="Ruang pribadi ini dikunci dengan PIN demi kenyamanan privasimu di sesi browser ini.">
          <ScreeningModal key={`${user.id}:${user.role}`} isOpen isPageMode onClose={() => navigate('/mood')} onComplete={() => undefined} onPersisted={onPersisted} />
        </PrivacyGuard>)
    },
    {
      path: '/counselors', sidebarSection: 'tools',
      element: layout('Jadwal & Direktori Konselor', 'Temukan konselor kampus yang tepat untuk mendampingi ceritamu.', 'Direktori',
        <div className="max-w-7xl mx-auto p-3 sm:p-4 md:p-5 w-full space-y-4">
          <div className="surface-card rounded-2xl p-3.5 sm:p-4 border border-teal-200/60 dark:border-teal-800/50 bg-gradient-to-r from-teal-50/70 via-white/90 to-emerald-50/50 dark:from-teal-950/35 dark:via-[#141b23] dark:to-emerald-950/20 flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="w-9 h-9 rounded-2xl bg-teal-700 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-[0_6px_16px_-4px_rgba(13,148,136,0.35)]">1-2-3</div>
              <div><h3 className="text-xs sm:text-sm font-bold text-teal-950 dark:text-teal-100">Langkah Mudah Menjadwalkan Sesi</h3><p className="text-[11.5px] text-teal-700 dark:text-teal-300/90">1. Pilih Konselor → 2. Pilih Waktu yang Nyaman → 3. Konfirmasi Jadwal</p></div>
            </div>
            <div className="flex items-center gap-2 text-[11px] font-semibold text-teal-800 dark:text-teal-200 shrink-0">
              <span className="px-3 py-1 rounded-full bg-teal-100/80 dark:bg-teal-900/50 border border-teal-200/80 dark:border-teal-800/70">{selectedCounselor ? `Konselor Terpilih: ${selectedCounselor.name}` : 'Pilih konselor dari daftar di bawah'}</span>
            </div>
          </div>
          <div className="flex flex-col xl:flex-row gap-3.5 sm:gap-4.5">
            <div className="flex-1 xl:w-2/3"><CounselorDirectory key={`${user.id}:${user.role}:${user.campusId || ''}`} onSelectCounselorForBooking={setSelectedCounselor} /></div>
            <div className="xl:w-1/3"><AppointmentScheduler selectedCounselorFromDir={selectedCounselor} userSession={user} setUserSession={setUser} /></div>
          </div>
        </div>)
    },
    {
      path: '/counselor-portal', sidebarSection: 'tools', requiresAuth: true,
      element: canAccessCounselorTools(user.role)
        ? layout('Portal Layanan Konselor & Rekam Medis SOAP', 'Triase kasus klinis, catatan SOAP terenkripsi AES-256-GCM, dan analitik kampus', 'Konselor', <CounselorPortal />)
        : <Navigate to="/" replace />
    },
    {
      path: '/counselordashboard', sidebarSection: 'tools', requiresAuth: true,
      element: canAccessCounselorTools(user.role)
        ? layout('Dashboard Konselor', 'Kelola jadwal sesi dan antrean konsultasi mahasiswa', 'Konselor', <CounselorDashboard />)
        : <Navigate to="/" replace />
    },
    {
      path: '/emergency', sidebarSection: 'tools',
      element: layout('Pusat Bantuan Krisis & Darurat', 'Healing119, bantuan medis darurat, dan sinyal SOS ke kontak pilihan Anda', 'Bantuan',
        <div className="max-w-4xl mx-auto p-3 sm:p-4 md:p-5 w-full"><EmergencyCenter key={`${user.id}:${user.role}`} onOpenPrivacyCenter={onOpenPrivacyCenter} /></div>)
    },
    { path: '*', element: <Navigate to="/" replace /> }
  ];
}
