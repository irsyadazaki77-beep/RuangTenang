import React, { useState, useEffect } from 'react';
import { Sparkles, X, ArrowRight } from 'lucide-react';
import { CURRENT_APP_VERSION, isNewUpdateAvailable, markUpdateAsSeen } from '../../data/changelogData';

interface NewUpdateToastProps {
  onOpenChangelog: () => void;
}

export const NewUpdateToast: React.FC<NewUpdateToastProps> = ({ onOpenChangelog }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if new update is available and user hasn't seen it
    const timer = setTimeout(() => {
      if (isNewUpdateAvailable()) {
        setIsVisible(true);
      }
    }, 1500); // Gentle delay after initial app load

    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = () => {
    markUpdateAsSeen();
    setIsVisible(false);
  };

  const handleOpen = () => {
    setIsVisible(false);
    onOpenChangelog();
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 right-4 z-40 max-w-sm w-[calc(100vw-2rem)] sm:w-auto bg-white dark:bg-slate-900 border border-teal-300 dark:border-teal-700/80 rounded-2xl shadow-xl p-3.5 sm:p-4 text-slate-900 dark:text-slate-100 animate-in slide-in-from-bottom-5 fade-in duration-300 ring-2 ring-teal-500/10">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-xl bg-teal-100 dark:bg-teal-900/80 text-teal-700 dark:text-teal-300 flex items-center justify-center shrink-0 shadow-3xs mt-0.5">
          <Sparkles className="w-4 h-4" />
        </div>

        <div className="flex-1 min-w-0 pr-1">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
              Pembaruan Harian {CURRENT_APP_VERSION}
            </span>
            <span className="px-1.5 py-0.2 bg-teal-100 dark:bg-teal-900 text-teal-800 dark:text-teal-200 rounded text-[9px] font-bold">
              Baru
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
            Ada pembaruan fitur & peningkatan stabilitas sistem hari ini.
          </p>

          <div className="flex items-center gap-2 mt-2.5">
            <button
              type="button"
              onClick={handleOpen}
              className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 active:scale-[0.98] text-white text-xs font-bold rounded-xl transition-all shadow-3xs flex items-center gap-1 cursor-pointer"
            >
              <span>Lihat Pembaruan</span>
              <ArrowRight className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={handleDismiss}
              className="px-2.5 py-1.5 text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors cursor-pointer"
            >
              Nanti Saja
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={handleDismiss}
          className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-colors cursor-pointer shrink-0 -mr-1 -mt-1"
          aria-label="Tutup Notifikasi"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
