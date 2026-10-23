import { getPhq9Severity, getGad7Severity } from '../../lib/clinicalScoring';
import React, { useState, useEffect, useMemo, useCallback, useLayoutEffect, useRef } from 'react';
import { apiClient } from "../../lib/apiClient";
import { safeLocalStorage } from "../../lib/storage";
import { useAuth } from "../../contexts/AuthContext";
import { calculateStreak, getLocalIsoDateString } from "../../utils/streak";
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
import { isMoodLogPendingSync } from './moodLogUtils';
import { Toast } from '../../components/Toast';
import { motion } from 'motion/react';
import { DashboardSkeleton } from '../../components/common/Skeleton';
import { ErrorState } from '../../components/common/ErrorState';

interface UserProgressTrackerProps {
  onNavigateToPrograms?: () => void;
  onNavigateToSchedule?: () => void;
  onOpenPrivacyCenter?: () => void;
}

interface HistoricalScore {
  id: string;
  date: string;
  phq9: number;
  gad7: number;
  label: string;
  triage: TriageCategory;
}

const DEFAULT_SELF_CARE_TASKS = [
  { id: 'sc1', task: 'Lakukan Teknik Grounding 5-4-3-2-1 sekali hari ini', done: false },
  { id: 'sc2', task: 'Terapkan rehat sejenak 25 menit saat mengerjakan tugas/skripsi', done: false },
  { id: 'sc3', task: 'Jalan santai di luar ruangan selama 15 menit tanpa HP', done: false },
  { id: 'sc4', task: 'Sediakan waktu 30 menit bebas layar sebelum tidur malam', done: false }
];

