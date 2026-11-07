import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { apiClient } from '../../../lib/apiClient';
import { BookOpen, CheckSquare, Heart, Sparkles, Wind } from 'lucide-react';
import { BreathingModal } from './BreathingModal';
import { BrandLogo } from '../../../components/ui/BrandLogo';
import { getDailyGroundingLine } from '../utils/dailyGrounding';

interface EmptyChatStateProps {
  userName?: string;
  onSelectPrompt: (prompt: string) => void;
  onOpenBreathing?: () => void;
  composer?: React.ReactNode;
}

interface MoodItem {
  id: string;
  value: number;
  label: string;
  feeling: string;
  emoji: string;
  prompt: string;
}

const EMOTIONAL_MOODS: MoodItem[] = [
  {
    id: 'heavy',
    value: 1,
    label: 'Berat',
    feeling: 'sedang merasa sedih dan beban terasa berat',
    emoji: '🌧️',
    prompt: 'Aku lagi ngerasa sedih dan semuanya terasa agak berat hari ini. Boleh temani aku bercerita pelan-pelan?'
  },
  {
    id: 'anxious',
    value: 2,
    label: 'Cemas',
    feeling: 'ada rasa cemas atau overthinking di kepala',
    emoji: '🌪️',
    prompt: 'Pikiranku lagi riuh banget dan ada rasa cemas yang susah hilang. Bisa bantu aku urai satu per satu?'
  },
  {
    id: 'exhausted',
    value: 3,
    label: 'Lelah',
    feeling: 'merasa lelah fisik maupun emosional',
    emoji: '🍂',
    prompt: 'Aku capek banget secara mental dan fisik hari ini. Aku cuma butuh ruang tenang untuk istirahat sejenak.'
  },
  {
    id: 'neutral',
    value: 4,
    label: 'Tenang',
    feeling: 'relatif stabil dan ingin berefleksi',
    emoji: '🌿',
    prompt: 'Hari ini terasa cukup tenang, tapi aku ingin meluangkan waktu sejenak untuk refleksi diri.'
  },
  {
    id: 'hopeful',
    value: 5,
    label: 'Lega',
    feeling: 'ada rasa syukur atau hal baik hari ini',
    emoji: '☀️',
    prompt: 'Ada hal baik yang bikin aku lega atau bersyukur hari ini, dan aku ingin membagikannya di sini.'
  },
];

const QUICK_PROMPTS = [
  {
    id: 'anxiety',
    label: 'Urai pikiran cemas',
    prompt: 'Pikiranku lagi riuh banget dan ada rasa cemas yang susah hilang. Bisa bantu aku urai satu per satu?',
    icon: Sparkles
  },
  {
    id: 'study-load',
    label: 'Kewalahan tugas kuliah',
    prompt: 'Aku lagi merasa kewalahan dengan tugas kuliah. Boleh bantu aku urai semuanya pelan-pelan dan memilih satu langkah kecil?',
    icon: BookOpen
  },
  {
    id: 'check-in',
    label: 'Cek kondisi saat ini',
    prompt: 'Hari ini rasanya campur aduk. Aku hanya butuh ruang tenang untuk menceritakan apa yang sedang kurasakan tanpa dihakimi.',
    icon: CheckSquare
  }
];

