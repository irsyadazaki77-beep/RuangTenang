import React, { useState } from 'react';
import {
  X,
  Brain,
  Sparkles,
  Coffee,
  Play,
  Copy,
  Check
} from 'lucide-react';
import {
  generateMabaExplanation,
  MabaExplanationReport
} from '../services/codeMabaExplainer';

interface MabaExplainerModalProps {
  isOpen: boolean;
  onClose: () => void;
  code: string;
  filename: string;
  isDark?: boolean;
}

export const MabaExplainerModal: React.FC<MabaExplainerModalProps> = ({
  isOpen,
  onClose,
  code,
  filename,
  isDark = true
}) => {
  const [report, setReport] = useState<MabaExplanationReport>(() =>
    generateMabaExplanation(code, filename)
  );
  const [activePersonaIdx, setActivePersonaIdx] = useState<number>(0);
  const [currentTraceStep, setCurrentTraceStep] = useState<number>(0);
  const [copied, setCopied] = useState<boolean>(false);

  // Re-generate report if opened or code changed
  React.useEffect(() => {
    if (isOpen) {
      setReport(generateMabaExplanation(code, filename));
      setCurrentTraceStep(0);
    }
  }, [isOpen, code, filename]);

  if (!isOpen) return null;

  const currentPersona = report.personas[activePersonaIdx];
  const activeTrace = report.variableTrace[currentTraceStep] || report.variableTrace[0];

  const handleCopyExplanation = () => {
    const text = `Penjelasan Kode (Mode Maba) - ${filename}:\n\nAnalogi: ${report.primaryAnalogy}\n\nUlasan ${currentPersona.personaName}:\n${currentPersona.verdict}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className={`w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl shadow-2xl border overflow-hidden ${
          isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Header */}
        <div className={`px-6 py-4 border-b flex items-center justify-between ${isDark ? 'border-slate-800 bg-slate-950/60' : 'border-slate-200 bg-slate-50'}`}>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-purple-500 to-pink-500 text-white shadow-md">
              <Brain className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold">Bedah Kode Mode Maba (ELIM)</h2>
                <span className="px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  Explain Like I'm Maba
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Membedah logika kode baris demi baris menggunakan analogi kehidupan kampus yang mudah dipahami.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyExplanation}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Tersalin!' : 'Salin Penjelasan'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                isDark ? 'hover:bg-slate-800 text-slate-400 hover:text-white' : 'hover:bg-slate-100 text-slate-500 hover:text-slate-900'
              }`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Primary Analogy Banner */}
        <div className={`px-6 py-3.5 border-b flex items-start gap-3 ${isDark ? 'border-slate-800 bg-purple-950/20' : 'border-purple-100 bg-purple-50/60'}`}>
          <Coffee className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
          <div className="text-xs leading-relaxed">
            <span className="font-bold text-purple-300 block mb-0.5">Analogi Utama:</span>
            <span className={isDark ? 'text-slate-300' : 'text-slate-700'}>{report.primaryAnalogy}</span>
          </div>
        </div>

        {/* Persona Tabs */}
        <div className={`px-6 py-2.5 border-b flex items-center gap-2 ${isDark ? 'border-slate-800 bg-slate-950/40' : 'border-slate-200 bg-slate-50'}`}>
          <span className="text-xs font-semibold text-slate-400 mr-2">Sudut Pandang Tokoh:</span>
          {report.personas.map((p, idx) => (
            <button
              key={p.personaId}
              type="button"
              onClick={() => setActivePersonaIdx(idx)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                activePersonaIdx === idx
                  ? 'bg-purple-600 text-white font-bold shadow-sm'
                  : isDark ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
              }`}
            >
              <span>{p.avatar}</span>
              <span>{p.personaName}</span>
            </button>
          ))}
        </div>

        {/* Selected Persona Quote & Verdict */}
        <div className={`px-6 py-3 border-b text-xs ${isDark ? 'border-slate-800 bg-slate-900/60' : 'border-slate-200 bg-white'}`}>
          <div className="italic text-slate-400 mb-1">{currentPersona.quote}</div>
          <div className={`p-2.5 rounded-xl border ${isDark ? 'bg-slate-800/40 border-slate-700 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'}`}>
            <span className="font-bold text-purple-400">Pesan {currentPersona.personaName}: </span>
            {currentPersona.verdict}
          </div>
        </div>

        {/* Content Body: Line-by-Line Breakdown & Variable Tracer */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 max-h-[50vh]">
          {/* Variable State Watcher / Tracer */}
          {report.variableTrace.length > 0 && (
            <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-xs font-bold text-sky-400">
                  <Play className="w-3.5 h-3.5" />
                  <span>Pelacak Nilai Variabel Langkah-demi-Langkah (Langkah {currentTraceStep + 1} dari {report.variableTrace.length}):</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={currentTraceStep === 0}
                    onClick={() => setCurrentTraceStep(prev => Math.max(0, prev - 1))}
                    className="px-2.5 py-1 rounded text-xs bg-slate-800 hover:bg-slate-700 disabled:opacity-40 cursor-pointer"
                  >
                    Sebelumnya
                  </button>
                  <button
                    type="button"
                    disabled={currentTraceStep === report.variableTrace.length - 1}
                    onClick={() => setCurrentTraceStep(prev => Math.min(report.variableTrace.length - 1, prev + 1))}
                    className="px-2.5 py-1 rounded text-xs bg-purple-600 hover:bg-purple-500 text-white disabled:opacity-40 cursor-pointer font-semibold"
                  >
                    Langkah Berikutnya
                  </button>
                </div>
              </div>

              <div className="text-xs text-slate-300 font-mono mb-2">
                Aksi: <span className="text-amber-300 font-bold">{activeTrace.action}</span> (Baris {activeTrace.lineNumber})
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {Object.entries(activeTrace.variables).map(([k, v]) => (
                  <div key={k} className="p-2 rounded border border-slate-800 bg-slate-900 text-xs font-mono">
                    <div className="text-[10px] text-slate-500 uppercase">{k}</div>
                    <div className="text-emerald-400 font-bold truncate">{String(v)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Line by line breakdown list */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Bedah Detail Tiap Baris Kode:
            </h4>
            {report.breakdown.map((item, idx) => (
              <div
                key={idx}
                className={`p-3.5 rounded-xl border transition-all ${
                  isDark ? 'bg-slate-800/30 border-slate-800 hover:border-slate-700' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center justify-center font-mono text-[11px] font-bold">
                      {item.lineNumber}
                    </span>
                    <span className="text-xs font-bold text-slate-200">{item.concept}</span>
                  </div>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-slate-700 text-slate-300">
                    {item.category}
                  </span>
                </div>

                <div className="font-mono text-xs text-amber-300 bg-slate-950 p-2 rounded-lg border border-slate-800 my-2 overflow-x-auto">
                  {item.codeLine}
                </div>

                <div className="text-xs text-slate-400 leading-relaxed mb-1">
                  💡 <span className="text-slate-300 font-medium">Analogi:</span> {item.analogy}
                </div>
                <div className="text-xs text-slate-500 leading-relaxed">
                  📘 <span className="text-slate-400 font-medium">Penjelasan Teknis:</span> {item.explanation}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className={`px-6 py-3 border-t flex items-center justify-between text-xs text-slate-400 ${isDark ? 'border-slate-800 bg-slate-950/60' : 'border-slate-200 bg-slate-50'}`}>
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span>Memahami konsep lebih penting daripada menghafal baris sintaks</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
              isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-200' : 'bg-slate-200 hover:bg-slate-300 text-slate-800'
            }`}
          >
            Selesai Membaca
          </button>
        </div>
      </div>
    </div>
  );
};
