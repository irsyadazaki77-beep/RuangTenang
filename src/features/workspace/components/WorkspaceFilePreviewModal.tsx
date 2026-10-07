import React, { useEffect, useState } from 'react';
import { Download, FileText, LoaderCircle, X } from 'lucide-react';
import { WorkspaceApiService, type WorkspaceAttachmentPreviewDto } from '../services/workspaceApiService';

interface Props { attachmentId: string; onClose: () => void }

export const WorkspaceFilePreviewModal: React.FC<Props> = ({ attachmentId, onClose }) => {
  const [preview, setPreview] = useState<WorkspaceAttachmentPreviewDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    void WorkspaceApiService.fetchAttachmentPreview(attachmentId, controller.signal).then(setPreview).catch(reason => {
      if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : 'Preview tidak tersedia.');
    });
    return () => controller.abort();
  }, [attachmentId]);

  return <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/60 p-3" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <section role="dialog" aria-modal="true" aria-labelledby="workspace-file-preview-title" className="flex max-h-[88dvh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
      <header className="flex items-center gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-700"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"><FileText className="h-4 w-4" /></span><div className="min-w-0 flex-1"><h2 id="workspace-file-preview-title" className="truncate text-sm font-semibold text-slate-900 dark:text-white">{preview?.filename || 'Preview file'}</h2><p className="text-[11px] text-slate-500">{preview ? `${preview.fileKind || preview.mimeType} · ${Math.ceil(preview.size / 1024)} KB · ${preview.chunkCount || 0} bagian` : 'Preview aman dari teks hasil ekstraksi'}</p></div>
        {preview && <a href={`/api/v1/chat/attachments/${encodeURIComponent(preview.id)}`} target="_blank" rel="noreferrer" className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"><Download className="h-3.5 w-3.5" />Buka file</a>}
        <button type="button" onClick={onClose} aria-label="Tutup preview" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="h-4 w-4" /></button>
      </header>
      <div className="min-h-0 flex-1 overflow-auto p-4">
        {!preview && !error && <div className="flex min-h-40 items-center justify-center gap-2 text-xs text-slate-500"><LoaderCircle className="h-4 w-4 animate-spin" />Memuat preview…</div>}
        {error && <p role="alert" className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">{error}</p>}
        {preview && <pre className="whitespace-pre-wrap break-words font-sans text-xs leading-6 text-slate-700 dark:text-slate-200">{preview.previewText || 'Tidak ada teks yang dapat ditampilkan untuk file ini.'}{preview.previewText.length >= 20_000 ? '\n\n— Preview dibatasi hingga 20.000 karakter —' : ''}</pre>}
      </div>
    </section>
  </div>;
};

