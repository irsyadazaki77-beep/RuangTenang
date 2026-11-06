import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { apiClient } from '../../../lib/apiClient';
import { ArrowRight, ClipboardCheck, Heart, Sparkles, Wind, BookOpen } from 'lucide-react';
import { BreathingModal } from './BreathingModal';
import { BrandLogo } from '../../../components/ui/BrandLogo';
import { Link } from 'react-router-dom';

interface EmptyChatStateProps {
  userName?: string;
  onSelectPrompt: (prompt: string) => void;
  onOpenBreathing?: () => void;
  composerSlot?: React.ReactNode;
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
    feeling: 'merasa tenang dan ingin berefleksi',
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

const QUICK_STARTER_CHIPS = [
  {
    id: 'cbt-reflection',
    label: 'Urai pikiran cemas',
    icon: Sparkles,
    prompt: 'Pikiranku sedang dipenuhi rasa cemas dan overthinking. Boleh bantu telaah pemicunya dan temani aku mencari sudut pandang yang lebih tenang?'
  },
  {
    id: 'burnout',
    label: 'Kewalahan tugas kuliah',
    icon: BookOpen,
    prompt: 'Aku lagi merasa kewalahan dan burnout dengan tugas kuliah belakangan ini. Boleh bantu aku urai rasa lelah ini pelan-pelan?'
  }
];

export function EmptyChatState({ userName, onSelectPrompt, onOpenBreathing, composerSlot }: EmptyChatStateProps) {
  const [isMoodTrayOpen, setIsMoodTrayOpen] = useState(false);
  const [selectedMood, setSelectedMood] = useState<MoodItem | null>(null);
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
    <div className="w-full max-w-2xl mx-auto flex flex-col items-center text-center px-4 py-6 my-auto select-none animate-fade-in">

      {/* 1. Subtle Brand Mark & Calm Editorial Greeting */}
      <div className="mb-3 opacity-90">
        <BrandLogo size="md" iconOnly />
      </div>

      <h1 className="text-2xl sm:text-3xl font-serif font-medium tracking-tight text-stone-850 dark:text-stone-100 max-w-lg mx-auto leading-snug text-balance">
        {userName ? `Hai ${userName}, ada yang ingin diceritakan?` : 'Hai, ada yang ingin kamu ceritakan hari ini?'}
      </h1>

      {/* 2. Centered Composer Slot (ChatGPT / Gemini style) */}
      {composerSlot && (
        <div className="w-full mt-6 mb-4">
          {composerSlot}
        </div>
      )}

      {/* 3. Thin Action Chips Row */}
      <div className="flex flex-wrap items-center justify-center gap-2 mt-1 max-w-xl">
        <button
          type="button"
          onClick={() => setIsMoodTrayOpen(prev => !prev)}
          aria-expanded={isMoodTrayOpen}
          className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all duration-150 cursor-pointer whitespace-nowrap shrink-0 border ${
            isMoodTrayOpen || selectedMood
              ? 'border-teal-500/70 bg-teal-50/80 dark:bg-teal-950/50 text-teal-800 dark:text-teal-200'
              : 'border-stone-200/80 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 text-stone-600 dark:text-slate-300 hover:border-stone-300 dark:hover:border-slate-700 hover:text-stone-900 dark:hover:text-white'
          }`}
        >
          <Heart className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
          <span>{selectedMood ? `Perasaan: ${selectedMood.label}` : 'Cek perasaan hari ini'}</span>
        </button>

        <button
          type="button"
          onClick={handleOpenBreathing}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium border border-stone-200/80 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 text-stone-600 dark:text-slate-300 hover:border-stone-300 dark:hover:border-slate-700 hover:text-stone-900 dark:hover:text-white transition-all duration-150 cursor-pointer whitespace-nowrap shrink-0"
        >
          <Wind className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
          <span>Jeda hening 1 menit</span>
        </button>

        {QUICK_STARTER_CHIPS.map(chip => {
          const Icon = chip.icon;
          return (
            <button
              key={chip.id}
              type="button"
              onClick={() => handlePromptSelectWithHaptic(chip.prompt)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium border border-stone-200/80 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 text-stone-600 dark:text-slate-300 hover:border-stone-300 dark:hover:border-slate-700 hover:text-stone-900 dark:hover:text-white transition-all duration-150 cursor-pointer whitespace-nowrap shrink-0"
            >
              <Icon className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
              <span>{chip.label}</span>
            </button>
          );
        })}

        <Link
          to="/screening"
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium border border-stone-200/80 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 text-stone-600 dark:text-slate-300 hover:border-stone-300 dark:hover:border-slate-700 hover:text-stone-900 dark:hover:text-white transition-all duration-150 whitespace-nowrap shrink-0"
        >
          <ClipboardCheck className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
          <span>Cek kondisi</span>
        </Link>
      </div>

      {/* 4. Progressive Disclosure: Inline Mood Check-in Tray (Only visible when toggled or selected) */}
      <AnimatePresence>
        {(isMoodTrayOpen || selectedMood) && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="w-full max-w-md mt-3 pt-2"
          >
            <div className="grid grid-cols-5 gap-1.5">
              {EMOTIONAL_MOODS.map(item => {
                const isSelected = selectedMood?.id === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleMoodSelect(item)}
                    aria-label={`Perasaan: ${item.label}`}
                    title={item.label}
                    className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-all duration-120 cursor-pointer min-h-[44px] ${
                      isSelected
                        ? 'border border-teal-500/80 bg-teal-50/80 dark:bg-teal-950/50 text-teal-800 dark:text-teal-200 shadow-2xs'
                        : 'border border-stone-200/60 dark:border-slate-800/70 bg-white/60 dark:bg-slate-900/50 text-stone-500 dark:text-slate-400 hover:border-stone-300 dark:hover:border-slate-700 hover:bg-white dark:hover:bg-slate-850'
                    }`}
                  >
                    <span className="text-base leading-none select-none" role="img" aria-hidden="true">
                      {item.emoji}
                    </span>
                    <span className={`text-[11px] mt-1 tracking-tight truncate w-full ${
                      isSelected ? 'font-semibold text-teal-800 dark:text-teal-200' : 'font-normal'
                    }`}>
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </div>

            {selectedMood && (
              <div className="mt-2.5 flex flex-wrap items-center justify-center gap-2 text-xs">
                <span className="text-stone-500 dark:text-slate-400 text-[11.5px]">
                  Kamu <span className="font-medium text-stone-800 dark:text-stone-200">{selectedMood.feeling}</span>.
                </span>
                <button
                  type="button"
                  onClick={() => handlePromptSelectWithHaptic(selectedMood.prompt)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-teal-700 hover:bg-teal-800 text-white font-medium text-[11px] transition-colors cursor-pointer shadow-2xs"
                >
                  <span>Mulai Cerita</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={saveMoodCheckin}
                  disabled={isSavingMood || Boolean(moodSaveMessage && moodSaveMessage.startsWith('Check-in tersimpan'))}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-stone-200 dark:border-slate-700 text-stone-600 dark:text-slate-300 font-medium text-[11px] transition-colors disabled:opacity-60 cursor-pointer"
                >
                  {isSavingMood ? 'Menyimpan…' : moodSaveMessage.startsWith('Check-in tersimpan') ? 'Tersimpan' : 'Simpan check-in'}
                </button>
                {moodSaveMessage && <span role="status" className="basis-full text-center text-[11px] text-secondary">{moodSaveMessage}</span>}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <BreathingModal
        isOpen={isBreathingModalOpen}
        onClose={() => setIsBreathingModalOpen(false)}
      />
    </div>
  );
}
