import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Pencil,
  Copy,
  Check,
  RotateCcw,
  ArrowRight,
  Sliders,
  ShieldCheck,
  TrendingUp,
  FileCheck2,
  X
} from 'lucide-react';
import {
  ParaphraseStyle,
  ParaphraseResult,
  paraphraseAcademicText
} from '../utils/paraphraseEngine';

interface AcademicParaphraseModalProps {
  isOpen: boolean;
  initialText?: string;
  onClose: () => void;
  onApplyParaphrase?: (newText: string) => void;
}

export const AcademicParaphraseModal: React.FC<AcademicParaphraseModalProps> = ({
  isOpen,
  initialText = '',
  onClose,
  onApplyParaphrase
}) => {
  const [inputText, setInputText] = useState(initialText);
  const [style, setStyle] = useState<ParaphraseStyle>('KONSERVATIF');
  const [result, setResult] = useState<ParaphraseResult | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (initialText) {
      setInputText(initialText);
    }
  }, [initialText]);

  useEffect(() => {
    if (!isOpen) return;
    if (inputText.trim()) {
      const res = paraphraseAcademicText(inputText, style);
      setResult(res);
    } else {
      setResult(null);
    }
  }, [inputText, style, isOpen]);

  if (!isOpen) return null;

  const handleCopy = () => {
    if (!result?.paraphrasedText) return;
    navigator.clipboard.writeText(result.paraphrasedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleApply = () => {
    if (!result?.paraphrasedText || !onApplyParaphrase) return;
    onApplyParaphrase(result.paraphrasedText);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div 
        className="w-full max-w-4xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-scale-up"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
              <Pencil className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base sm:text-lg text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <span>Alat Parafrase Akademik Beretika</span>
                <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800">
                  Anti-Plagiarisme
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Peningkatan diksi ilmiah formal (KBBI/PUEBI), restrukturisasi kalimat, dan sintesis ringkas
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Style Selector Toolbar */}
        <div className="p-3.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-850/40 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Gaya Penulisan:
            </span>
            <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-750">
              <button
                type="button"
                onClick={() => setStyle('KONSERVATIF')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  style === 'KONSERVATIF'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
                title="Ganti sinonim baku formal tanpa mengubah urutan kalimat"
              >
                1. Konservatif
              </button>
              <button
                type="button"
                onClick={() => setStyle('RESTRUKTURISASI')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  style === 'RESTRUKTURISASI'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
                title="Ubah kalimat aktif/pasif & alur logika klausa"
              >
                2. Restrukturisasi
              </button>
              <button
                type="button"
                onClick={() => setStyle('SINTESIS')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  style === 'SINTESIS'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
                title="Rangkum inti gagasan menjadi kalimat padat berbobot"
              >
                3. Sintesis Ringkas
              </button>
            </div>
          </div>

          <div className="text-xs text-slate-400">
            {style === 'KONSERVATIF' && 'Diksi Baku KBBI • Struktur Utuh'}
            {style === 'RESTRUKTURISASI' && 'Inversi Logika & Variasi Konjungsi'}
            {style === 'SINTESIS' && 'Eksekutif Ringkas • Kerapatan Informasi'}
          </div>
        </div>

        {/* Side-by-Side Comparison Container */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-2 min-h-0 divide-y md:divide-y-0 md:divide-x divide-slate-100 dark:divide-slate-800">
          {/* Left Column: Input Original Text */}
          <div className="flex flex-col p-4 space-y-2 overflow-y-auto">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Teks Asli / Draf Paragraf:
              </label>
              <span className="text-[11px] text-slate-400">
                {inputText.split(/\s+/).filter(Boolean).length} kata
              </span>
            </div>
            <textarea
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              placeholder="Ketik atau tempelkan draf kalimat/paragraf skripsi di sini..."
              rows={8}
              className="w-full flex-1 min-h-[160px] text-xs sm:text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all placeholder:text-slate-400 resize-none font-sans leading-relaxed"
            />
          </div>

          {/* Right Column: Paraphrased Output & Metrics */}
          <div className="flex flex-col p-4 space-y-3 overflow-y-auto bg-slate-50/40 dark:bg-slate-900/40">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-indigo-700 dark:text-indigo-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Hasil Parafrase Akademis:</span>
              </label>
              {result && (
                <span className="text-[11px] text-slate-400">
                  {result.wordCountParaphrased} kata • {result.changesCount} perubahan
                </span>
              )}
            </div>

            <div className="flex-1 min-h-[160px] p-3.5 rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs sm:text-sm text-slate-900 dark:text-slate-100 leading-relaxed font-sans overflow-y-auto custom-scrollbar select-all">
              {result?.paraphrasedText ? (
                <p>{result.paraphrasedText}</p>
              ) : (
                <p className="text-slate-400 italic">
                  Hasil parafrase akan muncul otomatis saat Anda mengetik atau menempelkan teks.
                </p>
              )}
            </div>

            {/* Metrics Bar */}
            {result && result.paraphrasedText && (
              <div className="grid grid-cols-3 gap-2 pt-1">
                <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-center">
                  <div className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">
                    Penurunan Plagiarisme
                  </div>
                  <div className="text-base font-extrabold text-emerald-600 dark:text-emerald-400">
                    ~{result.plagiarismRiskReduction}%
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 text-center">
                  <div className="text-[10px] font-semibold text-indigo-700 dark:text-indigo-300">
                    Variasi Kosakata
                  </div>
                  <div className="text-base font-extrabold text-indigo-600 dark:text-indigo-400">
                    {result.lexicalDiversity}%
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800/60 text-center">
                  <div className="text-[10px] font-semibold text-teal-700 dark:text-teal-300">
                    Keterbacaan Ilmiah
                  </div>
                  <div className="text-base font-extrabold text-teal-600 dark:text-teal-400">
                    {result.readabilityScore}/100
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-3.5 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between">
          <button
            type="button"
            onClick={handleCopy}
            disabled={!result?.paraphrasedText}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-750 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Tersalin ke Clipboard!' : 'Salin Hasil'}</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Tutup
            </button>
            {onApplyParaphrase && (
              <button
                type="button"
                onClick={handleApply}
                disabled={!result?.paraphrasedText}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-bold shadow-sm transition-all disabled:opacity-50 cursor-pointer"
              >
                <FileCheck2 className="w-4 h-4" />
                <span>Terapkan ke Dokumen</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
