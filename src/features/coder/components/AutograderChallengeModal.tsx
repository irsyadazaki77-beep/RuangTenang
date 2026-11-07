import React, { useState } from 'react';
import {
  X,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  Award,
  Sparkles,
  Clock,
  ShieldCheck,
  ChevronRight,
  RefreshCw
} from 'lucide-react';
import { AutograderReport } from '../services/codeEdgeCaseTester';

interface AutograderChallengeModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: AutograderReport | null;
  isRunning?: boolean;
  onRerun: () => void;
  onApplyFixWithAI?: (feedback: string) => void;
  onAppendTestFile?: (testCode: string) => void;
  isDark?: boolean;
}

export const AutograderChallengeModal: React.FC<AutograderChallengeModalProps> = ({
  isOpen,
  onClose,
  report,
  isRunning = false,
  onRerun,
  onApplyFixWithAI,
  onAppendTestFile: _onAppendTestFile,
  isDark = true
}) => {
  const [activeTab, setActiveTab] = useState<'tests' | 'feedback' | 'code'>('tests');
  const [copied, setCopied] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'failed' | 'passed'>('all');

  if (!isOpen) return null;

  const handleCopyReport = () => {
    if (!report) return;
    const summary = `Hasil Ujian Autograder Ruang Coder:\nFungsi: ${report.functionName}\nSkor: ${report.score}/100\nLulus: ${report.passedTests}/${report.totalTests}\nFeedback: ${report.labFeedback}`;
    navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const filteredResults = (report?.results || []).filter(r => {
    if (selectedFilter === 'passed') return r.passed;
    if (selectedFilter === 'failed') return !r.passed;
    return true;
  });

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10';
    if (score >= 70) return 'text-amber-400 border-amber-500/40 bg-amber-500/10';
    return 'text-rose-400 border-rose-500/40 bg-rose-500/10';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className={`w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl shadow-2xl border overflow-hidden ${
          isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Header */}
        <div className={`px-6 py-4 border-b flex items-center justify-between ${isDark ? 'border-slate-800 bg-slate-950/60' : 'border-slate-200 bg-slate-50'}`}>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white shadow-md">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold">Lab Autograder & Edge-Case Challenge</h2>
                <span className="px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Ujian Otomatis
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Menguji ketangguhan fungsi terhadap kasus batas ekstrem, input null, dan beban komputasi.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onRerun}
              disabled={isRunning}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-200' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRunning ? 'animate-spin' : ''}`} />
              <span>{isRunning ? 'Menguji...' : 'Uji Ulang'}</span>
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

        {/* Score Banner */}
        {report && (
          <div className={`px-6 py-4 border-b flex flex-wrap items-center justify-between gap-4 ${isDark ? 'border-slate-800 bg-slate-900/80' : 'border-slate-200 bg-slate-50/50'}`}>
            <div className="flex items-center gap-4">
              <div className={`px-4 py-2 rounded-xl border flex flex-col items-center justify-center font-bold ${getScoreColor(report.score)}`}>
                <span className="text-2xl leading-none">{report.score}</span>
                <span className="text-[10px] uppercase tracking-wider opacity-80">Skor Lab</span>
              </div>
              <div>
                <div className="text-sm font-semibold flex items-center gap-2">
                  <span>Target Fungsi:</span>
                  <code className="px-2 py-0.5 rounded text-xs bg-slate-800/80 text-amber-300 font-mono">
                    {report.functionName}()
                  </code>
                </div>
                <div className="flex items-center gap-4 text-xs text-slate-400 mt-1">
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> {report.passedTests} Lulus
                  </span>
                  <span className="flex items-center gap-1">
                    <XCircle className="w-3.5 h-3.5 text-rose-400" /> {report.failedTests} Gagal
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-sky-400" /> {report.executionTimeMs} ms
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyReport}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                  isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                }`}
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Tersalin!' : 'Salin Laporan'}</span>
              </button>
              {report.failedTests > 0 && onApplyFixWithAI && (
                <button
                  type="button"
                  onClick={() => onApplyFixWithAI(report.labFeedback)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-md cursor-pointer transition-all"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Perbaiki via AI</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className={`px-6 border-b flex items-center justify-between ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
          <div className="flex items-center gap-6">
            <button
              type="button"
              onClick={() => setActiveTab('tests')}
              className={`py-3 text-xs font-semibold border-b-2 cursor-pointer transition-colors flex items-center gap-2 ${
                activeTab === 'tests'
                  ? 'border-amber-400 text-amber-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>Daftar Edge Cases ({report?.totalTests || 0})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('feedback')}
              className={`py-3 text-xs font-semibold border-b-2 cursor-pointer transition-colors flex items-center gap-2 ${
                activeTab === 'feedback'
                  ? 'border-amber-400 text-amber-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>Evaluasi Asisten Lab</span>
              {report && report.failedTests > 0 && (
                <span className="w-4 h-4 rounded-full text-[10px] bg-rose-500 text-white flex items-center justify-center font-bold">
                  {report.failedTests}
                </span>
              )}
            </button>
          </div>

          {activeTab === 'tests' && (
            <div className="flex items-center gap-1 py-2">
              <button
                type="button"
                onClick={() => setSelectedFilter('all')}
                className={`px-2 py-0.5 rounded text-[11px] cursor-pointer ${
                  selectedFilter === 'all'
                    ? isDark ? 'bg-slate-700 text-white' : 'bg-slate-200 text-slate-900 font-medium'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Semua
              </button>
              <button
                type="button"
                onClick={() => setSelectedFilter('failed')}
                className={`px-2 py-0.5 rounded text-[11px] cursor-pointer ${
                  selectedFilter === 'failed'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Gagal ({report?.failedTests || 0})
              </button>
              <button
                type="button"
                onClick={() => setSelectedFilter('passed')}
                className={`px-2 py-0.5 rounded text-[11px] cursor-pointer ${
                  selectedFilter === 'passed'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Lulus ({report?.passedTests || 0})
              </button>
            </div>
          )}
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto max-h-[50vh] space-y-4">
          {activeTab === 'tests' && (
            <div className="space-y-3">
              {filteredResults.map(test => (
                <div
                  key={test.testId}
                  className={`p-3.5 rounded-xl border transition-all ${
                    test.passed
                      ? isDark ? 'bg-slate-800/40 border-slate-800 hover:border-slate-700' : 'bg-slate-50 border-slate-200'
                      : isDark ? 'bg-rose-950/20 border-rose-900/40' : 'bg-rose-50 border-rose-200'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {test.passed ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      ) : (
                        <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                      )}
                      <span className="text-xs font-semibold">{test.name}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-700/50 text-slate-300">
                        {test.category}
                      </span>
                    </div>
                    <span className="text-[11px] font-mono text-slate-400">{test.durationMs}ms</span>
                  </div>

                  <p className="text-xs text-slate-400 mt-1.5 ml-6">{test.description}</p>

                  <div className="mt-2.5 ml-6 grid grid-cols-1 md:grid-cols-2 gap-2 text-xs font-mono">
                    <div className={`p-2 rounded border ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'}`}>
                      <div className="text-[10px] text-slate-500 font-sans uppercase">Input Argumen:</div>
                      <div className="truncate text-amber-300">{test.inputFormatted}</div>
                    </div>
                    <div className={`p-2 rounded border ${
                      test.passed
                        ? isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'
                        : isDark ? 'bg-rose-900/20 border-rose-900/40' : 'bg-rose-100 border-rose-300'
                    }`}>
                      <div className="text-[10px] text-slate-500 font-sans uppercase">Keluaran Aktual:</div>
                      <div className={`truncate ${test.passed ? 'text-emerald-400' : 'text-rose-400 font-semibold'}`}>
                        {test.actualOutputFormatted}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'feedback' && report && (
            <div className="space-y-4">
              <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-800/40 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                <div className="flex items-center gap-2 text-xs font-bold text-amber-400 mb-2">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Catatan Asisten Dosen Praktikum:</span>
                </div>
                <p className="text-xs leading-relaxed text-slate-300">{report.labFeedback}</p>
              </div>

              {report.suggestedFixes.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-slate-300">Langkah Perbaikan Disarankan:</h4>
                  <div className="space-y-1.5">
                    {report.suggestedFixes.map((fix, idx) => (
                      <div
                        key={idx}
                        className={`flex items-start gap-2 p-2.5 rounded-lg text-xs ${
                          isDark ? 'bg-slate-800/60 text-slate-300' : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        <ChevronRight className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                        <span>{fix}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`px-6 py-3 border-t flex items-center justify-between text-xs text-slate-400 ${isDark ? 'border-slate-800 bg-slate-950/60' : 'border-slate-200 bg-slate-50'}`}>
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Hasil evaluasi autograder dapat disertakan langsung ke Laporan Praktikum (.md)</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
              isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-200' : 'bg-slate-200 hover:bg-slate-300 text-slate-800'
            }`}
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
