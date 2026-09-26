import React, { useState, useEffect, useMemo } from 'react';
import { apiClient } from "../../lib/apiClient";
import { safeLocalStorage } from "../../lib/storage";
import { useAuth } from "../../contexts/AuthContext";
import { calculateStreak } from "../../utils/streak";
import {
  TrendingUp,
  Activity,
  Award,
  CheckCircle2,
  Brain,
  ChevronDown,
  AlertCircle,
  Plus,
  FileDown,
  Sparkles,
  ListTodo
} from 'lucide-react';
import { TriageCategory } from '../../types';
import { MoodTracker } from './MoodTracker';
import { ScreeningTrend } from './ScreeningTrend';
import { TimelineTasks } from './TimelineTasks';
import { CounselorConsent } from './CounselorConsent';
import { AiLimits } from './AiLimits';
import { DailyCheckinModal, MoodLog } from './DailyCheckinModal';
import { Toast } from '../../components/Toast';
import { motion } from 'motion/react';
import { DashboardSkeleton } from '../../components/common/Skeleton';
import { ErrorState } from '../../components/common/ErrorState';

interface UserProgressTrackerProps {
  onNavigateToPrograms?: () => void;
  onNavigateToSchedule?: () => void;
}

interface HistoricalScore {
  id: string;
  date: string;
  phq9: number;
  gad7: number;
  label: string;
  triage: TriageCategory;
}

