import React, { useState } from 'react';
import { AlertCircle, CheckCircle2, FileCode, FileSpreadsheet, FileText, Image as ImageIcon, Loader2, Presentation, RotateCw, X } from 'lucide-react';
import { WorkspaceFileAttachment } from '../types';
import { isWorkspaceAttachmentAnalyzable } from '../utils/workspaceAttachments';

interface WorkspaceAttachmentListProps {
  attachments: WorkspaceFileAttachment[];
  disabled?: boolean;
  onRemove: (attachment: WorkspaceFileAttachment) => void;
  onRetry: (attachment: WorkspaceFileAttachment) => void;
  onRecheck?: (attachment: WorkspaceFileAttachment) => void;
  onSynthesizeMatrix?: () => void;
}

function getFileIcon(attachment: WorkspaceFileAttachment) {
  if (attachment.fileKind === 'xlsx' || attachment.fileKind === 'csv') {
    return (
      <div className="h-7 w-7 rounded-lg bg-emerald-100/70 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 flex items-center justify-center shrink-0">
        <FileSpreadsheet className="h-4 w-4" />
      </div>
    );
  }
  if (attachment.fileKind === 'pptx') {
    return (
      <div className="h-7 w-7 rounded-lg bg-amber-100/70 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400 flex items-center justify-center shrink-0">
        <Presentation className="h-4 w-4" />
      </div>
    );
  }
  if (attachment.fileKind === 'code' || attachment.fileKind === 'json') {
    return (
      <div className="h-7 w-7 rounded-lg bg-indigo-100/70 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400 flex items-center justify-center shrink-0">
        <FileCode className="h-4 w-4" />
      </div>
    );
  }
  if (attachment.fileKind === 'image') {
    return (
      <div className="h-7 w-7 rounded-lg bg-purple-100/70 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400 flex items-center justify-center shrink-0">
        <ImageIcon className="h-4 w-4" />
      </div>
    );
  }
  return (
    <div className="h-7 w-7 rounded-lg bg-rose-100/70 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400 flex items-center justify-center shrink-0">
      <FileText className="h-4 w-4" />
    </div>
  );
}

