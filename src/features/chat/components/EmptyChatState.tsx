import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { apiClient } from '../../../lib/apiClient';
import { BookOpen, CheckSquare, Heart, Sparkles, Wind } from 'lucide-react';
import { BreathingModal } from './BreathingModal';
import { BrandLogo } from '../../../components/ui/BrandLogo';

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
    label: 'Cek kondisi',
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
      setMoodSaveMessage('Check-in tersimpan di catatan mood Anda.');
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
    <div className="quiet-empty-content mx-auto my-auto flex w-full max-w-4xl flex-col items-center px-3 py-7 sm:px-6 sm:py-10 animate-fade-in">
      <div className="mb-4 sm:mb-6">
        <BrandLogo mode="RUANG_TENANG" size="lg" iconOnly />
      </div>

      <div className="max-w-3xl text-center">
        <h1 className="font-serif text-[1.8rem] font-medium leading-tight tracking-tight text-stone-900 dark:text-stone-100 sm:text-4xl md:text-[2.75rem]">
          Hai {userName || 'Mahasiswa'}, ada yang ingin diceritakan?
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-stone-600 dark:text-stone-300 sm:text-base">
          Mulai dari satu kalimat. Ceritakan sebatas yang kamu nyaman.
        </p>
      </div>

      {composer}

      <nav aria-label="Mulai dengan cepat" className="mx-auto mt-5 flex max-w-3xl flex-wrap justify-center gap-2">
        <button
          type="button"
          onClick={() => setIsMoodPickerOpen(open => !open)}
          aria-expanded={isMoodPickerOpen}
          aria-controls="quiet-mood-checkin"
          className="inline-flex min-h-10 items-center gap-2 rounded-full border border-stone-200/90 bg-white/85 px-3.5 py-2 text-xs font-medium text-stone-700 shadow-sm transition hover:-translate-y-0.5 hover:border-teal-300 hover:bg-teal-50/80 hover:text-teal-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 dark:border-slate-700/90 dark:bg-slate-900/75 dark:text-slate-200 dark:hover:border-teal-800 dark:hover:bg-teal-950/50 dark:hover:text-teal-200 sm:px-4 sm:text-sm"
        >
          <Heart className="h-4 w-4 text-teal-700 dark:text-teal-400" aria-hidden="true" />
          Cek perasaan hari ini
        </button>
        <button
          type="button"
          onClick={handleOpenBreathing}
          className="inline-flex min-h-10 items-center gap-2 rounded-full border border-stone-200/90 bg-white/85 px-3.5 py-2 text-xs font-medium text-stone-700 shadow-sm transition hover:-translate-y-0.5 hover:border-teal-300 hover:bg-teal-50/80 hover:text-teal-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 dark:border-slate-700/90 dark:bg-slate-900/75 dark:text-slate-200 dark:hover:border-teal-800 dark:hover:bg-teal-950/50 dark:hover:text-teal-200 sm:px-4 sm:text-sm"
        >
          <Wind className="h-4 w-4 text-teal-700 dark:text-teal-400" aria-hidden="true" />
          Jeda hening 1 menit
        </button>
        {QUICK_PROMPTS.map(item => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handlePromptSelectWithHaptic(item.prompt)}
              className="inline-flex min-h-10 items-center gap-2 rounded-full border border-stone-200/90 bg-white/85 px-3.5 py-2 text-xs font-medium text-stone-700 shadow-sm transition hover:-translate-y-0.5 hover:border-teal-300 hover:bg-teal-50/80 hover:text-teal-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 dark:border-slate-700/90 dark:bg-slate-900/75 dark:text-slate-200 dark:hover:border-teal-800 dark:hover:bg-teal-950/50 dark:hover:text-teal-200 sm:px-4 sm:text-sm"
            >
              <Icon className="h-4 w-4 text-teal-700 dark:text-teal-400" aria-hidden="true" />
              {item.label}
            </button>
          );
        })}
      </nav>

      <AnimatePresence initial={false}>
        {isMoodPickerOpen && (
          <motion.section
            id="quiet-mood-checkin"
            aria-label="Check-in suasana hati"
            initial={{ opacity: 0, height: 0, y: -6 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0, y: -6 }}
            transition={{ duration: 0.18 }}
            className="mt-4 w-full max-w-3xl overflow-hidden rounded-2xl border border-white/80 bg-white/55 p-3 shadow-sm backdrop-blur-sm dark:border-slate-700/80 dark:bg-slate-900/45 sm:p-4"
          >
            <div className="mb-2 flex items-center justify-between gap-3 px-1">
              <h2 className="text-xs font-semibold text-stone-700 dark:text-stone-300 sm:text-sm">Bagaimana perasaanmu hari ini?</h2>
              <span className="text-[10px] text-stone-500 dark:text-slate-400 sm:text-xs">Opsional</span>
            </div>
            <div className="grid grid-cols-5 gap-2">
              {EMOTIONAL_MOODS.map(item => {
                const isSelected = selectedMood?.id === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleMoodSelect(item)}
                    aria-label={`Perasaan: ${item.label}`}
                    aria-pressed={isSelected}
                    title={item.label}
                    className={`flex min-h-14 flex-col items-center justify-center rounded-xl border px-1.5 py-2 transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 ${
                      isSelected
                        ? 'border-teal-500/70 bg-teal-50/90 text-teal-800 shadow-sm dark:bg-teal-950/50 dark:text-teal-200'
                        : 'border-stone-200/70 bg-white/75 text-stone-600 hover:border-teal-300 hover:bg-white dark:border-slate-700/80 dark:bg-slate-900/55 dark:text-slate-400 dark:hover:border-teal-800 dark:hover:bg-slate-900'
                    }`}
                  >
                    <span className="text-base leading-none" role="img" aria-hidden="true">{item.emoji}</span>
                    <span className={`mt-1 w-full truncate text-[10px] tracking-tight sm:text-xs ${isSelected ? 'font-semibold text-teal-800 dark:text-teal-200' : 'font-normal'}`}>
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </div>

            <AnimatePresence>
              {selectedMood && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-3 flex flex-wrap items-center justify-center gap-2 overflow-hidden text-xs"
                >
                  <span className="text-center text-[11px] text-stone-500 dark:text-slate-400 sm:text-xs">
                    Kamu <span className="font-medium text-stone-800 dark:text-stone-200">{selectedMood.feeling}</span>.
                  </span>
                  <button
                    type="button"
                    onClick={() => handlePromptSelectWithHaptic(selectedMood.prompt)}
                    className="inline-flex min-h-9 items-center rounded-full bg-teal-700 px-4 py-2 text-xs font-medium text-white shadow-sm transition-colors hover:bg-teal-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2"
                  >
                    Mulai cerita
                  </button>
                  <button
                    type="button"
                    onClick={saveMoodCheckin}
                    disabled={isSavingMood || Boolean(moodSaveMessage && moodSaveMessage.startsWith('Check-in tersimpan'))}
                    className="inline-flex min-h-9 items-center rounded-full border border-stone-200 bg-white/80 px-4 py-2 text-xs font-medium text-stone-600 transition-colors hover:bg-white disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-300"
                  >
                    {isSavingMood ? 'Menyimpan…' : moodSaveMessage.startsWith('Check-in tersimpan') ? 'Tersimpan' : 'Simpan check-in'}
                  </button>
                  {moodSaveMessage && <span role="status" className="basis-full text-center text-[11px] text-stone-600 dark:text-slate-300">{moodSaveMessage}</span>}
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
