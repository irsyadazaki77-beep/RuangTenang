import React, { useState } from 'react';
import {
  X,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Copy,
  Check,
  BookOpen
} from 'lucide-react';
import {
  auditDocumentIntegrity,
  applyParaphrasesToContent,
  IntegrityAuditReport
} from '../utils/academicIntegrityAuditor';

export interface AcademicIntegrityModalProps {
  isOpen: boolean;
  onClose: () => void;
  content: string;
  onApplyParaphrase: (newContent: string) => void;
  isDark?: boolean;
}

export const AcademicIntegrityModal: React.FC<AcademicIntegrityModalProps> = ({
  isOpen,
  onClose,
  content,
  onApplyParaphrase,
  isDark = true
}) => {
  const [report, setReport] = useState<IntegrityAuditReport>(() => auditDocumentIntegrity(content));
  const [selectedSuggestions, setSelectedSuggestions] = useState<Record<number, boolean>>({});
  const [copied, setCopied] = useState<boolean>(false);
  const [isApplied, setIsApplied] = useState<boolean>(false);

  // Recalculate on open or content change
  React.useEffect(() => {
    if (isOpen) {
      const rep = auditDocumentIntegrity(content);
      setReport(rep);
      // Default all suggestions to selected
      const initSelected: Record<number, boolean> = {};
      rep.suggestions.forEach((_, idx) => {
        initSelected[idx] = true;
      });
      setSelectedSuggestions(initSelected);
    }
  }, [isOpen, content]);

  if (!isOpen) return null;

  const toggleSuggestion = (idx: number) => {
    setSelectedSuggestions(prev => ({
      ...prev,
      [idx]: !prev[idx]
    }));
  };

  const handleSelectAll = (select: boolean) => {
    const updated: Record<number, boolean> = {};
    report.suggestions.forEach((_, idx) => {
      updated[idx] = select;
    });
    setSelectedSuggestions(updated);
  };

  const selectedCount = Object.values(selectedSuggestions).filter(Boolean).length;

  const handleApply = () => {
    const replacements = report.suggestions
      .filter((_, idx) => selectedSuggestions[idx])
      .map(s => ({
        original: s.originalSentence,
        replacement: s.paraphrasedSentence
      }));

    const updated = applyParaphrasesToContent(content, replacements);
    onApplyParaphrase(updated);
    setIsApplied(true);
    setTimeout(() => {
      onClose();
      setIsApplied(false);
    }, 400);
  };

  const handleCopyCleanText = () => {
    const replacements = report.suggestions
      .filter((_, idx) => selectedSuggestions[idx])
      .map(s => ({
        original: s.originalSentence,
        replacement: s.paraphrasedSentence
      }));

    const updated = applyParaphrasesToContent(content, replacements);
    navigator.clipboard.writeText(updated);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className={`w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl shadow-2xl border overflow-hidden ${
          isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Header */}
        <div
          className={`px-6 py-4 border-b flex items-center justify-between shrink-0 ${
            isDark ? 'border-slate-800 bg-slate-950/70' : 'border-slate-200 bg-slate-50'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-indigo-600 to-rose-600 text-white shadow-md">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold">Audit Kesiapan Turnitin & Parafrase Akademik</h2>
                <span
                  className={`px-2 py-0.5 text-[10.5px] font-semibold tracking-wide uppercase rounded-full border ${
                    report.riskCategory === 'safe'
                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                      : report.riskCategory === 'moderate'
                      ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                      : 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                  }`}
                >
                  {report.riskCategory === 'safe'
                    ? 'Zona Aman'
                    : report.riskCategory === 'moderate'
                    ? 'Waspada'
                    : 'Risiko Tinggi'}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Pemeriksaan orisinalitas naskah, eliminasi frasa non-formal, dan restrukturisasi kalimat pasif objektif standar Dikti.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyCleanText}
              className={`p-1.5 rounded-lg cursor-pointer transition-colors ${
                isDark ? 'hover:bg-slate-800 text-slate-400 hover:text-white' : 'hover:bg-slate-100 text-slate-600'
              }`}
              title="Salin Naskah Hasil Parafrase"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={onClose}
              className={`p-1.5 rounded-lg cursor-pointer transition-colors ${
                isDark ? 'hover:bg-slate-800 text-slate-400 hover:text-white' : 'hover:bg-slate-100 text-slate-600'
              }`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Skor & Metrik Ringkasan Banner */}
        <div
          className={`px-6 py-4 border-b grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0 ${
            isDark ? 'border-slate-800 bg-slate-950/40' : 'border-slate-200 bg-slate-50/50'
          }`}
        >
          <div className="space-y-0.5">
            <span className="text-[11px] text-slate-400">Estimasi Similaritas Turnitin:</span>
            <div className="flex items-baseline gap-1.5">
              <span
                className={`text-xl font-bold font-mono ${
                  report.riskCategory === 'safe'
                    ? 'text-emerald-400'
                    : report.riskCategory === 'moderate'
                    ? 'text-amber-400'
                    : 'text-rose-400'
                }`}
              >
                ~{report.overallRiskScore}%
              </span>
              <span className="text-[10px] text-slate-500">indeks kemiripan</span>
            </div>
          </div>

          <div className="space-y-0.5">
            <span className="text-[11px] text-slate-400">Skor Nada Akademik:</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-bold font-mono text-indigo-400">
                {report.academicToneScore}/100
              </span>
              <span className="text-[10px] text-slate-500">standar formal</span>
            </div>
          </div>

          <div className="space-y-0.5">
            <span className="text-[11px] text-slate-400">Keragaman Kosa Kata:</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-bold font-mono text-sky-400">
                {(report.vocabularyDiversityRatio * 100).toFixed(0)}%
              </span>
              <span className="text-[10px] text-slate-500">Type-Token Ratio</span>
            </div>
          </div>

          <div className="space-y-0.5">
            <span className="text-[11px] text-slate-400">Rekomendasi Parafrase:</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-bold font-mono text-amber-400">
                {report.suggestions.length} Kalimat
              </span>
              <span className="text-[10px] text-slate-500">perlu optimasi</span>
            </div>
          </div>
        </div>

        {/* Catatan Ringkasan Sistem */}
        <div className="px-6 py-2 bg-indigo-500/10 border-b border-indigo-500/20 text-xs text-indigo-300 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <span>{report.summaryNote}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleSelectAll(true)}
              className="text-[10.5px] hover:underline cursor-pointer text-indigo-400"
            >
              Pilih Semua
            </button>
            <span className="text-indigo-600">·</span>
            <button
              type="button"
              onClick={() => handleSelectAll(false)}
              className="text-[10.5px] hover:underline cursor-pointer text-indigo-400"
            >
              Kosongkan
            </button>
          </div>
        </div>

        {/* Daftar Kalimat Rekomendasi Parafrase */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {report.suggestions.length === 0 ? (
            <div className="p-8 text-center space-y-2">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
              <h3 className="text-sm font-bold text-slate-200">Naskah Sempurna & Siap Sidang!</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Tidak terdeteksi frasa klise atau susunan kalimat yang berisiko tinggi terhadap sistem Turnitin.
              </p>
            </div>
          ) : (
            report.suggestions.map((item, idx) => {
              const isChecked = Boolean(selectedSuggestions[idx]);
              return (
                <div
                  key={idx}
                  onClick={() => toggleSuggestion(idx)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer ${
                    isChecked
                      ? isDark
                        ? 'bg-slate-950/80 border-indigo-500/50 shadow-xs'
                        : 'bg-indigo-50/40 border-indigo-300 shadow-xs'
                      : isDark
                      ? 'bg-slate-950/30 border-slate-800 opacity-60'
                      : 'bg-slate-50 border-slate-200 opacity-60'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleSuggestion(idx)}
                      onClick={(e) => e.stopPropagation()}
                      className="mt-1 w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full ${
                            item.riskLevel === 'high'
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              : item.riskLevel === 'medium'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                          }`}
                        >
                          {item.riskLevel === 'high' ? 'Risiko Tinggi' : item.riskLevel === 'medium' ? 'Sedang' : 'Penyempurnaan Gaya'}
                        </span>
                        <span className="text-[11px] text-slate-500 italic">{item.reason}</span>
                      </div>

                      {/* Before (Original) */}
                      <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 line-through">
                        {item.originalSentence}
                      </div>

                      {/* After (Paraphrased) */}
                      <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 font-medium flex items-start gap-2">
                        <Sparkles className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
                        <span>{item.paraphrasedSentence}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div
          className={`px-6 py-3 border-t flex items-center justify-between shrink-0 ${
            isDark ? 'border-slate-800 bg-slate-950/70' : 'border-slate-200 bg-slate-50'
          }`}
        >
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <BookOpen className="w-4 h-4 text-indigo-400" />
            <span>{selectedCount} dari {report.suggestions.length} kalimat siap diparafrase otomatis.</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={selectedCount === 0}
              onClick={handleApply}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold shadow-md transition-all ${
                selectedCount > 0
                  ? 'bg-gradient-to-r from-indigo-600 to-rose-600 hover:from-indigo-500 hover:to-rose-500 text-white cursor-pointer shadow-indigo-600/20'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }`}
            >
              {isApplied ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Diterapkan!</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Terapkan ({selectedCount}) Parafrase ke Dokumen</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
