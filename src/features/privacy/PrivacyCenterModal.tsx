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
  RotateCcw,
  Sparkles,
  BookOpen,
  UserCheck,
  Server,
  Lock,
  FileSpreadsheet
} from 'lucide-react';
import { UserSession } from '../../types';
import { apiClient } from '../../lib/apiClient';
import { ConsentTab } from './components/ConsentTab';
import { ErasureTab } from './components/ErasureTab';

interface PrivacyCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  userSession: UserSession;
  setUserSession: (session: UserSession) => void;
  onOpenAuth: () => void;
}

export const PrivacyCenterModal: React.FC<PrivacyCenterModalProps> = ({
  isOpen,
  onClose,
  userSession,
  setUserSession,
  onOpenAuth
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
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [deleteConfirmInput, setDeleteConfirmInput] = useState('');

  // Fetch current consent & privacy info
  const fetchPrivacyData = async () => {
    if (!isOpen || userSession.id === 'guest') return;
    setLoading(true);
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
    } catch (err) {
      console.error('Gagal memuat data privasi:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrivacyData();
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
    } catch (err) {
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
    } catch (err) {
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
    } catch (err) {
      setMsg({ type: 'error', text: 'Gagal menghubungi server.' });
    } finally {
      setLoading(false);
    }
  };

  // Download Data Export
  const handleDownloadData = async () => {
    try {
      window.open('/api/v1/privacy/download-data', '_blank');
      setMsg({ type: 'success', text: 'Mengunduh berkas ekspor data lengkap Anda (.json)...' });
    } catch (err) {
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
    } catch (err) {
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
    } catch (err) {
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
    } catch (err) {
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
    } catch (err) {
      setMsg({ type: 'error', text: 'Gagal memproses eksekusi penghapusan.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center max-sm:items-end bg-slate-900/60 backdrop-blur-xs p-3 sm:p-5 max-sm:p-0 animate-in fade-in duration-200 font-sans">
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="privacy-modal-title"
        className="bg-white rounded-3xl max-sm:rounded-b-none shadow-2xl border border-teal-50/50 w-full max-w-4xl max-h-[90vh] max-sm:max-h-[92vh] max-sm:w-full max-sm:animate-slide-up flex flex-col overflow-hidden relative transition-all duration-300"
      >
        {/* Drag handle for mobile bottom sheet */}
        <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto my-3 sm:hidden shrink-0" />
        
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-teal-500/20 border border-teal-400/30 rounded-xl text-teal-300">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 id="privacy-modal-title" className="text-base font-bold text-white flex items-center gap-2">
                Pusat Privasi & Hak Data Pengguna
                <span className="px-2 py-0.5 bg-teal-500/20 text-teal-300 text-[10px] font-semibold rounded-full border border-teal-400/30">
                  UU PDP & GDPR Compliant
                </span>
              </h2>
              <p className="text-xs text-slate-300">
                Kelola persetujuan AI, ekspor data, koreksi profil, dan eksekusi Hak untuk Dilupakan
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Tutup Pusat Privasi"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Global Feedback Banner */}
        {msg && (
          <div className={`px-6 py-2.5 text-xs font-semibold flex items-center gap-2 border-b ${
            msg.type === 'success' ? 'bg-emerald-50 text-emerald-900 border-emerald-200' : 'bg-rose-50 text-rose-900 border-rose-200'
          }`}>
            {msg.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />}
            <span>{msg.text}</span>
          </div>
        )}

        {/* Modal Layout: Sidebar + Main Content */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          
          {/* Navigation Sidebar */}
          <div className="w-full md:w-64 bg-slate-50 border-r border-slate-200 p-3 space-y-1 shrink-0 overflow-y-auto">
            <button
              onClick={() => { setActiveTab('consent'); setMsg(null); }}
              className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2.5 ${
                activeTab === 'consent' ? 'bg-teal-600 text-white shadow-xs' : 'text-slate-700 hover:bg-slate-200/60'
              }`}
            >
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>1. Persetujuan AI & Fitur</span>
            </button>

            <button
              onClick={() => { setActiveTab('export'); setMsg(null); }}
              className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2.5 ${
                activeTab === 'export' ? 'bg-teal-600 text-white shadow-xs' : 'text-slate-700 hover:bg-slate-200/60'
              }`}
            >
              <Download className="w-4 h-4 shrink-0" />
              <span>2. Unduh Data (Portabilitas)</span>
            </button>

            <button
              onClick={() => { setActiveTab('correct'); setMsg(null); }}
              className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2.5 ${
                activeTab === 'correct' ? 'bg-teal-600 text-white shadow-xs' : 'text-slate-700 hover:bg-slate-200/60'
              }`}
            >
              <Edit3 className="w-4 h-4 shrink-0" />
              <span>3. Koreksi Data Pribadi</span>
            </button>

            <button
              onClick={() => { setActiveTab('retention'); setMsg(null); }}
              className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2.5 ${
                activeTab === 'retention' ? 'bg-teal-600 text-white shadow-xs' : 'text-slate-700 hover:bg-slate-200/60'
              }`}
            >
              <Clock className="w-4 h-4 shrink-0" />
              <span>4. Atur Masa Penyimpanan</span>
            </button>

            <button
              onClick={() => { setActiveTab('sessions'); setMsg(null); }}
              className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2.5 ${
                activeTab === 'sessions' ? 'bg-teal-600 text-white shadow-xs' : 'text-slate-700 hover:bg-slate-200/60'
              }`}
            >
              <KeyRound className="w-4 h-4 shrink-0" />
              <span>5. Sesi Perangkat Aktif</span>
            </button>

            <button
              onClick={() => { setActiveTab('access_logs'); setMsg(null); }}
              className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2.5 ${
                activeTab === 'access_logs' ? 'bg-teal-600 text-white shadow-xs' : 'text-slate-700 hover:bg-slate-200/60'
              }`}
            >
              <Eye className="w-4 h-4 shrink-0" />
              <span>6. Akses Petugas Terhadap Data</span>
            </button>

            <button
              onClick={() => { setActiveTab('erasure'); setMsg(null); }}
              className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2.5 ${
                activeTab === 'erasure' ? 'bg-rose-600 text-white shadow-xs' : 'text-rose-700 hover:bg-rose-100/60'
              }`}
            >
              <Trash2 className="w-4 h-4 shrink-0" />
              <span>7. Hak untuk Dilupakan</span>
            </button>
          </div>

          {/* Main Tab Panel */}
          <div className="flex-1 p-6 overflow-y-auto space-y-5 bg-white">
            
            {/* TAB 1: Consent AI & Features */}
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
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Hak Atas Portabilitas Data (Data Export)</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Sesuai UU PDP & GDPR, Anda berhak mengunduh seluruh data milik Anda yang tersimpan di sistem RuangTenang dalam format terstruktur JSON.
                  </p>
                </div>

                <div className="p-4 border border-slate-200 rounded-xl bg-slate-50 space-y-3">
                  <h4 className="text-xs font-bold text-slate-800">Cakupan Berkas Ekspor Data:</h4>
                  <ul className="text-xs text-slate-600 space-y-1.5 list-disc list-inside">
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
                  className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-xs"
                >
                  <Download className="w-4 h-4 text-teal-400" />
                  <span>Unduh Paket Data Lengkap Saya (.JSON)</span>
                </button>
              </div>
            )}

            {/* TAB 3: Correct Personal Data */}
            {activeTab === 'correct' && (
              <form onSubmit={handleSaveCorrection} className="space-y-4 max-w-md">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Hak Mengoreksi Data Pribadi (Data Rectification)</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Perbarui data pribadi Anda jika terdapat kekeliruan penulisan atau perubahan nama/email institusi.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nama Lengkap / Panggilan</label>
                  <input
                    type="text"
                    value={corrName}
                    onChange={(e) => setCorrName(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Email Mahasiswa / Kampus</label>
                  <input
                    type="email"
                    value={corrEmail}
                    onChange={(e) => setCorrEmail(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Universitas / Institusi</label>
                  <input
                    type="text"
                    value={corrUniversity}
                    onChange={(e) => setCorrUniversity(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold transition shadow-xs"
                >
                  {loading ? 'Menyimpan...' : 'Perbarui Data Pribadi'}
                </button>
              </form>
            )}

            {/* TAB 4: Data Retention Policy */}
            {activeTab === 'retention' && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Pengaturan Periode Penyimpanan Data (Retention Period)</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Tentukan berapa lama rekam jejak skrining dan konseling Anda disimpan sebelum dibersihkan secara otomatis oleh sistem.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { days: 30, label: '30 Hari', desc: 'Sangat Singkat - Otomatis dihapus setelah 30 hari' },
                    { days: 90, label: '90 Hari (Standar)', desc: 'Rekomendasi Kampus - Cukup untuk evaluasi 1 semester' },
                    { days: 180, label: '180 Hari (6 Bulan)', desc: 'Penyimpanan Menengah - Rekomendasi pelacakan rutin' },
                    { days: 365, label: '1 Tahun (365 Hari)', desc: 'Penyimpanan Tahunan - Untuk rekam medis akademik' },
                    { days: 0, label: 'Selamanya / Sesuai Aturan', desc: 'Disimpan sampai Anda mengajukan Hak untuk Dilupakan' }
                  ].map((option) => (
                    <button
                      key={option.days}
                      type="button"
                      onClick={() => handleSaveRetention(option.days)}
                      className={`p-3.5 rounded-xl border text-left transition flex flex-col justify-between ${
                        retentionDays === option.days
                          ? 'border-teal-600 bg-teal-50/50 ring-2 ring-teal-600/20'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900">{option.label}</span>
                        {retentionDays === option.days && (
                          <span className="px-1.5 py-0.5 bg-teal-600 text-white text-[9px] font-bold rounded">
                            Aktif
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-500 mt-1">{option.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 5: Active Device Sessions */}
            {activeTab === 'sessions' && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Perangkat Terhubung & Sesi Aktif</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Pantau dan cabut akses perangkat yang saat ini terhubung ke akun Anda.
                  </p>
                </div>

                <div className="space-y-2">
                  {sessions.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">Belum ada data sesi aktif.</p>
                  ) : (
                    sessions.map((s) => (
                      <div key={s.sessionId} className="p-3 border border-slate-200 rounded-xl flex items-center justify-between bg-slate-50/50">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-800">{s.device || 'Perangkat Web'}</span>
                            {s.isCurrent && (
                              <span className="px-1.5 py-0.5 bg-teal-100 text-teal-800 rounded text-[9px] font-bold">
                                Sesi Ini
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-500 mt-0.5">
                            IP: {s.ip} • Terakhir aktif: {new Date(s.lastActive).toLocaleString('id-ID')}
                          </p>
                        </div>
                        {!s.isCurrent && (
                          <button
                            type="button"
                            onClick={() => handleRevokeSession(s.sessionId)}
                            className="px-2.5 py-1 bg-white hover:bg-rose-50 hover:text-rose-700 border border-slate-300 rounded text-[11px] font-medium transition"
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
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Transparansi Akses Petugas (Staff Access Transparency)</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Catatan transparan setiap kali konselor atau administrator kampus mengakses data kesehatan mental atau jadwal Anda.
                  </p>
                </div>

                <div className="space-y-2 max-h-72 overflow-y-auto">
                  {staffAccessLogs.length === 0 ? (
                    <div className="p-4 bg-slate-50 rounded-xl text-center text-xs text-slate-500">
                      Belum ada catatan akses dari petugas kampus terhadap data Anda.
                    </div>
                  ) : (
                    staffAccessLogs.map((log) => (
                      <div key={log.id} className="p-3 border border-slate-200 rounded-xl bg-slate-50/50 text-xs flex justify-between items-center">
                        <div>
                          <div className="font-bold text-slate-900">{log.staffName} ({log.staffRole.toUpperCase()})</div>
                          <div className="text-[11px] text-slate-600 mt-0.5">Tujuan: {log.purpose}</div>
                          <div className="text-[10px] text-slate-400 mt-0.5">Tipe Akses: {log.accessType}</div>
                        </div>
                        <div className="text-[10px] text-slate-500 text-right">
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

          </div>
        </div>

      </div>
    </div>
  );
};
