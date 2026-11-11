import React, { useRef, useEffect, useLayoutEffect, useMemo, useCallback } from 'react';
import { ArrowDown, ArrowUp, ChevronRight, Ghost } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { Message } from '../../chat/types';
import { LazyMarkdown } from '../../../components/common/LazyMarkdown';
import { StarterTaskItem, WorkspaceArtifact } from '../types';
import { BrandLogo } from '../../../components/ui/BrandLogo';
import { WorkspaceMessageRow } from './WorkspaceMessageRow';
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
  onOpenPlan?: () => void;
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

  if (!renderedContent.trim()) return null;

  return (
    <span className="inline">
      <LazyMarkdown content={renderedContent} />
      <span className="streaming-cursor" aria-hidden="true" />
    </span>
  );
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
  onOpenPlan
}) => {
  const shouldReduceMotion = useReducedMotion();
  const scrollRafRef = useRef<number | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const pendingScrollPreservationRef = useRef<{ anchor: HTMLElement; top: number } | null>(null);
  const isNearBottomRef = useRef(true);
  const copyTimersRef = useRef(new Map<string, number>());
  const [copiedMessageId, setCopiedMessageId] = React.useState<string | null>(null);
  const [showScrollBottom, setShowScrollBottom] = React.useState(false);

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
  const persistedMessageRows = useMemo(() => {
    const visibleMessages = hasUserSentMessage
      ? messages.filter(message => message.id !== 'msg_welcome')
      : messages;

    // Single-pass O(N) resolution of nearest preceding user prompt
    const precedingUserPromptMap = new Map<string, string | undefined>();
    let latestUserPrompt: string | undefined = undefined;
    for (let i = 0; i < visibleMessages.length; i++) {
      const msg = visibleMessages[i];
      precedingUserPromptMap.set(msg.id, latestUserPrompt ?? lastUserPrompt);
      if (msg.role === 'user') {
        latestUserPrompt = msg.content;
      }
    }

    return visibleMessages.map((message, index) => {
      const associatedUserPrompt = precedingUserPromptMap.get(message.id);
      const isLast = index === visibleMessages.length - 1 && !activeStreamingMessage && !isStreaming;
      return (
        <WorkspaceMessageRow
          key={message.id}
          message={message}
          lastUserPrompt={associatedUserPrompt}
          isHighlighted={scrollToMessageId === message.id}
          showArtifactLink={hasArtifacts}
          isCopied={copiedMessageId === message.id}
          onRetryMessage={onRetryMessage}
          onOpenCanvas={onOpenCanvas}
          onOpenSource={onOpenSource}
          onSendToCanvas={onSendToCanvas}
          onCopyMessage={copyMessage}
          onEditUserMessage={onEditUserMessage}
          formatMessageTime={formatMessageTime}
          isLastMessage={isLast}
          onSelectFollowUp={onSelectStarterTask}
          onOpenPlan={onOpenPlan}
        />
      );
    });
  }, [hasArtifacts, hasUserSentMessage, copiedMessageId, copyMessage, formatMessageTime, lastUserPrompt, messages, onOpenCanvas, onOpenSource, onRetryMessage, onSendToCanvas, onEditUserMessage, scrollToMessageId, activeStreamingMessage, isStreaming, onSelectStarterTask]);

  const handleConversationScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    const scroller = event.currentTarget;
    const nearBottom = scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight < 120;
    isNearBottomRef.current = nearBottom;
    setShowScrollBottom(!nearBottom);
  }, []);

  return (
    <div ref={scrollContainerRef} role="log" aria-label="Percakapan RuangKerja" aria-live={isStreaming ? 'off' : 'polite'} onScroll={handleConversationScroll} className="flex-1 min-h-0 overflow-y-auto overscroll-contain bg-transparent px-3 py-4 sm:px-6 sm:py-6 space-y-6 custom-scrollbar flex flex-col">
      {isTemporary && (
        <div className="mx-auto flex max-w-xl items-center justify-center gap-1.5 text-[11px] font-medium text-amber-800 dark:text-amber-300 xl:hidden">
          <Ghost className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>Sesi sementara · percakapan tidak disimpan</span>
        </div>
      )}
      {isLoading ? (
        <div role="status" aria-label="Memuat percakapan" className="my-auto w-full max-w-lg mx-auto space-y-4 px-4 py-8">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 animate-pulse" />
            <div className="h-3.5 w-32 rounded-md bg-slate-200 dark:bg-slate-800 animate-pulse" />
          </div>
          <div className="space-y-2.5 pl-11">
            <div className="h-3 w-5/6 rounded-md bg-slate-200/80 dark:bg-slate-800/80 animate-pulse" />
            <div className="h-3 w-4/6 rounded-md bg-slate-200/80 dark:bg-slate-800/80 animate-pulse" />
            <div className="h-3 w-3/6 rounded-md bg-slate-200/80 dark:bg-slate-800/80 animate-pulse" />
          </div>
          <div className="mt-6 flex justify-end">
            <div className="h-10 w-3/5 rounded-2xl rounded-br-sm bg-slate-200/70 dark:bg-slate-800/70 animate-pulse" />
          </div>
        </div>
      ) : !hasUserSentMessage && !activeStreamingMessage ? (
        /* FRESH WORKSPACE STATE: Minimalist Intro & Starter Tasks (ChatGPT / Claude Style) */
        <div className="my-auto mx-auto w-full max-w-2xl animate-fade-in px-2 py-8 sm:px-4">
          <div className="space-y-6">
          <div className="space-y-2 text-center">
            <div className="mb-2 flex flex-col items-center gap-1.5">
              <BrandLogo mode="RUANG_KERJA" size="md" iconOnly />
              <span className="text-xs font-semibold tracking-wider uppercase text-indigo-600 dark:text-indigo-400">RuangKerja</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-medium tracking-tight bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 dark:from-blue-400 dark:via-indigo-300 dark:to-purple-300 bg-clip-text text-transparent">
              Apa yang ingin kamu kerjakan hari ini?
            </h2>
            <p className="mx-auto max-w-md text-xs sm:text-sm leading-relaxed text-slate-500 dark:text-slate-400">
              Analisis berkas, riset topik akademik, atau susun draf dokumen di Canvas.
            </p>
          </div>

          <div className="text-center text-xs font-semibold text-slate-500 dark:text-slate-400">Mulai sesuatu</div>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 pt-1">
            {starterTasks.map((task) => (
              <button
                key={task.id}
                type="button"
                onClick={() => onSelectStarterTask(task.prompt)}
                className={`w-full p-3 rounded-2xl text-left transition-all duration-150 flex items-center justify-between group cursor-pointer active:scale-[0.99] border ${
                  task.primary
                    ? 'border-indigo-200 bg-indigo-50/60 hover:border-indigo-300 hover:bg-indigo-50 dark:border-indigo-900/60 dark:bg-indigo-950/20 dark:hover:border-indigo-800 dark:hover:bg-indigo-950/40'
                    : 'border-slate-200/60 bg-white/70 hover:border-slate-300 hover:bg-white dark:border-white/5 dark:bg-[#1e1f20]/60 dark:hover:border-white/10 dark:hover:bg-[#1e1f20]'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0 pr-2">
                  <div className="p-2 rounded-xl bg-slate-100/80 dark:bg-white/10 shrink-0 text-slate-700 dark:text-slate-300">
                    {task.icon}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs sm:text-[13px] font-semibold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-1">
                      {task.title}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 leading-snug mt-0.5">
                      {task.subtitle}
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-600 dark:group-hover:text-slate-200 transition-colors shrink-0 ml-1" />
              </button>
            ))}
          </div>
          </div>
        </div>
      ) : (
        /* ACTIVE WORKSPACE STATE: Chat Messages Feed */
        <>
          {hasOlderMessages && (
            <button
              type="button"
              onClick={() => { void handleLoadOlderMessages(); }}
              disabled={isLoadingOlderMessages}
              aria-live="polite"
              className="mx-auto inline-flex min-h-8 items-center gap-1.5 rounded-full border border-slate-200/80 bg-white px-3 py-1 text-xs font-medium text-slate-600 shadow-2xs transition-colors hover:bg-slate-50 disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
            >
              <ArrowUp className={`h-3.5 w-3.5 ${isLoadingOlderMessages ? 'animate-pulse' : ''}`} aria-hidden="true" />
              {isLoadingOlderMessages ? 'Memuat pesan sebelumnya…' : 'Muat pesan sebelumnya'}
            </button>
          )}
          {persistedMessageRows}

          {/* Active Streaming Preview - Clean & Uncluttered (Claude/ChatGPT style) */}
          {activeStreamingMessage && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-start w-full max-w-4xl mx-auto space-y-1.5"
            >
              <div className="flex items-center gap-2 select-none text-xs text-slate-500 dark:text-slate-400">
                <BrandLogo mode="RUANG_KERJA" size="xs" iconOnly />
                <span className="font-semibold text-slate-900 dark:text-slate-100 text-xs">RuangKerja</span>
                <span className="text-slate-300 dark:text-slate-600">·</span>
                <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium animate-pulse">Menulis...</span>
              </div>

              <div className="w-full text-slate-800 dark:text-slate-100 leading-relaxed text-[14px] sm:text-[15px]">
                {activeStreamingMessage.content?.trim() ? (
                  <div className="prose dark:prose-invert max-w-none text-[14px] sm:text-[15px] prose-p:my-2 prose-pre:my-2">
                    <StreamingMarkdownPreview content={activeStreamingMessage.content} />
                  </div>
                ) : null}

                <div
                  role="status"
                  aria-live="polite"
                  aria-label="Menyusun konten akademik di Canvas..."
                  className="sr-only"
                >
                  Menyusun konten akademik di Canvas...
                </div>
              </div>
            </motion.div>
          )}
        </>
      )}

      {comparisonRun && <React.Suspense fallback={<div role="status" className="mx-auto w-full max-w-4xl py-3 text-center text-xs text-slate-500">Memuat perbandingan…</div>}>
        <WorkspaceComparisonPanel run={comparisonRun} onUseResponse={onUseComparisonResponse} onSendToCanvas={onComparisonSendToCanvas} onCompareAgain={onCompareAgain} />
      </React.Suspense>}

      {showScrollBottom && (
        <div className="sticky bottom-2 flex justify-center pointer-events-none z-20">
          <button
            type="button"
            onClick={() => {
              const scroller = scrollContainerRef.current;
              if (scroller) scroller.scrollTo({ top: scroller.scrollHeight, behavior: 'smooth' });
              setShowScrollBottom(false);
              isNearBottomRef.current = true;
            }}
            className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full border border-indigo-200/80 bg-slate-900/95 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xl backdrop-blur-md transition-all hover:bg-slate-800 active:scale-95 cursor-pointer dark:border-indigo-800/80 dark:bg-white/95 dark:text-slate-900"
            aria-label="Gulir ke pesan terbaru"
          >
            <ArrowDown className="h-3.5 w-3.5 animate-bounce" />
            <span>Pesan Terbaru</span>
          </button>
        </div>
      )}

    </div>
  );
});
