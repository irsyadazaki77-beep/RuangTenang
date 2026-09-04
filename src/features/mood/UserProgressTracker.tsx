import { apiClient } from "../../lib/apiClient";
import React, { useState, useEffect } from 'react';
import { useAuth } from "../../contexts/AuthContext";
import { calculateStreak } from "../../utils/streak";
import {
  TrendingUp,
  Activity,
  Award,
  Clock,
  Sparkles,
  CheckCircle2,
  Brain,
  ChevronDown,
  AlertCircle
} from 'lucide-react';
import { ScreeningResult, TriageCategory } from '../../types';
import { MoodTracker } from './MoodTracker';
import { ScreeningTrend } from './ScreeningTrend';
import { TimelineTasks } from './TimelineTasks';
import { CounselorConsent } from './CounselorConsent';
import { AiLimits } from './AiLimits';
import { Toast } from '../../components/Toast';
import { motion } from 'motion/react';

interface UserProgressTrackerProps {
  screeningResult?: ScreeningResult | null;
  onOpenScreening?: () => void;
  onNavigateToPrograms?: () => void;
  onNavigateToSchedule?: () => void;
  initialActiveTab?: 'mood' | 'trend' | 'timeline' | 'consent' | 'limits';
}

interface HistoricalScore {
  id: string;
  date: string;
  phq9: number;
  gad7: number;
  label: string;
  triage: TriageCategory;
}

interface MoodLog {
  id: string;
  date: string; // YYYY-MM-DD
  mood: number; // 1-5
  emotions: string[];
  notes: string;
  factors: string[];
  sleepHours: number | null;
  sleepQuality: 'very_poor' | 'poor' | 'fair' | 'good' | 'excellent' | null;
}

