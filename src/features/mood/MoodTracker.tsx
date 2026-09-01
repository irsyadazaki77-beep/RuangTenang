import React, { useState, useMemo } from 'react';
import { useEscapeKey } from '../../hooks/useEscapeKey';
import { calculateStreak } from '../../utils/streak';
import { 
  Smile, 
  SmilePlus, 
  Moon, 
  Trash2, 
  Calendar, 
  Flame, 
  Sparkles, 
  Search, 
  Tag, 
  RefreshCw, 
  TrendingUp, 
  CheckCircle2, 
  Lightbulb,
  Plus,
  X, 
  ChevronRight 
} from 'lucide-react';
import { apiClient } from '../../lib/apiClient';

interface MoodLog {
  id: string;
  date: string;
  mood: number;
  emotions: string[];
  notes: string;
  sleepHours: number;
  sleepQuality: 'Nyenyak' | 'Kurang Nyenyak' | 'Insomnia';
}

interface MoodTrackerProps {
  moodLogs: MoodLog[];
  setMoodLogs: React.Dispatch<React.SetStateAction<MoodLog[]>>;
  showToast: (msg: string, type?: 'info' | 'success' | 'warning' | 'error', title?: string) => void;
}

const MOOD_OPTIONS = [
  { value: 1, label: 'Sangat Buruk', emoji: '😢', color: 'bg-rose-50 text-rose-600 border-rose-200 active:bg-rose-100 hover:bg-rose-50' },
  { value: 2, label: 'Buruk', emoji: '🙁', color: 'bg-amber-50 text-amber-600 border-amber-200 active:bg-amber-100 hover:bg-amber-50' },
  { value: 3, label: 'Biasa Saja', emoji: '😐', color: 'bg-slate-50 text-slate-600 border-slate-200 active:bg-slate-100 hover:bg-slate-50' },
  { value: 4, label: 'Baik', emoji: '🙂', color: 'bg-teal-50 text-teal-600 border-teal-200 active:bg-teal-100 hover:bg-teal-50' },
  { value: 5, label: 'Sangat Baik', emoji: '😊', color: 'bg-emerald-50 text-emerald-600 border-emerald-200 active:bg-emerald-100 hover:bg-emerald-50' }
];

const EMOTION_TAGS = [
  { label: 'Cemas', icon: '😰' },
  { label: 'Lelah', icon: '🥱' },
  { label: 'Tenang', icon: '🧘' },
  { label: 'Senang', icon: '😄' },
  { label: 'Sedih', icon: '😔' },
  { label: 'Bersemangat', icon: '🚀' },
  { label: 'Produktif', icon: '🎯' },
  { label: 'Tertekan', icon: '🤯' },
  { label: 'Kesal', icon: '😡' },
  { label: 'Bingung', icon: '💭' }
];

const FACTOR_TAGS = [
  { label: 'Tugas/Skripsi', icon: '📚' },
  { label: 'Ujian/Kuis', icon: '📝' },
  { label: 'Dosen/Bimbingan', icon: '👨‍🏫' },
  { label: 'Hubungan/Pertemanan', icon: '👥' },
  { label: 'Finansial/UKT', icon: '💸' },
  { label: 'Kurang Tidur', icon: '💤' },
  { label: 'Keluarga', icon: '🏡' },
  { label: 'Karir/Magang', icon: '💼' },
  { label: 'Organisasi', icon: '🤝' },
  { label: 'Kesehatan Fisik', icon: '🩺' }
];

