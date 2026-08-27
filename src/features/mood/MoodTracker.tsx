import React, { useState, useMemo } from 'react';
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
  showToast: (msg: string) => void;
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
  const [selectedMood, setSelectedMood] = useState<number | null>(null);
  const [selectedEmotions, setSelectedEmotions] = useState<string[]>([]);
  const [journalNote, setJournalNote] = useState<string>('');
  const [showDetails, setShowDetails] = useState<boolean>(false);
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

  const handleToggleEmotion = (tagLabel: string) => {
    if (selectedEmotions.includes(tagLabel)) {
      setSelectedEmotions(prev => prev.filter(e => e !== tagLabel));
    } else {
      setSelectedEmotions(prev => [...prev, tagLabel]);
    }
  };

  const handleSaveMoodLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedMood === null) {
      showToast('Harap pilih ekspresi mood utama Anda.');
      return;
    }

    const newLog: MoodLog = {
      id: `mood-${Date.now()}`,
      date: logDate,
      mood: selectedMood,
      emotions: selectedEmotions,
      notes: journalNote.trim(),
      sleepHours,
      sleepQuality
    };

    const updatedLogs = [newLog, ...moodLogs.filter(log => log.date !== logDate)].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    setMoodLogs(updatedLogs);
    
    // Sync with backend
    apiClient.post("/api/v1/mood", { 
      mood: selectedMood, 
      notes: journalNote.trim(), 
      intensity: sleepHours, 
      factors: selectedEmotions 
    }).catch(e => console.error("Failed to sync mood with backend:", e));

    // Reset fields
    setSelectedMood(null);
    setSelectedEmotions([]);
    setJournalNote('');
    setLogDate(new Date().toISOString().split('T')[0]);
    showToast('Catatan Mood harian berhasil disimpan! 🎉');
  };

  const handleDeleteMoodLog = async (id: string) => {
    const updated = moodLogs.filter(log => log.id !== id);
    setMoodLogs(updated);
    try {
      await apiClient.delete(`/api/v1/mood/${id}`);
      showToast('Catatan Mood berhasil dihapus dari server.');
    } catch (err) {
      console.warn('Failed to delete mood log on server:', err);
      showToast('Catatan Mood dihapus secara lokal.');
    }
  };

  // Streak Calculation
  const streakCount = useMemo(() => {
    if (!moodLogs || moodLogs.length === 0) return 0;
    
    const dates = Array.from(new Set(moodLogs.map(l => l.date))).sort().reverse();
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    // If no log today or yesterday, streak is 0
    if (!dates.includes(today) && !dates.includes(yesterday)) return 0;

    const current = dates.includes(today) ? new Date(today) : new Date(yesterday);
    let streak = 0;

    while (true) {
      const checkStr = current.toISOString().split('T')[0];
      if (dates.includes(checkStr)) {
        streak++;
        current.setDate(current.getDate() - 1);
      } else {
        break;
      }
    }
    return streak;
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

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* INPUT FORM */}
        <form onSubmit={handleSaveMoodLog} className="lg:col-span-5 bg-slate-50 rounded-2xl p-4 sm:p-5 space-y-4 border border-slate-200/80 shadow-xs">
          <div className="flex items-center gap-1.5 text-slate-900 font-semibold text-xs sm:text-sm border-b border-slate-200 pb-2.5">
            <Smile className="w-4 h-4 text-teal-700" />
            <span>Bagaimana perasaan Anda hari ini?</span>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider block">Tanggal Catatan</label>
            <input
              type="date"
              value={logDate}
              onChange={(e) => setLogDate(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
              className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:border-slate-800"
            />
          </div>

          {/* Mood Options */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider block">Pilih Mood Utama</label>
            <div className="grid grid-cols-5 gap-1.5">
              {MOOD_OPTIONS.map((opt) => {
                const isActive = selectedMood === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setSelectedMood(opt.value)}
                    className={`py-2.5 rounded-xl border flex flex-col items-center gap-0.5 transition-all ${
                      isActive 
                        ? `${opt.color} ring-2 ring-slate-800 ring-offset-1 font-bold shadow-xs` 
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <span className="text-base sm:text-lg">{opt.emoji}</span>
                    <span className="text-[8px] sm:text-[9px] font-medium leading-none text-center truncate w-full px-1">{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Emotion Tags */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider block">Emosi yang Dirasakan</label>
            <div className="flex flex-wrap gap-1.5">
              {EMOTION_TAGS.map((tag) => {
                const isSelected = selectedEmotions.includes(tag.label);
                return (
                  <button
                    key={tag.label}
                    type="button"
                    onClick={() => handleToggleEmotion(tag.label)}
                    className={`px-2.5 py-1 text-[11px] rounded-lg border transition-all flex items-center gap-1 ${
                      isSelected
                        ? 'bg-slate-800 border-slate-800 text-white font-medium shadow-3xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
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
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider block">Faktor / Pemicu Terkait</label>
            <div className="flex flex-wrap gap-1.5">
              {FACTOR_TAGS.map((factor) => {
                const isSelected = selectedEmotions.includes(factor.label);
                return (
                  <button
                    key={factor.label}
                    type="button"
                    onClick={() => handleToggleEmotion(factor.label)}
                    className={`px-2.5 py-1 text-[11px] rounded-lg border transition-all flex items-center gap-1 ${
                      isSelected
                        ? 'bg-teal-700 border-teal-700 text-white font-medium shadow-3xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <span>{factor.icon}</span>
                    <span>{factor.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {!showDetails ? (
            <button
              type="button"
              onClick={() => setShowDetails(true)}
              className="w-full py-2 border border-dashed border-slate-300 text-slate-600 text-xs font-semibold rounded-xl hover:bg-white hover:text-slate-800 transition-colors cursor-pointer"
            >
              + Tambah Detail (Durasi Tidur & Jurnal Refleksi)
            </button>
          ) : (
            <div className="space-y-4 animate-in fade-in duration-300">
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider block">Durasi Tidur: {sleepHours} Jam</label>
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
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider block">Kualitas Tidur</label>
                  <select
                    value={sleepQuality}
                    onChange={(e) => setSleepQuality(e.target.value as any)}
                    className="w-full text-xs p-2 bg-white border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:border-slate-800"
                  >
                    <option value="Nyenyak">😴 Nyenyak</option>
                    <option value="Kurang Nyenyak">🔄 Kurang Nyenyak</option>
                    <option value="Insomnia">😳 Insomnia</option>
                  </select>
                </div>
              </div>

              {/* Reflection Prompt Helper */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider block">Jurnal Refleksi Emosi</label>
                  <button
                    type="button"
                    onClick={handleFetchReflectionPrompts}
                    disabled={isLoadingPrompts}
                    className="text-[10px] text-teal-700 hover:text-teal-800 font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    {isLoadingPrompts ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Lightbulb className="w-3 h-3" />}
                    <span>Inspirasi Refleksi AI</span>
                  </button>
                </div>

                {reflectionPrompts.length > 0 && (
                  <div className="bg-teal-50/60 p-2.5 rounded-xl border border-teal-100 space-y-1.5">
                    <span className="text-[10px] font-bold text-teal-800 block">Pilih prompt untuk memandu tulisanmu:</span>
                    {reflectionPrompts.map((p, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setJournalNote(prev => prev ? `${prev}\n\n${p}: ` : `${p}: `)}
                        className="w-full text-left text-[11px] text-slate-700 hover:text-teal-900 hover:bg-teal-100/50 p-1.5 rounded-md transition-colors block leading-relaxed"
                      >
                        • {p}
                      </button>
                    ))}
                  </div>
                )}

                <textarea
                  placeholder="Ceritakan kejadian atau apa yang ada di pikiran Anda secara singkat..."
                  value={journalNote}
                  onChange={(e) => setJournalNote(e.target.value.slice(0, 400))}
                  rows={3}
                  className="w-full p-2.5 text-xs bg-white border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:border-slate-800 placeholder:text-slate-400 resize-none"
                />
                <div className="flex justify-end">
                  <span className="text-[10px] text-slate-400">{journalNote.length}/400 karakter</span>
                </div>
              </div>
            </div>
          )}

          <button
            type="submit"
            className="w-full py-2.5 bg-slate-800 hover:bg-slate-900 active:bg-slate-950 text-white font-semibold text-xs rounded-xl shadow-xs transition-all active:scale-98 cursor-pointer"
          >
            Simpan Check-In Mood
          </button>
        </form>

        {/* LOG HISTORY & SEARCH */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <span className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
              Riwayat Jurnal Mood Harian
            </span>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Cari catatan atau emosi..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="text-xs bg-white border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-slate-800 focus:outline-none focus:border-slate-400 w-full sm:w-48"
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
    </div>
  );
};

