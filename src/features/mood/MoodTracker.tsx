import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEscapeKey } from '../../hooks/useEscapeKey';
import { calculateStreak } from '../../utils/streak';
import { 
  Smile, 
  Moon, 
  Trash2, 
  Calendar, 
  Flame, 
  Sparkles, 
  Search, 
  Tag, 
  RefreshCw, 
  CheckCircle2, 
  Plus, 
  ChevronRight,
  Brain
} from 'lucide-react';
import { EmptyState } from '../../components/common/EmptyState';
import { apiClient } from '../../lib/apiClient';
import { DailyCheckinModal, MoodLog, MOOD_OPTIONS, EMOTION_TAGS, FACTOR_TAGS } from './DailyCheckinModal';

interface MoodTrackerProps {
  moodLogs: MoodLog[];
  setMoodLogs: React.Dispatch<React.SetStateAction<MoodLog[]>>;
  showToast: (msg: string, type?: 'info' | 'success' | 'warning' | 'error', title?: string) => void;
  onRequestOpenCheckin?: () => void;
}

export const MoodTracker: React.FC<MoodTrackerProps> = ({
  moodLogs,
  setMoodLogs,
  showToast,
  onRequestOpenCheckin
}) => {
  const navigate = useNavigate();
  const [isCheckinModalOpen, setIsCheckinModalOpen] = useState<boolean>(false);
  const [savedLogForBridge, setSavedLogForBridge] = useState<MoodLog | null>(null);

  useEscapeKey(() => {
    if (savedLogForBridge) setSavedLogForBridge(null);
  }, !!savedLogForBridge);

  // Time range filter & Search
  const [timeRange, setTimeRange] = useState<'7' | '30' | '90'>('30');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedFactorFilter, setSelectedFactorFilter] = useState<string | null>(null);
  
  const [aiInsight, setAiInsight] = useState<{
    summary: string;
    patterns: string[];
    recommendations: string[];
  } | null>(null);
  const [isLoadingInsight, setIsLoadingInsight] = useState<boolean>(false);

  const handleOpenCheckin = () => {
    if (onRequestOpenCheckin) {
      onRequestOpenCheckin();
    } else {
      setIsCheckinModalOpen(true);
    }
  };

  const handleCheckinSaved = (canonicalLog: MoodLog) => {
    setMoodLogs(prev => {
      const filtered = prev.filter(log => log.id !== canonicalLog.id && log.date !== canonicalLog.date);
      return [canonicalLog, ...filtered].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );
    });
    setSavedLogForBridge(canonicalLog);
  };

  const handleDeleteMoodLog = async (id: string) => {
    const previousLogs = [...moodLogs];
    setMoodLogs(prev => prev.filter(log => log.id !== id));
    try {
      const res = await apiClient.delete(`/api/v1/mood/${id}`);
      if (!res.success) {
        setMoodLogs(previousLogs);
        showToast(res.error || 'Gagal menghapus catatan mood dari server.', 'error');
        return;
      }
      showToast('Catatan Mood berhasil dihapus.', 'success');
    } catch (err) {
      console.warn('Failed to delete mood log on server:', err);
      setMoodLogs(previousLogs);
      showToast('Gagal menghapus catatan mood (koneksi terputus).', 'error');
    }
  };

  // Streak Calculation
  const streakCount = useMemo(() => {
    if (!moodLogs || moodLogs.length === 0) return 0;
    return calculateStreak(moodLogs.map(l => l.date));
  }, [moodLogs]);

  // Average mood calculation
  const averageMood = useMemo(() => {
    if (moodLogs.length === 0) return 'N/A';
    return (moodLogs.reduce((acc, log) => acc + log.mood, 0) / moodLogs.length).toFixed(1);
  }, [moodLogs]);

  const getMoodEmojiAndLabel = (avg: string) => {
    if (avg === 'N/A') return { emoji: '—', label: 'Belum diisi' };
    const num = parseFloat(avg);
    if (num >= 4.5) return { emoji: '😊', label: 'Sangat Baik' };
    if (num >= 3.5) return { emoji: '🙂', label: 'Baik' };
    if (num >= 2.5) return { emoji: '😐', label: 'Biasa Saja' };
    if (num >= 1.5) return { emoji: '🙁', label: 'Buruk' };
    return { emoji: '😢', label: 'Sangat Buruk' };
  };

  const moodSummary = getMoodEmojiAndLabel(averageMood);

  const emotionCounts: { [key: string]: number } = {};
  moodLogs.forEach(log => {
    log.emotions.forEach(emotion => {
      emotionCounts[emotion] = (emotionCounts[emotion] || 0) + 1;
    });
  });
  const topEmotions = Object.entries(emotionCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([emotion]) => emotion);

  const logsWithSleep = moodLogs.filter(
    log => log.sleepHours !== null && log.sleepHours !== undefined && typeof log.sleepHours === 'number' && !isNaN(log.sleepHours)
  );
  const averageSleep = logsWithSleep.length > 0
    ? (logsWithSleep.reduce((acc, log) => acc + (log.sleepHours as number), 0) / logsWithSleep.length).toFixed(1)
    : 'N/A';

  // Dynamic grid generation for 7, 30, or 90 days
  const daysCount = parseInt(timeRange, 10);
  const gridCells = useMemo(() => {
    const grid = [];
    const today = new Date();
    for (let i = daysCount - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const dateString = date.toISOString().split('T')[0];
      const matchLog = moodLogs.find(log => log.date === dateString);
      grid.push({
        date: dateString,
        dayName: date.toLocaleDateString('id-ID', { weekday: 'short' }),
        dayNumber: date.getDate(),
        label: date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
        log: matchLog || null
      });
    }
    return grid;
  }, [moodLogs, daysCount]);

  // Fetch AI Weekly Insights
  const handleFetchAiInsights = async () => {
    setIsLoadingInsight(true);
    try {
      const res = await apiClient.post<any>('/api/v1/chat/mood-insights', {
        logs: moodLogs.slice(0, 14),
        averageMood,
        streak: streakCount
      });
      const data = res.data;
      if (data) {
        setAiInsight(data);
        showToast('Wawasan pola mood AI diperbarui! ✨', 'success');
      }
    } catch {
      showToast('Wawasan pola mood lokal dimuat.', 'info');
      setAiInsight({
        summary: `Catatan emosimu dalam beberapa hari terakhir memiliki rata-rata ${averageMood}/5 dengan konsistensi streak ${streakCount} hari.`,
        patterns: ["Pencatatan emosi rutin membantu mengidentifikasi dinamika suasana hati Anda secara bertahap tanpa spekulasi sebab-akibat."],
        recommendations: ["Jadwalkan 15 menit relaksasi bebas gawai di malam hari.", "Tuliskan 3 prioritas utama harian untuk mengurangi beban kognitif."]
      });
    } finally {
      setIsLoadingInsight(false);
    }
  };

  // Filtered mood logs for the history list
  const filteredLogs = useMemo(() => {
    return moodLogs.filter(log => {
      const matchesSearch = searchQuery.trim() === '' || 
        log.notes.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.emotions.some(e => e.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesFactor = !selectedFactorFilter || 
        (log.factors && log.factors.includes(selectedFactorFilter));
      return matchesSearch && matchesFactor;
    });
  }, [moodLogs, searchQuery, selectedFactorFilter]);

  return (
    <div className="space-y-6">
      {/* Header with Quick Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-default">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-primary flex items-center gap-2">
            <Brain className="w-5 h-5 text-teal-600 dark:text-teal-400" />
            <span>Log & Analisis Mood Harian</span>
          </h2>
          <p className="text-xs sm:text-sm text-secondary mt-0.5">
            Catat ritme emosi harian dan dapatkan wawasan pola suasana hati Anda.
          </p>
        </div>
        <button
          onClick={handleOpenCheckin}
          className="btn-primary flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>Catat Mood Hari Ini</span>
        </button>
      </div>

      {/* 4-Column Statistics Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Streak */}
        <div className="surface-card p-4 sm:p-5 rounded-2xl border border-default space-y-2 flex flex-col justify-between shadow-3xs">
          <div className="flex items-center justify-between">
            <span className="text-xs text-secondary font-medium uppercase tracking-wider">Mood Streak</span>
            <div className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-500">
              <Flame className={`w-4 h-4 ${streakCount > 0 ? 'animate-pulse' : ''}`} />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-bold text-primary">{streakCount}</span>
              <span className="text-xs font-semibold text-secondary">Hari Berturut-turut</span>
            </div>
            <p className="text-xs text-muted mt-1 leading-normal">
              {streakCount >= 7 
                ? 'Luar biasa! Konsistensi tinggi 🔥' 
                : streakCount >= 3 
                ? 'Bagus! Pertahankan ritme check-in 👍' 
                : 'Check-in setiap hari untuk kebiasaan'}
            </p>
          </div>
        </div>

        {/* Card 2: Average Mood */}
        <div className="surface-card p-4 sm:p-5 rounded-2xl border border-default space-y-2 flex flex-col justify-between shadow-3xs">
          <div className="flex items-center justify-between">
            <span className="text-xs text-secondary font-medium uppercase tracking-wider">Rata-rata Mood</span>
            <div className="p-1.5 rounded-lg bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400">
              <Smile className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl sm:text-3xl font-bold text-primary">{averageMood}</span>
              <span className="text-2xl">{moodSummary.emoji}</span>
            </div>
            <p className="text-xs text-secondary font-medium mt-1">
              Kategori: <span className="font-semibold text-primary">{moodSummary.label}</span>
            </p>
          </div>
        </div>

        {/* Card 3: Top Emotion */}
        <div className="surface-card p-4 sm:p-5 rounded-2xl border border-default space-y-2 flex flex-col justify-between shadow-3xs">
          <div className="flex items-center justify-between">
            <span className="text-xs text-secondary font-medium uppercase tracking-wider">Emosi Dominan</span>
            <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
              <Tag className="w-4 h-4" />
            </div>
          </div>
          <div>
            {topEmotions.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {topEmotions.map((emotion, i) => (
                  <span key={i} className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-primary text-xs font-semibold rounded-md border border-default">
                    {emotion}
                  </span>
                ))}
              </div>
            ) : (
              <span className="text-xs text-muted italic">Belum ada catatan emosi</span>
            )}
            <p className="text-xs text-muted mt-1.5">Berdasarkan jurnal harian</p>
          </div>
        </div>

        {/* Card 4: Sleep Quality */}
        <div className="surface-card p-4 sm:p-5 rounded-2xl border border-default space-y-2 flex flex-col justify-between shadow-3xs">
          <div className="flex items-center justify-between">
            <span className="text-xs text-secondary font-medium uppercase tracking-wider">Rata-rata Tidur</span>
            <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
              <Moon className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-bold text-primary">{averageSleep}</span>
              <span className="text-xs font-semibold text-secondary">Jam / Hari</span>
            </div>
            <p className="text-xs text-muted mt-1 leading-normal">
              {averageSleep === 'N/A'
                ? 'Belum ada data tidur'
                : parseFloat(averageSleep) >= 7
                ? 'Sangat ideal & mencukupi 😴'
                : parseFloat(averageSleep) >= 5
                ? 'Cukup, jaga Sleep Hygiene'
                : 'Perlu evaluasi pola istirahat'}
            </p>
          </div>
        </div>
      </div>

      {/* Mood Grid Heatmap Section */}
      <div className="surface-card rounded-2xl p-4 sm:p-6 border border-default space-y-4 shadow-3xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-default pb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <span className="text-sm sm:text-base font-bold text-primary">Mood Grid Heatmap</span>
              <span className="text-xs text-secondary ml-2 hidden md:inline">Visualisasi konsistensi catatan suasana hati</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Time Range Selector */}
            <div className="flex surface-muted rounded-xl p-0.5 border border-default">
              {(['7', '30', '90'] as const).map(range => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    timeRange === range
                      ? 'bg-teal-600 text-white shadow-xs'
                      : 'text-secondary hover:text-primary'
                  }`}
                >
                  {range} Hari
                </button>
              ))}
            </div>

            {/* Heatmap Legend */}
            <div className="flex items-center gap-1 text-[11px] text-secondary font-medium">
              <span>Buruk</span>
              <span className="w-3 h-3 rounded bg-rose-500" title="Sangat Buruk" />
              <span className="w-3 h-3 rounded bg-amber-500" title="Buruk" />
              <span className="w-3 h-3 rounded bg-slate-400 dark:bg-slate-600" title="Biasa" />
              <span className="w-3 h-3 rounded bg-teal-500" title="Baik" />
              <span className="w-3 h-3 rounded bg-emerald-500" title="Sangat Baik" />
              <span>Baik</span>
            </div>
          </div>
        </div>

        {/* Grid Cells Rendering */}
        <div className="overflow-x-auto custom-scrollbar pt-1 pb-2">
          {timeRange === '7' ? (
            /* 7 Days: Clean 7-column layout with Day names */
            <div className="grid grid-cols-7 gap-2 min-w-[320px]">
              {gridCells.map((cell, idx) => {
                let colorClass = 'surface-muted text-secondary hover:border-slate-400';
                if (cell.log) {
                  if (cell.log.mood === 1) colorClass = 'bg-rose-500 text-white shadow-xs';
                  else if (cell.log.mood === 2) colorClass = 'bg-amber-500 text-white shadow-xs';
                  else if (cell.log.mood === 3) colorClass = 'bg-slate-500 text-white shadow-xs';
                  else if (cell.log.mood === 4) colorClass = 'bg-teal-500 text-white shadow-xs';
                  else if (cell.log.mood === 5) colorClass = 'bg-emerald-500 text-white shadow-xs';
                }

                return (
                  <div
                    key={idx}
                    className={`p-3 rounded-xl border border-default text-center transition-all cursor-pointer group relative flex flex-col justify-center items-center min-h-[72px] ${colorClass}`}
                  >
                    <span className="text-xs font-medium opacity-90">{cell.dayName}</span>
                    <span className="text-base font-bold">{cell.dayNumber}</span>
                    <span className="text-[10px] mt-0.5 truncate max-w-full font-medium">
                      {cell.log ? MOOD_OPTIONS[cell.log.mood - 1].label : 'Kosong'}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : timeRange === '30' ? (
            /* 30 Days: Responsive layout with readable cells */
            <div className="grid grid-cols-6 sm:grid-cols-10 md:grid-cols-15 xl:grid-cols-30 gap-1.5 sm:gap-2 min-w-[480px]">
              {gridCells.map((cell, idx) => {
                let colorClass = 'surface-muted text-muted hover:border-slate-400';
                if (cell.log) {
                  if (cell.log.mood === 1) colorClass = 'bg-rose-500 text-white font-bold';
                  else if (cell.log.mood === 2) colorClass = 'bg-amber-500 text-white font-bold';
                  else if (cell.log.mood === 3) colorClass = 'bg-slate-500 text-white font-bold';
                  else if (cell.log.mood === 4) colorClass = 'bg-teal-500 text-white font-bold';
                  else if (cell.log.mood === 5) colorClass = 'bg-emerald-500 text-white font-bold';
                }

                return (
                  <div
                    key={idx}
                    className={`h-9 sm:h-10 rounded-lg border border-default transition-all cursor-pointer relative group flex flex-col items-center justify-center ${colorClass}`}
                    title={`${cell.label}: ${cell.log ? MOOD_OPTIONS[cell.log.mood - 1].label : 'Kosong'}`}
                  >
                    <span className="text-[11px] leading-tight select-none">
                      {cell.dayNumber}
                    </span>
                    
                    {/* Tooltip */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-slate-900 dark:bg-slate-950 text-white border border-slate-700 px-3 py-2 rounded-xl text-xs whitespace-nowrap z-50 shadow-xl pointer-events-none">
                      <p className="font-bold text-teal-300">{cell.label}</p>
                      <p className="mt-0.5">
                        {cell.log 
                          ? `Mood: ${MOOD_OPTIONS[cell.log.mood - 1].label}${cell.log.sleepHours != null ? ` (${cell.log.sleepHours} Jam tidur)` : ''}` 
                          : 'Tidak ada catatan mood'}
                      </p>
                      {cell.log?.emotions?.length ? <p className="text-[10px] text-slate-300 mt-0.5">Emosi: {cell.log.emotions.join(', ')}</p> : null}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* 90 Days: Clean matrix */
            <div className="grid grid-cols-10 sm:grid-cols-15 md:grid-cols-18 lg:grid-cols-30 gap-1.5 min-w-[540px]">
              {gridCells.map((cell, idx) => {
                let colorClass = 'surface-muted text-muted hover:border-slate-400';
                if (cell.log) {
                  if (cell.log.mood === 1) colorClass = 'bg-rose-500 text-white';
                  else if (cell.log.mood === 2) colorClass = 'bg-amber-500 text-white';
                  else if (cell.log.mood === 3) colorClass = 'bg-slate-500 text-white';
                  else if (cell.log.mood === 4) colorClass = 'bg-teal-500 text-white';
                  else if (cell.log.mood === 5) colorClass = 'bg-emerald-500 text-white';
                }

                return (
                  <div
                    key={idx}
                    className={`h-7 sm:h-8 rounded-md border border-default transition-all cursor-pointer relative group flex items-center justify-center ${colorClass}`}
                    title={`${cell.label}: ${cell.log ? MOOD_OPTIONS[cell.log.mood - 1].label : 'Kosong'}`}
                  >
                    <span className="text-[9px] leading-tight select-none opacity-80">
                      {cell.dayNumber}
                    </span>

                    {/* Tooltip */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-slate-900 dark:bg-slate-950 text-white border border-slate-700 px-3 py-2 rounded-xl text-xs whitespace-nowrap z-50 shadow-xl pointer-events-none">
                      <p className="font-bold text-teal-300">{cell.label}</p>
                      <p className="mt-0.5">
                        {cell.log 
                          ? `Mood: ${MOOD_OPTIONS[cell.log.mood - 1].label}${cell.log.sleepHours != null ? ` (${cell.log.sleepHours} Jam)` : ''}` 
                          : 'Tidak ada catatan'}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* AI Weekly Pattern & Self-Care Insights Panel */}
      <div className="surface-card rounded-2xl p-4 sm:p-5 border border-teal-200 dark:border-teal-900/50 space-y-3.5 shadow-3xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-xs shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-primary">Analisis Wawasan Mood AI</h3>
              <p className="text-xs text-secondary">Refleksi mingguan dan rekomendasi kebiasaan mikro non-medis.</p>
            </div>
          </div>

          <button
            onClick={handleFetchAiInsights}
            disabled={isLoadingInsight}
            className="px-3.5 py-2 btn-primary text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-xs disabled:opacity-50 shrink-0"
          >
            {isLoadingInsight ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            <span>{aiInsight ? 'Perbarui Analisis AI' : 'Analisis Pola Mood'}</span>
          </button>
        </div>

        {aiInsight && (
          <div className="space-y-3 pt-2 border-t border-default animate-fade-in">
            <p className="text-xs sm:text-sm text-primary leading-relaxed font-medium surface-muted p-3.5 rounded-xl border border-default">
              {aiInsight.summary}
            </p>

            {aiInsight.patterns && aiInsight.patterns.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-xs font-bold text-teal-700 dark:text-teal-400 uppercase tracking-wider block">
                  Pola Kunci Terdeteksi:
                </span>
                <ul className="text-xs text-secondary space-y-1 pl-4 list-disc">
                  {aiInsight.patterns.map((pat, idx) => (
                    <li key={idx}>{pat}</li>
                  ))}
                </ul>
              </div>
            )}

            {aiInsight.recommendations && aiInsight.recommendations.length > 0 && (
              <div className="space-y-2 pt-1">
                <span className="text-xs font-bold text-teal-700 dark:text-teal-400 uppercase tracking-wider block">
                  Rekomendasi Self-Care Minggu Ini:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {aiInsight.recommendations.map((rec, idx) => (
                    <div key={idx} className="surface-muted p-3 rounded-xl border border-default text-xs text-primary flex items-start gap-2 shadow-3xs">
                      <CheckCircle2 className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" />
                      <span>{rec}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Mood History & Search Section */}
      <div className="surface-card rounded-2xl p-4 sm:p-5 border border-default space-y-4 shadow-3xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="font-bold text-base text-primary">Riwayat Catatan Jurnal Mood</h3>
          
          {/* Search Input */}
          <div className="relative w-full sm:max-w-xs">
            <Search className="w-3.5 h-3.5 text-secondary absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Cari catatan atau emosi..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="text-xs sm:text-sm surface-muted border border-default rounded-xl pl-9 pr-3 py-2 text-primary focus:outline-none focus:ring-2 focus:ring-teal-500/20 w-full"
            />
          </div>
        </div>

        {/* Quick Factor Filter Badges */}
        <div className="flex flex-wrap gap-1.5 items-center pt-1 border-t border-default">
          <span className="text-xs text-secondary font-medium mr-1 flex items-center gap-1">
            <Tag className="w-3 h-3" /> Filter:
          </span>
          <button
            onClick={() => setSelectedFactorFilter(null)}
            className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-all cursor-pointer ${
              selectedFactorFilter === null
                ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900'
                : 'surface-muted text-secondary hover:text-primary'
            }`}
          >
            Semua ({moodLogs.length})
          </button>
          {['Tugas/Skripsi', 'Cemas', 'Lelah', 'Tenang', 'Senang'].map(tag => (
            <button
              key={tag}
              onClick={() => setSelectedFactorFilter(selectedFactorFilter === tag ? null : tag)}
              className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-all cursor-pointer ${
                selectedFactorFilter === tag
                  ? 'bg-teal-600 text-white'
                  : 'surface-muted text-secondary hover:text-primary'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>

        {/* Mood Log Cards List */}
        {filteredLogs.length === 0 ? (
          <EmptyState
            icon="activity"
            title="Tidak ada catatan mood yang sesuai"
            description="Coba sesuaikan kata kunci pencarian atau catat mood baru dengan menekan tombol di atas."
            actionLabel="Reset Filter"
            onAction={() => {
              setSearchQuery("");
              setSelectedFactorFilter(null);
            }}
            className="my-3"
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
            {filteredLogs.map((log) => {
              const moodOpt = MOOD_OPTIONS.find(o => o.value === log.mood) || MOOD_OPTIONS[2];
              const dateObj = new Date(log.date);
              const isToday = log.date === new Date().toISOString().split('T')[0];
              const formattedDate = isToday 
                ? 'Hari Ini' 
                : dateObj.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short' });

              return (
                <div 
                  key={log.id} 
                  className="surface-card rounded-xl p-4 border border-default space-y-3 hover:border-slate-300 dark:hover:border-slate-700 transition-all relative group shadow-3xs"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <span className="text-2xl sm:text-3xl leading-none">{moodOpt.emoji}</span>
                      <div>
                        <span className="text-xs sm:text-sm font-bold text-primary flex items-center gap-1.5">
                          {formattedDate}
                          {isToday && <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse"></span>}
                        </span>
                        <span className="text-[11px] text-secondary font-semibold uppercase tracking-wider block">
                          Mood: {moodOpt.label}
                        </span>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => handleDeleteMoodLog(log.id)}
                      className="text-muted hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors opacity-70 group-hover:opacity-100 cursor-pointer"
                      title="Hapus Catatan"
                      aria-label="Hapus catatan mood"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {log.notes && (
                    <p className="text-xs sm:text-sm text-primary leading-relaxed surface-muted p-3 rounded-xl border border-default font-normal">
                      {log.notes}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs pt-1">
                    <div className="flex flex-wrap gap-1">
                      {log.emotions && log.emotions.map((em, i) => {
                        const matchObj = EMOTION_TAGS.find(t => t.label === em);
                        return (
                          <span key={`em-${i}`} className="px-2 py-0.5 surface-muted text-secondary border border-default rounded-md text-[11px] font-medium">
                            {matchObj ? matchObj.icon : '🏷️'} {em}
                          </span>
                        );
                      })}
                      {log.factors && log.factors.map((fac, i) => {
                        const matchObj = FACTOR_TAGS.find(t => t.label === fac);
                        return (
                          <span key={`fac-${i}`} className="px-2 py-0.5 bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 rounded-md text-[11px] font-medium">
                            {matchObj ? matchObj.icon : '🏷️'} {fac}
                          </span>
                        );
                      })}
                    </div>

                    {log.sleepHours != null && (
                      <div className="flex items-center gap-1.5 text-secondary text-xs font-medium ml-auto">
                        <Moon className="w-3.5 h-3.5 text-indigo-500" />
                        <span>{log.sleepHours} Jam {log.sleepQuality ? `(${log.sleepQuality})` : ''}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* DAILY CHECKIN MODAL (Isolated overlay with backdrop blur & scroll lock) */}
      <DailyCheckinModal
        isOpen={isCheckinModalOpen}
        onClose={() => setIsCheckinModalOpen(false)}
        onSaveSuccess={handleCheckinSaved}
        showToast={showToast}
      />

      {/* MOOD TO CHAT BRIDGE OPT-IN MODAL */}
      {savedLogForBridge && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="absolute inset-0" onClick={() => setSavedLogForBridge(null)} />
          <div className="relative w-full max-w-sm surface-card rounded-3xl border border-default shadow-2xl overflow-hidden flex flex-col p-6 space-y-4 animate-scale-up">
            <div className="p-3 bg-teal-50 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400 rounded-2xl w-12 h-12 flex items-center justify-center mx-auto">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>
            
            <div className="space-y-1.5 text-center">
              <h4 className="text-base font-bold text-primary">Diskusikan Hasil di Chat?</h4>
              <p className="text-xs sm:text-sm text-secondary leading-relaxed">
                Apakah Anda ingin membahas catatan suasana hati hari ini bersama AI Pendamping di Chat? Anda dapat merefleksikan emosi secara lebih mendalam dan mencari solusinya bersama.
              </p>
            </div>

            <div className="p-3.5 surface-muted rounded-xl border border-default space-y-1.5">
              <span className="text-[10px] uppercase font-bold text-muted block">Data yang akan ditransmisikan secara privat:</span>
              <div className="flex flex-wrap gap-1.5 items-center mt-1">
                <span className="px-2 py-0.5 surface-card border border-default rounded text-xs text-primary font-medium">
                  Mood: {savedLogForBridge.mood === 5 ? '😊 Sangat Baik' : savedLogForBridge.mood === 4 ? '🙂 Baik' : savedLogForBridge.mood === 3 ? '😐 Biasa Saja' : savedLogForBridge.mood === 2 ? '🙁 Buruk' : '😢 Sangat Buruk'}
                </span>
                {savedLogForBridge.emotions.map(e => (
                  <span key={e} className="px-2 py-0.5 surface-card border border-default rounded text-xs text-secondary">
                    {e}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setSavedLogForBridge(null)}
                className="flex-1 py-2.5 min-h-[42px] btn-secondary rounded-xl text-xs sm:text-sm font-semibold transition-all"
              >
                Tutup
              </button>
              <button
                type="button"
                onClick={() => {
                  const log = savedLogForBridge;
                  setSavedLogForBridge(null);
                  navigate('/', { state: { discussMood: log } });
                }}
                className="flex-1 py-2.5 min-h-[42px] btn-primary rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-1.5 shadow-xs"
              >
                <span>Buka Chat</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
