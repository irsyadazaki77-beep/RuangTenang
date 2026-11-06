import React, { useRef, useEffect, useLayoutEffect, useMemo, useCallback } from 'react';
import { ArrowUp, Ghost, Sparkles, GitCompare } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { Message } from '../../chat/types';
import { LazyMarkdown } from '../../../components/common/LazyMarkdown';
import { StarterTaskItem, WorkspaceArtifact } from '../types';
import { RhythmicTypingIndicator } from '../../../components/ui/RhythmicTypingIndicator';
import { BrandLogo } from '../../../components/ui/BrandLogo';
import { WorkspaceMessageRow } from './WorkspaceMessageRow';
import { TextSelectionToolbar } from '../../../components/common/TextSelectionToolbar';
import type { WorkspaceComparisonCandidate, WorkspaceComparisonRun } from '../types';
import type { FileSourceReference } from '../../../../shared/contracts/files';

const noopOpenSource = (_source: FileSourceReference) => undefined;
const noop = () => undefined;
const WorkspaceComparisonPanel = React.lazy(() => import('./WorkspaceComparisonPanel').then(module => ({ default: module.WorkspaceComparisonPanel })));

interface WorkspaceConversationProps {
  messages: Message[];
  isLoading?: boolean;
  hasOlderMessages?: boolean;
  isLoadingOlderMessages?: boolean;
  onLoadOlderMessages?: () => Promise<boolean>;
  activeStreamingMessage: Message | null;
  isStreaming: boolean;
  artifacts: WorkspaceArtifact[];
  starterTasks: StarterTaskItem[];
  onSelectStarterTask: (prompt: string) => void;
  onRetryMessage: (lastUserPrompt: string, errorMsgId: string) => void;
  onOpenCanvas: () => void;
  onSendToCanvas?: (content: string) => void;
  comparisonRun?: WorkspaceComparisonRun | null;
  onUseComparisonResponse?: (run: WorkspaceComparisonRun, candidate: WorkspaceComparisonCandidate) => Promise<boolean | void> | boolean | void;
  onComparisonSendToCanvas?: (candidate: WorkspaceComparisonCandidate) => void;
  onCompareAgain?: (run: WorkspaceComparisonRun) => void;
  onOpenSource?: (source: FileSourceReference) => void;
  onEditUserMessage?: (messageId: string, newContent: string) => void;
  isTemporary?: boolean;
  scrollToMessageId?: string;
  composerSlot?: React.ReactNode;
  onOpenTemplateGallery?: () => void;
  onToggleCompareMode?: () => void;
  onQuoteSelection?: (text: string) => void;
  onExplainSelection?: (text: string) => void;
}

const StreamingMarkdownPreview = React.memo(function StreamingMarkdownPreview({ content }: { content: string }) {
  const [renderedContent, setRenderedContent] = React.useState(content);
  const latestContentRef = useRef(content);
  const lastFlushAtRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  latestContentRef.current = content;

  useEffect(() => {
    const remaining = 100 - (Date.now() - lastFlushAtRef.current);
    if (remaining <= 0) {
      lastFlushAtRef.current = Date.now();
      setRenderedContent(content);
    } else if (!timerRef.current) {
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        lastFlushAtRef.current = Date.now();
        setRenderedContent(latestContentRef.current);
      }, remaining);
    }
  }, [content]);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  return <LazyMarkdown content={renderedContent || '...'} />;
});

