import React, { useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { apiClient } from '../../../lib/apiClient';
import { ArrowRight } from 'lucide-react';
import { BreathingModal } from './BreathingModal';

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
    prompt: 'Aku capek banget secara mental dan fisik hari ini. Aku cuma butuh ruang tenang untuk istirahat sejenak?'
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
    iconEmoji: '🪞',
    title: 'Refleksi Jurnal CBT',
    prompt: 'Aku ingin menceritakan catatan hariku untuk refleksi diri. Boleh bantu telaah pemicu, pikiran otomatis, dan temani aku mencari sudut pandang yang lebih seimbang?'
  },
  {
    id: 'burnout',
    iconEmoji: '📖',
    title: 'Burnout kuliah',
    prompt: 'Aku lagi ngerasa kewalahan dan burnout banget sama tugas kuliah belakangan ini. Boleh bantu aku urai rasa cemas dan lelah ini pelan-pelan?'
  },
  {
    id: 'anxiety-future',
    iconEmoji: '🧭',
    title: 'Cemas masa depan',
    prompt: 'Pikiranku lagi penuh rasa takut gagal dan overthinking tentang masa depan. Gimana cara menenangkan diri agar bisa fokus ke hari ini?'
  },
  {
    id: 'vent',
    iconEmoji: '💬',
    title: 'Butuh teman cerita',
    prompt: 'Hari ini rasanya berat dan campur aduk. Aku nggak butuh solusi buru-buru, cuma pengen menumpahkan apa yang lagi aku rasakan.'
  }
];

