import { apiClient } from "../../lib/apiClient";
import React, { useState, useEffect } from 'react';
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
  sleepHours: number;
  sleepQuality: 'Nyenyak' | 'Kurang Nyenyak' | 'Insomnia';
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
  
  const [selfCareChecklist, setSelfCareChecklist] = useState<{ id: string; task: string; done: boolean }[]>([
    { id: 'sc1', task: 'Lakukan Teknik Grounding 5-4-3-2-1 sekali sehari', done: true },
    { id: 'sc2', task: 'Terapkan Pomodoro 25 menit untuk skripsi', done: false },
    { id: 'sc3', task: 'Jalan santai di luar kos selama 15 menit tanpa HP', done: false },
    { id: 'sc4', task: 'Matikan gawai 30 menit sebelum jadwal tidur malam', done: true }
  ]);

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
              if (d.factors) parsedEmotions = typeof d.factors === 'string' ? JSON.parse(d.factors) : d.factors;
            } catch {}

            return {
              id: d.id,
              date: dateStr,
              mood: parseInt(d.mood) || 3,
              emotions: parsedEmotions,
              notes: d.notes || '',
              sleepHours: d.intensity || 0,
              sleepQuality: 'Nyenyak'
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
              triage: (d.phq9Score >= 15 || d.gad7Score >= 15) ? 'Krisis' : (d.phq9Score >= 10 || d.gad7Score >= 10 ? 'Prioritas' : 'Ringan')
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
  const avgScreeningScore = screenHistory.length > 0 
    ? Math.round(screenHistory.reduce((acc, curr) => acc + curr.phq9 + curr.gad7, 0) / (screenHistory.length * 2))
    : 0;
  const currentPhq9 = screenHistory.length > 0 ? screenHistory[0].phq9 : 0;
  const currentGad7 = screenHistory.length > 0 ? screenHistory[0].gad7 : 0;
  const currentTriage = screenHistory.length > 0 ? screenHistory[0].triage : 'Ringan';

  const uniqueActiveDays = React.useMemo(() => {
    if (!moodLogs || moodLogs.length === 0) return 0;
    const uniqueDates = new Set(moodLogs.map(l => l.date));
    return uniqueDates.size;
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

  const handleToggleSelfCare = (id: string) => {
    setSelfCareChecklist(prev =>
      prev.map(item => item.id === id ? { ...item, done: !item.done } : item)
    );
    showToast('Tugas perawatan mandiri diperbarui!');
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50/50 w-full overflow-y-auto">
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="max-w-5xl mx-auto w-full p-4 sm:p-6 lg:p-8 space-y-8"
      >
        
        {/* Header Section */}
        <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">Progress & Aktivitas</h1>
            <p className="text-sm text-slate-500 mt-1">Pantau perkembangan kesejahteraan mental Anda dari waktu ke waktu.</p>
          </div>
          <button
            onClick={() => {
              showToast('Menyiapkan dokumen PDF Anda...');
              window.open('/api/v1/user/export-progress-pdf', '_blank');
            }}
            className="flex items-center gap-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-4 py-2.5 rounded-xl font-medium text-sm transition-all shadow-sm"
          >
            <Activity className="w-4 h-4 text-teal-600" />
            <span>Unduh Ringkasan Perkembangan Saya (.PDF)</span>
          </button>
        </motion.div>

        {/* Summary Cards */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <span className="text-slate-500 text-sm font-medium">Mood Terakhir</span>
              <div className={`p-2 rounded-lg ${getMoodColor(latestMood)}`}><Brain className="w-4 h-4" /></div>
            </div>
            <div>
              <span className="text-3xl font-bold text-slate-900">{getMoodLabel(latestMood)}</span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <span className="text-slate-500 text-sm font-medium">Rata-rata Skor Skrining</span>
              <div className="p-2 bg-blue-50 rounded-lg text-blue-600"><Activity className="w-4 h-4" /></div>
            </div>
            <div>
              <span className="text-3xl font-bold text-slate-900">{avgScreeningScore}</span>
              <span className="text-sm text-slate-500 ml-2">/ 27</span>
            </div>
          </div>
          
          <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <span className="text-slate-500 text-sm font-medium">Streak Aktivitas</span>
              <div className="p-2 bg-orange-50 rounded-lg text-orange-600"><TrendingUp className="w-4 h-4" /></div>
            </div>
            <div>
              <span className="text-3xl font-bold text-slate-900">{uniqueActiveDays}</span>
              <span className="text-sm text-slate-500 ml-2">hari aktif</span>
            </div>
          </div>
        </motion.div>

        {/* Main Chart (Progress Tracker & Screening) */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-6">
            <h3 className="font-semibold text-slate-800 mb-4">Tren Skrining (PHQ-9 & GAD-7)</h3>
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

          <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-6">
            <h3 className="font-semibold text-slate-800 mb-4">Log Mood Harian</h3>
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
        <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h3 className="font-semibold text-slate-800">Insight Perkembangan</h3>
                <button 
                  onClick={() => setIsExpandedInsight(!isExpandedInsight)}
                  className="text-sm text-teal-600 font-medium hover:text-teal-700 flex items-center gap-1"
                >
                  {isExpandedInsight ? 'Tutup Detail' : 'Lihat Detail'}
                  <ChevronDown className={`w-4 h-4 transition-transform ${isExpandedInsight ? 'rotate-180' : ''}`} />
                </button>
              </div>
              <div className="p-6">
                <div className="flex gap-4 items-start">
                  <div className="p-3 bg-teal-50 rounded-xl text-teal-600 shrink-0">
                    <Award className="w-6 h-6" />
                  </div>
                  <div>
                    {moodLogs.length === 0 && screenHistory.length === 0 ? (
                      <div>
                        <h4 className="text-lg font-semibold text-slate-900 mb-2">Mulai Catat Perjalanan Anda</h4>
                        <p className="text-slate-600 text-sm leading-relaxed mb-2">
                          Belum ada catatan aktivitas. Mulai dengan mencatat log mood harian pertama Anda atau lakukan skrining mandiri PHQ-9 & GAD-7 untuk mendapatkan wawasan personalisasi perkembangan kesejahteraan emosional.
                        </p>
                      </div>
                    ) : (
                      <div>
                        <h4 className="text-lg font-semibold text-slate-900 mb-2">
                          {latestMood >= 3 ? 'Perkembangan Positif Terpantau!' : 'Tetap Semangat & Luangkan Waktu Rehat'}
                        </h4>
                        <p className="text-slate-600 text-sm leading-relaxed mb-4">
                          {moodLogs.length >= 3
                            ? `Tercatat ${uniqueActiveDays} hari aktif dengan ${moodLogs.length} entri mood. Keteraturan Anda membantu mengenali pola stres dan keseimbangan aktivitas akademis.`
                            : `Data awal Anda telah tercatat (${moodLogs.length} log). Terus catat secara berkala untuk analisis pola emosi yang lebih mendalam.`}
                        </p>
                        
                        {isExpandedInsight && (
                          <div className="mt-4 pt-4 border-t border-slate-100 space-y-3 animate-in fade-in slide-in-from-top-2">
                            <div className="flex gap-3 items-start">
                              <CheckCircle2 className="w-5 h-5 text-teal-500 shrink-0 mt-0.5" />
                              <p className="text-sm text-slate-700">Log tersimpan secara aman di database profil Anda.</p>
                            </div>
                            {currentPhq9 > 9 && (
                              <div className="flex gap-3 items-start">
                                <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                                <p className="text-sm text-slate-700">Skor skrining terakhir menunjukkan perlunya istirahat atau konsultasi dengan konselor.</p>
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

            <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-6">
              <h3 className="font-semibold text-slate-800 mb-4">Tugas & Rutinitas</h3>
              <TimelineTasks 
                selfCareChecklist={selfCareChecklist} 
                onToggleSelfCare={handleToggleSelfCare} 
                onNavigateToSchedule={onNavigateToSchedule}
              />
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-6">
              <h3 className="font-semibold text-slate-800 mb-4 text-sm flex items-center justify-between">
                <span>Penggunaan AI</span>
                <span className="text-xs font-normal text-slate-500">Bulan ini</span>
              </h3>
              <AiLimits usageStats={usageStats} loadingUsage={loadingUsage} onRefreshUsage={fetchUsageStats} />
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-6">
              <h3 className="font-semibold text-slate-800 mb-4 text-sm flex items-center justify-between">
                <span>Akses Konselor</span>
                <span className="text-xs font-normal text-slate-500">Izin Data</span>
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