export const WorkspaceAttachmentList: React.FC<WorkspaceAttachmentListProps> = React.memo(({ attachments, disabled, onRemove, onRetry, onRecheck, onSynthesizeMatrix }) => {
  const [openWarningId, setOpenWarningId] = useState<string | null>(null);
  if (!attachments.length) return null;

  return (
    <ul aria-label="Dokumen aktif Workspace" aria-live="polite" className="mb-2 flex max-h-28 flex-wrap gap-1.5 overflow-y-auto">
      {attachments.length >= 2 && onSynthesizeMatrix && (
        <li className="w-full flex items-center justify-between rounded-xl border border-teal-200/80 bg-gradient-to-r from-teal-50 to-emerald-50/70 dark:border-teal-900/50 dark:from-teal-950/40 dark:to-emerald-950/30 px-3 py-1.5 text-xs text-teal-900 dark:text-teal-200 shadow-2xs">
          <div className="flex items-center gap-1.5 font-medium truncate pr-2">
            <span className="text-sm">📊</span>
            <span className="truncate">{attachments.length} Dokumen Jurnal Terlampir</span>
          </div>
          <button
            type="button"
            disabled={disabled}
            onClick={onSynthesizeMatrix}
            className="shrink-0 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-medium text-[11px] px-2.5 py-1 shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
            title="Sintesis komparatif Bab 2 Skripsi dengan Gemini Context Caching"
          >
            Sintesis Matriks (Bab 2)
          </button>
        </li>
      )}
      {attachments.map(attachment => {
        const key = attachment.clientId || attachment.id || `${attachment.name}:${attachment.size}`;
        const analyzable = isWorkspaceAttachmentAnalyzable(attachment);
        const partialExtraction = Boolean(attachment.extractionWarnings?.length);
        const fileType = attachment.name.split('.').pop()?.toUpperCase() || attachment.fileKind?.toUpperCase() || 'FILE';
        const formattedSize = attachment.size ? `${Math.max(1, Math.round(attachment.size / 1024))} KB` : '';

        return (
          <li
            key={key}
            className="group/attach relative flex items-center gap-2 rounded-lg border border-slate-200/80 bg-slate-50 py-1 pl-1.5 pr-2 text-xs text-slate-800 transition-all hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
          >
            {getFileIcon(attachment)}

            <div className="min-w-0 pr-1">
              <div className="max-w-[150px] sm:max-w-[200px] truncate font-medium text-xs leading-tight" title={attachment.name}>
                {attachment.name}
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-0.5">
                <span>{fileType}</span>
                {formattedSize && <span>· {formattedSize}</span>}
                {attachment.status === 'ready' && (
                  <span className="inline-flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400 font-medium">
                    <CheckCircle2 className="h-2.5 w-2.5" />
                    {analyzable && partialExtraction ? 'Sebagian' : 'Siap'}
                  </span>
                )}
                {attachment.status === 'uploading' && (
                  <span className="inline-flex items-center gap-0.5 text-amber-600 dark:text-amber-400">
                    <Loader2 className="h-2.5 w-2.5 animate-spin" />
                    Mengunggah
                  </span>
                )}
                {attachment.status === 'processing' && (
                  <span className="inline-flex items-center gap-0.5 text-indigo-600 dark:text-indigo-400">
                    <Loader2 className="h-2.5 w-2.5 animate-spin" />
                    Memproses…
                  </span>
                )}
                {attachment.status === 'failed' && (
                  <span className="inline-flex items-center gap-0.5 text-rose-600 dark:text-rose-400 font-medium">
                    <AlertCircle className="h-2.5 w-2.5" />
                    Gagal
                  </span>
                )}
              </div>
            </div>

            {attachment.ocrApplied && (
              <span title="OCR visual diterapkan" className="rounded-md bg-indigo-100/70 px-1.5 py-0.5 text-[9px] font-semibold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                OCR
              </span>
            )}

            {partialExtraction && attachment.extractionWarnings && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setOpenWarningId(prev => prev === key ? null : key)}
                  className="rounded-md bg-amber-100/80 hover:bg-amber-200/80 px-1.5 py-0.5 text-[9px] font-semibold text-amber-800 dark:bg-amber-950/60 dark:hover:bg-amber-900/60 dark:text-amber-300 cursor-pointer"
                >
                  Lihat {attachment.extractionWarnings.length} peringatan
                </button>
                {openWarningId === key && (
                  <div className="absolute bottom-full left-0 mb-1 z-30 w-64 p-2 bg-white dark:bg-slate-900 rounded-lg shadow-lg border border-amber-200 dark:border-amber-900/60 text-[10px] text-amber-900 dark:text-amber-200">
                    {attachment.extractionWarnings.map((warn, i) => (
                      <div key={i}>{warn}</div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {attachment.status === 'failed' && (
              <button
                type="button"
                disabled={disabled}
                onClick={() => onRetry(attachment)}
                className="h-6 w-6 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-200 dark:hover:bg-white/10 cursor-pointer"
                aria-label={`Coba lagi ${attachment.name}`}
                title="Coba lagi"
              >
                <RotateCw className="h-3 w-3" />
              </button>
            )}

            {attachment.status === 'processing' && attachment.id && attachment.errorMessage && (
              <button
                type="button"
                disabled={disabled}
                onClick={() => onRecheck?.(attachment)}
                className="rounded-md px-1.5 py-0.5 text-[10px] font-medium text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 cursor-pointer"
                title={attachment.errorMessage}
              >
                Cek
              </button>
            )}

            <button
              type="button"
              disabled={disabled}
              onClick={() => onRemove(attachment)}
              className="h-6 w-6 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-white/15 dark:hover:text-slate-100 transition-colors cursor-pointer disabled:opacity-40"
              aria-label={`Hapus ${attachment.name}`}
              title="Hapus berkas"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </li>
        );
      })}
    </ul>
  );
});
