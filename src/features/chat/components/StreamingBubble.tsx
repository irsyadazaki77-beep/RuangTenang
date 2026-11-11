import React, { memo, useMemo } from 'react';
import { StreamingMarkdown } from '../../../components/common/StreamingMarkdown';
import { Message } from '../types';
import { RhythmicTypingIndicator } from '../../../components/ui/RhythmicTypingIndicator';
import { BrandLogo } from '../../../components/ui/BrandLogo';
import { ReasoningAccordion } from './ReasoningAccordion';
import { parseReasoning } from '../utils/parseReasoning';

interface Props {
  msg: Message;
}

/**
 * Dedicated ultra-lightweight streaming bubble (Claude / ChatGPT style).
 * Uses editorial 720px reading measure, smooth token fade-in, and semantic streaming cursor.
 */
export const StreamingBubble: React.FC<Props> = memo(({ msg }) => {
  const reasoning = useMemo(() => parseReasoning(msg.content), [msg.content]);
  return (
    <div
      id={`msg-${msg.id}`}
      style={{
        contain: 'paint layout',
        transform: 'translate3d(0, 0, 0)',
        willChange: 'contents'
      }}
      className="render-optimized-item flex items-start gap-3 sm:gap-3.5 group w-full justify-start transition-all duration-200 animate-fade-in"
    >
      {/* Subtle Brand Logo Avatar */}
      <div className="shrink-0 mt-0.5 relative self-start">
        <div className="relative rounded-xl ring-1 ring-teal-500/25 bg-white/80 dark:bg-slate-900/80">
          <BrandLogo size="xs" iconOnly />
        </div>
      </div>

      <div className="flex-1 min-w-0 max-w-[720px] space-y-2">
        <div className="flex items-center gap-2 select-none text-xs text-slate-500 dark:text-slate-400">
          <span className="font-semibold text-slate-900 dark:text-slate-100 text-xs">RuangTenang</span>
          <span className="text-slate-300 dark:text-slate-600">·</span>
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-teal-50/90 dark:bg-teal-950/60 text-[11px] text-teal-700 dark:text-teal-300 font-medium border border-teal-200/60 dark:border-teal-800/60">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-teal-500" />
            </span>
            <span>Sedang Merespons...</span>
          </span>
        </div>

        {!msg.content ? (
          <div className="py-0.5">
            <RhythmicTypingIndicator mode="RUANG_TENANG" hideAvatar />
          </div>
        ) : (
          <div className="prose prose-slate dark:prose-invert max-w-[720px] break-words text-[14.5px] sm:text-[15px] leading-[1.7] text-slate-800 dark:text-slate-100 space-y-2.5 font-normal animate-token-fade">
            {(reasoning.thinking || reasoning.isThinking) && (
              <ReasoningAccordion thinking={reasoning.thinking} isThinking={reasoning.isThinking} />
            )}
            <StreamingMarkdown content={reasoning.answer} />
            <span aria-hidden="true" className="streaming-cursor" />
          </div>
        )}
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  return prevProps.msg.id === nextProps.msg.id && prevProps.msg.content === nextProps.msg.content;
});

StreamingBubble.displayName = 'StreamingBubble';
