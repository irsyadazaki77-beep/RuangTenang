import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Send, X } from 'lucide-react';

interface InlineAiAssistModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeFilePath: string;
  onSubmit: (prompt: string) => void;
  isDark?: boolean;
}

const QUICK_PROMPTS = [
  'Refactor kode agar lebih bersih & modular',
  'Tambahkan validasi input & handling error',
  'Terapkan styling responsif modern',
  'Tambahkan fitur dark mode toggle',
  'Buat komponen interaktif baru'
];

export const InlineAiAssistModal: React.FC<InlineAiAssistModalProps> = ({
  isOpen,
  onClose,
  activeFilePath,
  onSubmit,
  isDark = true
}) => {
  const [prompt, setPrompt] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setPrompt('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = prompt.trim();
    if (!trimmed) return;
    onSubmit(`[Inline AI Edit pada "${activeFilePath}"]: ${trimmed}`);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className={`w-full max-w-xl rounded-xl border shadow-2xl overflow-hidden flex flex-col ${
          isDark ? 'bg-[#0f172a] border-sky-500/40 text-slate-200' : 'bg-white border-sky-300 text-slate-800'
        }`}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className={`px-3 py-2 border-b flex items-center justify-between text-xs ${
            isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-slate-50 border-slate-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md bg-gradient-to-tr from-sky-500 to-indigo-500 flex items-center justify-center text-white shadow-xs">
              <Sparkles className="w-3 h-3" />
            </div>
            <span className="font-bold text-xs">Inline AI Coding Assist</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-sky-400 border border-slate-700">
              {activeFilePath}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="p-3 space-y-2.5">
          <div className="relative flex items-center">
            <input
              ref={inputRef}
              type="text"
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ketik instruksi modifikasi kode... (contoh: ubah tombol jadi gradient hijau, perbaiki error)"
              className={`w-full pl-3 pr-10 py-2.5 rounded-lg text-xs outline-none border font-sans transition-all ${
                isDark
                  ? 'bg-slate-950 border-slate-700 focus:border-sky-500 text-slate-100 placeholder:text-slate-500'
                  : 'bg-white border-slate-300 focus:border-sky-500 text-slate-900 placeholder:text-slate-400'
              }`}
            />
            <button
              type="submit"
              disabled={!prompt.trim()}
              className="absolute right-1.5 p-1.5 rounded-md bg-sky-500 hover:bg-sky-400 disabled:opacity-40 disabled:hover:bg-sky-500 text-white cursor-pointer transition shadow-xs"
              title="Kirim ke Dewan AI (Enter)"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Quick Suggestions */}
          <div className="space-y-1">
            <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
              Saran Cepat:
            </div>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_PROMPTS.map((qp, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setPrompt(qp);
                    setTimeout(() => inputRef.current?.focus(), 20);
                  }}
                  className={`text-[11px] px-2 py-1 rounded-md border text-left cursor-pointer transition-colors ${
                    isDark
                      ? 'bg-slate-900/60 hover:bg-slate-800 border-slate-800 text-slate-300 hover:text-white'
                      : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700 hover:text-slate-900'
                  }`}
                >
                  {qp}
                </button>
              ))}
            </div>
          </div>
        </form>

        {/* Footer info */}
        <div
          className={`px-3 py-1.5 border-t text-[10px] flex items-center justify-between text-slate-500 ${
            isDark ? 'border-slate-800 bg-slate-950/40' : 'border-slate-200 bg-slate-50'
          }`}
        >
          <span>Tekan <kbd className="px-1 py-0.5 bg-slate-800 text-slate-300 rounded font-mono">Enter</kbd> untuk eksekusi langsung ke berkas</span>
          <span>Shortcut: <kbd className="px-1 py-0.5 bg-slate-800 text-slate-300 rounded font-mono">Ctrl+K</kbd></span>
        </div>
      </div>
    </div>
  );
};
