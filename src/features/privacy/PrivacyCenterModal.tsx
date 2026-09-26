import { useEscapeKey } from '../../hooks/useEscapeKey';
import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldCheck,
  X,
  Download,
  Edit3,
  Trash2,
  Clock,
  Eye,
  KeyRound,
  CheckCircle2,
  AlertTriangle,
  ChevronLeft, 
  ChevronRight,
  Lock,
  Ghost,
  Shield
} from 'lucide-react';
import { UserSession } from '../../types';
import { apiClient } from '../../lib/apiClient';
import { ErrorState } from '../../components/common/ErrorState';
import { EmptyState } from '../../components/common/EmptyState';
import { ConsentTab } from './components/ConsentTab';
import { ErasureTab } from './components/ErasureTab';

interface PrivacyCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  userSession: UserSession;
  setUserSession: (session: UserSession) => void;
}

export const PrivacyCenterModal: React.FC<PrivacyCenterModalProps> = ({
  isOpen,
  onClose,
  userSession,
  setUserSession
}) => {
  useEscapeKey(onClose, true);

  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
      if (e.key === 'Tab') {
        const focusableElements = modalRef.current?.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (!focusableElements || focusableElements.length === 0) return;
        const firstElement = focusableElements[0] as HTMLElement;
        const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            lastElement.focus();
            e.preventDefault();
          }
        } else {
          if (document.activeElement === lastElement) {
            firstElement.focus();
            e.preventDefault();
          }
        }
      }
    };
    
    // Set initial focus
    const focusable = modalRef.current?.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (focusable && focusable.length > 0) {
      (focusable[0] as HTMLElement).focus();
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  const [showMobileDetail, setShowMobileDetail] = useState(false);
  const [activeTab, setActiveTab] = useState<
    'consent' | 'export' | 'correct' | 'retention' | 'sessions' | 'access_logs' | 'erasure'
  >('consent');

  // Consent State
  const [consentForAI, setConsentForAI] = useState(false);
  const [consentForAIMood, setConsentForAIMood] = useState(false);
  const [consentForAIScreening, setConsentForAIScreening] = useState(false);
  const [consentForAIMemory, setConsentForAIMemory] = useState(false);
  const [consentForAIJournal, setConsentForAIJournal] = useState(false);
  const [consentForEmergencySOS, setConsentForEmergencySOS] = useState(false);
  const [consentForCounselorSummary, setConsentForCounselorSummary] = useState(false);
  const [consentForCounselorSharing, setConsentForCounselorSharing] = useState(false);
  const [consentForTelemetry, setConsentForTelemetry] = useState(false);
  const [consentForAnalytics, setConsentForAnalytics] = useState(false);
  const [retentionDays, setRetentionDays] = useState(90);
  const [consentVersion, setConsentVersion] = useState('v1.3-2026');
  const [policyVersion, setPolicyVersion] = useState('v2.0-PDP-2026');
  const [consentTimestamp, setConsentTimestamp] = useState<string | null>(null);

  // Correction Form State
  const [corrName, setCorrName] = useState(userSession.name || '');
  const [corrEmail, setCorrEmail] = useState(userSession.email || '');
  const [corrUniversity, setCorrUniversity] = useState(userSession.university || '');

  // Active Sessions & Logs
  const [sessions, setSessions] = useState<any[]>([]);
  const [staffAccessLogs, setStaffAccessLogs] = useState<any[]>([]);
  const [erasureStatus, setErasureStatus] = useState<any>(null);

  // Status & UI State
  const [loading, setLoading] = useState(false);
  const [initLoading, setInitLoading] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [deleteConfirmInput, setDeleteConfirmInput] = useState('');

  // Fetch current consent & privacy info
  const fetchPrivacyData = async () => {
    if (!isOpen || userSession.id === 'guest') return;
    setInitLoading(true);
    setInitError(null);
    try {
      // 1. Consent
      const resConsent = await apiClient.get<any>('/api/v1/privacy/consent');
      if (resConsent.success && resConsent.data) {
        const data = resConsent.data;
        if (data.consent) {
          setConsentForAI(!!data.consent.consentForAI);
          setConsentForAIMood(!!data.consent.consentForAIMood);
          setConsentForAIScreening(!!data.consent.consentForAIScreening);
          setConsentForAIMemory(!!data.consent.consentForAIMemory);
          setConsentForAIJournal(!!data.consent.consentForAIJournal);
          setConsentForEmergencySOS(!!data.consent.consentForEmergencySOS);
          setConsentForCounselorSummary(!!data.consent.consentForCounselorSummary);
          setConsentForCounselorSharing(!!data.consent.consentForCounselorSharing);
          setConsentForTelemetry(!!data.consent.consentForTelemetry);
          setConsentForAnalytics(!!data.consent.consentForAnalytics);
          setRetentionDays(data.consent.retentionDays || 90);
          setConsentVersion(data.consent.consentVersion || 'v1.3-2026');
          setPolicyVersion(data.consent.policyVersion || 'v2.0-PDP-2026');
          setConsentTimestamp(data.consent.consentTimestamp || data.consent.updatedAt || null);
        }
      } else {
         throw new Error(resConsent.error || 'Gagal memuat persetujuan AI.');
      }

      // 2. Active Sessions
      const resSess = await apiClient.get<any>('/api/v1/auth/sessions');
      if (resSess.success && resSess.data) {
        setSessions(resSess.data.sessions || []);
      }

      // 3. Staff Access Transparency Logs
      const resStaff = await apiClient.get<any>('/api/v1/privacy/staff-access-logs');
      if (resStaff.success && resStaff.data) {
        setStaffAccessLogs(resStaff.data.logs || []);
      }

      // 4. Erasure Status
      const resErasure = await apiClient.get<any>('/api/v1/privacy/erasure-status');
      if (resErasure.success && resErasure.data) {
        setErasureStatus(resErasure.data.erasureRecord || null);
      }
    } catch (err: any) {
      console.error('Gagal memuat data privasi:', err);
      setInitError(err.message || 'Terjadi kesalahan jaringan.');
    } finally {
      setInitLoading(false);
    }
  };

  useEffect(() => {
    fetchPrivacyData(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, userSession.id]);

  if (!isOpen) return null;

  // Save Consent Preferences
  const handleSaveConsent = async () => {
    setMsg(null);
    setLoading(true);
    try {
      const res = await apiClient.post<any>('/api/v1/privacy/consent', {
        consentForAI,
        consentForAIMood,
        consentForAIScreening,
        consentForAIMemory,
        consentForAIJournal,
        consentForEmergencySOS,
        consentForCounselorSummary,
        consentForCounselorSharing,
        consentForTelemetry,
        consentForAnalytics,
        retentionDays
      });
      if (res.success) {
        setMsg({ type: 'success', text: `Preferensi consent berhasil disimpan (Kebijakan ${policyVersion}, Versi ${consentVersion}).` });
        if (res.data?.record) {
          setConsentTimestamp(res.data.record.consentTimestamp);
        }
      } else {
        setMsg({ type: 'error', text: res.error || 'Gagal menyimpan consent.' });
      }
    } catch {
      setMsg({ type: 'error', text: 'Koneksi gagal. Periksa koneksi internet Anda.' });
    } finally {
      setLoading(false);
    }
  };

  // Revoke All Consents
  const handleRevokeAll = async () => {
    setConsentForAI(false);
    setConsentForAIMood(false);
    setConsentForAIScreening(false);
    setConsentForAIMemory(false);
    setConsentForAIJournal(false);
    setConsentForEmergencySOS(false);
    setConsentForCounselorSummary(false);
    setConsentForCounselorSharing(false);
    setConsentForTelemetry(false);
    setConsentForAnalytics(false);
    setMsg(null);
    setLoading(true);
    try {
      const res = await apiClient.post<any>('/api/v1/privacy/consent/revoke', {});
      if (res.success) {
        setMsg({ type: 'success', text: 'Seluruh izin persetujuan telah dicabut dan memori AI dibersihkan.' });
        fetchPrivacyData();  
      } else {
        setMsg({ type: 'error', text: res.error || 'Gagal mencabut consent.' });
      }
    } catch {
      setMsg({ type: 'error', text: 'Gagal mencabut consent.' });
    } finally {
      setLoading(false);
    }
  };

  // Clear Activity Data Only
  const handleClearActivityData = async () => {
    if (!window.confirm('Bersihkan seluruh riwayat chat, mood, dan skrining tanpa menghapus akun Anda?')) return;
    setLoading(true);
    setMsg(null);
    try {
      const res = await apiClient.delete<any>('/api/v1/privacy/activity');
      if (res.success) {
        setMsg({ type: 'success', text: 'Riwayat percakapan, catatan mood, dan skrining berhasil dibersihkan.' });
      } else {
        setMsg({ type: 'error', text: res.error || 'Gagal membersihkan data aktivitas.' });
      }
    } catch {
      setMsg({ type: 'error', text: 'Gagal menghubungi server.' });
    } finally {
      setLoading(false);
    }
  };

  // Download Data Export
  const handleDownloadData = async () => {
    try {
      const link = document.createElement('a');
      link.href = '/api/v1/privacy/download-data';
      link.setAttribute('download', 'ruangtenang_data_export.json');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setMsg({ type: 'success', text: 'Mengunduh berkas ekspor data lengkap Anda (.json)...' });
    } catch {
      setMsg({ type: 'error', text: 'Gagal mengunduh berkas data.' });
    }
  };

  // Submit Data Correction
  const handleSaveCorrection = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    setLoading(true);
    try {
      const res = await apiClient.post<any>('/api/v1/privacy/correct-data', {
        name: corrName,
        email: corrEmail,
        university: corrUniversity
      });
      if (res.success) {
        setMsg({ type: 'success', text: 'Data profil Anda telah berhasil diperbarui di basis data.' });
        if (res.data?.user) {
          setUserSession({
            ...userSession,
            name: res.data.user.name,
            email: res.data.user.email,
            university: res.data.user.university
          });
        }
      } else {
        setMsg({ type: 'error', text: res.error || 'Gagal memperbarui data.' });
      }
    } catch {
      setMsg({ type: 'error', text: 'Koneksi ke server gagal.' });
    } finally {
      setLoading(false);
    }
  };

  // Set Retention Policy
  const handleSaveRetention = async (days: number) => {
    setRetentionDays(days);
    setMsg(null);
    setLoading(true);
    try {
      const res = await apiClient.post<any>('/api/v1/privacy/retention-policy', { retentionDays: days });
      if (res.success) {
        setMsg({ type: 'success', text: res.data?.message || 'Periode penyimpanan berhasil diatur.' });
      } else {
        setMsg({ type: 'error', text: res.error || 'Gagal mengubah periode penyimpanan.' });
      }
    } catch {
      setMsg({ type: 'error', text: 'Gagal menghubungi server.' });
    } finally {
      setLoading(false);
    }
  };

  // Revoke Device Session
  const handleRevokeSession = async (sessionId: string) => {
    try {
      const res = await apiClient.post<any>('/api/v1/auth/sessions/revoke', { sessionId });
      if (res.success) {
        setMsg({ type: 'success', text: 'Sesi perangkat telah berhasil dicabut.' });
        fetchPrivacyData();  
      }
    } catch {
      setMsg({ type: 'error', text: 'Gagal mencabut sesi.' });
    }
  };

  // Execute Right to be Forgotten (Full Data Erasure)
  const handleExecuteErasure = async () => {
    if (deleteConfirmInput.trim() !== 'HAPUS SEMUA DATA SAYA') {
      setMsg({ type: 'error', text: 'Kalimat konfirmasi belum sesuai. Ketik "HAPUS SEMUA DATA SAYA".' });
      return;
    }

    setLoading(true);
    setMsg(null);
    try {
      const res = await apiClient.post<any>('/api/v1/privacy/erasure-request', { userId: userSession.id });
      if (res.success) {
        // Clear client local storage
        try { localStorage.clear(); } catch {}
        try { sessionStorage.clear(); } catch {}
        setMsg({ type: 'success', text: 'Seluruh data Anda telah berhasil dibersihkan secara permanen (Hak untuk Dilupakan). Memuat ulang sesi...' });
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        setMsg({ type: 'error', text: res.error || 'Gagal memproses penghapusan data.' });
      }
    } catch {
      setMsg({ type: 'error', text: 'Gagal memproses eksekusi penghapusan.' });
    } finally {
      setLoading(false);
    }
  };

  const tabItems = [
    { id: 'consent', label: 'Persetujuan AI', fullLabel: '1. Persetujuan AI & Fitur', icon: ShieldCheck },
    { id: 'export', label: 'Unduh Data', fullLabel: '2. Unduh Data (Portabilitas)', icon: Download },
    { id: 'correct', label: 'Koreksi Profil', fullLabel: '3. Koreksi Data Pribadi', icon: Edit3 },
    { id: 'retention', label: 'Masa Simpan', fullLabel: '4. Atur Masa Penyimpanan', icon: Clock },
    { id: 'sessions', label: 'Sesi Aktif', fullLabel: '5. Sesi Perangkat Aktif', icon: KeyRound },
    { id: 'access_logs', label: 'Akses Petugas', fullLabel: '6. Akses Petugas Data', icon: Eye },
    { id: 'erasure', label: 'Hapus Data', fullLabel: '7. Hak untuk Dilupakan', icon: Trash2 },
  ] as const;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center max-sm:items-start bg-slate-900/60 backdrop-blur-xs p-2 sm:p-4 max-sm:p-0 animate-fade-in font-sans">
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="privacy-modal-title"
        className="surface-card text-primary rounded-2xl max-sm:rounded-none shadow-xl border border-default w-full max-w-4xl max-h-[90vh] max-sm:h-[100dvh] max-sm:max-h-[100dvh] max-sm:w-full max-sm:animate-slide-up flex flex-col overflow-hidden relative transition-all duration-200"
      >
        
        {/* Header */}
        <div className="px-4 sm:px-6 py-3.5 surface-card text-primary flex items-center justify-between shrink-0 border-b border-default">
          <div className="flex items-center gap-3">
            <div className="p-2 surface-muted border border-default rounded-xl text-teal-600 dark:text-teal-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 id="privacy-modal-title" className="text-sm sm:text-base font-bold text-primary flex items-center gap-2">
                Pusat Privasi & Hak Data Pengguna
                <span className="px-2 py-0.5 bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-400 text-[10px] font-semibold rounded-full border border-teal-200 dark:border-teal-800/50">
                  Prinsip UU PDP
                </span>
              </h2>
              <p className="text-xs text-secondary mt-0.5 hidden sm:block">
                Kelola persetujuan AI, ekspor data, koreksi profil, dan hak penghapusan data
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Tutup Pusat Privasi"
            className="p-1.5 rounded-lg text-secondary hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-800 transition min-h-[40px] min-w-[40px] flex items-center justify-center cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Global Feedback Banner */}
        {msg && (
          <div className={`px-4 sm:px-6 py-2 text-xs font-semibold flex items-center gap-2 border-b ${
            msg.type === 'success' ? 'bg-teal-50 dark:bg-teal-950/30 text-teal-900 dark:text-teal-300 border-teal-200 dark:border-teal-900/50' : 'bg-rose-50 dark:bg-rose-950/30 text-rose-900 dark:text-rose-300 border-rose-200 dark:border-rose-900/50'
          }`}>
            {msg.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" /> : <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />}
            <span>{msg.text}</span>
          </div>
        )}

        
        {/* Modal Layout: Sidebar + Main Content */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden surface-page">
          
          {/* Unified Navigation Sidebar */}
          <div className={`w-full md:w-64 md:flex-col surface-muted border-r border-default p-2.5 space-y-1 shrink-0 overflow-y-auto ${showMobileDetail ? 'hidden md:flex' : 'flex flex-col'}`}>
            {tabItems.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => { setActiveTab(tab.id); setMsg(null); setShowMobileDetail(true); }}
                  className={`w-full text-left px-3 py-2 min-h-[44px] rounded-xl text-xs font-semibold transition-colors flex items-center justify-between cursor-pointer active:scale-[0.98] ${
                    isActive
                      ? tab.id === 'erasure' ? 'bg-rose-600 text-white shadow-3xs' : 'bg-teal-600 text-white shadow-3xs'
                      : tab.id === 'erasure' ? 'text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30' : 'text-secondary hover:text-primary hover:bg-slate-200/50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{tab.fullLabel}</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 md:hidden shrink-0" />
                </button>
              );
            })}
          </div>

          

          {/* Main Tab Panel */}
          <div className={`flex-1 p-4 sm:p-6 overflow-y-auto space-y-4 surface-page text-primary ${!showMobileDetail ? 'hidden md:block' : 'block'}`}>
            
            {/* TAB 1: Consent AI & Features */}
            {showMobileDetail && (
              <button 
                onClick={() => setShowMobileDetail(false)} 
                className="md:hidden flex items-center gap-1.5 text-xs font-semibold text-teal-600 dark:text-teal-400 hover:text-teal-700 px-3.5 py-2 mb-4 rounded-lg bg-teal-50 dark:bg-teal-900/40 cursor-pointer transition-all min-h-[44px] w-fit"
              >
                <ChevronLeft className="w-4 h-4" /> Kembali ke Kategori
              </button>
            )}

            {initLoading ? (
              <div className="animate-pulse space-y-4">
                <div className="h-8 bg-slate-100 rounded-lg w-1/3"></div>
                <div className="h-32 bg-slate-100 rounded-lg w-full"></div>
                <div className="h-32 bg-slate-100 rounded-lg w-full"></div>
              </div>
            ) : initError ? (
              <ErrorState
                type="network"
                title="Gagal Memuat Data Privasi"
                description={initError}
                onRetry={fetchPrivacyData}
                className="py-12"
              />
            ) : (
              <>
                {/* 3 Main Privacy Pillars Summary */}
                <div className="surface-muted border border-default p-3.5 rounded-2xl space-y-2 mb-4">
                  <h3 className="text-xs font-bold text-primary flex items-center gap-1.5 uppercase tracking-wide">
                    <Shield className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                    3 Pilar Utama Arsitektur Keamanan & Privasi RuangTenang
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11.5px]">
                    <div className="p-2.5 surface-card border border-default rounded-xl space-y-1">
                      <div className="font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1">
                        <Ghost className="w-3.5 h-3.5" />
                        1. Temporary / Incognito
                      </div>
                      <p className="text-secondary text-[10.5px] leading-tight">
                        Obrolan sementara efemeral. Teks diproses transient di RAM tanpa disimpan ke basis data atau cache browser.
                      </p>
                    </div>

                    <div className="p-2.5 surface-card border border-default rounded-xl space-y-1">
                      <div className="font-bold text-teal-700 dark:text-teal-400 flex items-center gap-1">
                        <Lock className="w-3.5 h-3.5" />
                        2. Private Vault (PIN)
                      </div>
                      <p className="text-secondary text-[10.5px] leading-tight">
                        Proteksi data sensitif (jurnal, mood, PHQ-9/GAD-7) dengan PIN WebCrypto + Server AES-256-GCM. Auto-lock 5 menit.
                      </p>
                    </div>

                    <div className="p-2.5 surface-card border border-default rounded-xl space-y-1">
                      <div className="font-bold text-blue-700 dark:text-blue-400 flex items-center gap-1">
                        <Shield className="w-3.5 h-3.5" />
                        3. Instant Conceal / Panic
                      </div>
                      <p className="text-secondary text-[10.5px] leading-tight">
                        Penyamaran layar cepat ke portal repositori jurnal akademik Sinta/Scopus via tombol, Alt+X, Ctrl+Shift+L, atau Dobel Esc.
                      </p>
                    </div>
                  </div>
                </div>

                {activeTab === 'consent' && (
                  <ConsentTab
                    loading={loading}
                    consentVersion={consentVersion}
                consentTimestamp={consentTimestamp}
                consentForAI={consentForAI}
                setConsentForAI={setConsentForAI}
                consentForAIMood={consentForAIMood}
                setConsentForAIMood={setConsentForAIMood}
                consentForAIScreening={consentForAIScreening}
                setConsentForAIScreening={setConsentForAIScreening}
                consentForAIMemory={consentForAIMemory}
                setConsentForAIMemory={setConsentForAIMemory}
                consentForAIJournal={consentForAIJournal}
                setConsentForAIJournal={setConsentForAIJournal}
                consentForEmergencySOS={consentForEmergencySOS}
                setConsentForEmergencySOS={setConsentForEmergencySOS}
                consentForCounselorSharing={consentForCounselorSharing}
                setConsentForCounselorSharing={setConsentForCounselorSharing}
                consentForCounselorSummary={consentForCounselorSummary}
                setConsentForCounselorSummary={setConsentForCounselorSummary}
                consentForTelemetry={consentForTelemetry}
                setConsentForTelemetry={setConsentForTelemetry}
                consentForAnalytics={consentForAnalytics}
                setConsentForAnalytics={setConsentForAnalytics}
                handleSaveConsent={handleSaveConsent}
                handleRevokeAll={handleRevokeAll}
              />
            )}

            {/* TAB 2: Download Export Data */}
            {activeTab === 'export' && (
              <div className="space-y-4 text-xs sm:text-sm">
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-primary">Hak Atas Portabilitas Data (Data Export)</h3>
                  <p className="text-xs text-secondary mt-1">
                    Sesuai prinsip UU PDP, Anda berhak mengunduh data Anda yang tersimpan di RuangTenang dalam format terstruktur JSON.
                  </p>
                </div>

                <div className="p-4 border border-default rounded-xl surface-muted space-y-2.5">
                  <h4 className="text-xs font-bold text-primary">Cakupan Berkas Ekspor Data:</h4>
                  <ul className="text-xs text-secondary space-y-1 list-disc list-inside">
                    <li>Profil Akun & Peran (Nama, Email, Institusi)</li>
                    <li>Riwayat Persetujuan Consent & Timestamp Log</li>
                    <li>Riwayat Jadwal Konseling & Catatan Pertemuan</li>
                    <li>Hasil Skrining Kesehatan Mental (PHQ-9 & GAD-7)</li>
                    <li>Daftar Sesi Perangkat Aktif & IP Address</li>
                    <li>Catatan Transparansi Akses Petugas Konselor</li>
                    <li>Kemajuan Program Modul Mandiri</li>
                  </ul>
                </div>

                <button
                  type="button"
                  onClick={handleDownloadData}
                  className="px-4 py-2 min-h-[44px] bg-slate-800 dark:bg-white hover:bg-slate-900 dark:hover:bg-slate-100 text-white dark:text-slate-900 rounded-xl text-xs sm:text-sm font-semibold transition flex items-center gap-2 shadow-3xs cursor-pointer active:scale-[0.98]"
                >
                  <Download className="w-4 h-4 text-teal-400 dark:text-teal-600" />
                  <span>Unduh Paket Data Lengkap Saya (.JSON)</span>
                </button>
              </div>
            )}

            {/* TAB 3: Correct Personal Data */}
            {activeTab === 'correct' && (
              <form onSubmit={handleSaveCorrection} className="space-y-3.5 max-w-md text-xs sm:text-sm">
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-primary">Hak Mengoreksi Data Pribadi (Data Rectification)</h3>
                  <p className="text-xs text-secondary mt-1">
                    Perbarui data pribadi Anda jika terdapat kekeliruan penulisan atau perubahan nama/email institusi.
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-secondary">Nama Lengkap / Panggilan</label>
                  <input
                    type="text"
                    value={corrName}
                    onChange={(e) => setCorrName(e.target.value)}
                    required
                    className="w-full px-3.5 py-2 text-base sm:text-xs surface-muted border border-default rounded-xl text-primary focus:ring-1 focus:ring-teal-600 focus:outline-none min-h-[44px]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-secondary">Email Mahasiswa / Kampus</label>
                  <input
                    type="email"
                    value={corrEmail}
                    onChange={(e) => setCorrEmail(e.target.value)}
                    required
                    className="w-full px-3.5 py-2 text-base sm:text-xs surface-muted border border-default rounded-xl text-primary focus:ring-1 focus:ring-teal-600 focus:outline-none min-h-[44px]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-secondary">Universitas / Institusi</label>
                  <input
                    type="text"
                    value={corrUniversity}
                    onChange={(e) => setCorrUniversity(e.target.value)}
                    required
                    className="w-full px-3.5 py-2 text-base sm:text-xs surface-muted border border-default rounded-xl text-primary focus:ring-1 focus:ring-teal-600 focus:outline-none min-h-[44px]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 min-h-[44px] bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs sm:text-sm font-semibold transition shadow-3xs cursor-pointer active:scale-[0.98]"
                >
                  {loading ? 'Menyimpan...' : 'Perbarui Data Pribadi'}
                </button>
              </form>
            )}

            {/* TAB 4: Data Retention Policy */}
            {activeTab === 'retention' && (
              <div className="space-y-4 text-xs sm:text-sm">
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-primary">Pengaturan Periode Penyimpanan Data (Retention Period)</h3>
                  <p className="text-xs text-secondary mt-1">
                    Tentukan berapa lama rekam jejak skrining dan konseling Anda disimpan sebelum dibersihkan secara otomatis oleh sistem.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {[
                    { days: 30, label: '30 Hari', desc: 'Sangat Singkat - Otomatis dihapus setelah 30 hari' },
                    { days: 90, label: '90 Hari (Standar)', desc: 'Rekomendasi Kampus - Cukup untuk evaluasi 1 semester' },
                    { days: 180, label: '180 Hari (6 Bulan)', desc: 'Penyimpanan Menengah - Rekomendasi pelacakan rutin' },
                    { days: 365, label: '1 Tahun (365 Hari)', desc: 'Penyimpanan Tahunan - Untuk rekam konseling akademik' },
                    { days: 0, label: 'Selamanya / Sesuai Aturan', desc: 'Disimpan sampai Anda mengajukan Hak untuk Dilupakan' }
                  ].map((option) => (
                    <button
                      key={option.days}
                      type="button"
                      onClick={() => handleSaveRetention(option.days)}
                      className={`p-3 rounded-xl border text-left transition flex flex-col justify-between cursor-pointer active:scale-[0.99] ${
                        retentionDays === option.days
                          ? 'border-teal-600 bg-teal-50/50 dark:bg-teal-950/30 ring-1 ring-teal-600/30'
                          : 'border-default hover:border-slate-300 dark:hover:border-slate-700 surface-card'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-primary">{option.label}</span>
                        {retentionDays === option.days && (
                          <span className="px-1.5 py-0.5 bg-teal-600 text-white text-[9px] font-bold rounded">
                            Aktif
                          </span>
                        )}
                      </div>
                      <p className="text-[10.5px] text-secondary mt-1">{option.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 5: Active Device Sessions */}
            {activeTab === 'sessions' && (
              <div className="space-y-4 text-xs sm:text-sm">
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-primary">Perangkat Terhubung & Sesi Aktif</h3>
                  <p className="text-xs text-secondary mt-1">
                    Pantau dan cabut akses perangkat yang saat ini terhubung ke akun Anda.
                  </p>
                </div>

                <div className="space-y-2">
                  {sessions.length === 0 ? (
                    <EmptyState icon="info" title="Tidak Ada Sesi" description="Tidak ada sesi aktif perangkat tercatat." className="py-6 border border-slate-100 bg-slate-50" />
                  ) : (
                    sessions.map((s) => (
                      <div key={s.sessionId} className="p-3 border border-default rounded-xl flex items-center justify-between surface-muted">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-primary">{s.device || 'Perangkat Web'}</span>
                            {s.isCurrent && (
                              <span className="px-1.5 py-0.5 bg-teal-100 dark:bg-teal-900/50 text-teal-800 dark:text-teal-300 rounded text-[9px] font-bold">
                                Sesi Ini
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-secondary mt-0.5">
                            IP: {s.ip} • Terakhir aktif: {new Date(s.lastActive).toLocaleString('id-ID')}
                          </p>
                        </div>
                        {!s.isCurrent && (
                          <button
                            type="button"
                            onClick={() => handleRevokeSession(s.sessionId)}
                            className="px-2.5 py-1 min-h-[36px] surface-card hover:bg-rose-50 dark:hover:bg-rose-950/30 hover:text-rose-600 border border-default rounded-lg text-[11px] font-semibold transition cursor-pointer active:scale-[0.98]"
                          >
                            Cabut Sesi
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* TAB 6: Staff Access Transparency Logs */}
            {activeTab === 'access_logs' && (
              <div className="space-y-4 text-xs sm:text-sm">
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-primary">Transparansi Akses Petugas (Staff Access Transparency)</h3>
                  <p className="text-xs text-secondary mt-1">
                    Catatan transparan setiap kali konselor atau administrator kampus mengakses data kesehatan mental atau jadwal Anda.
                  </p>
                </div>

                <div className="space-y-2 max-h-72 overflow-y-auto">
                  {staffAccessLogs.length === 0 ? (
                    <EmptyState icon="info" title="Tidak Ada Catatan Akses" description="Belum ada catatan akses dari petugas kampus terhadap data Anda." className="py-6 border border-slate-100 bg-slate-50" />
                  ) : (
                    staffAccessLogs.map((log) => (
                      <div key={log.id} className="p-3 border border-default rounded-xl surface-muted text-xs flex justify-between items-center">
                        <div>
                          <div className="font-bold text-primary">{log.staffName} ({log.staffRole.toUpperCase()})</div>
                          <div className="text-[11px] text-secondary mt-0.5">Tujuan: {log.purpose}</div>
                          <div className="text-[10px] text-secondary mt-0.5">Tipe Akses: {log.accessType}</div>
                        </div>
                        <div className="text-[10px] text-secondary text-right">
                          {new Date(log.timestamp).toLocaleString('id-ID')}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* TAB 7: Right to be Forgotten (Full Erasure) */}
            {activeTab === 'erasure' && (
              <ErasureTab
                loading={loading}
                erasureStatus={erasureStatus}
                deleteConfirmInput={deleteConfirmInput}
                setDeleteConfirmInput={setDeleteConfirmInput}
                handleClearActivityData={handleClearActivityData}
                handleExecuteErasure={handleExecuteErasure}
              />
            )}
              </>
            )}

          </div>
        </div>

      </div>
    </div>
  );
};
