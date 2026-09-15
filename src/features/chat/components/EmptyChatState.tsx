import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { apiClient } from '../../../lib/apiClient';
import { Sparkles, Heart, ArrowRight, Check, Compass, Wind } from 'lucide-react';

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
    label: 'Tenang / Butuh Ruang',
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

const NATURAL_INVITATIONS = [
  {
    id: 'tired',
    icon: Wind,
    tag: 'Tanpa Tuntutan',
    quote: '“Aku lagi capek banget hari ini dan cuma butuh didengarkan…”',
    desc: 'Untuk saat-saat di mana kamu tidak butuh solusi cepat, melainkan ruang yang aman untuk menumpahkan lelah.',
    prompt: 'Aku lagi capek banget hari ini, baik fisik maupun pikiran. Aku nggak butuh solusi buru-buru, cuma pengen didengarkan dengan tenang.'
  },
  {
    id: 'confused',
    icon: Compass,
    tag: 'Urai Pikiran',
    quote: '“Pikiranku lagi penuh, tapi aku bingung mulai dari mana…”',
    desc: 'Saat semua hal terasa menumpuk bersamaan, kita bisa mengurainya bersama secara perlahan.',
    prompt: 'Pikiran dan perasaanku rasanya campur aduk sekarang sampai aku bingung harus mulai cerita dari mana. Bisa bantu aku urai pelan-pelan?'
  },
  {
    id: 'anxiety-grounding',
    icon: Sparkles,
    tag: 'Penenang Diri',
    quote: '“Aku merasa cemas seharian, bantu aku rileks sebentar…”',
    desc: 'Panduan reflektif dan latihan pernapasan santai untuk membantu tubuh dan pikiranmu kembali rileks.',
    prompt: 'Tolong bantu aku meredakan ketegangan dan rasa cemas ini dengan latihan relaksasi atau obrolan yang menenangkan.'
  }
];

