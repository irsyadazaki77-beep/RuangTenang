import React from 'react';
import { AlertCircle, CheckCircle2, FileCode, FileSpreadsheet, FileText, Image as ImageIcon, Loader2, Presentation, RotateCw, ScanText, X } from 'lucide-react';
import { WorkspaceFileAttachment } from '../types';

interface WorkspaceAttachmentListProps {
  attachments: WorkspaceFileAttachment[];
  disabled?: boolean;
  onRemove: (attachment: WorkspaceFileAttachment) => void;
  onRetry: (attachment: WorkspaceFileAttachment) => void;
  onRecheck: (attachment: WorkspaceFileAttachment) => void;
}

function getFileIcon(attachment: WorkspaceFileAttachment) {
  if (attachment.fileKind === 'xlsx' || attachment.fileKind === 'csv') return <FileSpreadsheet className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />;
  if (attachment.fileKind === 'pptx') return <Presentation className="h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400" />;
  if (attachment.fileKind === 'code' || attachment.fileKind === 'json') return <FileCode className="h-3.5 w-3.5 shrink-0 text-indigo-600 dark:text-indigo-400" />;
  if (attachment.fileKind === 'image') return <ImageIcon className="h-3.5 w-3.5 shrink-0 text-purple-600 dark:text-purple-400" />;
  return <FileText className="h-3.5 w-3.5 shrink-0 text-rose-600 dark:text-rose-400" />;
}

export const WorkspaceAttachmentList: React.FC<WorkspaceAttachmentListProps> = React.memo(({ attachments, disabled, onRemove, onRetry, onRecheck }) => {
  if (!attachments.length) return null;
  return (
    <ul aria-label="Dokumen aktif Workspace" aria-live="polite" className="mb-2 flex max-h-20 flex-wrap gap-1.5 overflow-y-auto">
      {attachments.map(attachment => {
        const key = attachment.clientId || attachment.id || `${attachment.name}:${attachment.size}`;
        const status = attachment.status === 'ready'
          ? <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400"><CheckCircle2 className="h-3 w-3" />Siap</span>
          : attachment.status === 'uploading'
            ? <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400"><Loader2 className="h-3 w-3 animate-spin" />Unggah</span>
            : attachment.status === 'processing'
              ? <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400"><Loader2 className="h-3 w-3 animate-spin" />Memproses…</span>
              : attachment.status === 'unsupported'
                ? <span title={attachment.errorMessage || 'Format dokumen tidak didukung.'} className="flex items-center gap-1 text-rose-600 dark:text-rose-400"><AlertCircle className="h-3 w-3" />Format tidak didukung</span>
                : <span title={attachment.errorMessage || 'Dokumen gagal diproses'} className="flex items-center gap-1 text-rose-600 dark:text-rose-400"><AlertCircle className="h-3 w-3" />Gagal</span>;
        const fileType = attachment.name.split('.').pop()?.toUpperCase() || attachment.fileKind?.toUpperCase() || 'FILE';
        return (
          <li key={key} className="flex h-8 max-w-full items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-100 px-2 text-[11px] text-slate-800 dark:border-slate-700 dark:bg-slate-800/90 dark:text-slate-200">
            {getFileIcon(attachment)}
            <span className="max-w-[min(10rem,40vw)] truncate font-medium" title={attachment.name}>{attachment.name}</span>
            <span className="shrink-0 text-[9px] text-slate-500 dark:text-slate-400" title={attachment.mimeType}>{fileType}</span>
            <span className="shrink-0 text-slate-400">{attachment.size ? `${Math.max(1, Math.round(attachment.size / 1024))} KB` : ''}</span>
            <span className="shrink-0">{status}</span>
            {attachment.ocrApplied ? (
              <span title={attachment.readingUncertainty || `Teks diekstraksi dengan OCR Visual${attachment.ocrConfidence ? ` (${Math.round(attachment.ocrConfidence * 100)}%)` : ''}`} className="flex shrink-0 items-center gap-0.5 rounded bg-indigo-50 px-1.5 py-0.5 text-[9.5px] font-semibold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                <ScanText className="h-2.5 w-2.5" />OCR
              </span>
            ) : attachment.previewOnly && attachment.visualAnalysisAvailable ? (
              <span title="Berkas pindaian/gambar siap untuk pratinjau & analisis visual multimodal" className="flex shrink-0 items-center gap-0.5 rounded bg-purple-50 px-1.5 py-0.5 text-[9.5px] font-semibold text-purple-700 dark:bg-purple-950/60 dark:text-purple-300">
                <ScanText className="h-2.5 w-2.5" />Visual
              </span>
            ) : attachment.previewOnly ? (
              <span title="Ekstraksi visual tidak tersedia pada konfigurasi saat ini" className="flex shrink-0 items-center gap-0.5 rounded bg-slate-200 px-1.5 py-0.5 text-[9.5px] font-semibold text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                Pratinjau saja
              </span>
            ) : null}
            {attachment.extractionWarnings?.length ? <span title={attachment.extractionWarnings.join('\n')} className="flex shrink-0 items-center gap-1 text-amber-700 dark:text-amber-300"><AlertCircle className="h-3 w-3" />Ekstraksi parsial</span> : null}
            {attachment.status === 'failed' && <button type="button" disabled={disabled} onClick={() => onRetry(attachment)} className="rounded p-0.5 text-slate-500 hover:bg-slate-200 disabled:opacity-40 dark:hover:bg-slate-700" aria-label={`Coba lagi ${attachment.name}`} title="Coba lagi"><RotateCw className="h-3 w-3" /></button>}
            {attachment.status === 'processing' && attachment.id && attachment.errorMessage && <button type="button" disabled={disabled} onClick={() => onRecheck(attachment)} className="shrink-0 rounded px-1.5 py-0.5 text-[9.5px] font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-40 dark:text-blue-300 dark:hover:bg-blue-950/60" aria-label={`Periksa lagi status ${attachment.name}`} title={attachment.errorMessage}>Periksa lagi</button>}
            <button type="button" disabled={disabled} onClick={() => onRemove(attachment)} className="rounded p-0.5 text-slate-500 hover:bg-slate-200 hover:text-rose-600 disabled:opacity-40 dark:hover:bg-slate-700" aria-label={`Hapus ${attachment.name}`} title="Hapus dokumen"><X className="h-3.5 w-3.5" /></button>
          </li>
        );
      })}
    </ul>
  );
});