export const WorkspaceConversation: React.FC<WorkspaceConversationProps> = React.memo(({
  messages,
  isLoading = false,
  hasOlderMessages = false,
  isLoadingOlderMessages = false,
  onLoadOlderMessages,
  activeStreamingMessage,
  isStreaming,
  artifacts,
  starterTasks,
  onSelectStarterTask,
  onRetryMessage,
  onOpenCanvas,
  onSendToCanvas,
  comparisonRun = null,
  onUseComparisonResponse = noop,
  onComparisonSendToCanvas = noop,
  onCompareAgain = noop,
  onOpenSource = noopOpenSource,
  onEditUserMessage,
  isTemporary = false,
  scrollToMessageId,
  composerSlot,
  onOpenTemplateGallery,
  onToggleCompareMode,
  onQuoteSelection,
  onExplainSelection
}) => {
  const shouldReduceMotion = useReducedMotion();
  const scrollRafRef = useRef<number | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const pendingScrollPreservationRef = useRef<{ anchor: HTMLElement; top: number } | null>(null);
  const isNearBottomRef = useRef(true);
  const copyTimersRef = useRef(new Map<string, number>());
  const [copiedMessageId, setCopiedMessageId] = React.useState<string | null>(null);

  const handleLoadOlderMessages = useCallback(async () => {
    const scroller = scrollContainerRef.current;
    if (!scroller || !onLoadOlderMessages || isLoadingOlderMessages) return;
    const anchor = scroller.querySelector<HTMLElement>('[data-workspace-message-id]');
    pendingScrollPreservationRef.current = anchor
      ? { anchor, top: anchor.getBoundingClientRect().top }
      : null;
    const loaded = await onLoadOlderMessages();
    if (!loaded) pendingScrollPreservationRef.current = null;
  }, [isLoadingOlderMessages, onLoadOlderMessages]);

  useLayoutEffect(() => {
    const pending = pendingScrollPreservationRef.current;
    const scroller = scrollContainerRef.current;
    if (!pending || !scroller) return;
    scroller.scrollTop += pending.anchor.getBoundingClientRect().top - pending.top;
    pendingScrollPreservationRef.current = null;
  }, [messages]);

  const hasUserSentMessage = useMemo(
    () => isStreaming || messages.length > 1 || messages.some(message => message.role === 'user'),
    [isStreaming, messages]
  );

  useEffect(() => () => {
    for (const timer of copyTimersRef.current.values()) window.clearTimeout(timer);
    copyTimersRef.current.clear();
  }, []);

  // Follow new messages only while the reader is already near the bottom.
  useEffect(() => {
    if (scrollToMessageId) return;
    if (scrollRafRef.current) {
      cancelAnimationFrame(scrollRafRef.current);
    }

    scrollRafRef.current = requestAnimationFrame(() => {
      const scroller = scrollContainerRef.current;
      if (!scroller || !isNearBottomRef.current) return;
      scroller.scrollTo({ top: scroller.scrollHeight, behavior: 'auto' });
      isNearBottomRef.current = true;
    });

    return () => {
      if (scrollRafRef.current) {
        cancelAnimationFrame(scrollRafRef.current);
      }
    };
  }, [messages, activeStreamingMessage, scrollToMessageId]);

  useEffect(() => {
    if (!scrollToMessageId) return;
    const target = Array.from(document.querySelectorAll<HTMLElement>('[data-workspace-message-id]'))
      .find(element => element.dataset.workspaceMessageId === scrollToMessageId);
    target?.scrollIntoView?.({ behavior: shouldReduceMotion ? 'auto' : 'smooth', block: 'center' });
  }, [messages, scrollToMessageId, shouldReduceMotion]);

  const formatMessageTime = useCallback((date?: Date | string) => {
    if (!date) return '';
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  }, []);

  const copyMessage = useCallback(async (message: Message) => {
    if (!navigator.clipboard?.writeText) return;
    try {
      await navigator.clipboard.writeText(message.content);
      setCopiedMessageId(message.id);
      const previousTimer = copyTimersRef.current.get(message.id);
      if (previousTimer) window.clearTimeout(previousTimer);
      const timer = window.setTimeout(() => {
        copyTimersRef.current.delete(message.id);
        setCopiedMessageId(current => current === message.id ? null : current);
      }, 1400);
      copyTimersRef.current.set(message.id, timer);
    } catch {
      setCopiedMessageId(null);
    }
  }, []);

  const lastUserPrompt = useMemo(() => {
    for (let index = messages.length - 1; index >= 0; index -= 1) {
      if (messages[index].role === 'user') return messages[index].content;
    }
    return undefined;
  }, [messages]);

  const hasArtifacts = artifacts.length > 0;
  const latestArtifactTitle = artifacts.length > 0 ? artifacts[artifacts.length - 1]?.title : undefined;
  const persistedMessageRows = useMemo(() => messages.map((message, idx) => {
    let associatedUserPrompt = lastUserPrompt;
    for (let i = idx - 1; i >= 0; i--) {
      if (messages[i].role === 'user') {
        associatedUserPrompt = messages[i].content;
        break;
      }
    }
    return (
      <WorkspaceMessageRow
        key={message.id}
        message={message}
        lastUserPrompt={associatedUserPrompt}
        isHighlighted={scrollToMessageId === message.id}
        showArtifactLink={hasArtifacts}
        activeArtifactTitle={latestArtifactTitle}
        isCopied={copiedMessageId === message.id}
        onRetryMessage={onRetryMessage}
        onOpenCanvas={onOpenCanvas}
        onOpenSource={onOpenSource}
        onSendToCanvas={onSendToCanvas}
        onCopyMessage={copyMessage}
        onEditUserMessage={onEditUserMessage}
        onContinueMessage={onExplainSelection ? (_m) => {
          onExplainSelection('Lanjutkan penjelasan dan hitungan di atas tepat dari bagian terakhir yang terpotong secara lengkap, tuntas, dan terstruktur sampai akhir.');
        } : undefined}
        formatMessageTime={formatMessageTime}
      />
    );
  }), [hasArtifacts, latestArtifactTitle, copiedMessageId, copyMessage, formatMessageTime, lastUserPrompt, messages, onOpenCanvas, onOpenSource, onRetryMessage, onSendToCanvas, onEditUserMessage, onExplainSelection, scrollToMessageId]);

  const handleConversationScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    const scroller = event.currentTarget;
    isNearBottomRef.current = scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight < 120;
  }, []);

  return (
    <div
      ref={scrollContainerRef}
      role="log"
      aria-label="Percakapan RuangKerja"
      aria-live={isStreaming ? 'off' : 'polite'}
      onScroll={handleConversationScroll}
      className="flex-1 min-h-0 overflow-y-auto overscroll-contain bg-transparent px-3.5 sm:px-5 py-3 space-y-4 custom-scrollbar flex flex-col"
    >
      {isTemporary && (
        <div className="mx-auto flex w-fit max-w-xl items-center justify-center gap-2 rounded-full border border-amber-300/70 bg-amber-50/80 px-3.5 py-1 text-[11px] text-amber-900 dark:border-amber-800/70 dark:bg-amber-950/35 dark:text-amber-200">
          <Ghost className="h-3 w-3 shrink-0 text-amber-600 dark:text-amber-400" />
          <span className="font-medium">Sesi sementara aktif</span>
          <span aria-hidden="true" className="opacity-50">·</span>
          <span className="text-amber-800/80 dark:text-amber-300/80">Tidak disimpan ke riwayat</span>
        </div>
      )}

      {isLoading ? (
        <div role="status" aria-label="Memuat percakapan" className="my-auto w-full max-w-lg mx-auto space-y-3 px-2">
          <div className="h-3 w-28 rounded bg-slate-200 dark:bg-slate-800 animate-pulse" />
          <div className="h-16 rounded-xl bg-slate-100 dark:bg-slate-900 animate-pulse" />
          <div className="h-12 w-4/5 ml-auto rounded-xl bg-slate-100 dark:bg-slate-900 animate-pulse" />
        </div>
      ) : !hasUserSentMessage && !activeStreamingMessage && !comparisonRun ? (
        /* ZERO-STATE: Centered Greeting, Composer Slot, and Thin Action Chips */
        <div className="my-auto mx-auto w-full max-w-2xl flex flex-col items-center text-center animate-fade-in px-2 py-6 select-none">
          <div className="mb-3 opacity-90">
            <BrandLogo mode="RUANG_KERJA" size="md" iconOnly />
          </div>

          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 max-w-lg mx-auto leading-snug text-balance">
            Apa yang ingin kita kerjakan hari ini?
          </h2>

          {composerSlot && (
            <div className="w-full mt-6 mb-4">
              {composerSlot}
            </div>
          )}

          {/* Thin 1-row Action Chips */}
          <div className="flex flex-wrap items-center justify-center gap-2 mt-1 max-w-2xl">
            {starterTasks.map((task) => (
              <button
                key={task.id}
                type="button"
                onClick={() => onSelectStarterTask(task.prompt)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium border border-slate-200/80 dark:border-slate-800 bg-white/75 dark:bg-slate-900/60 text-slate-600 dark:text-slate-300 hover:border-indigo-300 dark:hover:border-indigo-800 hover:text-indigo-700 dark:hover:text-indigo-300 transition-all duration-150 cursor-pointer whitespace-nowrap shrink-0"
              >
                <span className="shrink-0 [&>svg]:w-3.5 [&>svg]:h-3.5">{task.icon}</span>
                <span>{task.title}</span>
              </button>
            ))}

            {onOpenTemplateGallery && (
              <button
                type="button"
                onClick={onOpenTemplateGallery}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium border border-slate-200/80 dark:border-slate-800 bg-white/75 dark:bg-slate-900/60 text-slate-600 dark:text-slate-300 hover:border-indigo-300 dark:hover:border-indigo-800 hover:text-indigo-700 dark:hover:text-indigo-300 transition-all duration-150 cursor-pointer whitespace-nowrap shrink-0"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>Galeri Template</span>
              </button>
            )}

            {onToggleCompareMode && (
              <button
                type="button"
                onClick={onToggleCompareMode}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium border border-slate-200/80 dark:border-slate-800 bg-white/75 dark:bg-slate-900/60 text-slate-600 dark:text-slate-300 hover:border-indigo-300 dark:hover:border-indigo-800 hover:text-indigo-700 dark:hover:text-indigo-300 transition-all duration-150 cursor-pointer whitespace-nowrap shrink-0"
              >
                <GitCompare className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>Bandingkan Model</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        /* ACTIVE WORKSPACE STATE: Chat Messages Feed */
        <div className="mx-auto w-full max-w-3xl space-y-5 pb-6">
          {hasOlderMessages && (
            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => { void handleLoadOlderMessages(); }}
                disabled={isLoadingOlderMessages}
                aria-live="polite"
                className="inline-flex min-h-8.5 items-center gap-1.5 rounded-full border border-slate-200 bg-white/90 px-3.5 py-1.5 text-[11px] font-medium text-slate-600 shadow-2xs transition-colors hover:border-indigo-200 hover:bg-indigo-50/70 hover:text-indigo-700 disabled:cursor-wait disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900/90 dark:text-slate-300 dark:hover:border-indigo-800 dark:hover:bg-indigo-950/40 dark:hover:text-indigo-300"
              >
                <ArrowUp className={`h-3.5 w-3.5 ${isLoadingOlderMessages ? 'animate-pulse' : ''}`} aria-hidden="true" />
                {isLoadingOlderMessages ? 'Memuat pesan sebelumnya…' : 'Muat pesan sebelumnya'}
              </button>
            </div>
          )}
          {persistedMessageRows}

          {/* Active Streaming Preview */}
          {activeStreamingMessage && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex gap-3 sm:gap-3.5 items-start"
            >
              <BrandLogo mode="RUANG_KERJA" size="xs" iconOnly className="shrink-0 mt-1" />
              <div className="flex-1 min-w-0 text-slate-800 dark:text-slate-100 leading-[1.7] text-[15px]">
                <div className="prose dark:prose-invert max-w-none text-[15px] leading-[1.7] prose-p:my-2">
                  <StreamingMarkdownPreview content={activeStreamingMessage.content || '...'} />
                </div>
                <div className="mt-2.5 pt-2 border-t border-slate-200/60 dark:border-slate-800/70">
                  <RhythmicTypingIndicator label="Menyusun respons akademik..." avatarSrc="/ruangkerja.svg" />
                </div>
              </div>
            </motion.div>
          )}

          {/* Contextual Follow-Up Suggestion Chips */}
          {!isStreaming &&
            !activeStreamingMessage &&
            messages.length > 0 &&
            messages[messages.length - 1]?.role === 'assistant' &&
            !messages[messages.length - 1]?.error && (() => {
              const lastMsg = messages[messages.length - 1];
              const lastTrimmed = (lastMsg?.content || '').trim();
              const isLastTruncated =
                lastTrimmed.length > 80 &&
                !/[.!?:;\n)\]*`~"']$/.test(lastTrimmed) &&
                !lastTrimmed.endsWith('```');

              const chips = [
                ...(isLastTruncated ? [{
                  label: '⚡ Lanjutkan bagian yang terpotong',
                  prompt: 'Lanjutkan penjelasan dan hitungan di atas tepat dari bagian terakhir yang terpotong secara lengkap, tuntas, dan terstruktur sampai akhir.',
                  highlight: true
                }] : []),
                {
                  label: 'Perdalam analisis bagian ini',
                  prompt: 'Tolong perdalam analisis dan tambahkan argumen akademik yang lebih rinci dari penjelasan di atas.',
                  highlight: false
                },
                {
                  label: 'Susun ke dalam draf Canvas',
                  prompt: 'Tolong susun pembahasan di atas menjadi draf naskah terstruktur yang siap disunting di Canvas.',
                  highlight: false
                },
                {
                  label: 'Cek sitasi & struktur logis',
                  prompt: 'Bantu periksa kelengkapan sitasi ilmiah serta alur logika dari pembahasan tersebut.',
                  highlight: false
                }
              ];

              return (
                <div className="flex flex-wrap gap-1.5 pt-1 pl-7 sm:pl-8 justify-start">
                  {chips.map((chip) => (
                    <button
                      key={chip.label}
                      type="button"
                      onClick={() => {
                        if (onExplainSelection) {
                          onExplainSelection(chip.prompt);
                        } else {
                          onSelectStarterTask(chip.prompt);
                        }
                      }}
                      className={
                        chip.highlight
                          ? 'px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/70 dark:hover:bg-indigo-900/80 border border-indigo-300 dark:border-indigo-700 rounded-full text-xs font-semibold text-indigo-700 dark:text-indigo-300 transition-all text-left cursor-pointer active:scale-[0.98] shadow-2xs'
                          : 'px-3.5 py-1.5 bg-white/80 hover:bg-slate-100 dark:bg-slate-900/70 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-800 rounded-full text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors text-left cursor-pointer active:scale-[0.98]'
                      }
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>
              );
            })()}
        </div>
      )}

      {onQuoteSelection && (
        <TextSelectionToolbar
          containerRef={scrollContainerRef}
          accentColor="indigo"
          onQuoteSelection={onQuoteSelection}
          onExplainSelection={
            onExplainSelection
              ? (selected) =>
                  onExplainSelection(
                    `Tolong jelaskan dan uraikan bagian ini lebih mendalam:\n\n> "${selected.slice(0, 320)}"`
                  )
              : undefined
          }
          onSendToCanvas={onSendToCanvas}
        />
      )}

      {comparisonRun && (
        <React.Suspense fallback={<div role="status" className="mx-auto w-full max-w-3xl py-3 text-center text-xs text-slate-500">Memuat perbandingan…</div>}>
          <div className="mx-auto w-full max-w-3xl">
            <WorkspaceComparisonPanel
              run={comparisonRun}
              onUseResponse={onUseComparisonResponse}
              onSendToCanvas={onComparisonSendToCanvas}
              onCompareAgain={onCompareAgain}
            />
          </div>
        </React.Suspense>
      )}
    </div>
  );
});
