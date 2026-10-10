import React from 'react';
import { ArrowUpRight, FileText, X } from 'lucide-react';
import type { FileSourceReference } from '../../../../shared/contracts/files';

interface Props {
  source: FileSourceReference;
  onOpenDocument: (documentId: string) => void;
  onClose: () => void;
}

export const WorkspaceSourcePreview: React.FC<Props> = ({ source, onOpenDocument, onClose }) => (
  <section aria-label="Bukti sumber terpilih" className="mb-3 rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 dark:border-emerald-900/70 dark:bg-emerald-950/20">
    <div className="flex items-start gap-2">
      <FileText className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700 dark:text-emerald-300" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <h3 tabIndex={-1} data-workspace-source-preview className="truncate text-xs font-semibold text-slate-900 outline-none dark:text-slate-100">{source.filename}</h3>
        <p className="mt-1 text-[10px] text-slate-600 dark:text-slate-300">Lokasi yang tersedia: {source.sourceRef}</p>
      </div>
      <button type="button" onClick={onClose} aria-label="Tutup pratinjau sumber" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-500 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:hover:bg-slate-900"><X className="h-4 w-4" aria-hidden="true" /></button>
    </div>
    {source.snippet ? <blockquote className="mt-2 border-l-2 border-emerald-400 pl-2.5 text-xs leading-5 text-slate-700 dark:text-slate-200">{source.snippet}</blockquote> : <p className="mt-2 text-[11px] text-slate-500">Cuplikan tidak tersedia untuk kutipan ini. Buka dokumen untuk meninjaunya.</p>}
    <button type="button" onClick={() => onOpenDocument(source.documentId)} className="mt-2 inline-flex min-h-8 items-center gap-1 rounded-md px-2 text-[11px] font-semibold text-emerald-800 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:text-emerald-200 dark:hover:bg-slate-900">Buka dokumen <ArrowUpRight className="h-3 w-3" aria-hidden="true" /></button>
  </section>
);
