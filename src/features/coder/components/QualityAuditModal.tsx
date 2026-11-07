import React from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  XCircle,
  CheckCircle2,
  Sparkles,
  RefreshCw,
  X
} from 'lucide-react';
import { QualityAuditReport } from '../services/codeQualityAuditor';

interface QualityAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: QualityAuditReport | null;
  onReaudit: () => void;
  onFixWithAI?: () => void;
}

export const QualityAuditModal: React.FC<QualityAuditModalProps> = ({
  isOpen,
  onClose,
  report,
  onReaudit,
  onFixWithAI
}) => {
  if (!isOpen || !report) return null;

  const getStatusColor = (st: QualityAuditReport['overallStatus']) => {
    switch (st) {
      case 'passed':
        return 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10';
      case 'warning':
        return 'text-amber-400 border-amber-500/30 bg-amber-500/10';
      case 'error':
        return 'text-rose-400 border-rose-500/30 bg-rose-500/10';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/80 bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Inspeksi Kualitas Pak Bambang
                <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  QA & SecOps
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Pemeriksaan sanitasi kode, keutuhan tag, dan keamanan script.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Score & Summary */}
        <div className="p-6 border-b border-slate-800/60 flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-400">Skor Kesehatan Kode:</div>
            <div className="text-3xl font-extrabold text-white mt-1 flex items-baseline gap-1">
              <span>{report.score}</span>
              <span className="text-sm font-normal text-slate-500">/ 100</span>
            </div>
          </div>
          <div
            className={`px-3 py-1.5 rounded-xl border font-bold text-xs flex items-center gap-2 ${getStatusColor(
              report.overallStatus
            )}`}
          >
            {report.overallStatus === 'passed' && <CheckCircle2 className="w-4 h-4" />}
            {report.overallStatus === 'warning' && <AlertTriangle className="w-4 h-4" />}
            {report.overallStatus === 'error' && <XCircle className="w-4 h-4" />}
            <span>
              {report.overallStatus === 'passed'
                ? 'SIAP BUILD'
                : report.overallStatus === 'warning'
                ? 'PERLU PERHATIAN'
                : 'BERISIKO'}
            </span>
          </div>
        </div>

        {/* Checks List */}
        <div className="p-6 space-y-3 max-h-72 overflow-y-auto">
          {report.checks.map(chk => (
            <div
              key={chk.id}
              className="p-3 rounded-xl border border-slate-800/80 bg-slate-950/40 space-y-1"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-200">{chk.title}</span>
                {chk.status === 'passed' && (
                  <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Lolos
                  </span>
                )}
                {chk.status === 'warning' && (
                  <span className="text-[10px] text-amber-400 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> Warning
                  </span>
                )}
                {chk.status === 'error' && (
                  <span className="text-[10px] text-rose-400 flex items-center gap-1">
                    <XCircle className="w-3 h-3" /> Error
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">{chk.detail}</p>
            </div>
          ))}
        </div>

        {/* Recommendation Box */}
        {report.recommendation && (
          <div className="px-6 py-2">
            <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/60 text-xs text-slate-300">
              <span className="font-semibold text-white">Catatan Pak Bambang: </span>
              {report.recommendation}
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="p-6 border-t border-slate-800/80 bg-slate-950/40 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onReaudit}
            className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Audit Ulang
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              Tutup
            </button>
            {report.overallStatus !== 'passed' && onFixWithAI && (
              <button
                type="button"
                onClick={() => {
                  onFixWithAI();
                  onClose();
                }}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 shadow-lg shadow-emerald-500/20 transition flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Minta Ki Hadjar Perbaiki
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
