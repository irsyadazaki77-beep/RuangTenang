import React, { useState } from 'react';
import {
  Sparkles,
  Zap,
  Bug,
  FileCode,
  Send,
  X
} from 'lucide-react';

interface InlineAiActionBarProps {
  isOpen: boolean;
  selectedText: string;
  onClose: () => void;
  onSubmit: (prompt: string, selectedCode: string) => void;
  isDark?: boolean;
}

export const InlineAiActionBar: React.FC<InlineAiActionBarProps> = ({
  isOpen,
  selectedText,
  onClose,
  onSubmit,
  isDark = true
}) => {
  const [customPrompt, setCustomPrompt] = useState('');

  if (!isOpen) return null;

  const handleQuickAction = (actionPrompt: string) => {
    onSubmit(actionPrompt, selectedText);
    onClose();
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customPrompt.trim()) return;
    onSubmit(customPrompt.trim(), selectedText);
    setCustomPrompt('');
    onClose();
  };

  return (
    <div className="absolute top-8 left-1/2 transform -translate-x-1/2 z-40 w-full max-w-xl px-4 animate-in fade-in zoom-in-95 duration-100">
      <div
        className={`rounded-2xl border shadow-2xl p-3 flex flex-col gap-2.5 backdrop-blur-xl ${
          isDark
            ? 'bg-[#0f172a]/95 border-sky-500/40 text-slate-100 shadow-sky-500/10'
            : 'bg-white/95 border-sky-400 text-slate-800 shadow-xl'
        }`}
      >
        {/* Header & Quick Actions */}
        <div className="flex items-center justify-between text-xs pb-1.5 border-b border-slate-700/60">
          <div className="flex items-center gap-1.5 font-bold text-sky-400">
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Inline Assistant ({selectedText.split(/\r?\n/).length} baris terpilih)</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Action Pills */}
        <div className="flex items-center gap-1.5 flex-wrap text-xs">
          <button
            type="button"
            onClick={() => handleQuickAction('Jelaskan cara kerja potongan kode ini secara ringkas dan alur datanya.')}
            className="px-2.5 py-1 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border border-sky-500/30 flex items-center gap-1 cursor-pointer transition-colors"
          >
            <FileCode className="w-3 h-3" />
            <span>Jelaskan</span>
          </button>
          <button
            type="button"
            onClick={() => handleQuickAction('Optimalkan efisiensi, performa, dan kerapian sintaks pada kode ini tanpa mengubah fungsionalitas aslinya.')}
            className="px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 flex items-center gap-1 cursor-pointer transition-colors"
          >
            <Zap className="w-3 h-3" />
            <span>Optimalkan</span>
          </button>
          <button
            type="button"
            onClick={() => handleQuickAction('Analisis potensi bug, null-pointer, memory leak, atau edge-case error pada kode ini lalu berikan solusinya.')}
            className="px-2.5 py-1 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 flex items-center gap-1 cursor-pointer transition-colors"
          >
            <Bug className="w-3 h-3" />
            <span>Cari Bug</span>
          </button>
          <button
            type="button"
            onClick={() => handleQuickAction('Tambahkan dokumentasi JSDoc / komentar penjelas yang komprehensif pada fungsi dan variabel ini.')}
            className="px-2.5 py-1 rounded-lg bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/30 flex items-center gap-1 cursor-pointer transition-colors"
          >
            <span>📝 Docstring</span>
          </button>
        </div>

        {/* Custom Input Field */}
        <form onSubmit={handleCustomSubmit} className="relative flex items-center gap-2">
          <input
            type="text"
            value={customPrompt}
            onChange={e => setCustomPrompt(e.target.value)}
            placeholder="Instruksikan perubahan (contoh: ubah fungsi ini jadi async/await)..."
            autoFocus
            className={`w-full px-3 py-2 rounded-xl text-xs outline-none border transition-all ${
              isDark
                ? 'bg-slate-900 border-slate-700 text-white placeholder:text-slate-500 focus:border-sky-400'
                : 'bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-sky-500'
            }`}
          />
          <button
            type="submit"
            disabled={!customPrompt.trim()}
            className="px-3 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold flex items-center gap-1 disabled:opacity-40 cursor-pointer transition-all shadow-xs"
          >
            <Send className="w-3 h-3" />
            <span className="hidden sm:inline">Kirim</span>
          </button>
        </form>

        <div className="flex items-center justify-between text-[10px] text-slate-500 px-1">
          <span>💡 Tekan <strong>Esc</strong> untuk menutup • <strong>Enter</strong> untuk mengirim</span>
          <span className="font-mono">Ctrl+K / ⌘K</span>
        </div>
      </div>
    </div>
  );
};
