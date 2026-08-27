import React from 'react';
import { NotebookPen, HeartPulse, Sparkles, Wind } from 'lucide-react';

interface EmptyChatStateProps {
  userName?: string;
  onSelectPrompt: (prompt: string) => void;
}

const QUICK_ACTIONS = [
  {
    title: 'Menceritakan hari saya',
    desc: 'Bagi pengalaman atau hal yang membebani pikiran Anda',
    icon: NotebookPen,
    iconColor: 'text-teal-600 dark:text-teal-400',
    iconBg: 'bg-teal-50 dark:bg-teal-950/60 border-teal-200/60 dark:border-teal-900/60',
    query: 'Saya ingin menceritakan apa yang saya alami dan rasakan hari ini...'
  },
  {
    title: 'Saya sedang merasa cemas',
    desc: 'Temukan rasa tenang dan kurangi rasa gelisah',
    icon: HeartPulse,
    iconColor: 'text-rose-600 dark:text-rose-400',
    iconBg: 'bg-rose-50 dark:bg-rose-950/60 border-rose-200/60 dark:border-rose-900/60',
    query: 'Saya sedang merasa cemas dan tegang, tolong bantu saya merasa lebih tenang...'
  },
  {
    title: 'Refleksi pikiran',
    desc: 'Urai benang kusut dalam pikiran secara jernih',
    icon: Sparkles,
    iconColor: 'text-indigo-600 dark:text-indigo-400',
    iconBg: 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-200/60 dark:border-indigo-900/60',
    query: 'Bantu saya merefleksikan dan menyusun ulang sudut pandang pikiran saya...'
  },
  {
    title: 'Latihan pernapasan',
    desc: 'Panduan teknik relaksasi napas 4-7-8',
    icon: Wind,
    iconColor: 'text-sky-600 dark:text-sky-400',
    iconBg: 'bg-sky-50 dark:bg-sky-950/60 border-sky-200/60 dark:border-sky-900/60',
    query: 'Tolong pandu saya latihan pernapasan santai untuk meredakan ketegangan...'
  }
];

export function EmptyChatState({ userName, onSelectPrompt }: EmptyChatStateProps) {
  return (
    <div className="w-full max-w-[660px] mx-auto flex flex-col items-center text-center px-4 pt-4 sm:pt-8 pb-4 my-auto">
      {/* Compact Logo */}
      <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 shadow-2xs flex items-center justify-center p-2 mb-3 shrink-0">
        <img src="/favicon.svg" alt="RuangTenang" className="w-full h-full object-contain" />
      </div>
      
      {/* Greeting */}
      <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight mb-1">
        Halo, {userName || "Tamu"}.
      </h2>
      
      {/* Short Subtitle */}
      <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mb-5 sm:mb-6 max-w-sm sm:max-w-md leading-relaxed">
        Ruang aman dan rahasia. Ceritakan apa saja yang sedang Anda rasakan atau pilih panduan di bawah.
      </p>
      
      {/* Quick Action Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full text-left">
        {QUICK_ACTIONS.map(action => {
          const Icon = action.icon;
          return (
            <button
              key={action.title}
              onClick={() => onSelectPrompt(action.query)}
              aria-label={`${action.title}: ${action.desc}`}
              className="group relative flex items-center gap-3 p-3 sm:py-3.5 sm:px-4 rounded-xl sm:rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 hover:bg-slate-50 dark:hover:bg-slate-800/80 hover:border-teal-500/40 dark:hover:border-teal-500/40 hover:shadow-xs active:scale-[0.99] transition-all cursor-pointer min-h-[56px] sm:min-h-[64px]"
            >
              <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl border flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${action.iconBg}`}>
                <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${action.iconColor}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 group-hover:text-teal-700 dark:group-hover:text-teal-400 truncate transition-colors">
                  {action.title}
                </div>
                <div className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5 leading-snug">
                  {action.desc}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

