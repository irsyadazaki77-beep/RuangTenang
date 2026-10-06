import React from 'react';
import { Terminal, X, CheckCircle2, AlertTriangle, XCircle, ShieldCheck, Square, Clock } from 'lucide-react';
import { CodeValidationResult, CodeExecutionStatus } from '../services/codeExecutionTypes';

interface CodeExecutionResultPanelProps {
  result: CodeValidationResult | null;
  status: CodeExecutionStatus;
  onClose: () => void;
  onStop?: () => void;
}

export const CodeExecutionResultPanel: React.FC<CodeExecutionResultPanelProps> = ({
  result,
  status,
  onClose,
  onStop
}) => {
  if (!result && status === 'idle') return null;

  const isRunning = status === 'running' || status === 'checking';
  const isStopped = status === 'stopped';
  const isTimeout = status === 'timeout';
  const isError = status === 'error' || (result?.stderr && result.stderr.length > 0);
  const isSandbox = result?.mode === 'sandbox';

  const getStatusBadge = () => {
    if (isRunning) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
          {status === 'running' ? 'Menjalankan...' : 'Memeriksa...'}
        </span>
      );
    }
    if (isTimeout) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
          <Clock className="w-3 h-3" />
          Batas Waktu Terlampaui
        </span>
      );
    }
    if (isStopped) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-slate-500/10 text-slate-400 border border-slate-500/20">
          <Square className="w-2.5 h-2.5" />
          Dihentikan
        </span>
      );
    }
    if (isError) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
          <XCircle className="w-3 h-3" />
          Kesalahan
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
        <CheckCircle2 className="w-3 h-3" />
        Selesai
      </span>
    );
  };

  return (
    <div
      role="region"
      aria-label="Panel Hasil Pemeriksaan Kode"
      className="rounded-2xl overflow-hidden border border-slate-800 bg-[#0b0f19] text-slate-200 shadow-md animate-slide-up mt-4"
    >
      {/* Header bar */}
      <div className="px-4 py-2.5 bg-[#111624] border-b border-slate-800 flex items-center justify-between text-xs font-mono">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 text-slate-300">
            {isSandbox ? (
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Terminal className="w-3.5 h-3.5 text-sky-400" />
            )}
            <span className="font-semibold capitalize">
              {result?.language || 'Code'}
            </span>
            <span className="text-slate-500">•</span>
            <span className="text-slate-400">
              {isSandbox ? 'Sandbox Lokal' : 'Pemeriksaan Statis'}
            </span>
          </div>

          {getStatusBadge()}

          {result?.durationMs !== undefined && (
            <span className="text-slate-500 text-[11px]">
              ({result.durationMs} ms)
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {isRunning && onStop && (
            <button
              type="button"
              onClick={onStop}
              aria-label="Hentikan eksekusi kode"
              className="flex items-center gap-1 px-2 py-0.5 rounded bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-800 text-[11px] font-semibold cursor-pointer transition-colors"
            >
              <Square className="w-2.5 h-2.5 fill-current" />
              <span>Hentikan</span>
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup panel hasil"
            className="p-1 hover:text-slate-200 text-slate-500 rounded-lg hover:bg-slate-800 cursor-pointer transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Content body */}
      <div
        aria-live="polite"
        className="p-4 font-mono text-xs leading-relaxed max-h-64 overflow-y-auto space-y-3 custom-scrollbar"
      >
        {/* Pesan status utama */}
        {result?.message && (
          <div className={`p-2.5 rounded-lg border text-xs ${
            isError 
              ? 'bg-rose-950/20 border-rose-900/50 text-rose-300' 
              : 'bg-slate-900/50 border-slate-800 text-slate-300'
          }`}>
            {result.message}
          </div>
        )}

        {/* Warnings list */}
        {result?.warnings && result.warnings.length > 0 && (
          <div className="p-2.5 rounded-lg bg-amber-950/20 border border-amber-900/40 text-amber-300 text-xs space-y-1">
            <div className="flex items-center gap-1.5 font-semibold mb-1 text-amber-200">
              <AlertTriangle className="w-3 h-3 text-amber-400" />
              <span>Catatan / Peringatan:</span>
            </div>
            {result.warnings.map((w, idx) => (
              <div key={idx} className="pl-4 relative before:content-['•'] before:absolute before:left-1">
                {w}
              </div>
            ))}
          </div>
        )}

        {/* Stderr / Errors */}
        {result?.stderr && result.stderr.length > 0 && (
          <div className="p-2.5 rounded-lg bg-rose-950/30 border border-rose-800/60 text-rose-300 text-xs space-y-1">
            <div className="font-semibold text-rose-200 mb-1 flex items-center gap-1.5">
              <XCircle className="w-3 h-3 text-rose-400" />
              <span>Detail Kesalahan:</span>
            </div>
            {result.stderr.map((err, idx) => (
              <div key={idx} className="whitespace-pre-wrap text-rose-200">
                {err}
              </div>
            ))}
          </div>
        )}

        {/* Stdout */}
        {result?.stdout && result.stdout.length > 0 && (
          <div className="space-y-1">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Output:
            </div>
            <div className="bg-[#050811] p-3 rounded-lg border border-slate-800/80 text-emerald-300 font-mono text-xs whitespace-pre-wrap">
              {result.stdout.join('\n')}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
