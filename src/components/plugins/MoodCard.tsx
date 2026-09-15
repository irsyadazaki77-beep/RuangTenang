import React from 'react';
import { Heart } from 'lucide-react';

export default function MoodCard() {
  return (
    <div className="my-4 border border-stone-200/80 dark:border-slate-800 rounded-3xl p-5 surface-card shadow-[0_2px_16px_-4px_rgba(0,0,0,0.04)] flex flex-col sm:flex-row items-start gap-4">
      <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-2xl shrink-0">
        <Heart className="w-6 h-6" />
      </div>
      <div className="flex-1">
        <h3 className="font-semibold text-[16px] text-stone-900 dark:text-stone-100">Mood Check-in Harian</h3>
        <p className="text-[14px] text-stone-500 dark:text-stone-400 mt-1 mb-4 leading-relaxed">
          Catat perasaan Anda untuk melacak pola emosi dan ketenangan pikiran dari waktu ke waktu.
        </p>
        <div className="flex flex-wrap gap-2.5">
          {['😭', '😟', '😐', '🙂', '😄'].map(e => (
            <button 
              key={e} 
              className="w-11 h-11 min-h-[44px] min-w-[44px] rounded-2xl bg-stone-50 dark:bg-slate-800 hover:bg-teal-50 dark:hover:bg-slate-700 flex items-center justify-center text-xl transition-all duration-150 border border-stone-200/60 dark:border-slate-700/60 cursor-pointer active:scale-95"
            >
              {e}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
