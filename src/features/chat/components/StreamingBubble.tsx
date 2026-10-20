import React, { memo } from 'react';
import { LazyMarkdown } from '../../../components/common/LazyMarkdown';
import { Message } from '../types';
import { RhythmicTypingIndicator } from '../../../components/ui/RhythmicTypingIndicator';
import { BrandLogo } from '../../../components/ui/BrandLogo';

interface Props {
  msg: Message;
}

/**
 * Dedicated ultra-lightweight streaming bubble.
 * Avoids heavier actions, audio synthesizers, and context menu calculations while actively streaming.
 */
export const StreamingBubble: React.FC<Props> = memo(({ msg }) => {
  return (
    <div
      id={`msg-${msg.id}`}
      style={{
        contain: 'paint layout',
        transform: 'translate3d(0, 0, 0)',
        willChange: 'contents'
      }}
      className="render-optimized-item flex gap-3 sm:gap-3.5 group w-full justify-start transition-none"
    >
      <BrandLogo size="xs" iconOnly className="shrink-0 mt-0.5" />

      <div className="flex-1 min-w-0 max-w-full">
        {!msg.content ? (
          <div className="py-1">
            <RhythmicTypingIndicator label="Menuliskan pesan yang tenang..." avatarSrc="" />
          </div>
        ) : (
          <div className="prose prose-stone dark:prose-invert max-w-none break-words text-[14.5px] sm:text-[15px] leading-[1.65] text-stone-800 dark:text-stone-200 space-y-2.5 font-normal">
            <LazyMarkdown content={msg.content} />
            <span
              aria-hidden="true"
              className="inline-block w-1.5 h-4 ml-1 bg-teal-500 rounded-xs align-middle animate-pulse"
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
