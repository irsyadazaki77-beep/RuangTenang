import React, { useState, useEffect } from 'react';
import { Smile, X, Lightbulb, RefreshCw, Check } from 'lucide-react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { apiClient } from '../../lib/apiClient';
import { clientDb } from '../../lib/clientDb';
import { modalBackdropVariants, modalPanelVariants, reducedMotionVariants } from '../../lib/motionTokens';

export interface MoodLog {
  id: string;
  date: string;
  mood: number;
  emotions: string[];
  notes: string;
  factors: string[];
  sleepHours: number | null;
  sleepQuality: 'very_poor' | 'poor' | 'fair' | 'good' | 'excellent' | null;
}

interface DailyCheckinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveSuccess: (savedLog: MoodLog) => void;
  showToast: (msg: string, type?: 'info' | 'success' | 'warning' | 'error', title?: string) => void;
}

export const MOOD_OPTIONS = [
  { value: 1, label: 'Sangat Buruk', emoji: '😢', activeColor: 'bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-300 border-rose-300 dark:border-rose-700 ring-2 ring-rose-400/30' },
  { value: 2, label: 'Buruk', emoji: '🙁', activeColor: 'bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-300 border-amber-300 dark:border-amber-700 ring-2 ring-amber-400/30' },
  { value: 3, label: 'Biasa Saja', emoji: '😐', activeColor: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-600 ring-2 ring-slate-400/30' },
  { value: 4, label: 'Baik', emoji: '🙂', activeColor: 'bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 border-teal-300 dark:border-teal-700 ring-2 ring-teal-400/30' },
  { value: 5, label: 'Sangat Baik', emoji: '😊', activeColor: 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700 ring-2 ring-emerald-400/30' }
];

export const EMOTION_TAGS = [
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

export const FACTOR_TAGS = [
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

export const DailyCheckinModal: React.FC<DailyCheckinModalProps> = ({
  isOpen,
  onClose,
  onSaveSuccess,
  showToast
}) => {
  const shouldReduceMotion = useReducedMotion();
  const [selectedMood, setSelectedMood] = useState<number | null>(null);
  const [selectedEmotions, setSelectedEmotions] = useState<string[]>([]);
  const [selectedFactors, setSelectedFactors] = useState<string[]>([]);
  const [journalNote, setJournalNote] = useState<string>('');
  const [sleepHours, setSleepHours] = useState<number>(7);
  const [sleepQuality, setSleepQuality] = useState<'Nyenyak' | 'Kurang Nyenyak' | 'Insomnia'>('Nyenyak');
  const [logDate, setLogDate] = useState<string>(new Date().toISOString().split('T')[0]);

  const [reflectionPrompts, setReflectionPrompts] = useState<string[]>([]);
  const [isLoadingPrompts, setIsLoadingPrompts] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Lock body scroll and handle Escape key
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  const handleToggleEmotion = (tagLabel: string) => {
    if (selectedEmotions.includes(tagLabel)) {
      setSelectedEmotions(prev => prev.filter(e => e !== tagLabel));
    } else {
      setSelectedEmotions(prev => [...prev, tagLabel]);
    }
  };

  const handleToggleFactor = (tagLabel: string) => {
    if (selectedFactors.includes(tagLabel)) {
      setSelectedFactors(prev => prev.filter(e => e !== tagLabel));
    } else {
      setSelectedFactors(prev => [...prev, tagLabel]);
    }
  };

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
    } catch {
      setReflectionPrompts([
        "Apa satu hal kecil hari ini yang membuatmu merasa sedikit lebih tenang?",
        "Jika tubuhmu saat ini bisa meminta sesuatu, apa yang paling ia butuhkan?",
        "Apa satu beban pikiran yang bisa kamu lepaskan sejenak malam ini?"
      ]);
    } finally {
      setIsLoadingPrompts(false);
    }
  };

  const handleSaveMoodLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedMood === null) {
      showToast('Harap pilih ekspresi mood utama Anda.', 'warning');
      return;
    }

    setIsSubmitting(true);
    const payload = { 
      mood: selectedMood, 
      notes: journalNote.trim(), 
      sleepHours,
      sleepQuality: sleepQuality === 'Nyenyak' ? 'good' : sleepQuality === 'Insomnia' ? 'very_poor' : 'poor',
      factors: selectedFactors,
      emotions: selectedEmotions 
    };

    try {
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        // Offline mode fallback
        await clientDb.addToOutbox('mood_log', '/api/v1/mood', payload);
        const offlineLog: MoodLog = {
          id: `offline-${Date.now()}`,
          date: logDate,
          mood: selectedMood,
          emotions: selectedEmotions,
          notes: journalNote.trim() ? `${journalNote.trim()} (Offline)` : '(Disimpan Offline)',
          factors: selectedFactors,
          sleepHours,
          sleepQuality: sleepQuality === 'Nyenyak' ? 'good' : sleepQuality === 'Insomnia' ? 'very_poor' : 'poor'
        };

        setSelectedMood(null);
        setSelectedEmotions([]);
        setSelectedFactors([]);
        setJournalNote('');
        setLogDate(new Date().toISOString().split('T')[0]);

        onSaveSuccess(offlineLog);
        onClose();
        showToast('Catatan Mood disimpan di antrean offline. Akan disinkronkan saat terhubung.', 'info');
        return;
      }

      const res = await apiClient.post<{ success: boolean; log: any }>("/api/v1/mood", payload);

      if (!res.success || !res.data?.log) {
        // Fallback to outbox on API failure
        await clientDb.addToOutbox('mood_log', '/api/v1/mood', payload);
        const offlineLog: MoodLog = {
          id: `offline-${Date.now()}`,
          date: logDate,
          mood: selectedMood,
          emotions: selectedEmotions,
          notes: journalNote.trim() ? `${journalNote.trim()} (Offline)` : '(Disimpan Offline)',
          factors: selectedFactors,
          sleepHours,
          sleepQuality: sleepQuality === 'Nyenyak' ? 'good' : sleepQuality === 'Insomnia' ? 'very_poor' : 'poor'
        };

        setSelectedMood(null);
        setSelectedEmotions([]);
        setSelectedFactors([]);
        setJournalNote('');
        setLogDate(new Date().toISOString().split('T')[0]);

        onSaveSuccess(offlineLog);
        onClose();
        showToast('Koneksi terganggu. Catatan Mood disimpan offline.', 'warning');
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
        emotions: Array.isArray(saved.emotions) ? saved.emotions : selectedEmotions,
        notes: saved.notes || journalNote.trim(),
        factors: Array.isArray(saved.factors) ? saved.factors : selectedFactors,
        sleepHours: saved.sleepHours ?? sleepHours,
        sleepQuality: saved.sleepQuality ?? (sleepQuality === 'Nyenyak' ? 'good' : sleepQuality === 'Insomnia' ? 'very_poor' : 'poor')
      };

      // Reset fields
      setSelectedMood(null);
      setSelectedEmotions([]);
      setSelectedFactors([]);
      setJournalNote('');
      setLogDate(new Date().toISOString().split('T')[0]);
      
      onSaveSuccess(canonicalLog);
      onClose();
      showToast('Catatan Mood harian berhasil disimpan! 🎉', 'success');
    } catch (err: any) {
      console.error("Failed to sync mood with backend:", err);
      await clientDb.addToOutbox('mood_log', '/api/v1/mood', payload);
      const offlineLog: MoodLog = {
        id: `offline-${Date.now()}`,
        date: logDate,
        mood: selectedMood,
        emotions: selectedEmotions,
        notes: journalNote.trim() ? `${journalNote.trim()} (Offline)` : '(Disimpan Offline)',
        factors: selectedFactors,
        sleepHours,
        sleepQuality: sleepQuality === 'Nyenyak' ? 'good' : sleepQuality === 'Insomnia' ? 'very_poor' : 'poor'
      };

      setSelectedMood(null);
      setSelectedEmotions([]);
      setSelectedFactors([]);
      setJournalNote('');
      setLogDate(new Date().toISOString().split('T')[0]);

      onSaveSuccess(offlineLog);
      onClose();
      showToast('Gagal terhubung ke server. Catatan Mood disimpan di antrean offline.', 'warning');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-slate-900/60 backdrop-blur-xs overflow-y-auto"
          initial="hidden"
          animate="visible"
          exit="exit"
          variants={shouldReduceMotion ? reducedMotionVariants : modalBackdropVariants}
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="daily-checkin-title"
        >
          <motion.div 
            className="relative w-full max-w-lg surface-card rounded-2xl sm:rounded-3xl border border-default shadow-2xl overflow-hidden flex flex-col max-h-[92vh] my-auto"
            initial="hidden"
            animate="visible"
            exit="exit"
            variants={shouldReduceMotion ? reducedMotionVariants : modalPanelVariants}
            onClick={(e) => e.stopPropagation()}
          >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 sm:px-6 border-b border-default shrink-0 bg-stone-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2.5 text-primary font-bold text-base sm:text-lg">
            <div className="p-2 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400">
              <Smile className="w-5 h-5" />
            </div>
            <div>
              <h2 id="daily-checkin-title" className="text-base sm:text-lg font-bold text-primary leading-tight">
                Daily Check-in Mood
              </h2>
              <p className="text-xs text-secondary font-normal mt-0.5">
                Bagaimana perasaan Anda hari ini?
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-secondary hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            aria-label="Tutup formulir check-in"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Form Body */}
        <form onSubmit={handleSaveMoodLog} className="p-4 sm:p-6 space-y-5 sm:space-y-6 overflow-y-auto custom-scrollbar flex-1">
          {/* Date Picker */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-secondary uppercase tracking-wider block">
              Tanggal Catatan
            </label>
            <input
              type="date"
              value={logDate}
              onChange={(e) => setLogDate(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
              className="w-full text-sm p-3 surface-muted border border-default rounded-xl text-primary focus:outline-none focus:ring-2 focus:ring-teal-500/20"
            />
          </div>

          {/* Mood Selection (5 Options) */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-secondary uppercase tracking-wider block">
              Pilih Mood Utama <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
              {MOOD_OPTIONS.map((opt) => {
                const isActive = selectedMood === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setSelectedMood(opt.value)}
                    className={`p-2 sm:p-3 rounded-xl sm:rounded-2xl border flex flex-col items-center justify-center gap-1 sm:gap-1.5 transition-all cursor-pointer chip-tactile ${
                      isActive
                        ? `${opt.activeColor} shadow-xs scale-105`
                        : 'surface-muted border-default text-secondary hover:text-primary hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <span className="text-2xl sm:text-3xl leading-none">{opt.emoji}</span>
                    <span className="text-[10px] sm:text-xs font-semibold text-center leading-tight">
                      {opt.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Emotion Tags */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-secondary uppercase tracking-wider block">
              Emosi yang Dirasakan (Bisa pilih lebih dari satu)
            </label>
            <div className="flex flex-wrap gap-1.5 sm:gap-2">
              {EMOTION_TAGS.map((tag) => {
                const isSelected = selectedEmotions.includes(tag.label);
                return (
                  <button
                    key={tag.label}
                    type="button"
                    onClick={() => handleToggleEmotion(tag.label)}
                    className={`px-3 py-1.5 text-xs rounded-xl border transition-all flex items-center gap-1.5 cursor-pointer chip-tactile ${
                      isSelected
                        ? 'bg-teal-600 border-teal-600 text-white font-semibold shadow-xs'
                        : 'surface-muted border-default text-secondary hover:text-primary hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <span>{tag.icon}</span>
                    <span>{tag.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Factors / Triggers */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-secondary uppercase tracking-wider block">
              Faktor / Pemicu Terkait
            </label>
            <div className="flex flex-wrap gap-1.5 sm:gap-2">
              {FACTOR_TAGS.map((factor) => {
                const isSelected = selectedFactors.includes(factor.label);
                return (
                  <button
                    key={factor.label}
                    type="button"
                    onClick={() => handleToggleFactor(factor.label)}
                    className={`px-3 py-1.5 text-xs rounded-xl border transition-all flex items-center gap-1.5 cursor-pointer chip-tactile ${
                      isSelected
                        ? 'bg-blue-600 border-blue-600 text-white font-semibold shadow-xs'
                        : 'surface-muted border-default text-secondary hover:text-primary hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <span>{factor.icon}</span>
                    <span>{factor.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sleep Hours & Sleep Quality */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div className="space-y-2 p-3.5 surface-muted rounded-xl border border-default">
              <div className="flex justify-between items-center">
                <label className="text-xs font-semibold text-secondary uppercase tracking-wider block">
                  Durasi Tidur
                </label>
                <span className="text-xs font-bold text-teal-600 dark:text-teal-400">
                  {sleepHours} Jam
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="12"
                step="0.5"
                value={sleepHours}
                onChange={(e) => setSleepHours(parseFloat(e.target.value))}
                className="w-full accent-teal-600 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-muted">
                <span>0 Jam</span>
                <span>6 Jam</span>
                <span>12 Jam</span>
              </div>
            </div>

            <div className="space-y-2 p-3.5 surface-muted rounded-xl border border-default">
              <label className="text-xs font-semibold text-secondary uppercase tracking-wider block">
                Kualitas Tidur
              </label>
              <select
                value={sleepQuality}
                onChange={(e) => setSleepQuality(e.target.value as any)}
                className="w-full text-sm p-2 surface-card border border-default rounded-lg text-primary focus:outline-none focus:ring-2 focus:ring-teal-500/20"
              >
                <option value="Nyenyak">😴 Nyenyak & Segar</option>
                <option value="Kurang Nyenyak">🔄 Kurang Nyenyak / Sering Terbangun</option>
                <option value="Insomnia">😳 Sulit Tidur / Insomnia</option>
              </select>
            </div>
          </div>

          {/* AI Reflection Prompt Guide */}
          <div className="space-y-2.5 pt-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-secondary uppercase tracking-wider block">
                Catatan Jurnal Refleksi
              </label>
              <button
                type="button"
                onClick={handleFetchReflectionPrompts}
                disabled={isLoadingPrompts}
                className="text-xs text-teal-600 dark:text-teal-400 hover:text-teal-700 font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isLoadingPrompts ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Lightbulb className="w-3.5 h-3.5" />}
                <span>Inspirasi Refleksi AI</span>
              </button>
            </div>

            {reflectionPrompts.length > 0 && (
              <div className="bg-teal-50/70 dark:bg-teal-950/40 p-3 sm:p-3.5 rounded-xl border border-teal-200 dark:border-teal-800/60 space-y-1.5 animate-fade-in">
                <span className="text-[11px] font-bold text-teal-900 dark:text-teal-300 block">
                  Pilih prompt untuk memandu refleksi:
                </span>
                {reflectionPrompts.map((prompt, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setJournalNote(prev => prev ? `${prev}\n\n${prompt}: ` : `${prompt}: `)}
                    className="w-full text-left text-xs text-slate-700 dark:text-slate-300 hover:text-teal-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-800/80 p-2 rounded-lg transition-all block leading-relaxed border border-transparent hover:border-teal-100 dark:hover:border-teal-900/50"
                  >
                    • {prompt}
                  </button>
                ))}
              </div>
            )}

            <div className="space-y-1">
              <textarea
                placeholder="Ceritakan kejadian, emosi, atau apa yang ada di pikiran Anda hari ini..."
                value={journalNote}
                onChange={(e) => setJournalNote(e.target.value.slice(0, 500))}
                rows={4}
                className="w-full p-3.5 text-sm surface-muted border border-default rounded-xl text-primary focus:outline-none focus:ring-2 focus:ring-teal-500/20 placeholder:text-muted resize-none transition-all"
              />
              <div className="flex justify-end">
                <span className="text-[11px] text-muted">{journalNote.length}/500 karakter</span>
              </div>
            </div>
          </div>

          {/* Footer Action Buttons */}
          <div className="flex gap-3 pt-3 border-t border-default">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 btn-secondary rounded-xl text-sm font-semibold transition-all btn-press"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting || selectedMood === null}
              className="flex-2 py-3 px-4 btn-primary rounded-xl text-sm font-semibold shadow-xs transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed btn-tactile"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Simpan Check-In Mood</span>
                </>
              )}
            </button>
          </div>
        </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