export function EmptyChatState({ userName, onSelectPrompt, onOpenBreathing }: EmptyChatStateProps) {
  const [selectedMood, setSelectedMood] = useState<MoodItem | null>(null);
  const [isBreathingModalOpen, setIsBreathingModalOpen] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  const handleMoodSelect = async (mood: MoodItem) => {
    // Tactile sensory grounding feedback on mood selection
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(15);
      } catch {
        // Graceful fallback if device/browser disables vibration
      }
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
    } catch {
      // Graceful fallback
    }
  };

  const handlePromptSelectWithHaptic = (prompt: string) => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(15);
      } catch {
        // Graceful fallback
      }
    }
    onSelectPrompt(prompt);
  };

  const handleOpenBreathing = () => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(15);
      } catch {
        // Graceful fallback
      }
    }
    if (onOpenBreathing) {
      onOpenBreathing();
    } else {
      setIsBreathingModalOpen(true);
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto flex flex-col items-center text-center px-4 py-2 sm:py-6 my-auto select-none animate-fade-in">
      
      {/* 1. Hero Section Super Ringkas: Hidden on mobile */}
      <div className="hidden sm:block">
        <div className="relative inline-flex items-center justify-center mb-4">
          {/* Breathing Halo Effect */}
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-emerald-400 to-teal-300 dark:from-emerald-500 dark:to-teal-400 blur-lg opacity-40 dark:opacity-30 animate-pulse-gentle pointer-events-none" />
          
          {/* Icon Container with official RuangTenang Logo */}
          <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-emerald-200/80 dark:border-emerald-800/60 shadow-lg shadow-emerald-500/10 flex items-center justify-center p-3 sm:p-3.5">
            <img 
              src="/favicon.svg" 
              alt="RuangTenang" 
              className="w-full h-full object-contain pointer-events-none select-none animate-float-subtle" 
              loading="eager"
            />
          </div>
        </div>
      </div>

      {/* Judul */}
      <h1 className="text-xl sm:text-2xl font-serif text-slate-800 dark:text-slate-100 text-center font-medium mt-2 sm:mt-4">
        {userName ? `Hai ${userName}, ada yang ingin diceritakan?` : 'Hai Mahasiswa, ada yang ingin diceritakan?'}
      </h1>

      {/* Subtitle + Tombol Jeda Hening dijadikan SATU baris ringkas yang elegan */}
      <div className="flex items-center justify-center gap-2 mt-1 mb-3">
        <span className="text-xs text-slate-500">Tarik napas perlahan.</span>
        <button 
          type="button" 
          onClick={handleOpenBreathing} 
          className="inline-flex items-center gap-1 text-[11px] font-medium text-teal-600 dark:text-teal-400 hover:underline cursor-pointer"
        >
          <span>• Jeda hening 1 menit</span>
        </button>
      </div>

      {/* Breathing Modal */}
      <BreathingModal 
        isOpen={isBreathingModalOpen} 
        onClose={() => setIsBreathingModalOpen(false)} 
      />

      {/* 2. Mood Selector Ringkas (Micro-Cards with Spring Physics) */}
      <div className="flex items-center justify-center gap-1.5 sm:gap-2.5 my-2">
        {EMOTIONAL_MOODS.map(item => {
          const isSelected = selectedMood?.id === item.id;
          return (
            <motion.button
              key={item.id}
              type="button"
              onClick={() => handleMoodSelect(item)}
              aria-label={`Perasaan: ${item.label}`}
              title={item.label}
              whileHover={shouldReduceMotion ? undefined : { scale: 1.03 }}
              whileTap={shouldReduceMotion ? undefined : { scale: 0.96 }}
              transition={{ type: "spring", stiffness: 340, damping: 26, mass: 0.8 }}
              className={`flex flex-col items-center justify-center p-3 sm:p-3.5 rounded-2xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border border-slate-200/70 dark:border-slate-800/70 hover:border-emerald-400/60 dark:hover:border-emerald-500/50 hover:bg-white/90 dark:hover:bg-slate-800/90 hover:shadow-lg hover:shadow-emerald-500/10 transition-colors duration-200 cursor-pointer ${
                isSelected
                  ? 'ring-2 ring-emerald-500/80 dark:ring-emerald-400 border-emerald-400 dark:border-emerald-600 bg-white/95 dark:bg-slate-800/95 shadow-md scale-105'
                  : 'shadow-2xs'
              }`}
            >
              <span className="w-5 h-5 flex items-center justify-center text-lg sm:text-xl leading-none shrink-0" role="img" aria-hidden="true">
                {item.emoji}
              </span>
              <span className={`text-[10px] sm:text-xs font-medium text-slate-600 dark:text-slate-300 mt-1 ${
                isSelected ? 'text-emerald-700 dark:text-emerald-300 font-semibold' : ''
              }`}>
                {item.label}
              </span>
            </motion.button>
          );
        })}
      </div>

      {/* Action banner when mood chosen */}
      <AnimatePresence>
        {selectedMood && (
          <motion.div 
            initial={{ opacity: 0, y: 4, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.95 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="my-1.5 flex items-center justify-center gap-2 text-xs will-change-transform"
          >
            <span className="text-slate-600 dark:text-slate-300">
              Kamu <span className="font-medium text-slate-800 dark:text-slate-100">{selectedMood.feeling}</span>.
            </span>
            <button
              type="button"
              onClick={() => handlePromptSelectWithHaptic(selectedMood.prompt)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-teal-700 hover:bg-teal-800 active:bg-teal-900 text-white font-medium text-xs shadow-2xs transition cursor-pointer shrink-0"
            >
              <span>Mulai Cerita</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3. Topik Obrolan Cepat: JADIKAN 1 BARIS HORIZONTAL SCROLL (WAJIB) dengan Spring Chips */}
      <div className="w-full mt-2">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-2 px-4 -mx-4 sm:mx-auto sm:justify-center sm:flex-wrap max-w-lg">
          {QUICK_STARTERS.map((starter) => (
            <motion.button
              key={starter.id}
              type="button"
              onClick={() => handlePromptSelectWithHaptic(starter.prompt)}
              whileHover={shouldReduceMotion ? undefined : { scale: 1.03 }}
              whileTap={shouldReduceMotion ? undefined : { scale: 0.96 }}
              transition={{ type: "spring", stiffness: 340, damping: 26, mass: 0.8 }}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-medium bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border border-slate-200/70 dark:border-slate-800/70 text-slate-700 dark:text-slate-300 hover:border-emerald-300 hover:text-emerald-700 dark:hover:text-emerald-300 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/30 transition-colors duration-200 cursor-pointer shadow-sm shrink-0"
            >
              <span>{starter.iconEmoji}</span>
              <span>{starter.title}</span>
            </motion.button>
          ))}
        </div>
      </div>

    </div>
  );
}
