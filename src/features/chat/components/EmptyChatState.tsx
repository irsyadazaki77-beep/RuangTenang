import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { apiClient } from '../../../lib/apiClient';
import { ArrowRight, ClipboardCheck, LifeBuoy, Users, Wind } from 'lucide-react';
import { BreathingModal } from './BreathingModal';
import { BrandLogo } from '../../../components/ui/BrandLogo';
import { Link } from 'react-router-dom';

interface EmptyChatStateProps {
  userName?: string;
  onSelectPrompt: (prompt: string) => void;
  onOpenBreathing?: () => void;
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

const QUICK_STARTERS = [
  {
    id: 'cbt-reflection',
    title: 'Refleksi Jurnal Pikiran',
    desc: 'Urai pemicu stres dan temukan sudut pandang lebih seimbang',
    prompt: 'Aku ingin menceritakan hal yang sedang membebani pikiranku. Boleh bantu telaah pemicu dan temani aku mencari sudut pandang yang lebih seimbang?',
    featured: true
  },
  {
    id: 'burnout',
    title: 'Kewalahan Tugas Kuliah',
    desc: 'Langkah bertahap mengatasi rasa buntu akademik',
    prompt: 'Aku lagi merasa kewalahan dan burnout dengan tugas kuliah belakangan ini. Boleh bantu aku urai rasa lelah ini pelan-pelan?',
    featured: false
  },
  {
    id: 'anxiety-future',
    title: 'Kecemasan Masa Depan',
    desc: 'Ketenangan saat terjebak overthinking masa depan',
    prompt: 'Pikiranku sedang dipenuhi rasa cemas tentang masa depan dan takut gagal. Bagaimana cara menenangkan diri agar bisa fokus ke hari ini?',
    featured: false
  },
  {
    id: 'vent',
    title: 'Teman Berbagi Cerita',
    desc: 'Ceritakan sesuai batas nyamanmu, atau pilih langkah lain',
    prompt: 'Hari ini rasanya campur aduk. Bantu aku mengurai apa yang sedang kurasakan dengan pelan-pelan dan tanpa memberi label.',
    featured: false
  }
];

export function EmptyChatState({ userName, onSelectPrompt, onOpenBreathing }: EmptyChatStateProps) {
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
    <div className="w-full max-w-lg mx-auto flex flex-col items-center text-center px-4 py-2 sm:py-6 my-0 sm:my-auto select-none animate-fade-in">

      {/* 1. Brand mark with enough space to read the heart and helping hand. */}
      <div className="mb-2 sm:mb-3">
        <BrandLogo size="lg" iconOnly />
      </div>

      {/* 2. Editorial Headline - Human, balanced line-height, no loud marketing */}
      <h1 className="text-base sm:text-xl font-serif font-medium tracking-tight text-stone-850 dark:text-stone-100 max-w-sm sm:max-w-md mx-auto leading-snug">
        {userName ? `Hai ${userName}, ada yang ingin diceritakan?` : 'Hai Mahasiswa, ada yang ingin diceritakan?'}
      </h1>

      {/* 3. Supporting Subtitle & Breathing Shortcut */}
      <div className="flex items-center justify-center gap-1.5 mt-1 text-[11px] sm:text-[12px] text-stone-600 dark:text-stone-300">
        <span>Kamu bisa bercerita sesuai batas nyamanmu</span>
        <span aria-hidden="true" className="opacity-40">·</span>
        <button
          type="button"
          onClick={handleOpenBreathing}
          className="text-teal-700 dark:text-teal-400 hover:text-teal-800 dark:hover:text-teal-300 font-semibold cursor-pointer transition-colors"
        >
          Jeda hening 1 menit
        </button>
      </div>

      <BreathingModal
        isOpen={isBreathingModalOpen}
        onClose={() => setIsBreathingModalOpen(false)}
      />

      {/* 4. Secondary: Coherent Emotional Mood Shortcuts (5 items in a stable responsive row) */}
      <div className="w-full max-w-sm mt-3 sm:mt-5 mb-2 sm:mb-2.5">
        <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
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
                    ? 'border border-teal-500/80 bg-teal-50/70 dark:bg-teal-950/40 text-teal-800 dark:text-teal-200 shadow-3xs'
                    : 'border border-stone-200/50 dark:border-slate-800/60 bg-stone-50/40 dark:bg-slate-900/40 text-stone-500 dark:text-slate-400 hover:border-stone-300 dark:hover:border-slate-700 hover:bg-white dark:hover:bg-slate-850'
                }`}
              >
                <span className="text-base sm:text-lg leading-none select-none" role="img" aria-hidden="true">
                  {item.emoji}
                </span>
                <span className={`text-[10.5px] sm:text-[11px] mt-1 tracking-tight truncate w-full ${
                  isSelected ? 'font-semibold text-teal-800 dark:text-teal-200' : 'font-normal'
                }`}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Dynamic Feedback when Mood Selected */}
      <AnimatePresence>
        {selectedMood && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.15 }}
            className="mb-2 flex flex-wrap items-center justify-center gap-2 text-xs overflow-hidden"
          >
            <span className="text-stone-500 dark:text-slate-400 text-[11.5px]">
              Kamu <span className="font-medium text-stone-800 dark:text-stone-200">{selectedMood.feeling}</span>.
            </span>
            <button
              type="button"
              onClick={() => handlePromptSelectWithHaptic(selectedMood.prompt)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-teal-700 hover:bg-teal-800 text-white font-medium text-[11px] transition-colors cursor-pointer shadow-3xs"
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
          </motion.div>
        )}
      </AnimatePresence>

      {/* 5. Tertiary: Suggested Prompts - Compact, subtle surface, understated borders */}
      <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-2 mt-2 text-left">
        {QUICK_STARTERS.map((starter) => (
          <button
            key={starter.id}
            type="button"
            onClick={() => handlePromptSelectWithHaptic(starter.prompt)}
            className={`p-2.5 sm:p-3 rounded-xl transition-all duration-120 cursor-pointer group flex flex-col justify-between text-left ${
              starter.featured
                ? 'border border-teal-200/50 dark:border-teal-900/50 bg-teal-50/30 dark:bg-teal-950/20 hover:border-teal-300 dark:hover:border-teal-800'
                : 'border border-stone-200/40 dark:border-slate-800/40 bg-stone-50/30 dark:bg-slate-900/30 hover:border-stone-300/70 dark:hover:border-slate-700 hover:bg-white dark:hover:bg-slate-850'
            }`}
          >
            <div className="flex items-center justify-between gap-1.5">
              <span className="text-[12px] sm:text-[12.5px] font-medium text-stone-700 dark:text-slate-300 group-hover:text-teal-700 dark:group-hover:text-teal-300 transition-colors leading-tight">
                {starter.title}
              </span>
              <ArrowRight className="w-3 h-3 text-stone-300 dark:text-slate-600 group-hover:text-teal-600 dark:group-hover:text-teal-400 group-hover:translate-x-0.5 transition-all shrink-0" />
            </div>
            <p className="text-[10.5px] sm:text-[11px] text-stone-400 dark:text-slate-500 mt-0.5 line-clamp-1 sm:line-clamp-2 leading-relaxed">
              {starter.desc}
            </p>
          </button>
        ))}
      </div>

      <nav aria-label="Pilihan bantuan lain" className="w-full max-w-md mt-3 sm:mt-4">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-400 dark:text-slate-500 mb-1.5">
          Atau pilih langkah lain
        </p>
        <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
          <Link to="/mindfulness" className="flex min-h-11 items-center justify-center gap-1 rounded-lg border border-stone-200/70 bg-white/60 px-1.5 text-[10.5px] font-medium text-stone-700 transition-colors hover:border-teal-300 hover:bg-teal-50/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-300 dark:hover:border-teal-800 dark:hover:bg-teal-950/40 sm:gap-1.5 sm:px-2 sm:text-xs">
            <Wind className="h-3.5 w-3.5 shrink-0 text-teal-600 dark:text-teal-400" aria-hidden="true" />
            <span>Latihan tenang</span>
          </Link>
          <Link to="/screening" className="flex min-h-11 items-center justify-center gap-1 rounded-lg border border-stone-200/70 bg-white/60 px-1.5 text-[10.5px] font-medium text-stone-700 transition-colors hover:border-teal-300 hover:bg-teal-50/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-300 dark:hover:border-teal-800 dark:hover:bg-teal-950/40 sm:gap-1.5 sm:px-2 sm:text-xs">
            <ClipboardCheck className="h-3.5 w-3.5 shrink-0 text-teal-600 dark:text-teal-400" aria-hidden="true" />
            <span>Cek kondisi</span>
          </Link>
          <Link to="/counselors" className="flex min-h-11 items-center justify-center gap-1 rounded-lg border border-stone-200/70 bg-white/60 px-1.5 text-[10.5px] font-medium text-stone-700 transition-colors hover:border-teal-300 hover:bg-teal-50/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-300 dark:hover:border-teal-800 dark:hover:bg-teal-950/40 sm:gap-1.5 sm:px-2 sm:text-xs">
            <Users className="h-3.5 w-3.5 shrink-0 text-teal-600 dark:text-teal-400" aria-hidden="true" />
            <span>Cari konselor</span>
          </Link>
        </div>
        <Link to="/emergency" className="mt-2 inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg px-2 text-[11px] font-medium text-rose-700 underline decoration-rose-300 underline-offset-2 hover:text-rose-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-600 dark:text-rose-300 dark:decoration-rose-800 dark:hover:text-rose-200">
          <LifeBuoy className="h-3.5 w-3.5" aria-hidden="true" />
          Butuh bantuan segera? Buka Pusat Bantuan Krisis
        </Link>
      </nav>

    </div>
  );
}
