import React, { useState } from 'react';
import { Globe, FileText, ExternalLink, ChevronDown } from 'lucide-react';
import type { FileSourceReference } from '../../../shared/contracts/files';

interface GroundingSourcesBarProps {
  sources?: FileSourceReference[];
  accent?: 'teal' | 'indigo';
  onOpenSource?: (source: FileSourceReference) => void;
}

function extractDomain(url?: string, fallback?: string): string {
  if (!url) return fallback || 'Dokumen Lokal';
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, '');
  } catch {
    return fallback || 'Sumber Web';
  }
}

export const GroundingSourcesBar: React.FC<GroundingSourcesBarProps> = React.memo(({
  sources = [],
  accent = 'teal',
  onOpenSource
}) => {
  const [expanded, setExpanded] = useState(false);

  if (!sources || sources.length === 0) return null;

  const webCount = sources.filter(s => Boolean(s.url) || s.documentId?.startsWith('web_')).length;
  const docCount = sources.length - webCount;

  const accentColor = accent === 'indigo'
    ? 'text-indigo-600 dark:text-indigo-400'
    : 'text-teal-700 dark:text-teal-400';

  const handleSourceClick = (src: FileSourceReference) => {
    if (onOpenSource && !src.url) {
      onOpenSource(src);
      return;
    }
    if (src.url && typeof window !== 'undefined') {
      const anchor = document.createElement('a');
      anchor.href = src.url;
      anchor.target = '_blank';
      anchor.rel = 'noopener noreferrer';
      anchor.click();
    } else if (onOpenSource) {
      onOpenSource(src);
    }
  };

  return (
    <div className="not-prose mt-3 pt-2.5 border-t border-stone-200/60 dark:border-slate-800/75 space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setExpanded(prev => !prev)}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-stone-600 dark:text-slate-300 hover:text-stone-900 dark:hover:text-white transition-colors cursor-pointer"
        >
          {webCount > 0 ? (
            <Globe className={`w-3.5 h-3.5 ${accentColor}`} />
          ) : (
            <FileText className={`w-3.5 h-3.5 ${accentColor}`} />
          )}
          <span className="tabular-nums">
            Sumber & Sitasi ({sources.length})
          </span>
          {webCount > 0 && docCount > 0 && (
            <span className="text-[11px] text-stone-400 dark:text-slate-500 tabular-nums">
              · {webCount} Web · {docCount} Dokumen
            </span>
          )}
          <ChevronDown
            className={`w-3.5 h-3.5 text-stone-400 transition-transform duration-150 ${
              expanded ? 'rotate-180' : ''
            }`}
          />
        </button>

        {/* Compact horizontal clickable citation pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          {sources.slice(0, 4).map((src, idx) => {
            const isWeb = Boolean(src.url) || src.documentId?.startsWith('web_');
            const domainLabel = isWeb ? extractDomain(src.url, src.sourceRef) : src.filename;
            const badgeId = src.citationId ? src.citationId.replace('SRC_', '') : `${idx + 1}`;
            return (
              <button
                key={`${src.documentId || idx}_${badgeId}`}
                type="button"
                onClick={() => handleSourceClick(src)}
                title={`${src.filename}${src.snippet ? ` — ${src.snippet}` : ''}`}
                className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg border border-stone-200/80 dark:border-slate-800 bg-stone-50/90 dark:bg-slate-900/75 hover:border-stone-300 dark:hover:border-slate-700 text-[11px] text-stone-700 dark:text-slate-300 transition-colors cursor-pointer tabular-nums"
              >
                <span className={`font-mono text-[10px] font-semibold ${accentColor}`}>
                  [{badgeId}]
                </span>
                <span className="truncate max-w-[140px]">{domainLabel}</span>
                {isWeb && <ExternalLink className="w-2.5 h-2.5 text-stone-400 shrink-0" />}
              </button>
            );
          })}
        </div>
      </div>

      {expanded && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 animate-fade-in">
          {sources.map((src, idx) => {
            const isWeb = Boolean(src.url) || src.documentId?.startsWith('web_');
            const domainLabel = isWeb ? extractDomain(src.url, src.sourceRef) : (src.page ? `Halaman ${src.page}` : 'Dokumen Rujukan');
            const badgeId = src.citationId ? src.citationId.replace('SRC_', '') : `${idx + 1}`;

            return (
              <button
                key={`card_${src.documentId || idx}_${badgeId}`}
                type="button"
                onClick={() => handleSourceClick(src)}
                className="flex flex-col justify-between text-left p-2.5 rounded-xl border border-stone-200/80 dark:border-slate-800/90 bg-white/80 dark:bg-slate-900/60 hover:border-stone-300 dark:hover:border-slate-700 transition-colors cursor-pointer group"
              >
                <div className="space-y-1 min-w-0 w-full">
                  <div className="flex items-center justify-between gap-2 text-[10.5px] text-stone-400 dark:text-slate-500">
                    <span className="inline-flex items-center gap-1 min-w-0 truncate">
                      <span className={`font-mono font-semibold tabular-nums ${accentColor}`}>
                        [{badgeId}]
                      </span>
                      <span>·</span>
                      <span className="truncate font-medium text-stone-500 dark:text-slate-400">
                        {domainLabel}
                      </span>
                    </span>
                    {isWeb && (
                      <ExternalLink className="w-3 h-3 shrink-0 opacity-60 group-hover:opacity-100 transition-opacity" />
                    )}
                  </div>
                  <div className="text-xs font-semibold text-stone-800 dark:text-slate-200 line-clamp-1 group-hover:underline">
                    {src.filename}
                  </div>
                  {src.snippet && (
                    <p className="text-[11px] text-stone-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                      {src.snippet}
                    </p>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
});

GroundingSourcesBar.displayName = 'GroundingSourcesBar';
