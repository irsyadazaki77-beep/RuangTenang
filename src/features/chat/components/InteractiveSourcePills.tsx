import React, { useState } from 'react';
import { Copy, Check, ExternalLink, FileText } from 'lucide-react';
import type { FileSourceReference } from '../../../../shared/contracts/files';

interface Props {
  sources: FileSourceReference[];
}

export const InteractiveSourcePills: React.FC<Props> = React.memo(({ sources }) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (!sources || sources.length === 0) return null;

  const activeSource = sources.find(s => (s.citationId || s.sourceRef) === selectedId) || null;

  const handleCopyCitation = async (src: FileSourceReference) => {
    const key = src.citationId || src.sourceRef;
    const formatted = `${src.filename}${src.page ? `, hlm. ${src.page}` : ''}${src.section ? ` (${src.section})` : ''}${src.snippet ? ` — "${src.snippet}"` : ''}`;
    try {
      await navigator.clipboard.writeText(formatted);
      setCopiedId(key);
      setTimeout(() => setCopiedId(null), 1800);
    } catch {
      setCopiedId(null);
    }
  };

  return (
    <div className="not-prose mt-3 pt-2.5 border-t border-slate-100 dark:border-white/5 space-y-2 text-xs">
      <div className="font-semibold text-[11px] uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1">
        <span>Sumber & Bukti Terverifikasi</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {sources.map(src => {
          const key = src.citationId || src.sourceRef;
          const isSelected = selectedId === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setSelectedId(prev => (prev === key ? null : key))}
              aria-expanded={isSelected}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-[11px] shadow-2xs transition-colors cursor-pointer ${
                isSelected
                  ? 'bg-teal-50 dark:bg-teal-950/60 border-teal-400 dark:border-teal-600 text-teal-900 dark:text-teal-200'
                  : 'bg-slate-50 dark:bg-white/5 border-slate-200/70 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-white/20'
              }`}
              title={src.snippet || src.sourceRef}
            >
              <span className="font-mono text-[10px] font-bold text-teal-600 dark:text-teal-400">
                {src.citationId || 'REF'}
              </span>
              <span className="truncate max-w-[180px] font-medium">
                {src.filename}
                {src.page ? ` [Hal. ${src.page}]` : ''}
              </span>
              {src.isVisualExtraction && (
                <span className="px-1 py-0.2 rounded bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 text-[9.5px] font-medium border border-teal-200/50 dark:border-teal-800/50">
                  OCR
                </span>
              )}
            </button>
          );
        })}
      </div>

      {activeSource && (
        <div
          role="region"
          aria-label="Detail kutipan sumber"
          className="rounded-xl border border-teal-200/80 dark:border-teal-800/60 bg-teal-50/40 dark:bg-teal-950/30 p-3 space-y-2 animate-fade-in"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <FileText className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
              <span className="font-semibold text-slate-800 dark:text-slate-100 truncate">
                {activeSource.filename}
              </span>
              {activeSource.page && (
                <span className="text-[11px] text-slate-500 dark:text-slate-400 shrink-0">
                  • Hal. {activeSource.page}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {activeSource.url && (
                <a
                  href={activeSource.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] text-teal-700 dark:text-teal-300 hover:underline"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>Buka</span>
                </a>
              )}
              <button
                type="button"
                onClick={() => handleCopyCitation(activeSource)}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
              >
                {copiedId === (activeSource.citationId || activeSource.sourceRef) ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-500" />
                    <span>Tersalin</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Salin Kutipan</span>
                  </>
                )}
              </button>
            </div>
          </div>
          {activeSource.snippet && (
            <blockquote className="border-l-2 border-teal-500/70 pl-2.5 italic text-[11.5px] text-slate-600 dark:text-slate-300 leading-relaxed">
              &ldquo;{activeSource.snippet}&rdquo;
            </blockquote>
          )}
        </div>
      )}
    </div>
  );
});

InteractiveSourcePills.displayName = 'InteractiveSourcePills';

