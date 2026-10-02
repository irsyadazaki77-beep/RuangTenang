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
const CounselorDashboard = lazyWithRetry(() => import('../../features/counselors/CounselorDashboard').then(module => ({ default: module.CounselorDashboard })));
const CounselorPortal = lazyWithRetry(() => import('../../features/counselor-portal/CounselorPortal').then(module => ({ default: module.CounselorPortal })));

export interface AppRoute {
  path: string;
  element: ReactNode;
  mode?: 'ruangtenang' | 'ruangkerja';
  sidebarSection?: string;
  requiresAuth?: boolean;
}

export interface StudentRouteContext {
  user: UserSession;
  setUser: (user: UserSession | null) => void;
  chats: Chat[];
  setChats: React.Dispatch<React.SetStateAction<Chat[]>>;
  selectedCounselor: Counselor | null;
  setSelectedCounselor: (counselor: Counselor | null) => void;
  onSwitchMode: (mode: WorkspaceMode) => void;
  onOpenSidebar: () => void;
  onOpenSettings: () => void;
  onOpenChangelog: () => void;
  onPersisted: () => void;
  onTriggerSOS: () => void;
  navigate: (path: string) => void;
}

const canAccessCounselorTools = (role: string) => role === 'konselor' || role === 'admin' || role === 'peer_counselor';

export function createStudentRoutes(context: StudentRouteContext): AppRoute[] {
  const {
    user, setUser, chats, setChats, selectedCounselor, setSelectedCounselor,
    onSwitchMode, onOpenSidebar, onOpenSettings, onOpenChangelog, onPersisted, onTriggerSOS, navigate
  } = context;
  const openProps = { onOpenSidebar, onOpenSettings, onOpenChangelog };
  const mainChat = <MainChat user={user} chats={chats} setChats={setChats} {...openProps} />;
  const workspace = <StudentWorkspace user={user} chats={chats} setChats={setChats} {...openProps} onSwitchMode={onSwitchMode} />;
  const layout = (title: string, subtitle: string, badge: string, children: ReactNode) => (
    <WorkspaceLayout title={title} subtitle={subtitle} badge={badge} onOpenSidebar={onOpenSidebar} onOpenChangelog={onOpenChangelog}>
      {children}
    </WorkspaceLayout>
  );

  return [
    { path: '/', element: mainChat, mode: 'ruangtenang', sidebarSection: 'primary' },
    { path: '/c/:chatId', element: mainChat, mode: 'ruangtenang', sidebarSection: 'history' },
    { path: '/workspace', element: workspace, mode: 'ruangkerja', sidebarSection: 'primary' },
    { path: '/workspace/c/:chatId', element: workspace, mode: 'ruangkerja', sidebarSection: 'history' },
    {
      path: '/mood', sidebarSection: 'tools',
      element: layout('Mood Tracker & Progress', 'Pantau perkembangan kesehatan mental dan emosi Anda secara berkala', 'Lokal & Privat',
        <PrivacyGuard title="Bilik Catatan Suasana Hati Terkunci" description="Jurnal mood dan catatan emosional Anda dilindungi dengan PIN keamanan terenkripsi.">
          <UserProgressTracker onOpenScreening={() => navigate('/screening')} onNavigateToSchedule={() => navigate('/counselors')} />
        </PrivacyGuard>)
    },
    {
      path: '/mindfulness', sidebarSection: 'tools',
      element: layout('Workshop Meditasi & Tenang Mandiri', 'Latih ketenangan diri, atasi panik, dan catat jurnal syukur harian', 'Lokakarya Batin', <MindfulnessWorkshop />)
    },
    {
      path: '/screening', sidebarSection: 'tools',
      element: layout('Cek Kondisi Mental', 'Instrumen cek kondisi awal mandiri. BUKAN alat diagnosis medis.', 'Cek Kondisi',
        <PrivacyGuard title="Riwayat Skrining Terkunci" description="Hasil evaluasi mandiri PHQ-9 & GAD-7 Anda dilindungi dengan PIN keamanan terenkripsi.">
          <ScreeningModal isOpen isPageMode onClose={() => navigate('/mood')} onComplete={() => undefined} onPersisted={onPersisted} />
        </PrivacyGuard>)
    },
    {
      path: '/counselors', sidebarSection: 'tools',
      element: layout('Jadwal & Direktori Konselor', 'Lihat profil konselor yang tersedia dan ajukan sesi pendampingan. Kebijakan privasi mengikuti layanan kampus dan RuangTenang.', 'Direktori',
        <div className="max-w-7xl mx-auto p-3 sm:p-4 md:p-5 w-full space-y-4">
          <div className="surface-card rounded-2xl p-3 sm:p-4 border border-teal-200/60 dark:border-teal-900/60 bg-teal-50/40 dark:bg-teal-950/20 flex flex-col md:flex-row items-center justify-between gap-3 shadow-3xs">
            <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="w-8 h-8 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-3xs">1-2-3</div>
              <div><h3 className="text-xs sm:text-sm font-bold text-teal-900 dark:text-teal-200">Alur Pemesanan Sesi Konseling Terstruktur</h3><p className="text-[11px] text-teal-700 dark:text-teal-400">1. Pilih Konselor → 2. Pilih Slot & Waktu → 3. Konfirmasi Jadwal</p></div>
            </div>
            <div className="flex items-center gap-2 text-[11px] font-semibold text-teal-800 dark:text-teal-300 shrink-0">
              <span className="px-2.5 py-1 rounded-lg bg-teal-100/80 dark:bg-teal-900/50 border border-teal-200/80 dark:border-teal-800">{selectedCounselor ? `Konselor Terpilih: ${selectedCounselor.name}` : 'Pilih konselor dari direktori di bawah'}</span>
            </div>
          </div>
          <div className="flex flex-col xl:flex-row gap-3.5 sm:gap-4.5">
            <div className="flex-1 xl:w-2/3"><CounselorDirectory onSelectCounselorForBooking={setSelectedCounselor} /></div>
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
        <div className="max-w-4xl mx-auto p-3 sm:p-4 md:p-5 w-full"><EmergencyCenter onTriggerSOS={onTriggerSOS} /></div>)
    },
    { path: '*', element: <Navigate to="/" replace /> }
  ];
}
