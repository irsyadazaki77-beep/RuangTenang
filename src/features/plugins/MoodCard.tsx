import React from 'react';
import { Heart } from 'lucide-react';

export default function MoodCard({ onAction }: { onAction?: () => void }) {
  return (
    <div className="my-3 border border-slate-200 rounded-2xl p-4 bg-white shadow-sm flex items-start gap-4">
      <div className="p-3 bg-rose-50 text-rose-600 rounded-xl shrink-0">
        <Heart className="w-6 h-6" />
      </div>
      <div className="flex-1">
        <h3 className="font-semibold text-slate-800">Mood Check-in</h3>
        <p className="text-sm text-slate-500 mt-1 mb-3">Catat perasaan Anda untuk melacak pola emosi dari waktu ke waktu.</p>
        <div className="flex gap-2">
          {['😭', '😟', '😐', '🙂', '😄'].map(e => (
            <button key={e} className="w-10 h-10 rounded-full hover:bg-slate-100 flex items-center justify-center text-xl transition-colors border border-slate-100">
              {e}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
