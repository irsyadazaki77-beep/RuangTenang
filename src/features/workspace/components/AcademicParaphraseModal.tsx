import React, { useState, useEffect, useMemo, useId, useRef } from 'react';
import {
  Sparkles,
  Pencil,
  Copy,
  Check,
  FileCheck2,
  ShieldCheck,
  AlertTriangle,
  X
} from 'lucide-react';
import {
  ParaphraseStyle,
  ParaphraseResult,
  paraphraseAcademicText,
  calculateTextSimilarity
} from '../utils/paraphraseEngine';
import { useFocusTrap } from '../../../hooks/useFocusTrap';

interface AcademicParaphraseModalProps {
  isOpen: boolean;
  initialText?: string;
  onClose: () => void;
  onApplyParaphrase?: (newText: string) => void;
}

const MAX_ANALYSIS_CHARACTERS = 12_000;

export const AcademicParaphraseModal: React.FC<AcademicParaphraseModalProps> = ({
  isOpen,
  initialText = '',
  onClose,
  onApplyParaphrase
}) => {
  const [inputText, setInputText] = useState(initialText);
  const [style, setStyle] = useState<ParaphraseStyle>('KONSERVATIF');
  const [result, setResult] = useState<ParaphraseResult | null>(null);
  const [editableOutput, setEditableOutput] = useState('');
  const [showSentenceBreakdown, setShowSentenceBreakdown] = useState(false);
  const [copied, setCopied] = useState(false);
  const [clipboardError, setClipboardError] = useState('');
  const dialogTitleId = useId();
  const dialogDescriptionId = useId();
  const inputTextRef = useRef<HTMLTextAreaElement>(null);
  const dialogRef = useFocusTrap<HTMLDivElement>({ isOpen, onClose, initialFocusRef: inputTextRef });

  useEffect(() => {
    if (initialText) {
      setInputText(initialText);
    }
  }, [initialText]);

  useEffect(() => {
    if (!isOpen) return;
    if (inputText.length > MAX_ANALYSIS_CHARACTERS) {
      setResult(null);
      setEditableOutput('');
      return;
    }
    if (inputText.trim()) {
      const res = paraphraseAcademicText(inputText, style);
      setResult(res);
      setEditableOutput(res.paraphrasedText);
    } else {
      setResult(null);
      setEditableOutput('');
    }
  }, [inputText, style, isOpen]);

  const liveSimilarity = useMemo(() => {
    if (!inputText.trim() || !editableOutput.trim()) return result?.similarity || null;
    return calculateTextSimilarity(inputText, editableOutput);
  }, [inputText, editableOutput, result]);

  if (!isOpen) return null;

  const activeOutputText = editableOutput;

  const handleCopy = async () => {
    if (!activeOutputText) return;
    try {
      if (!navigator.clipboard?.writeText) throw new Error('CLIPBOARD_UNAVAILABLE');
      await navigator.clipboard.writeText(activeOutputText);
      setClipboardError('');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
      setClipboardError('Clipboard tidak dapat diakses. Pilih teks hasil lalu salin secara manual.');
    }
  };

  const handleApply = () => {
    if (!activeOutputText || !onApplyParaphrase) return;
    onApplyParaphrase(activeOutputText);
    onClose();
  };

  const simPercent = liveSimilarity?.overallSimilarityPercent ?? 0;
  const riskLevel = liveSimilarity?.riskLevel ?? 'RENDAH';
  const riskBadgeClass = riskLevel === 'TINGGI'
    ? 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800'
    : riskLevel === 'SEDANG'
      ? 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800'
      : 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800';
  const simBarColor = riskLevel === 'TINGGI'
    ? 'bg-rose-500'
    : riskLevel === 'SEDANG'
      ? 'bg-amber-500'
      : 'bg-emerald-500';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div
        ref={dialogRef}
        className="w-full max-w-4xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-scale-up"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={dialogTitleId}
        aria-describedby={dialogDescriptionId}
        tabIndex={-1}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
              <Pencil className="w-5 h-5" />
            </div>
            <div>
              <h2 id={dialogTitleId} className="font-bold text-base sm:text-lg text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <span>Penyunting Teks Akademik</span>
                <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800">
                  Mode lokal
                </span>
              </h2>
              <p id={dialogDescriptionId} className="text-xs text-slate-500 dark:text-slate-400">
                Pemrosesan dilakukan di browser. Konservatif mempertahankan draf; Sintesis memilih kalimat sumber tanpa menulis ulang.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup bantuan penulisan akademik"
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
                title="Pertahankan teks sumber apa adanya"
              >
                1. Konservatif
              </button>
              <button
                type="button"
                disabled
                aria-disabled="true"
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  style === 'RESTRUKTURISASI'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-400 dark:text-slate-500 cursor-not-allowed'
                }`}
                title="Restrukturisasi belum tersedia di mode lokal"
              >
                2. Restrukturisasi (nonaktif)
              </button>
              <button
                type="button"
                onClick={() => setStyle('SINTESIS')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  style === 'SINTESIS'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
                title="Memilih beberapa kalimat asli tanpa menulis ulang"
              >
                3. Sintesis Ringkas
              </button>
            </div>
          </div>

          <div className="text-xs text-slate-400">
            {style === 'KONSERVATIF' && 'Teks sumber dipertahankan apa adanya'}
            {style === 'RESTRUKTURISASI' && 'Restrukturisasi belum tersedia di mode lokal'}
            {style === 'SINTESIS' && 'Memilih kalimat dari sumber tanpa menulis ulang'}
          </div>
        </div>

        {/* Side-by-Side Comparison Container */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-2 min-h-0 divide-y md:divide-y-0 md:divide-x divide-slate-100 dark:divide-slate-800">
          {/* Left Column: Input Original Text */}
          <div className="flex flex-col p-4 space-y-2 overflow-y-auto">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Teks sumber / draf:
              </label>
              <span className="text-[11px] text-slate-400">
                {inputText.split(/\s+/).filter(Boolean).length} kata
              </span>
            </div>
            <textarea
              ref={inputTextRef}
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              maxLength={MAX_ANALYSIS_CHARACTERS}
              aria-label="Teks asli untuk disunting"
              placeholder="Ketik atau tempelkan draf kalimat/paragraf skripsi di sini..."
              rows={8}
              className="w-full flex-1 min-h-[160px] text-xs sm:text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all placeholder:text-slate-400 resize-none font-sans leading-relaxed"
            />
            {inputText.length > MAX_ANALYSIS_CHARACTERS ? (
              <p role="alert" className="text-[10px] text-rose-600 dark:text-rose-400">
                Draf ini {inputText.length.toLocaleString('id-ID')} karakter. Pangkas menjadi maksimal 12.000 karakter untuk menjalankan analisis.
              </p>
            ) : (
              <p className="text-[10px] text-slate-400">Batas 12.000 karakter per kolom agar penyuntingan tetap responsif.</p>
            )}
          </div>

          {/* Right Column: Paraphrased Output & Similarity Estimator */}
          <div className="flex flex-col p-4 space-y-3 overflow-y-auto bg-slate-50/40 dark:bg-slate-900/40">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-indigo-700 dark:text-indigo-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Teks hasil (dapat diedit):</span>
              </label>
              {result && (
                <span className="text-[11px] text-slate-400">
                  {activeOutputText.split(/\s+/).filter(Boolean).length} kata
                </span>
              )}
            </div>

            <textarea
              value={editableOutput}
              onChange={e => setEditableOutput(e.target.value)}
              maxLength={MAX_ANALYSIS_CHARACTERS}
              aria-label="Teks hasil penyuntingan"
              placeholder="Teks hasil akan mengikuti mode yang dipilih. Anda dapat menyuntingnya di sini."
              rows={6}
              className="w-full flex-1 min-h-[140px] p-3.5 rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs sm:text-sm text-slate-900 dark:text-slate-100 leading-relaxed font-sans focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 resize-none"
            />

            {/* Visual Similarity Estimator Card */}
            {result && activeOutputText && liveSimilarity && (
              <div className="space-y-2.5 pt-1">
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-100">
                      {riskLevel === 'TINGGI' ? (
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                      ) : (
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      )}
                      <span>Kemiripan dengan draf sumber: {simPercent}%</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${riskBadgeClass}`}>
                      Kategori {riskLevel.toLowerCase()}
                    </span>
                  </div>

                  {/* Visual Progress Bar */}
                  <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden" role="progressbar" aria-valuenow={simPercent} aria-valuemin={0} aria-valuemax={100} aria-label="Indikator kemiripan teks">
                    <div
                      className={`h-full transition-all duration-300 ${simBarColor}`}
                      style={{ width: `${simPercent}%` }}
                    />
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 text-[10.5px] text-slate-500 dark:text-slate-400">
                    <span>N-Gram Overlap: <strong>{liveSimilarity.ngramOverlapPercent}%</strong></span>
                    <span>Kemiripan Struktur (Levenshtein): <strong>{liveSimilarity.structuralSimilarityPercent}%</strong></span>
                    {liveSimilarity.sentenceComparisons.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setShowSentenceBreakdown(prev => !prev)}
                        className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline cursor-pointer"
                      >
                        {showSentenceBreakdown ? 'Sembunyikan Rincian Kalimat' : `Lihat ${liveSimilarity.sentenceComparisons.length} Kalimat`}
                      </button>
                    )}
                  </div>

                  <p className="text-[10px] leading-relaxed text-slate-500 dark:text-slate-400">
                    Estimator ini membandingkan draf dengan teks hasil memakai N-Gram dan edit distance. Kategori adalah indikator internal, bukan penilaian plagiarisme atau pencarian pada basis data publik.
                  </p>

                  {showSentenceBreakdown && liveSimilarity.sentenceComparisons.length > 0 && (
                    <div className="mt-2 max-h-36 overflow-y-auto space-y-1.5 border-t border-slate-100 dark:border-slate-800 pt-2 pr-1">
                      <p className="text-[10px] text-slate-400">Rincian dibatasi hingga 40 kalimat pertama; skor ringkas memakai seluruh teks.</p>
                      {liveSimilarity.sentenceComparisons.map((item, idx) => (
                        <div key={idx} className="rounded-lg bg-slate-50 dark:bg-slate-900 p-2 text-[10.5px] space-y-1 border border-slate-200/60 dark:border-slate-800">
                          <div className="flex items-center justify-between font-semibold">
                            <span className="text-slate-600 dark:text-slate-300">Kalimat #{idx + 1}</span>
                            <span className={item.similarityPercent >= 70 ? 'text-rose-600 dark:text-rose-400' : item.similarityPercent >= 40 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}>
                              {item.similarityPercent}% mirip (N-Gram {item.ngramOverlapPercent}%)
                            </span>
                          </div>
                          {item.original && <p className="text-slate-500 line-clamp-2">Asli: “{item.original}”</p>}
                          {item.paraphrased && <p className="text-slate-500 line-clamp-2">Hasil: “{item.paraphrased}”</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 text-center">
                    <div className="text-[10px] font-semibold text-indigo-700 dark:text-indigo-300">
                      Keragaman Kosakata
                    </div>
                    <div className="text-base font-extrabold text-indigo-600 dark:text-indigo-400">
                      {result.lexicalDiversity}%
                    </div>
                    <div className="text-[9px] text-indigo-700/80 dark:text-indigo-300/80">kata unik dari total kata</div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800/60 text-center">
                    <div className="text-[10px] font-semibold text-teal-700 dark:text-teal-300">
                      Keterbacaan (heuristik)
                    </div>
                    <div className="text-base font-extrabold text-teal-600 dark:text-teal-400">
                      {result.readabilityScore}/100
                    </div>
                    <div className="text-[9px] text-teal-700/80 dark:text-teal-300/80">berdasarkan kata per kalimat</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800/60 text-center">
                    <div className="text-[10px] font-semibold text-sky-700 dark:text-sky-300">Perubahan Jumlah Kata</div>
                    <div className="text-base font-extrabold text-sky-600 dark:text-sky-400">
                      {result.wordCountChange > 0 ? '+' : ''}{result.wordCountChange}
                    </div>
                  </div>
                </div>
                <p className="text-[10px] leading-relaxed text-slate-500 dark:text-slate-400">
                  Tinjau kembali ketepatan makna dan pertahankan atribusi serta sitasi sesuai panduan akademik institusi Anda.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-3.5 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={handleCopy}
              disabled={!activeOutputText}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-750 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer shrink-0"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Tersalin ke Clipboard!' : 'Salin Hasil'}</span>
            </button>
            {clipboardError && <p role="status" aria-live="polite" className="text-[10px] text-rose-600 dark:text-rose-400">{clipboardError}</p>}
          </div>

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
                disabled={!activeOutputText}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-bold shadow-sm transition-all disabled:opacity-50 cursor-pointer"
              >
                <FileCheck2 className="w-4 h-4" />
                <span>Terapkan ke Dokumen Canvas</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
