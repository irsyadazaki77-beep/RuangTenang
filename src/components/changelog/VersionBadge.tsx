import React, { useState, useEffect } from 'react';
import { Sparkles, ArrowUpRight, CheckCircle2, History } from 'lucide-react';
import { CURRENT_APP_VERSION, LAST_UPDATED_DATE, isNewUpdateAvailable } from '../../data/changelogData';

interface VersionBadgeProps {
  variant?: 'pill' | 'compact' | 'sidebar' | 'card' | 'inline';
  onClick?: () => void;
  className?: string;
  showPing?: boolean;
}

export const VersionBadge: React.FC<VersionBadgeProps> = ({
  variant = 'pill',
  onClick,
  className = '',
  showPing = true
}) => {
  const [hasNewUpdate, setHasNewUpdate] = useState(false);

  useEffect(() => {
    setHasNewUpdate(isNewUpdateAvailable());
  }, []);

  if (variant === 'compact') {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`group relative flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full border transition-all cursor-pointer ${
          hasNewUpdate && showPing
            ? 'bg-teal-50 dark:bg-teal-950/80 border-teal-300 dark:border-teal-700 text-teal-800 dark:text-teal-200 shadow-3xs hover:bg-teal-100 dark:hover:bg-teal-900'
            : 'bg-slate-100/90 dark:bg-slate-800/90 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
        } ${className}`}
        title={`Versi Aplikasi: ${CURRENT_APP_VERSION} (Klik untuk melihat catatan rilis)`}
      >
        {hasNewUpdate && showPing ? (
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500"></span>
          </span>
        ) : (
          <Sparkles className="w-3 h-3 text-teal-600 dark:text-teal-400 group-hover:rotate-12 transition-transform shrink-0" />
        )}
        <span className="font-mono text-[11px] font-bold">{CURRENT_APP_VERSION}</span>
        <span className="text-[10px] hidden sm:inline text-teal-700 dark:text-teal-400 font-medium">Update</span>
      </button>
    );
  }

  if (variant === 'sidebar') {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-all border cursor-pointer ${
          hasNewUpdate && showPing
            ? 'bg-teal-50/80 dark:bg-teal-950/50 border-teal-200 dark:border-teal-800/80 text-teal-900 dark:text-teal-200 hover:bg-teal-100/80 dark:hover:bg-teal-900/60'
            : 'bg-white dark:bg-slate-800/60 border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100/80 dark:hover:bg-slate-800'
        } ${className}`}
        title="Buka Catatan Pembaruan Harian"
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-5 h-5 rounded-lg bg-teal-100 dark:bg-teal-900/80 text-teal-700 dark:text-teal-300 flex items-center justify-center shrink-0">
            <Sparkles className="w-3 h-3" />
          </div>
          <div className="flex flex-col text-left min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-[11px] truncate">Versi {CURRENT_APP_VERSION}</span>
              {hasNewUpdate && showPing && (
                <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse shrink-0" />
              )}
            </div>
            <span className="text-[9.5px] text-slate-400 dark:text-slate-500 truncate">
              {hasNewUpdate ? 'Ada Update Baru!' : 'Update Terkini'}
            </span>
          </div>
        </div>

        <span className="text-[10px] font-semibold text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/80 border border-teal-200/60 dark:border-teal-800 px-1.5 py-0.5 rounded-md shrink-0">
          Log
        </span>
      </button>
    );
  }

  if (variant === 'card') {
    return (
      <div className={`p-4 bg-gradient-to-br from-teal-50/70 to-sky-50/50 dark:from-teal-950/30 dark:to-slate-900 border border-teal-200/80 dark:border-teal-800/80 rounded-2xl space-y-3 ${className}`}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-3xs shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                  RuangTenang {CURRENT_APP_VERSION}
                </h4>
                <span className="px-2 py-0.5 text-[10px] font-bold bg-teal-100 dark:bg-teal-900 text-teal-800 dark:text-teal-200 rounded-full border border-teal-300 dark:border-teal-700">
                  Update Harian
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Rilis terbaru: {LAST_UPDATED_DATE}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClick}
            className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 active:scale-[0.98] text-white text-xs font-bold rounded-xl transition-all shadow-3xs flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            <History className="w-3.5 h-3.5" />
            <span>Lihat Riwayat</span>
          </button>
        </div>

        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          RuangTenang diperbarui secara berkala setiap hari untuk meningkatkan keamanan enkripsi, performa respons AI, dan fitur pendukung kesehatan mental mahasiswa.
        </p>

        <div className="flex items-center justify-between text-[11px] pt-1 border-t border-teal-100 dark:border-teal-900/60 text-slate-500 dark:text-slate-400">
          <span className="flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" /> Auto-Updated System
          </span>
          <button 
            type="button" 
            onClick={onClick} 
            className="text-teal-700 dark:text-teal-300 font-semibold hover:underline flex items-center gap-0.5 cursor-pointer"
          >
            Catatan Perubahan Lengkap &rarr;
          </button>
        </div>
      </div>
    );
  }

  // Default 'pill' variant
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
        hasNewUpdate && showPing
          ? 'bg-teal-50 dark:bg-teal-950/80 border-teal-300 dark:border-teal-700 text-teal-900 dark:text-teal-200 shadow-3xs hover:bg-teal-100 dark:hover:bg-teal-900 ring-2 ring-teal-500/10'
          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-750'
      } ${className}`}
      title="Buka Catatan Pembaruan & Versi"
    >
      <div className="flex items-center gap-1.5">
        {hasNewUpdate && showPing ? (
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500"></span>
          </span>
        ) : (
          <Sparkles className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 group-hover:rotate-12 transition-transform shrink-0" />
        )}
        <span className="font-mono font-bold">{CURRENT_APP_VERSION}</span>
      </div>

      <span className="h-3 w-px bg-slate-200 dark:bg-slate-700" />

      <span className="text-[11px] text-teal-700 dark:text-teal-400 font-medium group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
        Apa yang Baru <ArrowUpRight className="w-3 h-3" />
      </span>
    </button>
  );
};
