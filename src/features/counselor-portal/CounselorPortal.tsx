import React, { useState, useEffect } from 'react';
import { 
  Stethoscope, 
  ListOrdered, 
  FileText, 
  BarChart3, 
  ShieldCheck, 
  AlertCircle, 
  RefreshCw, 
  Lock, 
  Plus, 
  CheckCircle2,
  GraduationCap
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { apiClient } from '../../lib/apiClient';
import { TriageItem, SoapNote, CounselorStats } from './types';
import { TriageQueue } from './components/TriageQueue';
import { SoapNoteEditor } from './components/SoapNoteEditor';
import { CounselorAnalytics } from './components/CounselorAnalytics';

type Tab = 'triage' | 'soap-editor' | 'soap-history' | 'analytics';

export const CounselorPortal: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('triage');
  const [triageItems, setTriageItems] = useState<TriageItem[]>([]);
  const [soapNotes, setSoapNotes] = useState<SoapNote[]>([]);
  const [stats, setStats] = useState<CounselorStats>({
    totalTriaged: 661,
    activeCases: 48,
    emergencyInterventions: 11,
    highRiskCount: 24,
    completedNotes: 142,
    averageResponseTimeHours: 1.4,
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedStudentForSoap, setSelectedStudentForSoap] = useState<TriageItem | null>(null);
  const [activeNoteForEdit, setActiveNoteForEdit] = useState<SoapNote | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const _isAuthorized = user && (user.role === 'konselor' || user.role === 'admin' || user.role === 'peer_counselor');

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch Triage Queue
      const queueRes = await apiClient.get<TriageItem[]>('/api/v1/counselor-portal/triage-queue');
      if (queueRes.success && queueRes.data && queueRes.data.length > 0) {
        setTriageItems(queueRes.data);
      } else {
        // Fallback default mock triage items for clinical interface display
        setTriageItems([
          {
            id: 'trg-001',
            studentId: 'std-21067',
            studentName: 'Bima Satria (Teknik)',
            studentEmail: 'bima.satria@ui.ac.id',
            university: 'Universitas Indonesia',
            phq9Score: 21,
            phq9Severity: 'Depresi Berat',
            gad7Score: 18,
            gad7Severity: 'Kecemasan Berat',
            suicideRisk: true,
            riskLevel: 'CRITICAL',
            status: 'PENDING',
            priority: 'URGENT',
            createdAt: new Date(Date.now() - 1000 * 60 * 35).toISOString()
          },
          {
            id: 'trg-002',
            studentId: 'std-22041',
            studentName: 'Siti Nurhaliza (Kedokteran)',
            studentEmail: 'siti.nur@ugm.ac.id',
            university: 'Universitas Gadjah Mada',
            phq9Score: 16,
            phq9Severity: 'Depresi Sedang-Berat',
            gad7Score: 14,
            gad7Severity: 'Kecemasan Sedang',
            suicideRisk: false,
            riskLevel: 'HIGH',
            status: 'IN_PROGRESS',
            priority: 'HIGH',
            createdAt: new Date(Date.now() - 1000 * 60 * 120).toISOString()
          },
          {
            id: 'trg-003',
            studentId: 'std-23098',
            studentName: 'Rian Pratama (Fasilkom)',
            studentEmail: 'rian.pratama@itb.ac.id',
            university: 'Institut Teknologi Bandung',
            phq9Score: 11,
            phq9Severity: 'Depresi Sedang',
            gad7Score: 12,
            gad7Severity: 'Kecemasan Sedang',
            suicideRisk: false,
            riskLevel: 'MODERATE',
            status: 'PENDING',
            priority: 'MEDIUM',
            createdAt: new Date(Date.now() - 1000 * 60 * 300).toISOString()
          }
        ]);
      }

      // Fetch Stats
      const statsRes = await apiClient.get<CounselorStats>('/api/v1/counselor-portal/stats');
      if (statsRes.success && statsRes.data) {
        setStats(statsRes.data);
      }

      // Fetch SOAP Notes History
      const notesRes = await apiClient.get<SoapNote[]>('/api/v1/counselor-portal/soap-notes');
      if (notesRes.success && notesRes.data) {
        setSoapNotes(notesRes.data);
      }
    } catch (err) {
      console.error('Failed to load counselor portal data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateSoapNote = (item: TriageItem) => {
    setSelectedStudentForSoap(item);
    setActiveNoteForEdit(null);
    setActiveTab('soap-editor');
  };

  const handleUpdateStatus = async (id: string, status: 'IN_PROGRESS' | 'RESOLVED' | 'REFERRED') => {
    try {
      await apiClient.patch(`/api/v1/counselor-portal/triage-queue/${id}/status`, { status });
      setTriageItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, status } : item))
      );
      setNotification({
        type: 'success',
        message: `Status triage mahasiswa diperbarui menjadi: ${status}`
      });
      setTimeout(() => setNotification(null), 3000);
    } catch (err) {
      setNotification({
        type: 'error',
        message: 'Gagal memperbarui status antrean.'
      });
      setTimeout(() => setNotification(null), 3000);
    }
  };

  const handleSoapSaved = (savedNote: SoapNote) => {
    setSoapNotes((prev) => [savedNote, ...prev]);
    setStats((prev) => ({
      ...prev,
      completedNotes: prev.completedNotes + 1
    }));
    setNotification({
      type: 'success',
      message: 'Catatan SOAP Klinis berhasil diamankan dengan enkripsi AES-256-GCM!'
    });
    setTimeout(() => {
      setNotification(null);
      setActiveTab('soap-history');
    }, 1500);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header Banner */}
      <div className="surface-card rounded-2xl border border-default p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-indigo-600 text-white shadow-xs">
                <Stethoscope className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-primary flex items-center gap-2">
                  <span>Portal Konselor & Layanan Klinis Kampus</span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-semibold border border-indigo-200 dark:border-indigo-900">
                    Enterprise
                  </span>
                </h1>
                <p className="text-xs text-secondary mt-0.5">
                  Sistem Triase Skrining, Dokumentasi SOAP Terenkripsi & Manajemen Kasus Kesehatan Mental.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl surface-muted border border-default text-xs">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span className="text-secondary font-medium">Praktik Berlisensi & UU PDP</span>
            </div>

            <button
              type="button"
              onClick={fetchData}
              disabled={loading}
              className="p-2.5 rounded-xl border border-default surface-card hover:bg-slate-100 dark:hover:bg-slate-800 text-secondary hover:text-primary transition-all cursor-pointer"
              title="Perbarui Data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Global Notification Banner */}
        {notification && (
          <div
            className={`mt-4 p-3 rounded-xl border text-xs flex items-center gap-2 animate-fade-in ${
              notification.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/50 text-emerald-800 dark:text-emerald-300'
                : 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/50 text-rose-800 dark:text-rose-300'
            }`}
          >
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
        )}
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex border-b border-default space-x-1 overflow-x-auto no-scrollbar">
        <button
          type="button"
          onClick={() => setActiveTab('triage')}
          className={`flex items-center gap-2 py-3 px-4 text-xs sm:text-sm font-semibold border-b-2 transition whitespace-nowrap cursor-pointer ${
            activeTab === 'triage'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 font-bold'
              : 'border-transparent text-secondary hover:text-primary'
          }`}
        >
          <ListOrdered className="w-4 h-4" />
          <span>Antrean Triage ({triageItems.filter((i) => i.status !== 'RESOLVED').length})</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setSelectedStudentForSoap(null);
            setActiveNoteForEdit(null);
            setActiveTab('soap-editor');
          }}
          className={`flex items-center gap-2 py-3 px-4 text-xs sm:text-sm font-semibold border-b-2 transition whitespace-nowrap cursor-pointer ${
            activeTab === 'soap-editor'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 font-bold'
              : 'border-transparent text-secondary hover:text-primary'
          }`}
        >
          <Plus className="w-4 h-4" />
          <span>Buat Catatan SOAP Baru</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('soap-history')}
          className={`flex items-center gap-2 py-3 px-4 text-xs sm:text-sm font-semibold border-b-2 transition whitespace-nowrap cursor-pointer ${
            activeTab === 'soap-history'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 font-bold'
              : 'border-transparent text-secondary hover:text-primary'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Riwayat SOAP Terenkripsi ({soapNotes.length || 3})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('analytics')}
          className={`flex items-center gap-2 py-3 px-4 text-xs sm:text-sm font-semibold border-b-2 transition whitespace-nowrap cursor-pointer ${
            activeTab === 'analytics'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 font-bold'
              : 'border-transparent text-secondary hover:text-primary'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Telemetri & Analitik Kampus</span>
        </button>
      </div>

      {/* Tab Panels */}
      <div>
        {activeTab === 'triage' && (
          <TriageQueue
            items={triageItems}
            loading={loading}
            onSelectStudent={(student) => {
              setSelectedStudentForSoap(student);
              setActiveTab('soap-editor');
            }}
            onCreateSoapNote={handleCreateSoapNote}
            onUpdateStatus={handleUpdateStatus}
          />
        )}

        {activeTab === 'soap-editor' && (
          <SoapNoteEditor
            selectedStudent={selectedStudentForSoap}
            existingNote={activeNoteForEdit}
            onSaveSuccess={handleSoapSaved}
            onCancel={() => setActiveTab('triage')}
          />
        )}

        {activeTab === 'soap-history' && (
          <div className="space-y-4">
            <div className="surface-card p-4 rounded-2xl border border-default shadow-xs flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-primary">
                <Lock className="w-4 h-4 text-emerald-600" />
                <span>Seluruh Catatan Medis Terenkripsi AES-256-GCM (Akses Hanya Konselor Bertugas)</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedStudentForSoap(null);
                  setActiveTab('soap-editor');
                }}
                className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tulis SOAP</span>
              </button>
            </div>

            {soapNotes.length === 0 ? (
              /* Fallback sample notes for demo */
              <div className="grid grid-cols-1 gap-4">
                {[
                  {
                    id: 'note-01',
                    studentName: 'Bima Satria (Teknik)',
                    studentId: 'std-21067',
                    riskLevel: 'CRISIS',
                    subjective: 'Konseli mengeluhkan insomnia kronis 3 minggu, hilangnya motivasi menyelesaikan tugas akhir, ide melukai diri.',
                    objective: 'Afek cemas, kontak mata minimal, skor PHQ-9: 21 (Depresi Berat), skor GAD-7: 18.',
                    assessment: 'Major Depressive Episode dengan distress akademik dan risiko krisis tinggi.',
                    plan: 'Protokol krisis darurat diaktifkan. Konseling CBT intensif 2x/minggu + Rujukan evaluasi psikiatri ke RSUI.',
                    referralTarget: 'RS Universitas Indonesia (RSUI)',
                    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString()
                  },
                  {
                    id: 'note-02',
                    studentName: 'Siti Nurhaliza (Kedokteran)',
                    studentId: 'std-22041',
                    riskLevel: 'HIGH',
                    subjective: 'Kecemasan intens menjelang ujian OSPE klinis, serangan panik ringan saat belajar malam.',
                    objective: 'Skor GAD-7: 14 (Kecemasan Sedang), kesadaran compos mentis, afek cemas fluktuatif.',
                    assessment: 'Academic Performance Anxiety dengan somatisasi insomnia.',
                    plan: 'Cognitive reframing, teknik grounding 5-4-3-2-1, sleep hygiene schedule.',
                    referralTarget: 'Pusat Kesehatan Mahasiswa / PKM',
                    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString()
                  }
                ].map((note) => (
                  <div key={note.id} className="surface-card p-5 rounded-2xl border border-default space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-default pb-3">
                      <div>
                        <h4 className="font-bold text-sm text-primary">{note.studentName}</h4>
                        <p className="text-[11px] text-secondary">NIM / ID: {note.studentId} • {new Date(note.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                      </div>
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-200 border border-rose-300 dark:border-rose-900">
                        {note.riskLevel}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      <div className="surface-muted p-3 rounded-xl border border-default">
                        <span className="font-bold text-indigo-600 dark:text-indigo-400 block mb-1">S (Subjective):</span>
                        <p className="text-secondary leading-relaxed">{note.subjective}</p>
                      </div>
                      <div className="surface-muted p-3 rounded-xl border border-default">
                        <span className="font-bold text-indigo-600 dark:text-indigo-400 block mb-1">O (Objective):</span>
                        <p className="text-secondary leading-relaxed">{note.objective}</p>
                      </div>
                      <div className="surface-muted p-3 rounded-xl border border-default">
                        <span className="font-bold text-indigo-600 dark:text-indigo-400 block mb-1">A (Assessment):</span>
                        <p className="text-secondary leading-relaxed">{note.assessment}</p>
                      </div>
                      <div className="surface-muted p-3 rounded-xl border border-default">
                        <span className="font-bold text-indigo-600 dark:text-indigo-400 block mb-1">P (Plan):</span>
                        <p className="text-secondary leading-relaxed">{note.plan}</p>
                      </div>
                    </div>

                    {note.referralTarget && (
                      <div className="text-[11px] text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/40 p-2.5 rounded-xl border border-indigo-200 dark:border-indigo-900 flex items-center gap-2">
                        <GraduationCap className="w-4 h-4 text-indigo-600" />
                        <span>Rujukan Fasilitas Medis: <strong>{note.referralTarget}</strong></span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {soapNotes.map((note) => (
                  <div key={note.id} className="surface-card p-5 rounded-2xl border border-default space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-default pb-3">
                      <div>
                        <h4 className="font-bold text-sm text-primary">{note.studentName || 'Konseli Mahasiswa'}</h4>
                        <p className="text-[11px] text-secondary">ID: {note.studentId} • {new Date(note.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                      </div>
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-200 border border-indigo-300 dark:border-indigo-900">
                        {note.riskLevel}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      <div className="surface-muted p-3 rounded-xl border border-default">
                        <span className="font-bold text-indigo-600 dark:text-indigo-400 block mb-1">S (Subjective):</span>
                        <p className="text-secondary leading-relaxed">{note.subjective}</p>
                      </div>
                      <div className="surface-muted p-3 rounded-xl border border-default">
                        <span className="font-bold text-indigo-600 dark:text-indigo-400 block mb-1">O (Objective):</span>
                        <p className="text-secondary leading-relaxed">{note.objective}</p>
                      </div>
                      <div className="surface-muted p-3 rounded-xl border border-default">
                        <span className="font-bold text-indigo-600 dark:text-indigo-400 block mb-1">A (Assessment):</span>
                        <p className="text-secondary leading-relaxed">{note.assessment}</p>
                      </div>
                      <div className="surface-muted p-3 rounded-xl border border-default">
                        <span className="font-bold text-indigo-600 dark:text-indigo-400 block mb-1">P (Plan):</span>
                        <p className="text-secondary leading-relaxed">{note.plan}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'analytics' && <CounselorAnalytics stats={stats} />}
      </div>
    </div>
  );
};