export const UserProgressTracker: React.FC<UserProgressTrackerProps> = ({
  screeningResult,
  onOpenScreening,
  onNavigateToPrograms,
  onNavigateToSchedule,
}) => {
  const [screenHistory, setScreenHistory] = useState<HistoricalScore[]>([]);
  const [moodLogs, setMoodLogs] = useState<MoodLog[]>([]);
  const [isExpandedInsight, setIsExpandedInsight] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [shareConsent, setShareConsent] = useState<boolean>(true);
  const [loadingUsage, setLoadingUsage] = useState<boolean>(false);
  const [usageStats, setUsageStats] = useState<any>(null);
  
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
      const saved = localStorage.getItem(CHECKLIST_KEY);
      if (saved) {
        try { 
          const parsed = JSON.parse(saved);
          setSelfCareChecklist(parsed);
        } catch (e) {}
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
            return bt ? { ...t, done: bt.isDone } : { ...t, done: false }; // always default to false from backend if not found
          });
        });
      }
    }).catch(console.error);
  }, [user]);

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

  useEffect(() => {
    fetchUsageStats();
    
    // Fetch Mood Logs from authenticated backend API
    apiClient.get<any>('/api/v1/mood')
      .then(res => {
        const data = res.data;
        if (res.success && Array.isArray(data) && data.length > 0) {
          const parsedLogs: MoodLog[] = data.map(d => {
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
      }).catch((err) => {
        console.warn('Failed to fetch mood logs:', err);
        setMoodLogs([]);
      });

    // Fetch Screenings from authenticated backend API
    apiClient.get<any>('/api/v1/screenings')
      .then(res => {
        const data = res.data;
        const items = Array.isArray(data) ? data : (data?.data && Array.isArray(data.data) ? data.data : []);
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
      }).catch((err) => {
        console.warn('Failed to fetch screenings:', err);
        setScreenHistory([]);
      });
  }, []);

  const getMoodColor = (mood: number) => {
    switch (mood) {
      case 5: return 'text-teal-600 bg-teal-50';
      case 4: return 'text-green-600 bg-green-50';
      case 3: return 'text-blue-600 bg-blue-50';
      case 2: return 'text-orange-600 bg-orange-50';
      case 1: return 'text-rose-600 bg-rose-50';
      default: return 'text-slate-600 bg-slate-50';
    }
  };

  const getMoodLabel = (mood: number) => {
    switch (mood) {
      case 5: return 'Sangat Baik';
      case 4: return 'Baik';
      case 3: return 'Biasa';
      case 2: return 'Buruk';
      case 1: return 'Sangat Buruk';
      default: return 'Belum ada';
    }
  };

  const latestMood = moodLogs.length > 0 ? moodLogs[0].mood : 0;
  const currentPhq9 = screenHistory.length > 0 ? screenHistory[0].phq9 : 0;
  const currentGad7 = screenHistory.length > 0 ? screenHistory[0].gad7 : 0;
  const currentTriage = screenHistory.length > 0 ? screenHistory[0].triage : 'Ringan';

  const totalActiveDays = React.useMemo(() => {
    if (!moodLogs || moodLogs.length === 0) return 0;
    return new Set(moodLogs.map(l => l.date)).size;
  }, [moodLogs]);

  const streakCount = React.useMemo(() => {
    if (!moodLogs || moodLogs.length === 0) return 0;
    return calculateStreak(moodLogs.map(l => l.date));
  }, [moodLogs]);

  const getTriageBadge = (triage: TriageCategory) => {
    switch(triage) {
      case 'Krisis': return { bg: 'bg-rose-50 text-rose-700 border-rose-200', dot: 'bg-rose-500', desc: 'Membutuhkan intervensi segera' };
      case 'Prioritas': return { bg: 'bg-orange-50 text-orange-700 border-orange-200', dot: 'bg-orange-500', desc: 'Direkomendasikan konseling' };
      default: return { bg: 'bg-teal-50 text-teal-700 border-teal-200', dot: 'bg-teal-500', desc: 'Kondisi relatif stabil' };
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
        localStorage.setItem(CHECKLIST_KEY, JSON.stringify(next));
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
      } catch (err) {
        // Rollback on failure
        setSelfCareChecklist(prev => prev.map(item => item.id === id ? { ...item, done: !newStatus } : item));
        showToast('Gagal menyimpan tugas');
      }
    } else {
      showToast('Tugas perawatan mandiri diperbarui!');
    }
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
        className="max-w-5xl mx-auto w-full p-3.5 sm:p-4 md:p-5 space-y-4 sm:space-y-5"
      >
        
        {/* Header Section */}
        <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-end justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-primary tracking-tight">Progress & Aktivitas</h1>
            <p className="text-xs sm:text-sm text-secondary mt-0.5">Pantau perkembangan kesejahteraan mental Anda dari waktu ke waktu.</p>
          </div>
          <button
            onClick={() => {
              showToast('Menyiapkan dokumen PDF Anda...');
              window.open('/api/v1/user/export-progress-pdf', '_blank');
            }}
            className="flex items-center gap-2 surface-card border border-default hover:bg-slate-100 dark:hover:bg-slate-800 text-primary px-3.5 py-2 rounded-xl font-medium text-xs sm:text-sm transition-all shadow-3xs cursor-pointer min-h-[40px] sm:min-h-[36px]"
          >
            <Activity className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            <span>Unduh Ringkasan Perkembangan (.PDF)</span>
          </button>
        </motion.div>

        {/* Summary Cards */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-3.5">
          <div className="surface-card p-3.5 sm:p-4 rounded-xl flex flex-col justify-between relative overflow-hidden border border-default shadow-3xs">
            <div className="flex items-center justify-between mb-3">
              <span className="text-secondary text-xs sm:text-sm font-medium">Mood Terakhir</span>
              <div className={`p-1.5 rounded-lg ${getMoodColor(latestMood)}`}><Brain className="w-3.5 h-3.5" /></div>
            </div>
            <div>
              <span className="text-xl sm:text-2xl font-bold text-primary">{latestMood === 0 ? 'Belum ada data' : getMoodLabel(latestMood)}</span>
            </div>
          </div>

          <div className="surface-card p-3.5 sm:p-4 rounded-xl flex flex-col justify-between border border-default shadow-3xs">
            <div className="flex items-center justify-between mb-3">
              <span className="text-secondary text-xs sm:text-sm font-medium">Streak Saat Ini</span>
              <div className="p-1.5 bg-orange-50 dark:bg-orange-950/50 rounded-lg text-orange-600 dark:text-orange-400"><TrendingUp className="w-3.5 h-3.5" /></div>
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-bold text-primary">{streakCount === 0 ? 'Belum ada data' : `${streakCount} hari`}</div>
              <div className="text-[11px] text-secondary mt-0.5 font-medium">{totalActiveDays} hari aktif total</div>
            </div>
          </div>
          

          <div className="surface-card p-3.5 sm:p-4 rounded-xl flex flex-col justify-between border border-default shadow-3xs">
            <div className="flex items-center justify-between mb-3">
              <span className="text-secondary text-xs sm:text-sm font-medium">PHQ-9 Terbaru</span>
              <div className="p-1.5 bg-blue-50 dark:bg-blue-950/50 rounded-lg text-blue-600 dark:text-blue-400"><Activity className="w-3.5 h-3.5" /></div>
            </div>
            <div>
              <span className="text-xl sm:text-2xl font-bold text-primary">{screenHistory.length === 0 ? 'Belum ada data' : currentPhq9}</span>
              {screenHistory.length > 0 && <span className="text-xs text-secondary ml-1">/ 27</span>}
            </div>
          </div>


          <div className="surface-card p-3.5 sm:p-4 rounded-xl flex flex-col justify-between border border-default shadow-3xs">
            <div className="flex items-center justify-between mb-3">
              <span className="text-secondary text-xs sm:text-sm font-medium">GAD-7 Terbaru</span>
              <div className="p-1.5 bg-teal-50 dark:bg-teal-950/50 rounded-lg text-teal-600 dark:text-teal-400"><Activity className="w-3.5 h-3.5" /></div>
            </div>
            <div>
              <span className="text-xl sm:text-2xl font-bold text-primary">{screenHistory.length === 0 ? 'Belum ada data' : currentGad7}</span>
              {screenHistory.length > 0 && <span className="text-xs text-secondary ml-1">/ 21</span>}
            </div>
          </div>
        </motion.div>

        {/* Main Chart (Progress Tracker & Screening) */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-2 gap-3.5 sm:gap-4">
          <div className="surface-card rounded-xl border border-default p-3.5 sm:p-4 shadow-3xs">
            <h3 className="font-semibold text-sm sm:text-base text-primary mb-3">Tren Skrining (PHQ-9 & GAD-7)</h3>
            <div className="overflow-hidden">
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
            </div>
          </div>

          <div className="surface-card rounded-xl border border-default p-3.5 sm:p-4 shadow-3xs">
            <h3 className="font-semibold text-sm sm:text-base text-primary mb-3">Log Mood Harian</h3>
            <div className="overflow-hidden">
               <MoodTracker 
                 moodLogs={moodLogs}
                 setMoodLogs={setMoodLogs as any}
                 showToast={showToast}
               />
            </div>
          </div>
        </motion.div>

        {/* Insight Perkembangan & Timeline Tasks */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-3.5 sm:gap-4">
          <div className="lg:col-span-2 space-y-3.5 sm:space-y-4">
            <div className="surface-card rounded-xl border border-default overflow-hidden shadow-3xs">
              <div className="p-3.5 sm:p-4 border-b border-default flex justify-between items-center surface-muted">
                <h3 className="font-semibold text-sm sm:text-base text-primary">Insight Perkembangan</h3>
                <button 
                  onClick={() => setIsExpandedInsight(!isExpandedInsight)}
                  className="text-xs sm:text-sm text-teal-600 dark:text-teal-400 font-medium hover:text-teal-700 flex items-center gap-1 cursor-pointer"
                >
                  {isExpandedInsight ? 'Tutup' : 'Detail'}
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isExpandedInsight ? 'rotate-180' : ''}`} />
                </button>
              </div>
              <div className="p-3.5 sm:p-4">
                <div className="flex gap-3 items-start">
                  <div className="p-2 bg-teal-50 dark:bg-teal-950/50 rounded-lg text-teal-600 dark:text-teal-400 shrink-0">
                    <Award className="w-5 h-5" />
                  </div>
                  <div>
                    {moodLogs.length === 0 && screenHistory.length === 0 ? (
                      <div>
                        <h4 className="text-sm sm:text-base font-semibold text-primary mb-1">Mulai Catat Perjalanan Anda</h4>
                        <p className="text-secondary text-xs sm:text-sm leading-relaxed mb-1">
                          Belum ada catatan aktivitas. Mulai dengan mencatat log mood harian pertama Anda atau lakukan skrining mandiri PHQ-9 & GAD-7 untuk mendapatkan wawasan personalisasi perkembangan kesejahteraan emosional.
                        </p>
                      </div>
                    ) : (
                      <div>
                        <h4 className="text-sm sm:text-base font-semibold text-primary mb-1">
                          {latestMood >= 3 ? 'Perkembangan Positif Terpantau!' : 'Tetap Semangat & Luangkan Waktu Rehat'}
                        </h4>
                        <p className="text-secondary text-xs sm:text-sm leading-relaxed mb-2">
                          {moodLogs.length >= 3
                            ? `Tercatat ${totalActiveDays} hari aktif dengan ${moodLogs.length} entri mood. Keteraturan Anda membantu mengenali pola stres dan keseimbangan aktivitas akademis.`
                            : `Data awal Anda telah tercatat (${moodLogs.length} log). Terus catat secara berkala untuk analisis pola emosi yang lebih mendalam.`}
                        </p>
                        
                        {isExpandedInsight && (
                          <div className="mt-3 pt-3 border-t border-default space-y-2 animate-in fade-in slide-in-from-top-2">
                            <div className="flex gap-2.5 items-start">
                              <CheckCircle2 className="w-4 h-4 text-teal-500 shrink-0 mt-0.5" />
                              <p className="text-xs sm:text-sm text-secondary">Log tersimpan di profil Anda.</p>
                            </div>
                            {currentPhq9 > 9 && (
                              <div className="flex gap-2.5 items-start">
                                <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                                <p className="text-xs sm:text-sm text-secondary">Skor skrining terakhir menunjukkan perlunya istirahat atau konsultasi dengan konselor.</p>
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

            <div className="surface-card rounded-xl border border-default p-3.5 sm:p-4 shadow-3xs">
              <h3 className="font-semibold text-sm sm:text-base text-primary mb-3">Perawatan Diri Hari Ini</h3>
              <TimelineTasks 
                selfCareChecklist={selfCareChecklist} 
                onToggleSelfCare={handleToggleSelfCare} 
                onNavigateToSchedule={onNavigateToSchedule}
              />
            </div>
          </div>

          <div className="space-y-3.5 sm:space-y-4">
            <div className="surface-card rounded-xl border border-default p-3.5 sm:p-4 shadow-3xs">
              <h3 className="font-semibold text-primary mb-3 text-xs sm:text-sm flex items-center justify-between">
                <span>Penggunaan AI</span>
                <span className="text-[11px] font-normal text-muted">Bulan ini</span>
              </h3>
              <AiLimits usageStats={usageStats} loadingUsage={loadingUsage} onRefreshUsage={fetchUsageStats} />
            </div>

            <div className="surface-card rounded-xl border border-default p-3.5 sm:p-4 shadow-3xs">
              <h3 className="font-semibold text-primary mb-3 text-xs sm:text-sm flex items-center justify-between">
                <span>Akses Konselor</span>
                <span className="text-[11px] font-normal text-muted">Izin Data</span>
              </h3>
              <CounselorConsent 
                shareConsent={shareConsent} 
                setShareConsent={setShareConsent} 
                showToast={showToast}
                currentTriage={currentTriage}
                currentPhq9={currentPhq9}
                currentGad7={currentGad7}
                averageMood={getMoodLabel(latestMood)}
                moodSummary={{ emoji: '', label: getMoodLabel(latestMood) }}
              />
            </div>
          </div>
        </motion.div>

      </motion.div>
      {toastMessage && <Toast message={toastMessage} onClose={() => setToastMessage(null)} />}
    </div>
  );
};
