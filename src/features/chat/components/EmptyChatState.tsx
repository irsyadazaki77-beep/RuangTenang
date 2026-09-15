import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { apiClient } from '../../../lib/apiClient';
import { 
  Heart, 
  ArrowRight, 
  Check, 
  Wind, 
  BookOpen, 
  Compass, 
  HeartHandshake,
  X
} from 'lucide-react';

interface EmptyChatStateProps {
  userName?: string;
  onSelectPrompt: (prompt: string) => void;
}

interface MoodItem {
  id: string;
  value: number;
  label: string;
  feeling: string;
  emoji: string;
  prompt: string;
  colorClass: string;
}

const EMOTIONAL_MOODS: MoodItem[] = [
  {
    id: 'heavy',
    value: 1,
    label: 'Sedang Berat',
    feeling: 'sedang merasa sedih dan beban terasa berat',
    emoji: '🌧️',
    prompt: 'Aku lagi ngerasa sedih dan semuanya terasa agak berat hari ini. Boleh temani aku bercerita pelan-pelan?',
    colorClass: 'hover:border-blue-300 dark:hover:border-blue-700/60 hover:bg-blue-50/40 dark:hover:bg-blue-950/20'
  },
  {
    id: 'anxious',
    value: 2,
    label: 'Cemas / Gelisah',
    feeling: 'ada rasa cemas atau overthinking di kepala',
    emoji: '🌪️',
    prompt: 'Pikiranku lagi riuh banget dan ada rasa cemas yang susah hilang. Bisa bantu aku urai satu per satu?',
    colorClass: 'hover:border-amber-300 dark:hover:border-amber-700/60 hover:bg-amber-50/40 dark:hover:bg-amber-950/20'
  },
  {
    id: 'exhausted',
    value: 3,
    label: 'Lelah / Burnout',
    feeling: 'merasa lelah fisik maupun emosional',
    emoji: '🍂',
    prompt: 'Aku capek banget secara mental dan fisik hari ini. Aku cuma butuh ruang tenang untuk istirahat sejenak.',
    colorClass: 'hover:border-orange-300 dark:hover:border-orange-700/60 hover:bg-orange-50/40 dark:hover:bg-orange-950/20'
  },
  {
    id: 'neutral',
    value: 4,
    label: 'Tenang / Reflektif',
    feeling: 'relatif stabil dan ingin berefleksi',
    emoji: '🌿',
    prompt: 'Hari ini terasa cukup tenang, tapi aku ingin meluangkan waktu sejenak untuk refleksi diri.',
    colorClass: 'hover:border-teal-300 dark:hover:border-teal-700/60 hover:bg-teal-50/40 dark:hover:bg-teal-950/20'
  },
  {
    id: 'hopeful',
    value: 5,
    label: 'Lega / Bersyukur',
    feeling: 'ada rasa syukur atau hal baik hari ini',
    emoji: '☀️',
    prompt: 'Ada hal baik yang bikin aku lega atau bersyukur hari ini, dan aku ingin membagikannya di sini.',
    colorClass: 'hover:border-emerald-300 dark:hover:border-emerald-700/60 hover:bg-emerald-50/40 dark:hover:bg-emerald-950/20'
  },
];

