import React, { useState, useEffect } from 'react';
import { ChevronRight, Check, Loader2, Globe, Sparkles, Brain, Layers, FileCheck2 } from 'lucide-react';
import { ReasoningStep } from '../../features/chat/types';

interface ThinkingReasoningDrawerProps {
  steps?: ReasoningStep[];
  durationMs?: number;
  thinkingDepth?: 'auto' | 'fast' | 'deep';
  webSearchUsed?: boolean;
  searchQuery?: string;
  isStreaming?: boolean;
  accent?: 'teal' | 'indigo';
}

export const ThinkingReasoningDrawer: React.FC<ThinkingReasoningDrawerProps> = React.memo(({
  steps = [],
  durationMs,
  thinkingDepth = 'auto',
  webSearchUsed = false,
  searchQuery,
  isStreaming = false,
  accent = 'teal'
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [liveElapsedMs, setLiveElapsedMs] = useState<number>(durationMs || 400);

  useEffect(() => {
    if (typeof durationMs === 'number' && durationMs > 0) {
      setLiveElapsedMs(durationMs);
    }
  }, [durationMs]);

  useEffect(() => {
    if (!isStreaming) return;
    const start = Date.now() - liveElapsedMs;
    const interval = setInterval(() => {
      setLiveElapsedMs(Date.now() - start);
    }, 100);
    return () => clearInterval(interval);
  }, [isStreaming]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!steps.length && !isStreaming && !webSearchUsed) {
    return null;
  }

  const effectiveSteps: ReasoningStep[] = steps.length > 0
    ? steps
    : [
        {
          id: 'default_context',
          label: 'Menganalisis konteks & merumuskan penalaran terstruktur',
          status: isStreaming ? 'running' : 'completed',
          category: 'reasoning'
        }
      ];

  const secondsFormatted = Math.max(0.2, liveElapsedMs / 1000).toFixed(1);
  const accentText = accent === 'indigo'
    ? 'text-indigo-600 dark:text-indigo-400'
    : 'text-teal-700 dark:text-teal-400';

  const getStepIcon = (step: ReasoningStep) => {
    if (step.status === 'running') {
      return <Loader2 className={`w-3.5 h-3.5 animate-spin shrink-0 ${accentText}`} />;
    }
    if (step.category === 'search') {
      return <Globe className={`w-3.5 h-3.5 shrink-0 ${accentText}`} />;
    }
    if (step.category === 'memory') {
      return <Layers className={`w-3.5 h-3.5 shrink-0 ${accentText}`} />;
    }
    if (step.category === 'synthesis') {
      return <FileCheck2 className={`w-3.5 h-3.5 shrink-0 ${accentText}`} />;
    }
    return <Check className={`w-3.5 h-3.5 shrink-0 ${accentText}`} />;
  };

  return (
    <div className="not-prose my-1.5 select-none">
      <button
        type="button"
        onClick={() => setIsExpanded(prev => !prev)}
        aria-expanded={isExpanded}
        className="group inline-flex items-center gap-1.5 py-1 px-2 -ml-2 rounded-lg text-xs text-stone-500 hover:text-stone-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-stone-100/70 dark:hover:bg-slate-800/60 transition-colors cursor-pointer"
      >
        <Brain className={`w-3.5 h-3.5 shrink-0 ${isStreaming ? 'animate-pulse ' + accentText : 'text-stone-400 dark:text-slate-500 group-hover:' + accentText}`} />
        <span className="font-medium">
          {isStreaming
            ? thinkingDepth === 'deep'
              ? 'Berpikir mendalam...'
              : 'Memproses penalaran...'
            : thinkingDepth === 'deep'
              ? 'Penalaran mendalam selesai'
              : 'Proses berpikir'}
        </span>
        <span aria-hidden="true" className="text-stone-300 dark:text-slate-700">·</span>
        <span className="font-mono text-[11px] tabular-nums text-stone-400 dark:text-slate-500">
          {secondsFormatted} dtk
        </span>
        {webSearchUsed && (
          <>
            <span aria-hidden="true" className="text-stone-300 dark:text-slate-700">·</span>
            <span className={`inline-flex items-center gap-1 text-[11px] font-medium ${accentText}`}>
              <Globe className="w-3 h-3" />
              <span>Web</span>
            </span>
          </>
        )}
        <ChevronRight
          className={`w-3.5 h-3.5 text-stone-400 transition-transform duration-150 ${
            isExpanded ? 'rotate-90' : ''
          }`}
        />
      </button>

      {isExpanded && (
        <div className="mt-1.5 rounded-xl border border-stone-200/75 dark:border-slate-800/85 bg-stone-50/60 dark:bg-slate-900/45 px-3.5 py-2.5 space-y-2 text-xs animate-fade-in">
          <div className="flex items-center justify-between text-[11px] text-stone-400 dark:text-slate-500 pb-1.5 border-b border-stone-200/50 dark:border-slate-800/60">
            <span className="inline-flex items-center gap-1.5 font-medium text-stone-600 dark:text-slate-300">
              <Sparkles className="w-3 h-3" />
              <span>Alur Penalaran & Konteks ({effectiveSteps.length} tahap)</span>
            </span>
            <span className="font-mono tabular-nums">
              {thinkingDepth === 'deep' ? 'Mode Mendalam' : 'Mode Adaptif'} · {secondsFormatted}s
            </span>
          </div>

          <ol className="space-y-2">
            {effectiveSteps.map((step, idx) => (
              <li key={step.id || idx} className="flex items-start gap-2.5 leading-snug">
                <div className="mt-0.5 shrink-0">{getStepIcon(step)}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-stone-700 dark:text-slate-200">
                      {step.label}
                    </span>
                    {typeof step.timestampMs === 'number' && (
                      <span className="font-mono text-[10px] tabular-nums text-stone-400 dark:text-slate-500 shrink-0">
                        +{(step.timestampMs / 1000).toFixed(2)}s
                      </span>
                    )}
                  </div>
                  {step.detail && (
                    <p className="text-[11px] text-stone-500 dark:text-slate-400 mt-0.5 truncate">
                      {step.detail}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ol>

          {searchQuery && (
            <div className="pt-1.5 border-t border-stone-200/50 dark:border-slate-800/60 flex items-center gap-1.5 text-[11px] text-stone-500 dark:text-slate-400">
              <Globe className="w-3 h-3 shrink-0" />
              <span className="truncate">
                Penelusuran aktif: <strong className="font-medium text-stone-700 dark:text-slate-300">“{searchQuery}”</strong>
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
});

ThinkingReasoningDrawer.displayName = 'ThinkingReasoningDrawer';
