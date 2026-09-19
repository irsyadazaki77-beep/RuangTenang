import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
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

  const handleMoodSelect = async (mood: MoodItem) => {
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

  const handleOpenBreathing = () => {
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
        <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-b from-white to-teal-50/80 dark:from-slate-900 dark:to-teal-950/70 border border-teal-200/80 dark:border-teal-800/80 shadow-[0_4px_20px_-3px_rgba(13,148,136,0.18)] flex items-center justify-center p-2.5 mx-auto mb-2">
          <img 
            src="/favicon.svg" 
            alt="RuangTenang" 
            className="w-full h-full object-contain pointer-events-none select-none" 
            loading="eager"
          />
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

      {/* 2. Mood Selector Ringkas (Micro-Cards) */}
      <div className="flex items-center justify-center gap-1.5 sm:gap-2.5 my-2">
        {EMOTIONAL_MOODS.map(item => {
          const isSelected = selectedMood?.id === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleMoodSelect(item)}
              aria-label={`Perasaan: ${item.label}`}
              title={item.label}
              className={`w-13 h-14 sm:w-16 sm:h-16 rounded-2xl flex flex-col items-center justify-center bg-slate-100/80 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-700 transition-all border border-slate-200/50 dark:border-slate-700/50 shadow-2xs cursor-pointer ${
                isSelected
                  ? 'ring-2 ring-teal-500/80 dark:ring-teal-400 border-teal-400 dark:border-teal-600 bg-white dark:bg-slate-700 shadow-sm scale-105'
                  : 'hover:shadow-2xs active:scale-95'
              }`}
            >
              <span className="w-5 h-5 flex items-center justify-center text-lg sm:text-xl leading-none shrink-0" role="img" aria-hidden="true">
                {item.emoji}
              </span>
              <span className={`text-[10px] sm:text-xs font-medium text-slate-600 dark:text-slate-300 mt-1 ${
                isSelected ? 'text-teal-700 dark:text-teal-300 font-semibold' : ''
              }`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Action banner when mood chosen */}
      <AnimatePresence>
        {selectedMood && (
          <motion.div 
            initial={{ opacity: 0, y: 3, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -3, height: 0 }}
            transition={{ duration: 0.2 }}
            className="my-1.5 flex items-center justify-center gap-2 overflow-hidden text-xs"
          >
            <span className="text-slate-600 dark:text-slate-300">
              Kamu <span className="font-medium text-slate-800 dark:text-slate-100">{selectedMood.feeling}</span>.
            </span>
            <button
              type="button"
              onClick={() => onSelectPrompt(selectedMood.prompt)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-teal-700 hover:bg-teal-800 active:bg-teal-900 text-white font-medium text-xs shadow-2xs transition cursor-pointer shrink-0"
            >
              <span>Mulai Cerita</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3. Topik Obrolan Cepat: JADIKAN 1 BARIS HORIZONTAL SCROLL (WAJIB) */}
      <div className="w-full mt-2">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-2 px-4 -mx-4 sm:mx-auto sm:justify-center sm:flex-wrap max-w-lg">
          {QUICK_STARTERS.map((starter) => (
            <button
              key={starter.id}
              type="button"
              onClick={() => onSelectPrompt(starter.prompt)}
              className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-slate-700 dark:text-slate-200 shadow-2xs active:scale-95 transition-all cursor-pointer hover:border-teal-500 hover:text-teal-600 dark:hover:border-teal-400"
            >
              <span>{starter.iconEmoji}</span>
              <span>{starter.title}</span>
            </button>
          ))}
        </div>
      </div>

    </div>
  );
}