const QUICK_STARTERS = [
  {
    id: 'burnout',
    tag: 'Akademik & Tugas',
    icon: BookOpen,
    title: 'Lagi burnout kuliah atau skripsi',
    desc: 'Urai rasa overwhelmed karena tenggat waktu dan tugas kuliah yang menumpuk.',
    prompt: 'Aku lagi ngerasa kewalahan dan burnout banget sama tugas/skripsi belakangan ini. Boleh bantu aku urai rasa cemas dan lelah ini pelan-pelan?',
    accent: 'border-amber-200 dark:border-amber-800/40 hover:border-amber-300 dark:hover:border-amber-700 text-amber-800 dark:text-amber-300'
  },
  {
    id: 'anxiety-future',
    tag: 'Overthinking',
    icon: Compass,
    title: 'Cemas kepikiran masa depan',
    desc: 'Meredakan ketakutan gagal dan fokus mengambil langkah kecil hari ini.',
    prompt: 'Pikiranku lagi penuh rasa takut gagal dan overthinking tentang masa depan. Gimana cara menenangkan diri agar bisa fokus ke hari ini?',
    accent: 'border-blue-200 dark:border-blue-800/40 hover:border-blue-300 dark:hover:border-blue-700 text-blue-800 dark:text-blue-300'
  },
  {
    id: 'vent',
    tag: 'Teman Dengar',
    icon: HeartHandshake,
    title: 'Cuma butuh tempat bercerita',
    desc: 'Ruang aman menumpahkan isi hati tanpa dihakimi atau dituntut solusi cepat.',
    prompt: 'Hari ini rasanya berat dan campur aduk. Aku nggak butuh solusi buru-buru, cuma pengen menumpahkan apa yang lagi aku rasakan.',
    accent: 'border-teal-200 dark:border-teal-800/40 hover:border-teal-300 dark:hover:border-teal-700 text-teal-800 dark:text-teal-300'
  }
];