export const MoodTracker: React.FC<MoodTrackerProps> = ({
  moodLogs,
  setMoodLogs,
  showToast
}) => {
  const [isFormModalOpen, setIsFormModalOpen] = useState<boolean>(false);
  useEscapeKey(() => setIsFormModalOpen(false), isFormModalOpen);

  const [selectedMood, setSelectedMood] = useState<number | null>(null);
  const [selectedEmotions, setSelectedEmotions] = useState<string[]>([]);
  const [journalNote, setJournalNote] = useState<string>('');
  const [sleepHours, setSleepHours] = useState<number>(7);
  const [sleepQuality, setSleepQuality] = useState<'Nyenyak' | 'Kurang Nyenyak' | 'Insomnia'>('Nyenyak');
  const [logDate, setLogDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // 2.0 Features: Time range filter, Search, AI insights & Reflection prompt
  const [timeRange, setTimeRange] = useState<'7' | '30' | '90'>('30');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedFactorFilter, setSelectedFactorFilter] = useState<string | null>(null);
  
  const [aiInsight, setAiInsight] = useState<{
    summary: string;
    patterns: string[];
    recommendations: string[];
  } | null>(null);
  const [isLoadingInsight, setIsLoadingInsight] = useState<boolean>(false);

  const [reflectionPrompts, setReflectionPrompts] = useState<string[]>([]);
  const [isLoadingPrompts, setIsLoadingPrompts] = useState<boolean>(false);
  const [isSubmittingMood, setIsSubmittingMood] = useState<boolean>(false);

  const handleToggleEmotion = (tagLabel: string) => {
    if (selectedEmotions.includes(tagLabel)) {
      setSelectedEmotions(prev => prev.filter(e => e !== tagLabel));
    } else {
      setSelectedEmotions(prev => [...prev, tagLabel]);
    }
  };

  const handleSaveMoodLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedMood === null) {
      showToast('Harap pilih ekspresi mood utama Anda.', 'warning');
      return;
    }

    setIsSubmittingMood(true);
    try {
      const res = await apiClient.post<{ success: boolean; log: any }>("/api/v1/mood", { 
        mood: selectedMood, 
        notes: journalNote.trim(), 
        intensity: sleepHours, 
        factors: selectedEmotions 
      });

      if (!res.success || !res.data?.log) {
        showToast(res.error || 'Gagal menyimpan catatan mood ke server.', 'error');
        return;
      }

      const saved = res.data.log;
      const canonicalDate = saved.timestamp
        ? new Date(saved.timestamp).toISOString().split('T')[0]
        : logDate;

      const canonicalLog: MoodLog = {
        id: saved.id,
        date: canonicalDate,
        mood: typeof saved.mood === 'number' ? saved.mood : (parseInt(saved.mood, 10) || selectedMood),
        emotions: Array.isArray(saved.factors) ? saved.factors : selectedEmotions,
        notes: saved.notes || journalNote.trim(),
        sleepHours: saved.intensity ?? sleepHours,
        sleepQuality
      };

      setMoodLogs(prev => {
        const filtered = prev.filter(log => log.id !== canonicalLog.id && log.date !== canonicalLog.date);
        return [canonicalLog, ...filtered].sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );
      });

      // Reset fields on success
      setSelectedMood(null);
      setSelectedEmotions([]);
      setJournalNote('');
      setLogDate(new Date().toISOString().split('T')[0]);
      setIsFormModalOpen(false);
      showToast('Catatan Mood harian berhasil disimpan! 🎉', 'success');
    } catch (err: any) {
      console.error("Failed to sync mood with backend:", err);
      showToast('Terjadi kesalahan jaringan saat menyimpan catatan mood.', 'error');
    } finally {
      setIsSubmittingMood(false);
    }
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

  const averageSleep = moodLogs.length > 0
    ? (moodLogs.reduce((acc, log) => acc + log.sleepHours, 0) / moodLogs.length).toFixed(1)
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
        label: date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
        log: matchLog || null
      });
    }
    return grid;
  }, [moodLogs, daysCount]);

  // Fetch AI Reflection Prompts
  const handleFetchReflectionPrompts = async () => {
    setIsLoadingPrompts(true);
    try {
      const currentMoodOpt = selectedMood ? MOOD_OPTIONS.find(m => m.value === selectedMood)?.label : 'Sedang';
      const res = await apiClient.post<any>('/api/v1/chat/reflection-prompts', {
        mood: currentMoodOpt,
        feeling: selectedEmotions.join(', ') || 'Reflektif',
        context: 'Rutinitas perkuliahan mahasiswa'
      });
      const data = res.data;
      if (data && data.prompts && data.prompts.length > 0) {
        setReflectionPrompts(data.prompts);
      }
    } catch (e) {
      setReflectionPrompts([
        "Apa satu hal kecil hari ini yang membuatmu merasa sedikit lebih tenang?",
        "Jika tubuhmu saat ini bisa meminta sesuatu, apa yang paling ia butuhkan?",
        "Apa satu beban pikiran yang bisa kamu lepaskan sejenak malam ini?"
      ]);
    } finally {
      setIsLoadingPrompts(false);
    }
  };

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
        showToast('Wawasan pola mood AI diperbarui! ✨');
      }
    } catch (e) {
      showToast('Wawasan pola mood lokal dimuat.');
      setAiInsight({
        summary: `Catatan emosimu dalam beberapa hari terakhir memiliki rata-rata ${averageMood}/5 dengan konsistensi streak ${streakCount} hari.`,
        patterns: ["Korelasi log menunjukkan istirahat yang cukup membantu kestabilan emosi."],
        recommendations: ["Jadwalkan 15 menit relaksasi bebas gawai di malam hari.", "Tuliskan 3 prioritas utama harian."]
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
      
      const matchesFactor = !selectedFactorFilter || log.emotions.includes(selectedFactorFilter);
      return matchesSearch && matchesFactor;
    });
  }, [moodLogs, searchQuery, selectedFactorFilter]);

  return (
    <div className="space-y-6">
      {/* Mood Statistics & Streak Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Card 1: Streak */}
        <div className="bg-slate-50 p-4 rounded-xl space-y-1 flex flex-col justify-between border border-slate-200/60 shadow-3xs">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-600 font-medium">Mood Streak</span>
            <Flame className={`w-4 h-4 ${streakCount > 0 ? 'text-amber-500 animate-pulse' : 'text-slate-400'}`} />
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold text-slate-900">{streakCount}</span>
              <span className="text-xs font-semibold text-slate-600">Hari Berturut-turut</span>
            </div>
            <p className="text-[10px] text-slate-500 mt-0.5">
              {streakCount >= 7 ? 'Luar biasa! Konsistensi tinggi 🔥' : streakCount >= 3 ? 'Bagus! Pertahankan ritme check-in 👍' : 'Check-in setiap hari untuk membentuk kebiasaan'}
            </p>
          </div>
        </div>

        {/* Card 2: Average Mood */}
        <div className="bg-slate-50 p-4 rounded-xl space-y-1 flex flex-col justify-between border border-slate-200/60 shadow-3xs">
          <span className="text-xs text-slate-600 font-medium">Rata-rata Mood</span>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-2xl font-bold text-slate-900">{averageMood}</span>
              <span className="text-lg">{moodSummary.emoji}</span>
            </div>
            <p className="text-[10px] text-slate-600 font-medium mt-0.5">{moodSummary.label}</p>
          </div>
        </div>

        {/* Card 3: Top Emotion/Trigger */}
        <div className="bg-slate-50 p-4 rounded-xl space-y-1 flex flex-col justify-between border border-slate-200/60 shadow-3xs">
          <span className="text-xs text-slate-600 font-medium">Emosi Sering Muncul</span>
          <div>
            {topEmotions.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {topEmotions.map((emotion, i) => (
                  <span key={i} className="px-1.5 py-0.5 bg-slate-200 text-slate-700 text-[10px] font-semibold rounded">
                    {emotion}
                  </span>
                ))}
              </div>
            ) : (
              <span className="text-xs text-slate-500 italic">Belum ada data</span>
            )}
            <p className="text-[10px] text-slate-500 mt-1">Berdasarkan jurnal harian</p>
          </div>
        </div>

        {/* Card 4: Average Sleep */}
        <div className="bg-slate-50 p-4 rounded-xl space-y-1 flex flex-col justify-between border border-slate-200/60 shadow-3xs">
          <span className="text-xs text-slate-600 font-medium">Rata-rata Jam Tidur</span>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold text-slate-900">{averageSleep}</span>
              <span className="text-xs text-slate-600 font-medium">Jam/Hari</span>
            </div>
            <p className="text-[10px] text-slate-600 mt-0.5">
              {parseFloat(averageSleep) >= 7 ? 'Sangat ideal! 😴' : parseFloat(averageSleep) >= 5 ? 'Cukup, jaga Sleep Hygiene' : 'Perlu evaluasi pola tidur'}
            </p>
          </div>
        </div>
      </div>

      {/* Interactive Mood Contribution Grid (7, 30, 90 Days) */}
      <div className="bg-slate-900 text-white p-4 sm:p-5 rounded-2xl space-y-3.5 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-teal-400" />
            <span className="text-xs sm:text-sm font-semibold">Mood Grid Heatmap</span>
            <div className="flex bg-slate-800 rounded-lg p-0.5 border border-slate-700 ml-2">
              {(['7', '30', '90'] as const).map(range => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`px-2 py-0.5 text-[10px] font-semibold rounded-md transition-all ${
                    timeRange === range
                      ? 'bg-teal-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {range} Hari
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-medium">
            <span>Buruk</span>
            <span className="w-2.5 h-2.5 rounded-xs bg-rose-500"></span>
            <span className="w-2.5 h-2.5 rounded-xs bg-amber-500"></span>
            <span className="w-2.5 h-2.5 rounded-xs bg-slate-600"></span>
            <span className="w-2.5 h-2.5 rounded-xs bg-teal-500"></span>
            <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500"></span>
            <span>Sangat Baik</span>
          </div>
        </div>

        <div className={`grid gap-1.5 pt-1 ${
          timeRange === '7' 
            ? 'grid-cols-7' 
            : timeRange === '30' 
            ? 'grid-cols-10' 
            : 'grid-cols-15 sm:grid-cols-18 md:grid-cols-30'
        }`}>
          {gridCells.map((cell, idx) => {
            let colorClass = 'bg-slate-800 hover:bg-slate-700';
            if (cell.log) {
              if (cell.log.mood === 1) colorClass = 'bg-rose-500 hover:bg-rose-600';
              else if (cell.log.mood === 2) colorClass = 'bg-amber-500 hover:bg-amber-600';
              else if (cell.log.mood === 3) colorClass = 'bg-slate-500 hover:bg-slate-400';
              else if (cell.log.mood === 4) colorClass = 'bg-teal-500 hover:bg-teal-400';
              else if (cell.log.mood === 5) colorClass = 'bg-emerald-500 hover:bg-emerald-400';
            }
            return (
              <div
                key={idx}
                className={`h-7 sm:h-8 rounded-md transition-all cursor-pointer relative group flex items-center justify-center ${colorClass}`}
                title={`${cell.label}: ${cell.log ? MOOD_OPTIONS[cell.log.mood - 1].label : 'Kosong'}`}
              >
                {timeRange !== '90' && (
                  <span className="text-[10px] font-semibold text-white/95 select-none">
                    {cell.label.split(' ')[0]}
                  </span>
                )}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block bg-slate-950 text-white border border-slate-700 px-2.5 py-1.5 rounded-lg text-[10px] whitespace-nowrap z-50 shadow-xl pointer-events-none">
                  <p className="font-bold text-teal-300">{cell.label}</p>
                  <p>{cell.log ? `Mood: ${MOOD_OPTIONS[cell.log.mood - 1].label} (${cell.log.sleepHours} Jam)` : 'Tidak ada catatan'}</p>
                  {cell.log?.emotions?.length ? <p className="text-[9px] text-slate-400 mt-0.5">Tag: {cell.log.emotions.join(', ')}</p> : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* AI Weekly Pattern & Self-Care Insights Panel */}
      <div className="bg-gradient-to-br from-teal-50/70 via-white to-slate-50 border border-teal-200/80 rounded-2xl p-5 space-y-3.5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-slate-900">Analisis Wawasan Mood AI</h3>
              <p className="text-[11px] text-slate-500">Refleksi mingguan dan rekomendasi kebiasaan mikro non-medis.</p>
            </div>
          </div>

          <button
            onClick={handleFetchAiInsights}
            disabled={isLoadingInsight}
            className="px-3.5 py-2 bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-xs disabled:opacity-50 cursor-pointer"
          >
            {isLoadingInsight ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            <span>{aiInsight ? 'Perbarui Analisis AI' : 'Analisis Pola Mood'}</span>
          </button>
        </div>

        {aiInsight && (
          <div className="space-y-3 pt-2 border-t border-teal-100/80 animate-fade-in">
            <p className="text-xs text-slate-700 leading-relaxed font-medium bg-white/80 p-3 rounded-xl border border-teal-100">
              {aiInsight.summary}
            </p>

            {aiInsight.patterns && aiInsight.patterns.length > 0 && (
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-teal-900 uppercase tracking-wider block">Pola Kunci Terdeteksi:</span>
                <ul className="text-xs text-slate-600 space-y-1 pl-4 list-disc">
                  {aiInsight.patterns.map((pat, idx) => (
                    <li key={idx}>{pat}</li>
                  ))}
                </ul>
              </div>
            )}

            {aiInsight.recommendations && aiInsight.recommendations.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <span className="text-[11px] font-bold text-teal-900 uppercase tracking-wider block">Rekomendasi Self-Care Minggu Ini:</span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {aiInsight.recommendations.map((rec, idx) => (
                    <div key={idx} className="bg-white p-2.5 rounded-xl border border-teal-100 text-xs text-slate-700 flex items-start gap-1.5 shadow-3xs">
                      <CheckCircle2 className="w-3.5 h-3.5 text-teal-600 shrink-0 mt-0.5" />
                      <span>{rec}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex justify-between items-center mb-6">
        <h3 className="font-semibold text-primary">Riwayat Catatan Mood</h3>
        <button
          onClick={() => setIsFormModalOpen(true)}
          className="btn-primary flex items-center gap-2 px-4 py-2 rounded-xl text-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Catatan</span>
        </button>
      </div>

      {/* INPUT FORM MODAL */}
      {isFormModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="absolute inset-0" onClick={() => setIsFormModalOpen(false)} />
          <div className="relative w-full max-w-lg surface-card rounded-3xl shadow-xl overflow-hidden flex flex-col max-h-full animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-default shrink-0">
              <div className="flex items-center gap-2 text-primary font-bold text-sm sm:text-base">
                <Smile className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                <span>Bagaimana perasaan Anda hari ini?</span>
              </div>
              <button
                onClick={() => setIsFormModalOpen(false)}
                className="p-2 text-secondary hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSaveMoodLog} className="p-4 sm:p-5 space-y-6 overflow-y-auto custom-scrollbar">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-secondary uppercase tracking-wider block">Tanggal Catatan</label>
                <input
                  type="date"
                  value={logDate}
                  onChange={(e) => setLogDate(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  className="w-full text-sm p-3 surface-muted border border-default rounded-xl text-primary focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                />
              </div>

              {/* Mood Options */}
              <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Pilih Mood Utama</label>
            <div className="grid grid-cols-5 gap-2">
              {MOOD_OPTIONS.map((opt) => {
                const isActive = selectedMood === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setSelectedMood(opt.value)}
                    className={`py-3 rounded-2xl border flex flex-col items-center gap-1 transition-all focus:outline-none cursor-pointer ${
                      isActive 
                        ? `${opt.color} border-transparent shadow-sm scale-105` 
                        : 'bg-stone-50 border-slate-200/60 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <span className="text-xl sm:text-2xl">{opt.emoji}</span>
                    <span className="text-[9px] font-semibold leading-none text-center truncate w-full px-1">{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Emotion Tags */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Emosi yang Dirasakan</label>
            <div className="flex flex-wrap gap-2">
              {EMOTION_TAGS.map((tag) => {
                const isSelected = selectedEmotions.includes(tag.label);
                return (
                  <button
                    key={tag.label}
                    type="button"
                    onClick={() => handleToggleEmotion(tag.label)}
                    className={`px-3 py-1.5 text-xs rounded-xl border transition-all flex items-center gap-1.5 cursor-pointer ${
                      isSelected
                        ? 'bg-teal-600 border-teal-600 text-white font-semibold shadow-sm'
                        : 'bg-stone-50 border-slate-200/60 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <span>{tag.icon}</span>
                    <span>{tag.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Trigger / Factors Section */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Faktor / Pemicu Terkait</label>
            <div className="flex flex-wrap gap-2">
              {FACTOR_TAGS.map((factor) => {
                const isSelected = selectedEmotions.includes(factor.label);
                return (
                  <button
                    key={factor.label}
                    type="button"
                    onClick={() => handleToggleEmotion(factor.label)}
                    className={`px-3 py-1.5 text-xs rounded-xl border transition-all flex items-center gap-1.5 cursor-pointer ${
                      isSelected
                        ? 'bg-blue-600 border-blue-600 text-white font-semibold shadow-sm'
                        : 'bg-stone-50 border-slate-200/60 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <span>{factor.icon}</span>
                    <span>{factor.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-5 pt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-secondary uppercase tracking-wider block">Durasi Tidur: {sleepHours} Jam</label>
                <input
                  type="range"
                  min="1"
                  max="12"
                    step="0.5"
                    value={sleepHours}
                    onChange={(e) => setSleepHours(parseFloat(e.target.value))}
                    className="w-full accent-slate-800"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Kualitas Tidur</label>
                  <select
                    value={sleepQuality}
                    onChange={(e) => setSleepQuality(e.target.value as any)}
                    className="w-full text-sm p-3 bg-stone-50 border border-slate-200/60 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                  >
                    <option value="Nyenyak">😴 Nyenyak</option>
                    <option value="Kurang Nyenyak">🔄 Kurang Nyenyak</option>
                    <option value="Insomnia">😳 Insomnia</option>
                  </select>
                </div>
              </div>

              {/* Reflection Prompt Helper */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Jurnal Refleksi Emosi</label>
                  <button
                    type="button"
                    onClick={handleFetchReflectionPrompts}
                    disabled={isLoadingPrompts}
                    className="text-[11px] text-teal-600 hover:text-teal-700 font-bold flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    {isLoadingPrompts ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Lightbulb className="w-3.5 h-3.5" />}
                    <span>Inspirasi Refleksi AI</span>
                  </button>
                </div>

                {reflectionPrompts.length > 0 && (
                  <div className="bg-teal-50/50 p-4 rounded-xl border border-teal-100/50 space-y-2">
                    <span className="text-[11px] font-bold text-teal-800 block">Pilih prompt untuk memandu tulisanmu:</span>
                    {reflectionPrompts.map((p, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setJournalNote(prev => prev ? `${prev}\n\n${p}: ` : `${p}: `)}
                        className="w-full text-left text-xs text-slate-700 hover:text-teal-900 hover:bg-white p-2 rounded-lg transition-colors block leading-relaxed border border-transparent hover:border-teal-100 shadow-3xs"
                      >
                        • {p}
                      </button>
                    ))}
                  </div>
                )}

                <div className="space-y-1">
                  <textarea
                    placeholder="Ceritakan kejadian atau apa yang ada di pikiran Anda secara singkat..."
                    value={journalNote}
                    onChange={(e) => setJournalNote(e.target.value.slice(0, 400))}
                    rows={4}
                    className="w-full p-3.5 text-sm bg-stone-50 border border-slate-200/60 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/20 placeholder:text-slate-400 resize-none transition-all"
                  />
                  <div className="flex justify-end">
                    <span className="text-[10px] text-slate-400 font-medium">{journalNote.length}/400 karakter</span>
                  </div>
                </div>
              </div>
            </div>

          <button
            type="submit"
            disabled={isSubmittingMood}
            className="w-full py-4 btn-primary rounded-2xl shadow-sm transition-all active:scale-95 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSubmittingMood ? 'Menyimpan Catatan...' : 'Simpan Check-In Mood'}
          </button>
        </form>
      </div>
    </div>
  )}

  {/* LOG HISTORY & SEARCH */}
  <div className="space-y-4 mt-2">
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 hidden">
      <span className="text-xs font-semibold text-primary uppercase tracking-wider">
        Riwayat Jurnal Mood Harian
      </span>
    </div>
    
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
      {/* Search Input */}
      <div className="relative w-full sm:max-w-xs">
        <Search className="w-3.5 h-3.5 text-secondary absolute left-3 top-2.5" />
        <input
          type="text"
          placeholder="Cari catatan atau emosi..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="text-sm surface-muted border border-default rounded-xl pl-8 pr-3 py-1.5 text-primary focus:outline-none focus:border-teal-500 w-full"
        />
      </div>
          </div>

          {/* Quick Factor Filter Badges */}
          <div className="flex flex-wrap gap-1.5 items-center">
            <span className="text-[10px] text-slate-500 font-medium mr-1 flex items-center gap-1">
              <Tag className="w-3 h-3" /> Filter:
            </span>
            <button
              onClick={() => setSelectedFactorFilter(null)}
              className={`px-2 py-0.5 text-[10px] rounded-md font-medium transition-all ${
                selectedFactorFilter === null
                  ? 'bg-slate-800 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Semua ({moodLogs.length})
            </button>
            {['Tugas/Skripsi', 'Cemas', 'Lelah', 'Tenang', 'Senang'].map(tag => (
              <button
                key={tag}
                onClick={() => setSelectedFactorFilter(selectedFactorFilter === tag ? null : tag)}
                className={`px-2 py-0.5 text-[10px] rounded-md font-medium transition-all ${
                  selectedFactorFilter === tag
                    ? 'bg-teal-700 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>

          {filteredLogs.length === 0 ? (
            <div className="bg-slate-50 rounded-2xl p-8 text-center border border-slate-200/60">
              <Smile className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-800">Tidak ada catatan mood yang sesuai</p>
              <p className="text-[11px] text-slate-500 mt-1">Coba sesuaikan kata kunci pencarian atau catat mood baru di sebelah kiri.</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1 scrollbar-thin">
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
                    className="bg-white border border-slate-200/80 rounded-2xl p-4 space-y-2.5 hover:border-slate-300 hover:shadow-xs transition-all relative group"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <span className="text-2xl">{moodOpt.emoji}</span>
                        <div>
                          <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                            {formattedDate}
                            {isToday && <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse"></span>}
                          </span>
                          <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider block">Mood: {moodOpt.label}</span>
                        </div>
                      </div>
                      
                      <button
                        onClick={() => handleDeleteMoodLog(log.id)}
                        className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition-colors opacity-0 group-hover:opacity-100 absolute top-3 right-3"
                        title="Hapus Catatan"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {log.notes && (
                      <p className="text-xs text-slate-700 font-sans leading-relaxed bg-slate-50/70 p-3 rounded-xl border border-slate-100">
                        {log.notes}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] pt-1">
                      <div className="flex flex-wrap gap-1">
                        {log.emotions.map((em, i) => {
                          const matchObj = [...EMOTION_TAGS, ...FACTOR_TAGS].find(t => t.label === em);
                          return (
                            <span key={i} className="px-2 py-0.5 bg-slate-100 text-slate-700 border border-slate-200 rounded-md text-[10px] font-semibold">
                              {matchObj ? matchObj.icon : '🏷️'} {em}
                            </span>
                          );
                        })}
                      </div>

                      <div className="flex items-center gap-1.5 text-slate-500 font-medium">
                        <Moon className="w-3 h-3 text-slate-400" />
                        <span>{log.sleepHours} Jam ({log.sleepQuality})</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
  );
};