export const UserProgressTracker: React.FC<UserProgressTrackerProps> = ({
  onNavigateToPrograms,
  onNavigateToSchedule,
  onOpenPrivacyCenter,
}) => {
  const { user } = useAuth();
  const dashboardIdentity = `${user?.id || 'anonymous'}:${user?.role || 'none'}`;
  const [screenHistory, setScreenHistory] = useState<HistoricalScore[]>([]);
  const [moodLogs, setMoodLogs] = useState<MoodLog[]>([]);
  const [isExpandedInsight, setIsExpandedInsight] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<'all' | 'mood' | 'screening' | 'selfcare'>('all');

  // Daily Checkin Modal
  const [isCheckinModalOpen, setIsCheckinModalOpen] = useState<boolean>(false);
  const [editingMoodLog, setEditingMoodLog] = useState<MoodLog | null>(null);

  const [loadingUsage, setLoadingUsage] = useState<boolean>(false);
  const [usageStats, setUsageStats] = useState<any>(null);

  const [isLoadingPage, setIsLoadingPage] = useState<boolean>(true);
  const [pageError, setPageError] = useState<string | null>(null);

  const CHECKLIST_KEY = `rt_self_care_${user?.id || "guest"}`;
  const [selfCareChecklist, setSelfCareChecklist] = useState<{ id: string; task: string; done: boolean }[]>(DEFAULT_SELF_CARE_TASKS);

  const dashboardIdentityRef = useRef(dashboardIdentity);
  dashboardIdentityRef.current = dashboardIdentity;
  const setMoodLogsForIdentity = useCallback((update: React.SetStateAction<MoodLog[]>) => {
    if (dashboardIdentityRef.current !== dashboardIdentity) return;
    setMoodLogs(previous => {
      if (dashboardIdentityRef.current !== dashboardIdentity) return previous;
      return typeof update === 'function' ? update(previous) : update;
    });
  }, [dashboardIdentity]);
  const setScreenHistoryForIdentity = useCallback((update: React.SetStateAction<HistoricalScore[]>) => {
    if (dashboardIdentityRef.current !== dashboardIdentity) return;
    setScreenHistory(previous => {
      if (dashboardIdentityRef.current !== dashboardIdentity) return previous;
      return typeof update === 'function' ? update(previous) : update;
    });
  }, [dashboardIdentity]);
  const dashboardRequestRef = useRef(0);
  const dashboardAbortRef = useRef<AbortController | null>(null);
  const usageRequestRef = useRef(0);
  const usageAbortRef = useRef<AbortController | null>(null);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useLayoutEffect(() => {
    dashboardRequestRef.current += 1;
    dashboardAbortRef.current?.abort();
    dashboardAbortRef.current = null;
    usageRequestRef.current += 1;
    usageAbortRef.current?.abort();
    usageAbortRef.current = null;
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = null;

    setScreenHistory([]);
    setMoodLogs([]);
    setUsageStats(null);
    setIsExpandedInsight(false);
    setEditingMoodLog(null);
    setIsCheckinModalOpen(false);
    setToastMessage(null);
    setPageError(null);
    setIsLoadingPage(true);
    setLoadingUsage(false);
    setActiveSection('all');

    let nextChecklist = DEFAULT_SELF_CARE_TASKS;
    if (!user?.id || user.role === 'guest') {
      const saved = safeLocalStorage.getItem(CHECKLIST_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            nextChecklist = DEFAULT_SELF_CARE_TASKS.map(task => ({
              ...task,
              done: parsed.find((item: any) => item?.id === task.id)?.done === true
            }));
          }
        } catch {
          nextChecklist = DEFAULT_SELF_CARE_TASKS;
        }
      }
    }
    setSelfCareChecklist(nextChecklist.map(task => ({ ...task })));
  }, [dashboardIdentity, CHECKLIST_KEY]);

  useEffect(() => {
    if (!user?.id || user.role === 'guest') {
      return;
    }

    // Fetch from backend for authenticated users
    const dateStr = getLocalIsoDateString();
    const identity = dashboardIdentity;
    const controller = new AbortController();
    apiClient.get<any>(`/api/v1/user/selfcare?date=${dateStr}`, { signal: controller.signal }).then(res => {
      if (controller.signal.aborted || dashboardIdentityRef.current !== identity) return;
      if (res.success && res.data && res.data.tasks) {
        const backendTasks = res.data.tasks;
        setSelfCareChecklist(prev => {
          return prev.map(t => {
            const bt = backendTasks.find((b: any) => b.taskId === t.id);
            if (dashboardIdentityRef.current !== identity) return t;
            return bt ? { ...t, done: bt.isDone } : { ...t, done: false };
          });
        });
      }
    }).catch(error => {
      if (!controller.signal.aborted && dashboardIdentityRef.current === identity) console.error(error);
    });
    return () => controller.abort();
  }, [dashboardIdentity, user?.id, user?.role]);

  const fetchUsageStats = useCallback(async () => {
    const identity = dashboardIdentity;
    if (dashboardIdentityRef.current !== identity) return;
    const requestId = ++usageRequestRef.current;
    usageAbortRef.current?.abort();
    const controller = new AbortController();
    usageAbortRef.current = controller;
    setLoadingUsage(previous => dashboardIdentityRef.current === identity && usageRequestRef.current === requestId ? true : previous);
    try {
      const res = await apiClient.get<any>('/api/v1/user/usage-stats', { signal: controller.signal });
      if (controller.signal.aborted || dashboardIdentityRef.current !== identity || usageRequestRef.current !== requestId) return;
      if (res.success && res.data) {
        setUsageStats(previous => dashboardIdentityRef.current === identity && usageRequestRef.current === requestId ? res.data : previous);
      }
    } catch (err) {
      if (!controller.signal.aborted && dashboardIdentityRef.current === identity && usageRequestRef.current === requestId) {
        console.error('Error fetching usage stats:', err);
      }
    } finally {
      if (!controller.signal.aborted && dashboardIdentityRef.current === identity && usageRequestRef.current === requestId) {
        setLoadingUsage(previous => dashboardIdentityRef.current === identity && usageRequestRef.current === requestId ? false : previous);
      }
    }
  }, [dashboardIdentity]);

  const fetchDashboardData = useCallback(async () => {
    const identity = dashboardIdentity;
    if (dashboardIdentityRef.current !== identity) return;
    const requestId = ++dashboardRequestRef.current;
    dashboardAbortRef.current?.abort();
    const controller = new AbortController();
    dashboardAbortRef.current = controller;
    setIsLoadingPage(previous => dashboardIdentityRef.current === identity && dashboardRequestRef.current === requestId ? true : previous);
    setPageError(previous => dashboardIdentityRef.current === identity && dashboardRequestRef.current === requestId ? null : previous);
    try {
      await fetchUsageStats();
      if (controller.signal.aborted || dashboardIdentityRef.current !== identity || dashboardRequestRef.current !== requestId) return;

      const [moodRes, screenRes] = await Promise.all([
        apiClient.get<any>('/api/v1/mood', { signal: controller.signal }),
        apiClient.get<any>('/api/v1/screenings', { signal: controller.signal })
      ]);
      if (controller.signal.aborted || dashboardIdentityRef.current !== identity || dashboardRequestRef.current !== requestId) return;

      if (moodRes.success && Array.isArray(moodRes.data) && moodRes.data.length > 0) {
        const parsedLogs: MoodLog[] = moodRes.data.map(d => {
          let dateStr = getLocalIsoDateString();
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
        setMoodLogsForIdentity(parsedLogs);
      } else {
        setMoodLogsForIdentity([]);
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
            triage: (d.riskLevel === 'Tinggi' || d.riskCategory === 'KRISIS_SANGAT_TINGGI')
              ? 'Krisis'
              : (d.hasSelfHarmRisk || (d.item9Score !== undefined && d.item9Score > 0) || d.riskCategory === 'RISIKO_MENYAKITI_DIRI' || d.phq9Score >= 15 || d.gad7Score >= 15)
                ? 'Prioritas'
                : 'Ringan'
          };
        });
        setScreenHistoryForIdentity(parsedScreenings);
      } else {
        setScreenHistoryForIdentity([]);
      }
    } catch (err: any) {
      if (controller.signal.aborted || dashboardIdentityRef.current !== identity || dashboardRequestRef.current !== requestId) return;
      console.warn('Failed to fetch dashboard data:', err);
      setPageError(previous => dashboardIdentityRef.current === identity && dashboardRequestRef.current === requestId
        ? (err.message || 'Terjadi kesalahan memuat data dashboard.')
        : previous);
    } finally {
      if (!controller.signal.aborted && dashboardIdentityRef.current === identity && dashboardRequestRef.current === requestId) {
        setIsLoadingPage(previous => dashboardIdentityRef.current === identity && dashboardRequestRef.current === requestId ? false : previous);
      }
    }
  }, [dashboardIdentity, fetchUsageStats, setMoodLogsForIdentity, setScreenHistoryForIdentity]);

  useEffect(() => {
    void fetchDashboardData();
    window.addEventListener('ruangtenang:offline-synced', fetchDashboardData);
    return () => {
      window.removeEventListener('ruangtenang:offline-synced', fetchDashboardData);
      dashboardRequestRef.current += 1;
      dashboardAbortRef.current?.abort();
      usageRequestRef.current += 1;
      usageAbortRef.current?.abort();
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    };
  }, [fetchDashboardData]);

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
  const hasScreening = screenHistory.length > 0;
  const currentPhq9 = hasScreening ? screenHistory[0].phq9 : null;
  const currentGad7 = hasScreening ? screenHistory[0].gad7 : null;
  const currentTriage = hasScreening ? screenHistory[0].triage : null;

  const todayDateStr = useMemo(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);

  const todayCheckin = useMemo(() => {
    return moodLogs.find(l => l.date === todayDateStr);
  }, [moodLogs, todayDateStr]);

  const totalActiveDays = useMemo(() => {
    if (!moodLogs || moodLogs.length === 0) return 0;
    return new Set(moodLogs.map(l => l.date)).size;
  }, [moodLogs]);

  const streakCount = useMemo(() => {
    if (!moodLogs || moodLogs.length === 0) return 0;
    return calculateStreak(moodLogs.map(l => l.date));
  }, [moodLogs]);

  const getTriageBadge = (triage: TriageCategory | null) => {
    if (!triage) {
      return { bg: 'bg-slate-50 dark:bg-slate-900 text-secondary border-default', dot: 'bg-slate-400', desc: 'Belum ada hasil skrining' };
    }
    switch(triage) {
      case 'Krisis': return { bg: 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800', dot: 'bg-rose-500', desc: 'Jawaban skrining memerlukan perhatian segera; gunakan layanan bantuan langsung jika Anda sedang dalam bahaya' };
      case 'Prioritas': return { bg: 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800', dot: 'bg-amber-500', desc: 'Skrining menandai pertimbangan untuk tindak lanjut; bukan diagnosis' };
      default: return { bg: 'bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800', dot: 'bg-teal-500', desc: 'Skor skrining tidak memicu penanda prioritas; hasil ini tidak meniadakan kebutuhan bantuan' };
    }
  };

  const showToast = (msg: string) => {
    const identity = dashboardIdentity;
    if (dashboardIdentityRef.current !== identity) return;
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToastMessage(msg);
    toastTimeoutRef.current = setTimeout(() => {
      if (dashboardIdentityRef.current === identity) setToastMessage(null);
    }, 3000);
  };

  const handleToggleSelfCare = async (id: string) => {
    const identity = dashboardIdentity;
    if (dashboardIdentityRef.current !== identity) return;
    const dateStr = getLocalIsoDateString();
    const itemToToggle = selfCareChecklist.find(i => i.id === id);
    if (!itemToToggle) return;
    const newStatus = !itemToToggle.done;

    // Optimistic UI
    setSelfCareChecklist(prev => {
      if (dashboardIdentityRef.current !== identity) return prev;
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
        if (dashboardIdentityRef.current !== identity) return;
        showToast('Tugas perawatan mandiri diperbarui!');
      } catch {
        if (dashboardIdentityRef.current !== identity) return;
        // Rollback on failure
        setSelfCareChecklist(prev => dashboardIdentityRef.current === identity
          ? prev.map(item => item.id === id ? { ...item, done: !newStatus } : item)
          : prev);
        showToast('Gagal menyimpan tugas');
      }
    } else {
      showToast('Tugas perawatan mandiri diperbarui!');
    }
  };

  const handleOpenMoodCheckin = () => {
    setEditingMoodLog(null);
    setIsCheckinModalOpen(true);
  };

  const handleEditMoodLog = (log: MoodLog) => {
    if (dashboardIdentityRef.current !== dashboardIdentity) return;
    if (isMoodLogPendingSync(log.id)) return;
    setEditingMoodLog(log);
    setIsCheckinModalOpen(true);
  };

  const handleCloseMoodCheckin = () => {
    setIsCheckinModalOpen(false);
    setEditingMoodLog(null);
  };

  const handleCheckinSaved = (canonicalLog: MoodLog) => {
    if (dashboardIdentityRef.current !== dashboardIdentity) return;
    setMoodLogsForIdentity(prev => {
      const filtered = prev.filter(log => log.id !== canonicalLog.id);
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
            {/* Today's Check-in Spotlight Hero Card */}
            <motion.div
              variants={itemVariants}
              className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                todayCheckin
                  ? 'bg-gradient-to-r from-teal-50 to-emerald-50 dark:from-teal-950/40 dark:to-emerald-950/30 border-teal-200/80 dark:border-teal-800/60'
                  : 'bg-gradient-to-r from-teal-500/10 via-amber-500/10 to-teal-500/5 border-teal-500/30 dark:border-teal-500/20 shadow-3xs'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
                <div className="flex items-start sm:items-center gap-3">
                  <div className={`p-2.5 rounded-xl shrink-0 ${
                    todayCheckin
                      ? 'bg-teal-700 text-white'
                      : 'bg-teal-700 dark:bg-teal-600 text-white animate-pulse'
                  }`}>
                    {todayCheckin ? <CheckCircle2 className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-primary">
                      {todayCheckin
                        ? `Sudah Check-in Hari Ini: ${getMoodLabel(todayCheckin.mood)}`
                        : 'Bagaimana suasana hati Anda hari ini?'}
                    </h3>
                    <p className="text-xs text-secondary mt-0.5">
                      {todayCheckin
                        ? (todayCheckin.notes ? `"${todayCheckin.notes.slice(0, 70)}${todayCheckin.notes.length > 70 ? '…' : ''}"` : 'Refleksi harian tercatat. Pertahankan ritme Anda!')
                        : 'Luangkan 30 detik untuk mencatat emosi, tidur, dan faktor pemicu.'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsCheckinModalOpen(true)}
                  className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer transition-all shrink-0 ${
                    todayCheckin
                      ? 'surface-card border border-default text-secondary hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-800'
                      : 'btn-primary shadow-xs'
                  }`}
                >
                  <Plus className="w-4 h-4" />
                  <span>{todayCheckin ? 'Ubah Catatan Hari Ini' : 'Catat Mood Sekarang'}</span>
                </button>
              </div>
            </motion.div>

            {/* Top 4 KPI Summary Cards (2x2 on mobile, 4-col on lg) */}
            <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {/* Mood Terakhir */}
              <div className="surface-card p-3.5 sm:p-5 rounded-2xl border border-default flex flex-col justify-between shadow-3xs space-y-2.5 sm:space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] sm:text-xs font-semibold text-secondary uppercase tracking-wider truncate">
                    Mood Terakhir
                  </span>
                  <div className={`p-1.5 sm:p-2 rounded-xl shrink-0 ${getMoodColor(latestMood)}`}>
                    <Brain className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </div>
                </div>
                <div>
                  <div className="text-lg sm:text-2xl font-bold text-primary truncate">
                    {latestMood === 0 ? 'Belum Ada' : getMoodLabel(latestMood)}
                  </div>
                  <p className="text-[11px] sm:text-xs text-secondary mt-1 truncate">
                    {moodLogs.length > 0 ? `Tercatat ${moodLogs[0].date}` : 'Mulai catat hari ini'}
                  </p>
                </div>
              </div>

              {/* Streak Check-in */}
              <div className="surface-card p-3.5 sm:p-5 rounded-2xl border border-default flex flex-col justify-between shadow-3xs space-y-2.5 sm:space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] sm:text-xs font-semibold text-secondary uppercase tracking-wider truncate">
                    Streak Check-in
                  </span>
                  <div className="p-1.5 sm:p-2 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 shrink-0">
                    <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </div>
                </div>
                <div>
                  <div className="text-lg sm:text-2xl font-bold text-primary">
                    {streakCount === 0 ? '0 Hari' : `${streakCount} Hari`}
                  </div>
                  <p className="text-[11px] sm:text-xs text-secondary mt-1 font-medium truncate">
                    {totalActiveDays} hari aktif total
                  </p>
                </div>
              </div>

              {/* PHQ-9 Terbaru */}
              <div className="surface-card p-3.5 sm:p-5 rounded-2xl border border-default flex flex-col justify-between shadow-3xs space-y-2.5 sm:space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] sm:text-xs font-semibold text-secondary uppercase tracking-wider truncate">
                    PHQ-9 (Depresi)
                  </span>
                  <div className="p-1.5 sm:p-2 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 shrink-0">
                    <Activity className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </div>
                </div>
                <div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-lg sm:text-2xl font-bold text-primary">
                      {currentPhq9 === null ? '—' : currentPhq9}
                    </span>
                    {currentPhq9 !== null && (
                      <span className="text-[10px] sm:text-xs text-secondary">/ 27</span>
                    )}
                  </div>
                  <p className="text-[11px] sm:text-xs text-secondary mt-1 font-medium truncate">
                    {currentPhq9 === null
                      ? 'Belum pernah tes'
                      : getPhq9Severity(currentPhq9)}
                  </p>
                </div>
              </div>

              {/* GAD-7 Terbaru */}
              <div className="surface-card p-3.5 sm:p-5 rounded-2xl border border-default flex flex-col justify-between shadow-3xs space-y-2.5 sm:space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] sm:text-xs font-semibold text-secondary uppercase tracking-wider truncate">
                    GAD-7 (Cemas)
                  </span>
                  <div className="p-1.5 sm:p-2 rounded-xl bg-teal-50 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400 shrink-0">
                    <Activity className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </div>
                </div>
                <div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-lg sm:text-2xl font-bold text-primary">
                      {currentGad7 === null ? '—' : currentGad7}
                    </span>
                    {currentGad7 !== null && (
                      <span className="text-[10px] sm:text-xs text-secondary">/ 21</span>
                    )}
                  </div>
                  <p className="text-[11px] sm:text-xs text-secondary mt-1 font-medium truncate">
                    {currentGad7 === null
                      ? 'Belum pernah tes'
                      : getGad7Severity(currentGad7)}
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Section Filter Pills */}
            <div
              role="tablist"
              aria-label="Navigasi Bagian Dashboard"
              className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-1"
            >
              <button
                type="button"
                role="tab"
                aria-selected={activeSection === 'all'}
                onClick={() => setActiveSection('all')}
                className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                  activeSection === 'all'
                    ? 'bg-teal-700 text-white shadow-xs'
                    : 'surface-card border border-default text-secondary hover:text-primary'
                }`}
              >
                Semua Bagian
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeSection === 'mood'}
                onClick={() => setActiveSection('mood')}
                className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeSection === 'mood'
                    ? 'bg-teal-700 text-white shadow-xs'
                    : 'surface-card border border-default text-secondary hover:text-primary'
                }`}
              >
                <Brain className="w-3.5 h-3.5" />
                <span>Log & Analisis Mood</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeSection === 'screening'}
                onClick={() => setActiveSection('screening')}
                className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeSection === 'screening'
                    ? 'bg-teal-700 text-white shadow-xs'
                    : 'surface-card border border-default text-secondary hover:text-primary'
                }`}
              >
                <Activity className="w-3.5 h-3.5" />
                <span>Tren Skrining PHQ/GAD</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeSection === 'selfcare'}
                onClick={() => setActiveSection('selfcare')}
                className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeSection === 'selfcare'
                    ? 'bg-teal-700 text-white shadow-xs'
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
                  key={dashboardIdentity}
                  moodLogs={moodLogs}
                  setMoodLogs={setMoodLogsForIdentity}
                  showToast={showToast}
                  onRefreshData={fetchDashboardData}
                  onRequestOpenCheckin={handleOpenMoodCheckin}
                  onRequestEditCheckin={handleEditMoodLog}
                />
              </motion.div>
            )}

            {/* SECTION 2: Screening Trends (PHQ-9 & GAD-7) (Full Width & Responsive) */}
            {(activeSection === 'all' || activeSection === 'screening') && (
              <motion.div variants={itemVariants} className="space-y-6">
                <ScreeningTrend
                  key={dashboardIdentity}
                  screenHistory={screenHistory as any}
                  moodLogs={moodLogs}
                  currentPhq9={currentPhq9}
                  currentGad7={currentGad7}
                  currentTriage={currentTriage}
                  triageStyle={getTriageBadge(currentTriage)}
                  onNavigateToPrograms={onNavigateToPrograms || (() => {})}
                  onNavigateToSchedule={onNavigateToSchedule || (() => {})}
                  onClearHistory={() => setScreenHistoryForIdentity([])}
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
                                  Catatan Terbaru Tersimpan
                                </h4>
                                <p className="text-secondary text-xs sm:text-sm leading-relaxed">
                                  {moodLogs.length >= 3
                                    ? `Tercatat ${totalActiveDays} hari aktif dengan ${moodLogs.length} entri mood. Catatan berkala dapat membantu Anda meninjau pengalaman sehari-hari, tetapi bukan penilaian klinis.`
                                    : `Data awal Anda telah tercatat (${moodLogs.length} log). Catatan tambahan dapat membantu melihat ringkasan pengalaman dari waktu ke waktu.`}
                                </p>

                                {isExpandedInsight && (
                                  <div className="mt-4 pt-4 border-t border-default space-y-2.5 animate-fade-in">
                                    <div className="flex gap-2.5 items-start">
                                      <CheckCircle2 className="w-4 h-4 text-teal-500 shrink-0 mt-0.5" />
                                      <p className="text-xs sm:text-sm text-secondary">
                                        Catatan ini terkait dengan akun Anda. Atur retensi dan penghapusan melalui Pusat Privasi.
                                      </p>
                                    </div>
                                    {currentPhq9 !== null && currentPhq9 > 9 && (
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
                        key={dashboardIdentity}
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
                      <AiLimits key={dashboardIdentity} usageStats={usageStats} loadingUsage={loadingUsage} onRefreshUsage={fetchUsageStats} />
                    </div>

                    {/* Counselor Consent */}
                    <div className="surface-card rounded-2xl border border-default p-4 sm:p-5 shadow-3xs space-y-3">
                      <h3 className="font-bold text-primary text-xs sm:text-sm flex items-center justify-between">
                        <span>Akses Konselor</span>
                        <span className="text-[11px] font-medium text-muted">Izin Data</span>
                      </h3>
                      <CounselorConsent key={dashboardIdentity} onOpenPrivacyCenter={onOpenPrivacyCenter} />
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
        key={dashboardIdentity}
        isOpen={isCheckinModalOpen}
        onClose={handleCloseMoodCheckin}
        initialLog={editingMoodLog}
        onSaveSuccess={handleCheckinSaved}
        showToast={showToast}
      />

      {toastMessage && <Toast message={toastMessage} onClose={() => setToastMessage(null)} />}
    </div>
  );
};
