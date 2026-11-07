import React, { useState } from 'react';
import { GitCompare, Check, RotateCcw, X } from 'lucide-react';

interface DiffReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  diff: {
    path: string;
    beforeContent: string;
    afterContent: string;
  } | null;
  onAccept: () => void;
  onRevert: () => void;
}

export const DiffReviewModal: React.FC<DiffReviewModalProps> = ({
  isOpen,
  onClose,
  diff,
  onAccept,
  onRevert
}) => {
  const [viewMode, setViewMode] = useState<'split' | 'unified'>('split');

  if (!isOpen || !diff) return null;

  const beforeLines = diff.beforeContent.split(/\r?\n/);
  const afterLines = diff.afterContent.split(/\r?\n/);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl max-w-4xl w-full overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/80 bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
              <GitCompare className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  Review Perubahan AI: <span className="font-mono text-sky-400">{diff.path}</span>
                </h2>
                <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30">
                  Diff Inspector
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Tinjau baris yang diubah sebelum menerima perubahan permanen.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg p-0.5 border border-slate-800 bg-slate-950 text-xs">
              <button
                type="button"
                onClick={() => setViewMode('split')}
                className={`px-2.5 py-1 rounded font-medium transition cursor-pointer ${
                  viewMode === 'split' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Split
              </button>
              <button
                type="button"
                onClick={() => setViewMode('unified')}
                className={`px-2.5 py-1 rounded font-medium transition cursor-pointer ${
                  viewMode === 'unified' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Unified
              </button>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Diff Canvas */}
        <div className="flex-1 overflow-y-auto p-4 font-mono text-xs select-text">
          {viewMode === 'split' ? (
            <div className="grid grid-cols-2 gap-3 h-full">
              {/* Before */}
              <div className="rounded-xl border border-rose-500/20 bg-rose-950/10 p-3 overflow-y-auto max-h-[50vh]">
                <div className="text-[11px] font-bold text-rose-400 mb-2 pb-1 border-b border-rose-500/20 flex items-center justify-between">
                  <span>- SEBELUM (ORIGINAL)</span>
                  <span className="text-slate-500">{beforeLines.length} baris</span>
                </div>
                <div className="space-y-0.5 leading-5 text-slate-300">
                  {beforeLines.map((line, idx) => (
                    <div key={idx} className="flex items-start gap-2 py-0.5 hover:bg-rose-500/10 px-1 rounded">
                      <span className="text-slate-600 text-[10px] w-6 shrink-0 text-right select-none">{idx + 1}</span>
                      <pre className="whitespace-pre-wrap break-all flex-1">{line || ' '}</pre>
                    </div>
                  ))}
                </div>
              </div>

              {/* After */}
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-950/10 p-3 overflow-y-auto max-h-[50vh]">
                <div className="text-[11px] font-bold text-emerald-400 mb-2 pb-1 border-b border-emerald-500/20 flex items-center justify-between">
                  <span>+ SESUDAH (PERUBAHAN AI)</span>
                  <span className="text-slate-500">{afterLines.length} baris</span>
                </div>
                <div className="space-y-0.5 leading-5 text-slate-200">
                  {afterLines.map((line, idx) => (
                    <div key={idx} className="flex items-start gap-2 py-0.5 hover:bg-emerald-500/10 px-1 rounded">
                      <span className="text-slate-600 text-[10px] w-6 shrink-0 text-right select-none">{idx + 1}</span>
                      <pre className="whitespace-pre-wrap break-all flex-1">{line || ' '}</pre>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-3 overflow-y-auto max-h-[50vh] space-y-1">
              <div className="text-[11px] font-bold text-slate-400 mb-2 pb-1 border-b border-slate-800">
                Tampilan Diff Unified:
              </div>
              {afterLines.map((line, idx) => {
                const isDifferent = beforeLines[idx] !== line;
                return (
                  <div
                    key={idx}
                    className={`flex items-start gap-2 px-1.5 py-0.5 rounded leading-5 ${
                      isDifferent ? 'bg-emerald-500/15 text-emerald-300 font-semibold' : 'text-slate-400'
                    }`}
                  >
                    <span className="text-slate-600 text-[10px] w-6 shrink-0 text-right select-none">{idx + 1}</span>
                    <span className="select-none text-slate-500 w-3">{isDifferent ? '+' : ' '}</span>
                    <pre className="whitespace-pre-wrap break-all flex-1">{line || ' '}</pre>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 px-6 border-t border-slate-800/80 bg-slate-950/40 flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              onRevert();
              onClose();
            }}
            className="px-4 py-2 text-xs font-bold rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 transition flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Tolak & Kembalikan (Revert)
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            >
              Tutup
            </button>
            <button
              type="button"
              onClick={() => {
                onAccept();
                onClose();
              }}
              className="px-5 py-2 text-xs font-bold rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 shadow-lg shadow-emerald-500/20 transition flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              Terima Perubahan (Accept)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
