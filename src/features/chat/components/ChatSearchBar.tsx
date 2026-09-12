import React, { useEffect, useRef } from 'react';
import { Search, ChevronUp, ChevronDown, X } from 'lucide-react';

interface ChatSearchBarProps {
  isOpen: boolean;
  onClose: () => void;
  query: string;
  onQueryChange: (val: string) => void;
  totalMatches: number;
  currentIndex: number;
  onNext: () => void;
  onPrev: () => void;
}

export function ChatSearchBar({
  isOpen,
  onClose,
  query,
  onQueryChange,
  totalMatches,
  currentIndex,
  onNext,
  onPrev
}: ChatSearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (e.shiftKey) {
        onPrev();
      } else {
        onNext();
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="w-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-b border-slate-200/70 dark:border-slate-800 px-3 sm:px-4 py-2 flex items-center justify-between gap-2 shadow-xs transition-all z-10 animate-in fade-in slide-in-from-top-1 duration-150">
      <div className="flex items-center gap-2 flex-1 max-w-xl">
        <Search className="w-4 h-4 text-slate-400 shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => onQueryChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Cari pesan dalam percakapan ini..."
          className="w-full bg-transparent text-xs sm:text-[13px] text-slate-800 dark:text-slate-100 placeholder-slate-400 outline-none"
        />
        {query && (
          <button
            onClick={() => onQueryChange('')}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
            aria-label="Hapus pencarian"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <div className="flex items-center gap-1.5 shrink-0 text-xs text-slate-500 dark:text-slate-400">
        {query ? (
          totalMatches > 0 ? (
            <span className="text-[11px] font-medium text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/60 px-2 py-0.5 rounded-full border border-teal-200/60 dark:border-teal-900/60">
              {currentIndex + 1} / {totalMatches}
            </span>
          ) : (
            <span className="text-[11px] text-slate-400">0 hasil</span>
          )
        ) : null}

        <div className="flex items-center">
          <button
            onClick={onPrev}
            disabled={totalMatches === 0}
            className="p-1 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded disabled:opacity-30 cursor-pointer"
            title="Pesan Sebelumnya (Shift+Enter)"
            aria-label="Pesan Sebelumnya"
          >
            <ChevronUp className="w-4 h-4" />
          </button>
          <button
            onClick={onNext}
            disabled={totalMatches === 0}
            className="p-1 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded disabled:opacity-30 cursor-pointer"
            title="Pesan Berikutnya (Enter)"
            aria-label="Pesan Berikutnya"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>

        <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-0.5" />

        <button
          onClick={onClose}
          className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded cursor-pointer"
          title="Tutup Pencarian (Esc)"
          aria-label="Tutup Pencarian"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
