import React, { useEffect } from 'react';
import { Check, X, Sparkles, SplitSquareVertical } from 'lucide-react';

export interface InlineDiffDecorationBarProps {
  filePath: string;
  additions: number;
  deletions: number;
  onAccept: () => void;
  onReject: () => void;
  onOpenModal?: () => void;
  isDark?: boolean;
}

export const InlineDiffDecorationBar: React.FC<InlineDiffDecorationBarProps> = ({
  filePath,
  additions,
  deletions,
  onAccept,
  onReject,
  onOpenModal,
  isDark = true
}) => {
  // Global keyboard shortcuts while diff bar is mounted (Tab / Ctrl+Enter = Accept, Esc = Reject)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if an explicit modal or dialog is open
      if (document.querySelector('dialog[open]') || document.querySelector('[role="dialog"]')) {
        return;
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onReject();
      } else if (e.key === 'Tab' && !e.shiftKey) {
        // Tab key to accept proposed AI diff
        e.preventDefault();
        e.stopPropagation();
        onAccept();
      } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        e.stopPropagation();
        onAccept();
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [onAccept, onReject]);

  const fileName = filePath ? filePath.split(/[/\\]/).pop() : 'File';

  return (
    <div
      role="region"
      aria-label="Tinjau Perubahan Kode Inline"
      className={`absolute top-2 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3 px-3.5 py-2 rounded-2xl shadow-2xl border transition-all animate-in fade-in slide-in-from-top-2 duration-200 select-none ${
        isDark
          ? 'bg-slate-900/95 backdrop-blur-md border-purple-500/40 text-slate-100 shadow-purple-950/40'
          : 'bg-white/95 backdrop-blur-md border-purple-300 text-slate-800 shadow-purple-200/50'
      }`}
    >
      {/* AI Indicator & Filename */}
      <div className="flex items-center gap-2 pr-2 border-r border-slate-700/60 dark:border-slate-700/60">
        <span className="flex h-2 w-2 rounded-full bg-purple-400 animate-ping" />
        <Sparkles className="w-3.5 h-3.5 text-purple-400" />
        <span className="text-xs font-semibold max-w-[130px] truncate" title={filePath}>
          {fileName}
        </span>
      </div>

      {/* Diff line stats pill */}
      <div className="flex items-center gap-1.5 text-[11px] font-mono">
        <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 font-semibold border border-emerald-500/30">
          +{additions}
        </span>
        <span className="px-1.5 py-0.5 rounded-md bg-rose-500/15 text-rose-400 font-semibold border border-rose-500/30">
          -{deletions}
        </span>
      </div>

      <span className="hidden sm:inline text-[11px] text-slate-400">
        Perubahan AI siap diterapkan
      </span>

      {/* Action buttons */}
      <div className="flex items-center gap-1.5 pl-2 border-l border-slate-700/60">
        {/* Reject Button */}
        <button
          type="button"
          onClick={onReject}
          className="flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-medium text-slate-400 hover:text-rose-300 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/30 transition-all cursor-pointer"
          title="Tolak perubahan kode ini (Escape)"
        >
          <X className="w-3.5 h-3.5 text-rose-400" />
          <span>Tolak</span>
          <kbd className="hidden md:inline-block text-[9px] font-mono px-1 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700">
            Esc
          </kbd>
        </button>

        {/* Full Modal Review Link */}
        {onOpenModal && (
          <button
            type="button"
            onClick={onOpenModal}
            className="flex items-center gap-1 px-2 py-1 rounded-xl text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 transition-colors cursor-pointer"
            title="Buka perbandingan sisi-demi-sisi penuh"
          >
            <SplitSquareVertical className="w-3.5 h-3.5" />
            <span className="hidden lg:inline text-[11px]">Bandingkan</span>
          </button>
        )}

        {/* Accept Button */}
        <button
          type="button"
          onClick={onAccept}
          className="flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-md shadow-emerald-950/40 transition-all cursor-pointer hover:scale-102 active:scale-98"
          title="Terapkan perubahan kode ini (Tab)"
        >
          <Check className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>Terapkan</span>
          <kbd className="text-[9px] font-mono px-1 py-0.2 rounded bg-emerald-800/60 text-emerald-100 border border-emerald-400/30">
            Tab
          </kbd>
        </button>
      </div>
    </div>
  );
};