export const UserProgressTracker: React.FC<UserProgressTrackerProps> = ({
  onNavigateToPrograms,
  onNavigateToSchedule,
}) => {
  const [screenHistory, setScreenHistory] = useState<HistoricalScore[]>([]);
  const [moodLogs, setMoodLogs] = useState<MoodLog[]>([]);
  const [isExpandedInsight, setIsExpandedInsight] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<'all' | 'mood' | 'screening' | 'selfcare'>('all');

  // Daily Checkin Modal
  const [isCheckinModalOpen, setIsCheckinModalOpen] = useState<boolean>(false);

  const [shareConsent, setShareConsent] = useState<boolean>(true);
  const [loadingUsage, setLoadingUsage] = useState<boolean>(false);
  const [usageStats, setUsageStats] = useState<any>(null);
  
  const [isLoadingPage, setIsLoadingPage] = useState<boolean>(true);
  const [pageError, setPageError] = useState<string | null>(null);

  const { user } = useAuth();
  const CHECKLIST_KEY = `rt_self_care_${user?.id || "guest"}`;
  const defaultTasks = [
    { id: 'sc1', task: 'Lakukan Teknik Grounding 5-4-3-2-1 sekali hari ini', done: false },
    { id: 'sc2', task: 'Terapkan rehat sejenak 25 menit saat mengerjakan tugas/skripsi', done: false },
    { id: 'sc3', task: 'Jalan santai di luar ruangan selama 15 menit tanpa HP', done: false },
    { id: 'sc4', task: 'Sediakan waktu 30 menit bebas layar sebelum tidur malam', done: false }
  ];
  const [selfCareChecklist, setSelfCareChecklist] = useState<{ id: string; task: string; done: boolean }[]>(defaultTasks);
  
  useEffect(() => {
    if (!user || user.role === 'guest') {
      const saved = safeLocalStorage.getItem(CHECKLIST_KEY);
      if (saved) {
        try { 
          const parsed = JSON.parse(saved);
          setSelfCareChecklist(parsed);
        } catch {}
      }
      return;
    }
    
    // Fetch from backend for authenticated users
    const dateStr = new Date().toISOString().split('T')[0];
    apiClient.get<any>(`/api/v1/user/selfcare?date=${dateStr}`).then(res => {
      if (res.success && res.data && res.data.tasks) {
        const backendTasks = res.data.tasks;
        setSelfCareChecklist(prev => {
          return prev.map(t => {
            const bt = backendTasks.find((b: any) => b.taskId === t.id);
            return bt ? { ...t, done: bt.isDone } : { ...t, done: false };
          });
        });
      }
    }).catch(console.error);
  }, [user, CHECKLIST_KEY]);

  const fetchUsageStats = async () => {
    setLoadingUsage(true);
    try {
      const res = await apiClient.get<any>('/api/v1/user/usage-stats');
      if (res.success && res.data) {
        setUsageStats(res.data);
      }
    } catch (err) {
      console.error('Error fetching usage stats:', err);
    } finally {
      setLoadingUsage(false);
    }
  };

  const fetchDashboardData = async () => {
    setIsLoadingPage(true);
    setPageError(null);
    try {
      await fetchUsageStats();
      
      const [moodRes, screenRes] = await Promise.all([
        apiClient.get<any>('/api/v1/mood'),
        apiClient.get<any>('/api/v1/screenings')
      ]);

      if (moodRes.success && Array.isArray(moodRes.data) && moodRes.data.length > 0) {
        const parsedLogs: MoodLog[] = moodRes.data.map(d => {
          let dateStr = new Date().toISOString().split('T')[0];
          try {
            if (d.timestamp) {
              const parsed = new Date(d.timestamp);
              if (!isNaN(parsed.getTime())) {
                dateStr = parsed.toISOString().split('T')[0];
              }
            }
          } catch {}

          let parsedEmotions: string[] = [];
          try {
            if (d.emotions) {
              parsedEmotions = typeof d.emotions === 'string' ? JSON.parse(d.emotions) : d.emotions;
            }
          } catch {}

          let parsedFactors: string[] = [];
          try {
            if (d.factors) {
              parsedFactors = typeof d.factors === 'string' ? JSON.parse(d.factors) : d.factors;
            }
          } catch {}

          return {
            id: d.id,
            date: dateStr,
            mood: parseInt(d.mood) || 3,
            emotions: Array.isArray(parsedEmotions) ? parsedEmotions : [],
            factors: Array.isArray(parsedFactors) ? parsedFactors : [],
            notes: d.notes || '',
            sleepHours: typeof d.sleepHours === 'number' ? d.sleepHours : null,
            sleepQuality: d.sleepQuality || null
          };
        });
        setMoodLogs(parsedLogs);
      } else {
        setMoodLogs([]);
      }

      const screenData = screenRes.data;
      const items = Array.isArray(screenData) ? screenData : (screenData?.data && Array.isArray(screenData.data) ? screenData.data : []);
      if (items.length > 0) {
        const parsedScreenings: HistoricalScore[] = items.map((d: any) => {
          let dateStr = 'Hari Ini';
          try {
            if (d.timestamp) {
              const parsed = new Date(d.timestamp);
              if (!isNaN(parsed.getTime())) {
                dateStr = parsed.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
              }
            }
          } catch {}

          return {
            id: d.id,
            date: dateStr,
            phq9: d.phq9Score || 0,
            gad7: d.gad7Score || 0,
            label: 'Screening Mandiri',
            triage: (d.hasSelfHarmRisk || (d.item9Score !== undefined && d.item9Score > 0) || d.riskLevel === 'Tinggi' || d.riskCategory === 'KRISIS_SANGAT_TINGGI' || d.riskCategory === 'RISIKO_MENYAKITI_DIRI') ? 'Krisis' : (d.phq9Score >= 15 || d.gad7Score >= 15 ? 'Prioritas' : 'Ringan')
          };
        });
        setScreenHistory(parsedScreenings);
      } else {
        setScreenHistory([]);
      }
    } catch (err: any) {
      console.warn('Failed to fetch dashboard data:', err);
      setPageError(err.message || 'Terjadi kesalahan memuat data dashboard.');
    } finally {
      setIsLoadingPage(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const getMoodColor = (mood: number) => {
    switch (mood) {
      case 5: return 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 dark:text-emerald-400';
      case 4: return 'text-teal-600 bg-teal-50 dark:bg-teal-950/50 dark:text-teal-400';
      case 3: return 'text-slate-600 bg-slate-100 dark:bg-slate-800 dark:text-slate-300';
      case 2: return 'text-amber-600 bg-amber-50 dark:bg-amber-950/50 dark:text-amber-400';
      case 1: return 'text-rose-600 bg-rose-50 dark:bg-rose-950/50 dark:text-rose-400';
      default: return 'text-slate-600 bg-slate-100 dark:bg-slate-800 dark:text-slate-300';
    }
  };

  const getMoodLabel = (mood: number) => {
    switch (mood) {
      case 5: return 'Sangat Baik 😊';
      case 4: return 'Baik 🙂';
      case 3: return 'Biasa Saja 😐';
      case 2: return 'Buruk 🙁';
      case 1: return 'Sangat Buruk 😢';
      default: return 'Belum ada data';
    }
  };

  const latestMood = moodLogs.length > 0 ? moodLogs[0].mood : 0;
  const currentPhq9 = screenHistory.length > 0 ? screenHistory[0].phq9 : 0;
  const currentGad7 = screenHistory.length > 0 ? screenHistory[0].gad7 : 0;
  const currentTriage = screenHistory.length > 0 ? screenHistory[0].triage : 'Ringan';

  const totalActiveDays = useMemo(() => {
    if (!moodLogs || moodLogs.length === 0) return 0;
    return new Set(moodLogs.map(l => l.date)).size;
  }, [moodLogs]);

  const streakCount = useMemo(() => {
    if (!moodLogs || moodLogs.length === 0) return 0;
    return calculateStreak(moodLogs.map(l => l.date));
  }, [moodLogs]);

  const getTriageBadge = (triage: TriageCategory) => {
    switch(triage) {
      case 'Krisis': return { bg: 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800', dot: 'bg-rose-500', desc: 'Membutuhkan intervensi segera' };
      case 'Prioritas': return { bg: 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800', dot: 'bg-amber-500', desc: 'Direkomendasikan konseling' };
      default: return { bg: 'bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800', dot: 'bg-teal-500', desc: 'Kondisi relatif stabil' };
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleToggleSelfCare = async (id: string) => {
    const dateStr = new Date().toISOString().split('T')[0];
    const itemToToggle = selfCareChecklist.find(i => i.id === id);
    if (!itemToToggle) return;
    const newStatus = !itemToToggle.done;

    // Optimistic UI
    setSelfCareChecklist(prev => {
      const next = prev.map(item => item.id === id ? { ...item, done: newStatus } : item);
      if (!user || user.role === 'guest') {
        safeLocalStorage.setItem(CHECKLIST_KEY, JSON.stringify(next));
      }
      return next;
    });

    if (user && user.role !== 'guest') {
      try {
        const res = await apiClient.put('/api/v1/user/selfcare', {
          taskId: id,
          date: dateStr,
          isDone: newStatus
        });
        if (!res.success) throw new Error(res.error);
        showToast('Tugas perawatan mandiri diperbarui!');
      } catch {
        // Rollback on failure
        setSelfCareChecklist(prev => prev.map(item => item.id === id ? { ...item, done: !newStatus } : item));
        showToast('Gagal menyimpan tugas');
      }
    } else {
      showToast('Tugas perawatan mandiri diperbarui!');
    }
  };

  const handleCheckinSaved = (canonicalLog: MoodLog) => {
    setMoodLogs(prev => {
      const filtered = prev.filter(log => log.id !== canonicalLog.id && log.date !== canonicalLog.date);
      return [canonicalLog, ...filtered].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );
    });
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 8 },
    show: { opacity: 1, y: 0, transition: { duration: 0.2, ease: "easeOut" as const } }
  };

  return (
    <div className="flex flex-col h-full surface-page w-full overflow-y-auto">
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8"
      >
        
        {/* Header Section */}
        <motion.div variants={itemVariants} className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-primary tracking-tight">
              Progress & Aktivitas
            </h1>
            <p className="text-xs sm:text-sm text-secondary mt-1">
              Pantau perkembangan kesejahteraan emosional, riwayat skrining, dan rutinitas pemulihan mandiri Anda.
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setIsCheckinModalOpen(true)}
              className="btn-primary flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Catat Mood Hari Ini</span>
            </button>
            <button
              onClick={() => {
                showToast('Menyiapkan Laporan Kesehatan Mental (PDF) Anda...');
                const link = document.createElement('a');
                link.href = '/api/v1/user/export-progress-pdf';
                link.setAttribute('download', 'Laporan-Kesehatan-Mental-RuangTenang.pdf');
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              }}
              className="btn-secondary flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold border-teal-300 dark:border-teal-700 bg-teal-50/50 dark:bg-teal-950/30 text-teal-800 dark:text-teal-200 hover:bg-teal-100 dark:hover:bg-teal-900/50 shadow-3xs"
              title="Unduh Laporan Kesehatan Mental Terpadu 30 Hari format PDF"
            >
              <FileDown className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              <span>Unduh Laporan Kesehatan Mental (PDF)</span>
            </button>
          </div>
        </motion.div>

        {isLoadingPage ? (
          <DashboardSkeleton />
        ) : pageError ? (
          <ErrorState
            type="network"
            title="Gagal Memuat Dashboard"
            description={pageError}
            onRetry={fetchDashboardData}
            className="my-6"
          />
        ) : (
          <>
            {/* Top 4 KPI Summary Cards */}
            <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Mood Terakhir */}
              <div className="surface-card p-4 sm:p-5 rounded-2xl border border-default flex flex-col justify-between shadow-3xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-secondary uppercase tracking-wider">
                    Mood Terakhir
                  </span>
                  <div className={`p-2 rounded-xl ${getMoodColor(latestMood)}`}>
                    <Brain className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <div className="text-xl sm:text-2xl font-bold text-primary">
                    {latestMood === 0 ? 'Belum Ada' : getMoodLabel(latestMood)}
                  </div>
                  <p className="text-xs text-secondary mt-1">
                    {moodLogs.length > 0 ? `Tercatat ${moodLogs[0].date}` : 'Mulai catat hari ini'}
                  </p>
                </div>
              </div>

              {/* Streak Check-in */}
              <div className="surface-card p-4 sm:p-5 rounded-2xl border border-default flex flex-col justify-between shadow-3xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-secondary uppercase tracking-wider">
                    Streak Check-in
                  </span>
                  <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <div className="text-xl sm:text-2xl font-bold text-primary">
                    {streakCount === 0 ? '0 Hari' : `${streakCount} Hari`}
                  </div>
                  <p className="text-xs text-secondary mt-1 font-medium">
                    {totalActiveDays} hari aktif tercatat total
                  </p>
                </div>
              </div>

              {/* PHQ-9 Terbaru */}
              <div className="surface-card p-4 sm:p-5 rounded-2xl border border-default flex flex-col justify-between shadow-3xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-secondary uppercase tracking-wider">
                    PHQ-9 (Depresi)
                  </span>
                  <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
                    <Activity className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-xl sm:text-2xl font-bold text-primary">
                      {screenHistory.length === 0 ? '—' : currentPhq9}
                    </span>
                    {screenHistory.length > 0 && (
                      <span className="text-xs text-secondary">/ 27</span>
                    )}
                  </div>
                  <p className="text-xs text-secondary mt-1 font-medium">
                    {screenHistory.length === 0 
                      ? 'Belum pernah tes' 
                      : `Kategori: ${currentPhq9 <= 4 ? 'Minimal' : currentPhq9 <= 9 ? 'Ringan' : currentPhq9 <= 14 ? 'Sedang' : 'Berat'}`}
                  </p>
                </div>
              </div>

              {/* GAD-7 Terbaru */}
              <div className="surface-card p-4 sm:p-5 rounded-2xl border border-default flex flex-col justify-between shadow-3xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-secondary uppercase tracking-wider">
                    GAD-7 (Kecemasan)
                  </span>
                  <div className="p-2 rounded-xl bg-teal-50 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400">
                    <Activity className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-xl sm:text-2xl font-bold text-primary">
                      {screenHistory.length === 0 ? '—' : currentGad7}
                    </span>
                    {screenHistory.length > 0 && (
                      <span className="text-xs text-secondary">/ 21</span>
                    )}
                  </div>
                  <p className="text-xs text-secondary mt-1 font-medium">
                    {screenHistory.length === 0 
                      ? 'Belum pernah tes' 
                      : `Kategori: ${currentGad7 <= 4 ? 'Minimal' : currentGad7 <= 9 ? 'Ringan' : currentGad7 <= 14 ? 'Sedang' : 'Berat'}`}
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Section Filter Pills */}
            <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-1">
              <button
                onClick={() => setActiveSection('all')}
                className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                  activeSection === 'all'
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'surface-card border border-default text-secondary hover:text-primary'
                }`}
              >
                Semua Bagian
              </button>
              <button
                onClick={() => setActiveSection('mood')}
                className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeSection === 'mood'
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'surface-card border border-default text-secondary hover:text-primary'
                }`}
              >
                <Brain className="w-3.5 h-3.5" />
                <span>Log & Analisis Mood</span>
              </button>
              <button
                onClick={() => setActiveSection('screening')}
                className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeSection === 'screening'
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'surface-card border border-default text-secondary hover:text-primary'
                }`}
              >
                <Activity className="w-3.5 h-3.5" />
                <span>Tren Skrining PHQ/GAD</span>
              </button>
              <button
                onClick={() => setActiveSection('selfcare')}
                className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeSection === 'selfcare'
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'surface-card border border-default text-secondary hover:text-primary'
                }`}
              >
                <ListTodo className="w-3.5 h-3.5" />
                <span>Perawatan & Integrasi</span>
              </button>
            </div>

            {/* SECTION 1: Mood Tracker (Full Width & Spacious) */}
            {(activeSection === 'all' || activeSection === 'mood') && (
              <motion.div variants={itemVariants} className="space-y-6">
                <MoodTracker 
                  moodLogs={moodLogs}
                  setMoodLogs={setMoodLogs as any}
                  showToast={showToast}
                  onRequestOpenCheckin={() => setIsCheckinModalOpen(true)}
                />
              </motion.div>
            )}

            {/* SECTION 2: Screening Trends (PHQ-9 & GAD-7) (Full Width & Responsive) */}
            {(activeSection === 'all' || activeSection === 'screening') && (
              <motion.div variants={itemVariants} className="space-y-6">
                <ScreeningTrend 
                  screenHistory={screenHistory as any}
                  moodLogs={moodLogs}
                  currentPhq9={currentPhq9}
                  currentGad7={currentGad7}
                  currentTriage={currentTriage}
                  triageStyle={getTriageBadge(currentTriage)}
                  onNavigateToPrograms={onNavigateToPrograms || (() => {})}
                  onNavigateToSchedule={onNavigateToSchedule || (() => {})}
                  onClearHistory={() => setScreenHistory([])}
                  getTriageBadge={getTriageBadge}
                />
              </motion.div>
            )}

            {/* SECTION 3: Self Care & Integrations (2-Column / 3-Column Responsive Grid) */}
            {(activeSection === 'all' || activeSection === 'selfcare') && (
              <motion.div variants={itemVariants} className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-default">
                  <div>
                    <h2 className="text-lg sm:text-xl font-bold text-primary flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                      <span>Perawatan Diri & Integrasi Layanan</span>
                    </h2>
                    <p className="text-xs sm:text-sm text-secondary mt-0.5">
                      Rencana tugas mandiri harian, alokasi kuota AI, serta izin integrasi data konselor.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Left 2 Columns: Insight & Self-care checklist */}
                  <div className="lg:col-span-2 space-y-6">
                    {/* Insight Perkembangan Card */}
                    <div className="surface-card rounded-2xl border border-default overflow-hidden shadow-3xs">
                      <div className="p-4 sm:p-5 border-b border-default flex justify-between items-center bg-stone-50/50 dark:bg-slate-900/50">
                        <div className="flex items-center gap-2">
                          <Award className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                          <h3 className="font-bold text-sm sm:text-base text-primary">
                            Insight Perkembangan Kesejahteraan
                          </h3>
                        </div>
                        <button 
                          onClick={() => setIsExpandedInsight(!isExpandedInsight)}
                          className="text-xs text-teal-600 dark:text-teal-400 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          {isExpandedInsight ? 'Tutup Detail' : 'Lihat Detail'}
                          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isExpandedInsight ? 'rotate-180' : ''}`} />
                        </button>
                      </div>

                      <div className="p-4 sm:p-6">
                        <div className="flex gap-4 items-start">
                          <div className="p-2.5 bg-teal-50 dark:bg-teal-950/50 rounded-2xl text-teal-600 dark:text-teal-400 shrink-0">
                            <Award className="w-6 h-6" />
                          </div>
                          <div>
                            {moodLogs.length === 0 && screenHistory.length === 0 ? (
                              <div>
                                <h4 className="text-sm sm:text-base font-bold text-primary mb-1">
                                  Mulai Catat Perjalanan Kesejahteraan Anda
                                </h4>
                                <p className="text-secondary text-xs sm:text-sm leading-relaxed">
                                  Belum ada catatan aktivitas. Mulai dengan mencatat log mood harian pertama Anda atau lakukan skrining mandiri PHQ-9 & GAD-7 untuk mendapatkan wawasan personalisasi perkembangan emosional.
                                </p>
                              </div>
                            ) : (
                              <div>
                                <h4 className="text-sm sm:text-base font-bold text-primary mb-1">
                                  {latestMood >= 3 ? 'Perkembangan Positif Terpantau!' : 'Tetap Semangat & Luangkan Waktu Rehat'}
                                </h4>
                                <p className="text-secondary text-xs sm:text-sm leading-relaxed">
                                  {moodLogs.length >= 3
                                    ? `Tercatat ${totalActiveDays} hari aktif dengan ${moodLogs.length} entri mood. Keteraturan Anda membantu mengenali pola stres dan keseimbangan aktivitas perkuliahan.`
                                    : `Data awal Anda telah tercatat (${moodLogs.length} log). Terus catat secara berkala untuk analisis pola emosi yang lebih mendalam.`}
                                </p>
                                
                                {isExpandedInsight && (
                                  <div className="mt-4 pt-4 border-t border-default space-y-2.5 animate-fade-in">
                                    <div className="flex gap-2.5 items-start">
                                      <CheckCircle2 className="w-4 h-4 text-teal-500 shrink-0 mt-0.5" />
                                      <p className="text-xs sm:text-sm text-secondary">
                                        Log data tersimpan secara aman dan terenkripsi pada akun Anda.
                                      </p>
                                    </div>
                                    {currentPhq9 > 9 && (
                                      <div className="flex gap-2.5 items-start">
                                        <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                                        <p className="text-xs sm:text-sm text-secondary">
                                          Skor skrining terakhir menunjukkan perlunya istirahat atau konsultasi dengan konselor kampus.
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Timeline Tasks (Perawatan Diri) */}
                    <div className="surface-card rounded-2xl border border-default p-4 sm:p-6 shadow-3xs space-y-4">
                      <h3 className="font-bold text-sm sm:text-base text-primary">
                        Perawatan Diri Hari Ini
                      </h3>
                      <TimelineTasks 
                        selfCareChecklist={selfCareChecklist} 
                        onToggleSelfCare={handleToggleSelfCare} 
                        onNavigateToSchedule={onNavigateToSchedule}
                      />
                    </div>
                  </div>

                  {/* Right 1 Column: AI Limits + Counselor Consent */}
                  <div className="space-y-6">
                    {/* AI Limits */}
                    <div className="surface-card rounded-2xl border border-default p-4 sm:p-5 shadow-3xs space-y-3">
                      <h3 className="font-bold text-primary text-xs sm:text-sm flex items-center justify-between">
                        <span>Penggunaan AI</span>
                        <span className="text-[11px] font-medium text-muted">Bulan ini</span>
                      </h3>
                      <AiLimits usageStats={usageStats} loadingUsage={loadingUsage} onRefreshUsage={fetchUsageStats} />
                    </div>

                    {/* Counselor Consent */}
                    <div className="surface-card rounded-2xl border border-default p-4 sm:p-5 shadow-3xs space-y-3">
                      <h3 className="font-bold text-primary text-xs sm:text-sm flex items-center justify-between">
                        <span>Akses Konselor</span>
                        <span className="text-[11px] font-medium text-muted">Izin Data</span>
                      </h3>
                      <CounselorConsent 
                        shareConsent={shareConsent} 
                        setShareConsent={setShareConsent} 
                        showToast={showToast}
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </>
        )}

      </motion.div>

      {/* GLOBAL DAILY CHECKIN MODAL */}
      <DailyCheckinModal
        isOpen={isCheckinModalOpen}
        onClose={() => setIsCheckinModalOpen(false)}
        onSaveSuccess={handleCheckinSaved}
        showToast={showToast}
      />

      {toastMessage && <Toast message={toastMessage} onClose={() => setToastMessage(null)} />}
    </div>
  );
};
