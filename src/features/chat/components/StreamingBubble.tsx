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
 * Shows vivid, reassuring breathing and typing animations so user knows AI is actively thinking.
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
      {/* Animated Brand Logo with Glowing Halo */}
      <div className="shrink-0 mt-0.5 relative self-start">
        <div className="absolute -inset-0.5 rounded-xl bg-teal-500/20 blur-xs animate-pulse" />
        <div className="relative rounded-xl ring-1 ring-teal-500/30 shadow-[0_0_8px_rgba(20,184,166,0.2)]">
          <BrandLogo size="xs" iconOnly />
        </div>
      </div>

      <div className="flex-1 min-w-0 max-w-full space-y-2">
        <div className="flex items-center gap-2 select-none text-xs text-slate-500 dark:text-slate-400">
          <span className="font-semibold text-slate-900 dark:text-slate-100 text-xs">RuangTenang</span>
          <span className="text-slate-300 dark:text-slate-600">·</span>
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-teal-50/90 dark:bg-teal-950/60 text-[11px] text-teal-700 dark:text-teal-300 font-medium border border-teal-200/60 dark:border-teal-800/60 shadow-3xs">
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
          <div className="prose prose-slate dark:prose-invert max-w-none break-words text-[14px] sm:text-[15px] leading-relaxed text-slate-800 dark:text-slate-100 space-y-2.5 font-normal">
            {(reasoning.thinking || reasoning.isThinking) && (
              <ReasoningAccordion thinking={reasoning.thinking} isThinking={reasoning.isThinking} />
            )}
            <StreamingMarkdown content={reasoning.answer} />
            <span
              aria-hidden="true"
              className="inline-block w-2.5 h-4.5 ml-1 bg-gradient-to-b from-teal-400 to-teal-600 rounded-xs align-middle shadow-[0_0_10px_rgba(20,184,166,0.8)] animate-pulse"
            />
          </div>
        )}
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  return prevProps.msg.id === nextProps.msg.id && prevProps.msg.content === nextProps.msg.content;
});

StreamingBubble.displayName = 'StreamingBubble';
