import React from 'react';
import { AlertCircle, Phone } from 'lucide-react';

export default function EmergencyCard({ onAction }: { onAction?: () => void }) {
  return (
    <div className="my-3 border border-red-300 dark:border-red-900/50 rounded-2xl p-4 bg-red-50 dark:bg-red-950/20 shadow-sm flex items-start gap-4">
      <div className="p-3 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded-xl shrink-0">
        <AlertCircle className="w-6 h-6" />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-red-900 dark:text-red-300">Bantuan Darurat (SOS)</h3>
        <p className="text-sm text-red-800 dark:text-red-200 mt-1 mb-3">Jika Anda merasa dalam bahaya atau berpikir untuk menyakiti diri sendiri, mohon segera hubungi bantuan profesional.</p>
        <div className="flex flex-wrap gap-2">
          <a href="tel:119" className="px-4 py-2.5 min-h-[44px] bg-red-600 hover:bg-red-700 active:scale-95 text-white rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer w-full sm:w-auto">
            <Phone className="w-4 h-4 shrink-0" /> Hubungi 119
          </a>
          <a href="tel:123" className="px-4 py-2.5 min-h-[44px] bg-white dark:bg-slate-800 border border-red-300 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/40 text-red-700 dark:text-red-300 rounded-lg text-sm font-semibold transition-all flex items-center justify-center cursor-pointer w-full sm:w-auto">
            Hotline Kampus
          </a>
        </div>
      </div>
    </div>
  );
}
