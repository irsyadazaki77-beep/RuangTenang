import React, { useState } from 'react';
import { apiClient } from '../../../lib/apiClient';
import { Check } from 'lucide-react';

interface EmptyChatStateProps {
  userName?: string;
  onSelectPrompt: (prompt: string) => void;
}

const QUICK_PROMPTS = [
  {
    title: 'Tekanan tugas & skripsi',
    desc: 'Urai beban akademik menjadi langkah terukur',
    query: 'Saya merasa kewalahan dengan beban tugas dan skripsi, tolong bantu saya menyusun langkah teratur...'
  },
  {
    title: 'Meredakan kecemasan',
    desc: 'Teknik meredakan pikiran dan ketegangan tubuh',
    query: 'Saya sedang merasa cemas dan gelisah, tolong bantu saya merasa lebih tenang...'
  },
  {
    title: 'Latihan napas terpandu',
    desc: 'Relaksasi napas 4-4-4 untuk rileks',
    query: 'Tolong pandu saya melakukan latihan pernapasan santai untuk meredakan ketegangan...'
  },
  {
    title: 'Ceritakan hari ini',
    desc: 'Refleksi hal yang terjadi atau membebani pikiran',
    query: 'Saya ingin menceritakan apa yang saya alami dan rasakan hari ini...'
  }
];

const MOOD_OPTIONS = [
  { value: 1, label: 'Sangat Buruk', emoji: '😢', prompt: 'Saya sedang merasa sangat sedih dan tertekan hari ini 😢, bolehkah kita berdiskusi?' },
  { value: 2, label: 'Kurang Baik', emoji: '🙁', prompt: 'Saya sedang merasa kurang baik hari ini 🙁, butuh teman mengobrol yang mendengarkan.' },
  { value: 3, label: 'Biasa Saja', emoji: '😐', prompt: 'Perasaan saya biasa saja hari ini 😐, bantu saya merefleksikan kegiatan dan perasaan saya.' },
  { value: 4, label: 'Cukup Baik', emoji: '🙂', prompt: 'Perasaan saya cukup baik hari ini 🙂, ingin berbagi cerita positif.' },
  { value: 5, label: 'Sangat Baik', emoji: '😊', prompt: 'Hari ini menyenangkan! Saya merasa bersyukur dan sangat baik 😊.' },
];

export function EmptyChatState({ userName, onSelectPrompt }: EmptyChatStateProps) {
  const [selectedMood, setSelectedMood] = useState<typeof MOOD_OPTIONS[0] | null>(null);
  const [isSaved, setIsSaved] = useState(false);

  const handleMoodSelect = async (mood: typeof MOOD_OPTIONS[0]) => {
    setSelectedMood(mood);
    setIsSaved(false);
    
    // Auto-log quietly in background if user is logged in
    try {
      await apiClient.post('/api/v1/mood', {
        mood: mood.value,
        notes: `Mood check-in cepat: ${mood.label}`,
        sleepHours: null,
        sleepQuality: null,
        factors: [],
        emotions: [mood.label]
      });
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
    } catch {
      // safe fallback
    }
  };

  return (
    <div className="w-full max-w-[680px] mx-auto flex flex-col items-center text-center px-4 pt-6 sm:pt-12 pb-4 my-auto space-y-6">
      {/* Brand icon & Greeting */}
      <div className="space-y-3">
        <div className="w-10 h-10 mx-auto rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 shadow-[0_2px_8px_rgba(0,0,0,0.03)] flex items-center justify-center p-2">
          <img src="/favicon.svg" alt="RuangTenang" className="w-full h-full object-contain" />
        </div>
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
          Bagaimana kabarmu, {userName || "teman"}?
        </h1>
        <p className="text-[13.5px] text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
          Ruang aman untuk bercerita, meredakan ketegangan, atau mencari sudut pandang baru.
        </p>
      </div>

      {/* Subtle Mood Check-in Strip */}
      <div className="flex flex-col items-center space-y-2 py-1">
        <div className="flex items-center gap-2 text-[11.5px] text-slate-400 dark:text-slate-500">
          <span>Bagaimana perasaanmu saat ini?</span>
          {isSaved && (
            <span className="text-teal-600 dark:text-teal-400 flex items-center gap-1 font-medium transition-opacity">
              <Check className="w-3 h-3" /> Tercatat
            </span>
          )}
        </div>
        <div className="flex items-center justify-center gap-1 sm:gap-1.5">
          {MOOD_OPTIONS.map(choice => {
            const isSelected = selectedMood?.value === choice.value;
            return (
              <button
                key={choice.value}
                onClick={() => handleMoodSelect(choice)}
                aria-label={`Mood: ${choice.label}`}
                title={choice.label}
                className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center text-lg sm:text-xl transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-slate-200/80 dark:bg-slate-800 scale-110 shadow-xs ring-1 ring-teal-500/50'
                    : 'hover:bg-slate-100 dark:hover:bg-slate-800/60 opacity-80 hover:opacity-100'
                }`}
              >
                {choice.emoji}
              </button>
            );
          })}
        </div>

        {selectedMood && (
          <div className="pt-1 flex items-center gap-2">
            <button
              onClick={() => onSelectPrompt(selectedMood.prompt)}
              className="text-[12px] text-teal-600 dark:text-teal-400 hover:underline font-medium cursor-pointer"
            >
              Lanjutkan bercerita tentang perasaan ini &rarr;
            </button>
          </div>
        )}
      </div>

      {/* Minimal Suggestion Chips Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full pt-2 text-left">
        {QUICK_PROMPTS.map(item => (
          <button
            key={item.title}
            onClick={() => onSelectPrompt(item.query)}
            className="group px-3.5 py-3 rounded-xl border border-slate-200/60 dark:border-slate-800/70 bg-white/60 dark:bg-slate-900/50 hover:bg-white dark:hover:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700 transition-all cursor-pointer shadow-[0_1px_2px_rgba(0,0,0,0.02)] active:scale-[0.99]"
          >
            <div className="text-[13px] font-medium text-slate-800 dark:text-slate-200 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
              {item.title}
            </div>
            <div className="text-[12px] text-slate-400 dark:text-slate-500 truncate mt-0.5">
              {item.desc}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