export function EmptyChatState({ userName, onSelectPrompt }: EmptyChatStateProps) {
  const [selectedMood, setSelectedMood] = useState<MoodItem | null>(null);
  const [isSaved, setIsSaved] = useState(false);

  const handleMoodSelect = async (mood: MoodItem) => {
    setSelectedMood(mood);
    setIsSaved(false);
    
    // Auto-log silently in background
    try {
      await apiClient.post('/api/v1/mood', {
        mood: mood.value,
        notes: `Check-in santai: ${mood.label}`,
        sleepHours: null,
        sleepQuality: null,
        factors: [],
        emotions: [mood.label]
      });
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3500);
    } catch {
      // safe fallback
    }
  };

  return (
    <div className="w-full max-w-[620px] mx-auto flex flex-col items-center text-center px-3 sm:px-4 pt-2 sm:pt-4 pb-8 my-auto space-y-6 sm:space-y-7 animate-fade-in select-none">
      {/* Soft Calming Visual (Therapeutic Organic Radiance) */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="relative flex items-center justify-center pt-1"
      >
        {/* Ambient Pulse Aura */}
        <motion.div 
          animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -inset-3 rounded-full bg-gradient-to-tr from-teal-200/40 via-emerald-100/30 to-teal-300/20 dark:from-teal-900/30 dark:via-emerald-950/20 dark:to-teal-800/10 blur-lg pointer-events-none"
        />

        {/* RuangTenang Official Brand Presence Badge */}
        <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-b from-white to-teal-50/70 dark:from-slate-900 dark:to-teal-950/70 border border-teal-200/80 dark:border-teal-800/80 shadow-[0_6px_24px_-4px_rgba(13,148,136,0.20)] flex items-center justify-center p-2.5">
          <img 
            src="/favicon.svg" 
            alt="RuangTenang" 
            className="w-full h-full object-contain pointer-events-none select-none" 
            loading="eager"
          />
        </div>
      </motion.div>

      {/* Empathic & Reassuring Greeting */}
      <div className="space-y-2 max-w-lg mx-auto">
        <motion.h1 
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.08 }}
          className="text-xl sm:text-2xl font-semibold tracking-tight text-stone-800 dark:text-stone-100 font-heading"
        >
          {userName ? `Hai ${userName}, ruang ini ada untukmu.` : 'Tarik napas perlahan... Kamu aman di sini.'}
        </motion.h1>
        
        <motion.p 
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="text-[13.5px] sm:text-[14.5px] text-stone-600 dark:text-stone-300 leading-relaxed max-w-md mx-auto"
        >
          Tidak ada tuntutan, tidak perlu terburu-buru. Apa pun yang sedang kamu rasakan saat ini, mari kita bicarakan pelan-pelan.
        </motion.p>
      </div>

      {/* "Mulai dengan Perasaan Hari Ini" Check-In Section */}
      <motion.div 
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="w-full bg-white/70 dark:bg-slate-900/60 backdrop-blur-xs border border-stone-200/80 dark:border-slate-800/80 rounded-2xl p-4 sm:p-5 shadow-[0_3px_18px_-3px_rgba(0,0,0,0.03)] space-y-3.5"
      >
        <div className="flex flex-col sm:flex-row items-center justify-between gap-1 text-center sm:text-left">
          <div>
            <h2 className="text-[14px] font-semibold text-stone-800 dark:text-stone-200 flex items-center justify-center sm:justify-start gap-1.5">
              <Heart className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 fill-teal-100 dark:fill-teal-950" />
              Bagaimana perasaanmu saat ini?
            </h2>
            <p className="text-[12px] text-stone-500 dark:text-stone-400 mt-0.5">
              Pilih satu yang paling mewakili keadaan hatimu sekarang.
            </p>
          </div>
          {isSaved && (
            <span className="text-[11.5px] text-teal-600 dark:text-teal-400 flex items-center gap-1 font-medium bg-teal-50 dark:bg-teal-950/60 px-2 py-0.5 rounded-full border border-teal-200/60 dark:border-teal-800 animate-fade-in">
              <Check className="w-3 h-3" /> Tersimpan di jurnalmu
            </span>
          )}
        </div>

        {/* Mood Emoji Pills with Accessible 44px+ Targets */}
        <div className="grid grid-cols-5 gap-1.5 sm:gap-2.5 pt-0.5">
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
                <span className={`text-[10.5px] sm:text-[11px] font-medium mt-1 line-clamp-1 leading-tight ${
                  isSelected ? 'text-teal-700 dark:text-teal-300 font-semibold' : 'text-stone-600 dark:text-stone-400'
                }`}>
                  {item.label.split('/')[0].trim()}
                </span>
              </button>
            );
          })}
        </div>

        {/* Soft Follow-up Action when Mood is chosen */}
        <AnimatePresence>
          {selectedMood && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="pt-2 border-t border-stone-200/50 dark:border-slate-800/60 flex flex-col sm:flex-row items-center justify-between gap-2.5 text-left overflow-hidden"
            >
              <div className="text-[13px] text-stone-600 dark:text-stone-300 text-center sm:text-left">
                Tampaknya kamu <span className="font-medium text-stone-800 dark:text-stone-100">{selectedMood.feeling}</span>. Ingin menguraikannya?
              </div>
              <button
                onClick={() => onSelectPrompt(selectedMood.prompt)}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white font-medium text-[13px] shadow-xs hover:shadow-sm transition-all duration-150 cursor-pointer min-h-[40px] shrink-0"
              >
                <span>Mulai Obrolan Ini</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Natural, Empathetic Suggested Prompts */}
      <div className="w-full space-y-2.5 text-left">
        <div className="text-[11px] font-semibold text-stone-400 dark:text-stone-500 uppercase tracking-wider px-1">
          Atau mulailah dari kalimat yang paling nyaman untukmu
        </div>

        <div className="grid grid-cols-1 gap-2.5">
          {NATURAL_INVITATIONS.map((item, idx) => {
            const Icon = item.icon;
            return (
              <motion.button
                key={item.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.25 + idx * 0.06 }}
                onClick={() => onSelectPrompt(item.prompt)}
                className="group w-full p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border border-stone-200/70 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/60 hover:bg-white dark:hover:bg-slate-900 hover:border-teal-300 dark:hover:border-teal-800/70 hover:shadow-[0_3px_16px_-4px_rgba(13,148,136,0.08)] transition-all duration-150 cursor-pointer active:scale-[0.99] text-left flex items-start gap-3 sm:gap-3.5 min-h-[44px]"
              >
                <div className="p-2 sm:p-2.5 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 border border-teal-100/80 dark:border-teal-900/50 shrink-0 group-hover:scale-105 transition-transform duration-150 mt-0.5">
                  <Icon className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-[10.5px] font-semibold px-1.5 py-0.5 rounded bg-stone-100 dark:bg-slate-800 text-stone-600 dark:text-stone-300">
                      {item.tag}
                    </span>
                  </div>
                  <div className="text-[14px] sm:text-[14.5px] font-semibold text-stone-800 dark:text-stone-100 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors leading-snug">
                    {item.quote}
                  </div>
                  <div className="text-[12.5px] text-stone-500 dark:text-stone-400 mt-0.5 leading-relaxed">
                    {item.desc}
                  </div>
                </div>

                <div className="hidden sm:flex items-center self-center text-stone-300 dark:text-slate-600 group-hover:text-teal-600 dark:group-hover:text-teal-400 group-hover:translate-x-0.5 transition-all duration-150 shrink-0 pl-1">
                  <ArrowRight className="w-4 h-4" />
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
