import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { apiClient } from '../../../lib/apiClient';
import { ArrowRight } from 'lucide-react';
import { BreathingModal } from './BreathingModal';
import { BrandLogo } from '../../../components/ui/BrandLogo';

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
    desc: 'Ruang aman untuk menuangkan isi hati tanpa dihakimi',
    prompt: 'Hari ini rasanya campur aduk. Aku hanya butuh ruang tenang untuk menumpahkan apa yang sedang aku rasakan tanpa dihakimi.',
    featured: false
  }
];

export function EmptyChatState({ userName, onSelectPrompt, onOpenBreathing }: EmptyChatStateProps) {
  const [selectedMood, setSelectedMood] = useState<MoodItem | null>(null);
  const [isBreathingModalOpen, setIsBreathingModalOpen] = useState(false);

  const handleMoodSelect = async (mood: MoodItem) => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(12);
      } catch {}
    }

    if (selectedMood?.id === mood.id) {
      setSelectedMood(null);
      return;
    }

    setSelectedMood(mood);

    // Auto-log silently in background
    try {
      await apiClient.post('/api/v1/mood', {
        mood: mood.value,
        notes: `Check-in suasana hati: ${mood.label}`,
        sleepHours: null,
        sleepQuality: null,
        factors: [],
        emotions: [mood.label]
      });
    } catch {}
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
    <div className="w-full max-w-lg mx-auto flex flex-col items-center text-center px-4 py-3 sm:py-6 my-auto select-none animate-fade-in">
      
      {/* 1. Brand Mark - Restrained, compact, calm */}
      <div className="mb-3">
        <BrandLogo size="sm" iconOnly />
      </div>

      {/* 2. Editorial Headline - Human, balanced line-height, no loud marketing */}
      <h1 className="text-lg sm:text-xl font-serif font-medium tracking-tight text-stone-850 dark:text-stone-100 max-w-sm sm:max-w-md mx-auto leading-snug">
        {userName ? `Hai ${userName}, ada yang ingin diceritakan?` : 'Hai Mahasiswa, ada yang ingin diceritakan?'}
      </h1>

      {/* 3. Supporting Subtitle & Breathing Shortcut */}
      <div className="flex items-center justify-center gap-1.5 mt-1 text-[12px] text-stone-400 dark:text-stone-400">
        <span>Ruang aman tanpa penghakiman</span>
        <span aria-hidden="true" className="opacity-40">·</span>
        <button 
          type="button" 
          onClick={handleOpenBreathing} 
          className="text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 font-medium cursor-pointer transition-colors"
        >
          Jeda hening 1 menit
        </button>
      </div>

      <BreathingModal 
        isOpen={isBreathingModalOpen} 
        onClose={() => setIsBreathingModalOpen(false)} 
      />

      {/* 4. Secondary: Coherent Emotional Mood Shortcuts (5 items in a stable responsive row) */}
      <div className="w-full max-w-sm mt-4 sm:mt-5 mb-2.5">
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
            className="mb-2 flex items-center justify-center gap-2 text-xs overflow-hidden"
          >
            <span className="text-stone-500 dark:text-slate-400 text-[11.5px]">
              Kamu <span className="font-medium text-stone-800 dark:text-stone-200">{selectedMood.feeling}</span>.
            </span>
            <button
              type="button"
              onClick={() => handlePromptSelectWithHaptic(selectedMood.prompt)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-medium text-[11px] transition-colors cursor-pointer shadow-3xs"
            >
              <span>Mulai Cerita</span>
              <ArrowRight className="w-3 h-3" />
            </button>
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

    </div>
  );
}
