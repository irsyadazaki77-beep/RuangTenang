import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, FileCode, FileText, FileJson, Layers, X } from 'lucide-react';

interface QuickOpenModalProps {
  isOpen: boolean;
  onClose: () => void;
  files: string[];
  activeFilePath: string;
  onSelectFile: (filePath: string) => void;
  isDark?: boolean;
}

function getFileIcon(filename: string) {
  const lower = filename.toLowerCase();
  if (lower.endsWith('.html') || lower.endsWith('.htm')) {
    return <FileCode className="w-4 h-4 text-orange-500 shrink-0" />;
  }
  if (lower.endsWith('.css')) {
    return <Layers className="w-4 h-4 text-sky-500 shrink-0" />;
  }
  if (lower.endsWith('.js') || lower.endsWith('.mjs') || lower.endsWith('.ts')) {
    return <FileCode className="w-4 h-4 text-amber-500 shrink-0" />;
  }
  if (lower.endsWith('.json')) {
    return <FileJson className="w-4 h-4 text-emerald-500 shrink-0" />;
  }
  return <FileText className="w-4 h-4 text-slate-400 shrink-0" />;
}

export const QuickOpenModal: React.FC<QuickOpenModalProps> = ({
  isOpen,
  onClose,
  files,
  activeFilePath,
  onSelectFile,
  isDark = true
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const filteredFiles = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      // Put currently active file first, then others
      return [
        activeFilePath,
        ...files.filter(f => f !== activeFilePath)
      ].filter(Boolean);
    }
    return files.filter(f => f.toLowerCase().includes(q));
  }, [query, files, activeFilePath]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredFiles]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % Math.max(1, filteredFiles.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + filteredFiles.length) % Math.max(1, filteredFiles.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const target = filteredFiles[selectedIndex];
      if (target) {
        onSelectFile(target);
        onClose();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className={`w-full max-w-xl rounded-xl border shadow-2xl overflow-hidden flex flex-col ${
          isDark ? 'bg-[#0f172a] border-slate-700 text-slate-200' : 'bg-white border-slate-300 text-slate-800'
        }`}
        onClick={e => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div
          className={`flex items-center gap-2 px-3 py-2.5 border-b ${
            isDark ? 'border-slate-800 bg-slate-900/60' : 'border-slate-200 bg-slate-50'
          }`}
        >
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ketik nama file untuk membuka... (↑↓ navigasi, Enter pilih, Esc tutup)"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-slate-500 font-mono"
          />
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded hover:bg-slate-700/50 text-slate-400 hover:text-slate-200 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* File List */}
        <div ref={listRef} className="max-h-80 overflow-y-auto p-1.5 space-y-0.5">
          {filteredFiles.length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-500 font-mono">
              Tidak ada file yang cocok dengan "{query}".
            </div>
          ) : (
            filteredFiles.map((file, idx) => {
              const isSelected = idx === selectedIndex;
              const isActive = file === activeFilePath;
              return (
                <div
                  key={file}
                  onClick={() => {
                    onSelectFile(file);
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-mono cursor-pointer transition-colors ${
                    isSelected
                      ? isDark
                        ? 'bg-sky-500/20 text-sky-200 border border-sky-500/30'
                        : 'bg-sky-100 text-sky-900 border border-sky-300'
                      : isDark
                      ? 'hover:bg-slate-800/60 text-slate-300'
                      : 'hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {getFileIcon(file)}
                    <span className="truncate font-medium">{file}</span>
                  </div>
                  {isActive && (
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-sans font-semibold ${
                        isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      Aktif
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer shortcuts helper */}
        <div
          className={`px-3 py-1.5 border-t text-[10px] flex items-center justify-between text-slate-500 ${
            isDark ? 'border-slate-800 bg-slate-950/40' : 'border-slate-200 bg-slate-50'
          }`}
        >
          <div className="flex items-center gap-3">
            <span><kbd className="px-1 py-0.5 bg-slate-800 text-slate-300 rounded">↑</kbd> <kbd className="px-1 py-0.5 bg-slate-800 text-slate-300 rounded">↓</kbd> Navigasi</span>
            <span><kbd className="px-1 py-0.5 bg-slate-800 text-slate-300 rounded">Enter</kbd> Buka</span>
            <span><kbd className="px-1 py-0.5 bg-slate-800 text-slate-300 rounded">Esc</kbd> Batal</span>
          </div>
          <span className="font-mono">{filteredFiles.length} berkas</span>
        </div>
      </div>
    </div>
  );
};