export function EmptyChatState({ userName, onSelectPrompt, onOpenBreathing, composer }: EmptyChatStateProps) {
  const [selectedMood, setSelectedMood] = useState<MoodItem | null>(null);
  const [isMoodPickerOpen, setIsMoodPickerOpen] = useState(false);
  const [isBreathingModalOpen, setIsBreathingModalOpen] = useState(false);
  const [isSavingMood, setIsSavingMood] = useState(false);
  const [moodSaveMessage, setMoodSaveMessage] = useState('');
  const dailyGroundingLine = useMemo(() => getDailyGroundingLine(), []);
  const timeGreeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 4) return 'Selamat malam';
    if (hour < 11) return 'Selamat pagi';
    if (hour < 15) return 'Selamat siang';
    if (hour < 18) return 'Selamat sore';
    return 'Selamat malam';
  }, []);

  const handleMoodSelect = (mood: MoodItem) => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(12);
      } catch {}
    }

    if (selectedMood?.id === mood.id) {
      setSelectedMood(null);
      setMoodSaveMessage('');
      return;
    }

    setSelectedMood(mood);
    setMoodSaveMessage('');
  };

  const saveMoodCheckin = async () => {
    if (!selectedMood || isSavingMood) return;
    setIsSavingMood(true);
    try {
      await apiClient.post('/api/v1/mood', {
        mood: selectedMood.value,
        notes: `Check-in suasana hati: ${selectedMood.label}`,
        sleepHours: null,
        sleepQuality: null,
        factors: [],
        emotions: [selectedMood.label]
      });
      setMoodSaveMessage('Perasaanmu valid. Check-in tersimpan di catatan — kami siap mendengarkan.');
    } catch {
      setMoodSaveMessage('Check-in belum tersimpan. Coba lagi saat koneksi tersedia.');
    } finally {
      setIsSavingMood(false);
    }
  };

  const handlePromptSelectWithHaptic = (prompt: string) => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(12);
      } catch {}
    }
    onSelectPrompt(prompt);
  };

  const handleOpenBreathing = () => {
    if (onOpenBreathing) {
      onOpenBreathing();
    } else {
      setIsBreathingModalOpen(true);
    }
  };

  return (
    <div className="quiet-empty-content mx-auto my-0 sm:my-auto flex w-full max-w-3xl flex-col items-center px-4 py-8 sm:py-12 animate-fade-in">
      {/* Brand Icon Badge (Floating Frosted Squircle) */}
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 6 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 320, damping: 24 }}
        className="mb-4 sm:mb-5 p-2.5 rounded-2xl bg-white/85 dark:bg-white/5 backdrop-blur-xl border border-teal-500/20 dark:border-teal-400/15 shadow-[0_8px_28px_-6px_rgba(13,148,136,0.18)]"
      >
        <BrandLogo mode="RUANG_TENANG" size="md" iconOnly />
      </motion.div>

      {/* Hero Welcome Typography */}
      <div className="max-w-xl text-center mb-6">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-teal-700/80 dark:text-teal-300/80" data-testid="time-greeting">
          {timeGreeting}
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 sm:text-3xl md:text-4xl">
          Hai {userName || 'Mahasiswa'}, ada yang ingin diceritakan?
        </h1>
        <p className="mx-auto mt-2 text-xs sm:text-sm leading-relaxed text-slate-500 dark:text-slate-400 max-w-md">
          Mulai dari satu kalimat santai. Ruang ini aman dan mendengarkan tanpa menghakimi.
        </p>
        <p className="mx-auto mt-3.5 inline-flex max-w-md items-center gap-1.5 rounded-full border border-teal-200/60 bg-teal-50/65 px-3.5 py-1 text-[11.5px] italic text-teal-800 shadow-3xs backdrop-blur-xs dark:border-teal-800/40 dark:bg-teal-950/35 dark:text-teal-200" data-testid="daily-grounding-line">
          <Sparkles className="h-3 w-3 shrink-0 not-italic text-teal-600 dark:text-teal-400" aria-hidden="true" />
          <span>{dailyGroundingLine}</span>
        </p>
      </div>

      {/* Floating Center Composer */}
      <div className="w-full">
        {composer}
      </div>

      {/* Suggestion Starter Pills below composer: Primary Sanctuary Actions & Gentle Prompts */}
      <nav aria-label="Mulai dengan cepat" className="mx-auto mt-5 flex max-w-2xl flex-col items-center gap-2.5">
        <div className="flex flex-wrap items-center justify-center gap-2">
          <motion.button
            type="button"
            whileHover={{ y: -2, scale: 1.015 }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 420, damping: 24 }}
            onClick={() => setIsMoodPickerOpen(open => !open)}
            aria-expanded={isMoodPickerOpen}
            aria-controls="quiet-mood-checkin"
            className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors duration-200 cursor-pointer border shadow-3xs backdrop-blur-md ${
              isMoodPickerOpen
                ? 'border-teal-500 bg-teal-50/90 dark:bg-teal-950/60 text-teal-800 dark:text-teal-200 ring-2 ring-teal-500/15'
                : 'border-slate-200/80 bg-white/85 dark:border-white/10 dark:bg-white/5 text-slate-700 dark:text-slate-200 hover:border-teal-300 dark:hover:border-teal-500/40 hover:bg-teal-50/50 dark:hover:bg-teal-950/40 hover:text-teal-800 dark:hover:text-teal-200'
            }`}
          >
            <Heart className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" aria-hidden="true" />
            <span>Cek perasaan hari ini</span>
          </motion.button>

          <motion.button
            type="button"
            whileHover={{ y: -2, scale: 1.015 }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 420, damping: 24 }}
            onClick={handleOpenBreathing}
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/80 bg-white/85 dark:border-white/10 dark:bg-white/5 px-3.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 shadow-3xs backdrop-blur-md transition-colors duration-200 hover:border-teal-300 dark:hover:border-teal-500/40 hover:bg-teal-50/50 dark:hover:bg-teal-950/40 hover:text-teal-800 dark:hover:text-teal-200 cursor-pointer"
          >
            <Wind className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" aria-hidden="true" />
            <span>Jeda hening 1 menit</span>
          </motion.button>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2">
          {QUICK_PROMPTS.map(item => {
            const Icon = item.icon;
            return (
              <motion.button
                key={item.id}
                type="button"
                whileHover={{ y: -2, scale: 1.015 }}
                whileTap={{ scale: 0.97 }}
                transition={{ type: 'spring', stiffness: 420, damping: 24 }}
                onClick={() => handlePromptSelectWithHaptic(item.prompt)}
                className="group inline-flex items-center gap-1.5 rounded-full border border-slate-200/80 bg-white/80 dark:border-white/10 dark:bg-white/5 px-3.5 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 shadow-3xs backdrop-blur-md transition-colors duration-200 hover:border-teal-300 dark:hover:border-teal-500/40 hover:bg-teal-50/40 dark:hover:bg-teal-950/35 hover:text-teal-800 dark:hover:text-teal-200 cursor-pointer"
              >
                <Icon className="h-3.5 w-3.5 text-slate-400 transition-colors group-hover:text-teal-600 dark:text-slate-500 dark:group-hover:text-teal-400" aria-hidden="true" />
                <span>{item.label}</span>
              </motion.button>
            );
          })}
        </div>
      </nav>

      {/* Mood Check-In Panel */}
      <AnimatePresence initial={false}>
        {isMoodPickerOpen && (
          <motion.section
            id="quiet-mood-checkin"
            aria-label="Check-in suasana hati"
            initial={{ opacity: 0, height: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, height: 'auto', y: 0, scale: 1 }}
            exit={{ opacity: 0, height: 0, y: -6, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 340, damping: 26 }}
            className="mt-4 w-full max-w-xl overflow-hidden rounded-3xl border border-teal-500/20 bg-white/92 dark:border-white/10 dark:bg-[#161b22]/92 p-4 shadow-[0_14px_38px_-10px_rgba(13,148,136,0.14)] backdrop-blur-xl"
          >
            <div className="mb-3 flex items-center justify-between gap-3 px-1">
              <div className="flex items-center gap-1.5">
                <Heart className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                <h2 className="text-xs font-semibold text-slate-800 dark:text-slate-200">Bagaimana perasaanmu saat ini?</h2>
              </div>
              <span className="text-[10.5px] font-medium text-teal-700 dark:text-teal-300 bg-teal-50/80 dark:bg-teal-950/50 px-2 py-0.5 rounded-full">
                Refleksi pribadi
              </span>
            </div>
            <div className="grid grid-cols-5 gap-2">
              {EMOTIONAL_MOODS.map(item => {
                const isSelected = selectedMood?.id === item.id;
                return (
                  <motion.button
                    key={item.id}
                    type="button"
                    whileHover={{ y: -2, scale: 1.03 }}
                    whileTap={{ scale: 0.95 }}
                    transition={{ type: 'spring', stiffness: 420, damping: 24 }}
                    onClick={() => handleMoodSelect(item)}
                    aria-label={`Perasaan: ${item.label}`}
                    aria-pressed={isSelected}
                    title={item.label}
                    className={`flex flex-col items-center justify-center rounded-2xl border p-2.5 transition-colors duration-200 cursor-pointer ${
                      isSelected
                        ? 'border-teal-500 bg-teal-50/95 text-teal-900 shadow-[0_6px_18px_-4px_rgba(13,148,136,0.22)] ring-2 ring-teal-500/20 dark:bg-teal-950/70 dark:text-teal-100'
                        : 'border-slate-200/70 bg-slate-50/60 text-slate-700 hover:border-teal-300/70 hover:bg-teal-50/40 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300 dark:hover:bg-white/10'
                    }`}
                  >
                    <span className="text-xl leading-none" role="img" aria-hidden="true">{item.emoji}</span>
                    <span className={`mt-1.5 truncate text-xs ${isSelected ? 'font-semibold text-teal-800 dark:text-teal-200' : 'font-medium'}`}>
                      {item.label}
                    </span>
                  </motion.button>
                );
              })}
            </div>

            <AnimatePresence>
              {selectedMood && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ type: 'spring', stiffness: 320, damping: 26 }}
                  className="mt-3.5 flex flex-wrap items-center justify-center gap-2 overflow-hidden text-xs pt-3 border-t border-slate-100 dark:border-white/10"
                >
                  <span className="text-center text-xs text-slate-500 dark:text-slate-400">
                    Kamu <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedMood.feeling}</span>.
                  </span>
                  <button
                    type="button"
                    onClick={() => handlePromptSelectWithHaptic(selectedMood.prompt)}
                    className="inline-flex items-center rounded-full bg-teal-700 hover:bg-teal-800 px-3.5 py-1.5 text-xs font-medium text-white shadow-xs transition-all cursor-pointer btn-tactile"
                  >
                    Mulai cerita
                  </button>
                  <button
                    type="button"
                    onClick={saveMoodCheckin}
                    disabled={isSavingMood || Boolean(moodSaveMessage && moodSaveMessage.includes('tersimpan'))}
                    className="inline-flex items-center rounded-full border border-slate-200/80 bg-white px-3.5 py-1.5 text-xs font-medium text-slate-600 transition-all hover:bg-slate-50 disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 cursor-pointer btn-tactile"
                  >
                    {isSavingMood ? 'Menyimpan…' : moodSaveMessage.includes('tersimpan') ? 'Tersimpan' : 'Simpan check-in'}
                  </button>
                  {moodSaveMessage && (
                    <span role="status" className="basis-full text-center text-[11.5px] font-medium text-teal-700 dark:text-teal-300 bg-teal-50/70 dark:bg-teal-950/40 rounded-xl py-1.5 px-3 mt-1 border border-teal-200/60 dark:border-teal-800/50">
                      ✨ {moodSaveMessage}
                    </span>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.section>
        )}
      </AnimatePresence>

      <BreathingModal isOpen={isBreathingModalOpen} onClose={() => setIsBreathingModalOpen(false)} />
    </div>
  );
}