export function EmptyChatState({ userName, onSelectPrompt }: EmptyChatStateProps) {
  const [selectedMood, setSelectedMood] = useState<MoodItem | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [showGrounding, setShowGrounding] = useState(false);
  const [groundingPhase, setGroundingPhase] = useState<'Tarik Napas' | 'Tahan' | 'Hembuskan'>('Tarik Napas');
  const [groundingSeconds, setGroundingSeconds] = useState(4);
  const [isGroundingActive, setIsGroundingActive] = useState(false);

  // 4-4-4 Box Breathing Timer
  useEffect(() => {
    if (!isGroundingActive) return;

    const timer = setInterval(() => {
      setGroundingSeconds(prev => {
        if (prev > 1) return prev - 1;

        if (groundingPhase === 'Tarik Napas') {
          setGroundingPhase('Tahan');
          return 4;
        } else if (groundingPhase === 'Tahan') {
          setGroundingPhase('Hembuskan');
          return 4;
        } else {
          setGroundingPhase('Tarik Napas');
          return 4;
        }
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isGroundingActive, groundingPhase]);

  const handleMoodSelect = async (mood: MoodItem) => {
    setSelectedMood(mood);
    setIsSaved(false);
    
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
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3500);
    } catch {
      // Graceful fallback
    }
  };

  return (
    <div className="w-full max-w-[640px] mx-auto flex flex-col items-center text-center px-3 sm:px-5 pt-3 sm:pt-6 pb-8 my-auto space-y-5 sm:space-y-6 animate-fade-in select-none">
      
      {/* 1. Soft Brand Presence Motif */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="relative flex items-center justify-center pt-1"
      >
        <motion.div 
          animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.55, 0.3] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -inset-3 rounded-full bg-gradient-to-tr from-teal-200/40 via-emerald-100/30 to-teal-300/20 dark:from-teal-900/30 dark:via-emerald-950/20 dark:to-teal-800/10 blur-lg pointer-events-none"
        />

        <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-b from-white to-teal-50/80 dark:from-slate-900 dark:to-teal-950/70 border border-teal-200/80 dark:border-teal-800/80 shadow-[0_6px_24px_-4px_rgba(13,148,136,0.20)] flex items-center justify-center p-2.5">
          <img 
            src="/favicon.svg" 
            alt="RuangTenang" 
            className="w-full h-full object-contain pointer-events-none select-none" 
            loading="eager"
          />
        </div>
      </motion.div>

      {/* 2. Empathetic Greeting Header */}
      <div className="space-y-1.5 max-w-lg mx-auto">
        <motion.h1 
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.08 }}
          className="text-xl sm:text-2xl font-semibold tracking-tight text-stone-900 dark:text-stone-100 font-serif"
        >
          {userName ? `Hai ${userName}, apa yang sedang kamu rasakan?` : 'Halo, apa yang sedang mengganjal di pikiranmu?'}
        </motion.h1>
        
        <motion.p 
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.14 }}
          className="text-xs sm:text-sm text-stone-600 dark:text-stone-400 leading-relaxed max-w-md mx-auto"
        >
          Ruang aman tanpa penghakiman. Apa pun yang ada di benakmu, mari kita urai dan bicarakan perlahan.
        </motion.p>
      </div>

      {/* 3. Quick Grounding 1-Minute Widget */}
      <motion.div 
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.18 }}
        className="w-full"
      >
        {!showGrounding ? (
          <button
            onClick={() => {
              setShowGrounding(true);
              setIsGroundingActive(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-teal-200/90 dark:border-teal-800/80 bg-teal-50/70 dark:bg-teal-950/40 text-teal-800 dark:text-teal-200 text-xs font-medium hover:bg-teal-100/80 dark:hover:bg-teal-900/60 transition shadow-xs cursor-pointer active:scale-98"
          >
            <Wind className="w-4 h-4 text-teal-600 dark:text-teal-400 animate-pulse" />
            <span>Merasa tegang atau cemas? Coba jeda hening 1-menit</span>
          </button>
        ) : (
          <div className="w-full rounded-2xl border border-teal-200 dark:border-teal-800/80 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-4 shadow-sm text-left relative">
            <button
              onClick={() => {
                setShowGrounding(false);
                setIsGroundingActive(false);
              }}
              className="absolute top-3.5 right-3.5 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 p-1 rounded-lg transition"
              aria-label="Tutup Latihan Relaksasi"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 mb-3">
              <Wind className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              <h3 className="text-xs font-semibold text-stone-900 dark:text-stone-100">
                Latihan Relaksasi Pernapasan Terarah
              </h3>
            </div>

            <div className="flex flex-col items-center justify-center py-4 text-center">
              <motion.div
                animate={{
                  scale: groundingPhase === 'Tarik Napas' ? 1.25 : groundingPhase === 'Tahan' ? 1.25 : 0.95,
                }}
                transition={{ duration: 4, ease: "easeInOut" }}
                className="w-24 h-24 rounded-full bg-gradient-to-tr from-teal-600 to-teal-500 text-white flex flex-col items-center justify-center shadow-lg shadow-teal-600/20"
              >
                <span className="text-xl font-bold font-mono">{groundingSeconds}s</span>
                <span className="text-[10px] uppercase font-semibold tracking-wider">{groundingPhase}</span>
              </motion.div>

              <p className="text-xs text-stone-600 dark:text-stone-400 mt-3 max-w-xs">
                Fokuskan perhatian pada tarikan dan hembusan napas untuk menenangkan sistem sarafmu.
              </p>
            </div>
          </div>
        )}
      </motion.div>

      {/* 4. Mood Check-In Capsule */}
      <motion.div 
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.22 }}
        className="w-full bg-white/70 dark:bg-slate-900/60 backdrop-blur-xs border border-stone-200/80 dark:border-slate-800/80 rounded-2xl p-4 sm:p-5 shadow-[0_3px_18px_-3px_rgba(0,0,0,0.03)] space-y-3 text-left"
      >
        <div className="flex flex-col sm:flex-row items-center justify-between gap-1 text-center sm:text-left">
          <div>
            <h2 className="text-[13.5px] font-semibold text-stone-800 dark:text-stone-200 flex items-center justify-center sm:justify-start gap-1.5">
              <Heart className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 fill-teal-100 dark:fill-teal-950" />
              Bagaimana suasana hatimu sekarang?
            </h2>
            <p className="text-[11.5px] text-stone-500 dark:text-stone-400 mt-0.5">
              Pilih satu yang paling mewakili keadaanmu hari ini.
            </p>
          </div>
          {isSaved && (
            <span className="text-[11px] text-teal-700 dark:text-teal-300 flex items-center gap-1 font-medium bg-teal-50 dark:bg-teal-950/60 px-2 py-0.5 rounded-full border border-teal-200/60 dark:border-teal-800 animate-fade-in">
              <Check className="w-3 h-3" /> Tersimpan di jurnal
            </span>
          )}
        </div>

        {/* Mood Emoji Pills */}
        <div className="grid grid-cols-5 gap-1.5 sm:gap-2 pt-0.5">
          {EMOTIONAL_MOODS.map(item => {
            const isSelected = selectedMood?.id === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleMoodSelect(item)}
                aria-label={`Perasaan: ${item.label}`}
                title={item.label}
                className={`group flex flex-col items-center justify-center p-2 sm:py-2.5 sm:px-2 rounded-xl border transition-all duration-150 cursor-pointer min-h-[50px] min-w-[44px] ${
                  isSelected
                    ? 'bg-teal-50 dark:bg-teal-950/70 border-teal-500/80 dark:border-teal-500/80 shadow-[0_2px_10px_-2px_rgba(13,148,136,0.2)] scale-[1.02]'
                    : `bg-stone-50/70 dark:bg-slate-800/50 border-stone-200/60 dark:border-slate-800 ${item.colorClass} hover:scale-[1.01]`
                }`}
              >
                <span className="text-xl sm:text-2xl transition-transform duration-150 group-hover:scale-110">
                  {item.emoji}
                </span>
                <span className={`text-[10px] sm:text-[11px] font-medium mt-1 line-clamp-1 leading-tight ${
                  isSelected ? 'text-teal-700 dark:text-teal-300 font-semibold' : 'text-stone-600 dark:text-stone-400'
                }`}>
                  {item.label.split('/')[0].trim()}
                </span>
              </button>
            );
          })}
        </div>

        {/* Follow-up Action when Mood is chosen */}
        <AnimatePresence>
          {selectedMood && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="pt-2 border-t border-stone-200/50 dark:border-slate-800/60 flex flex-col sm:flex-row items-center justify-between gap-2.5 overflow-hidden"
            >
              <div className="text-[12.5px] text-stone-600 dark:text-stone-300 text-center sm:text-left">
                Kamu <span className="font-medium text-stone-800 dark:text-stone-100">{selectedMood.feeling}</span>. Ingin menguraikannya?
              </div>
              <button
                onClick={() => onSelectPrompt(selectedMood.prompt)}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-teal-700 hover:bg-teal-800 active:bg-teal-900 text-white font-medium text-xs shadow-xs transition cursor-pointer min-h-[36px] shrink-0"
              >
                <span>Mulai Obrolan Ini</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* 5. 3 Contextual Quick Starters Cards */}
      <div className="w-full space-y-2.5 text-left">
        <div className="text-[11px] font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider px-1">
          Topik Obrolan Cepat
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {QUICK_STARTERS.map((starter, idx) => {
            const Icon = starter.icon;
            return (
              <motion.button
                key={starter.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.26 + idx * 0.06 }}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onSelectPrompt(starter.prompt)}
                className={`group flex flex-col justify-between p-3.5 sm:p-4 rounded-2xl border bg-white/80 dark:bg-slate-900/70 hover:bg-white dark:hover:bg-slate-900 shadow-xs hover:shadow-md transition-all cursor-pointer text-left ${starter.accent}`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-stone-100 dark:bg-slate-800 text-stone-600 dark:text-stone-400">
                      {starter.tag}
                    </span>
                    <Icon className="w-4 h-4 text-stone-400 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors" />
                  </div>
                  <h3 className="text-xs font-semibold text-stone-900 dark:text-stone-100 leading-snug">
                    {starter.title}
                  </h3>
                  <p className="text-[11px] text-stone-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                    {starter.desc}
                  </p>
                </div>

                <div className="mt-3.5 flex items-center gap-1 text-[11px] font-medium text-teal-700 dark:text-teal-400 group-hover:translate-x-0.5 transition-transform">
                  <span>Mulai cerita</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>

    </div>
  );
}
