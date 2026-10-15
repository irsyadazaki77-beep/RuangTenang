import React, { useRef, useEffect, useMemo, useCallback } from 'react';
import { ChevronRight, Sparkles } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { Message } from '../../chat/types';
import { LazyMarkdown } from '../../../components/common/LazyMarkdown';
import { StarterTaskItem, WorkspaceArtifact } from '../types';
import { RhythmicTypingIndicator } from '../../../components/ui/RhythmicTypingIndicator';
import { WorkspaceMessageRow } from './WorkspaceMessageRow';
import type { WorkspaceComparisonCandidate, WorkspaceComparisonRun } from '../types';
import type { FileSourceReference } from '../../../../shared/contracts/files';

const noopOpenSource = (_source: FileSourceReference) => undefined;
const noop = () => undefined;
const WorkspaceComparisonPanel = React.lazy(() => import('./WorkspaceComparisonPanel').then(module => ({ default: module.WorkspaceComparisonPanel })));

interface WorkspaceConversationProps {
  messages: Message[];
  isLoading?: boolean;
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
  scrollToMessageId?: string;
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
  scrollToMessageId
}) => {
  const shouldReduceMotion = useReducedMotion();
  const scrollRafRef = useRef<number | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef(true);
  const copyTimersRef = useRef(new Map<string, number>());
  const [copiedMessageId, setCopiedMessageId] = React.useState<string | null>(null);

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
  const persistedMessageRows = useMemo(() => messages.map(message => (
    <WorkspaceMessageRow
      key={message.id}
      message={message}
      lastUserPrompt={message.error ? lastUserPrompt : undefined}
      isHighlighted={scrollToMessageId === message.id}
      showArtifactLink={artifacts.length > 0}
      isCopied={copiedMessageId === message.id}
      onRetryMessage={onRetryMessage}
      onOpenCanvas={onOpenCanvas}
      onOpenSource={onOpenSource}
      onSendToCanvas={onSendToCanvas}
      onCopyMessage={copyMessage}
      formatMessageTime={formatMessageTime}
    />
  )), [artifacts, copiedMessageId, copyMessage, formatMessageTime, lastUserPrompt, messages, onOpenCanvas, onOpenSource, onRetryMessage, onSendToCanvas, scrollToMessageId]);

  const handleConversationScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    const scroller = event.currentTarget;
    isNearBottomRef.current = scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight < 120;
  }, []);

  return (
    <div ref={scrollContainerRef} role="log" aria-label="Percakapan RuangKerja" aria-live={isStreaming ? 'off' : 'polite'} onScroll={handleConversationScroll} className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-3.5 sm:p-5 space-y-4 custom-scrollbar flex flex-col">
      {isLoading ? (
        <div role="status" aria-label="Memuat percakapan" className="my-auto w-full max-w-lg mx-auto space-y-3 px-2">
          <div className="h-3 w-28 rounded bg-slate-200 dark:bg-slate-800 animate-pulse" />
          <div className="h-16 rounded-xl bg-slate-100 dark:bg-slate-900 animate-pulse" />
          <div className="h-12 w-4/5 ml-auto rounded-xl bg-slate-100 dark:bg-slate-900 animate-pulse" />
        </div>
      ) : !hasUserSentMessage && !activeStreamingMessage ? (
        /* FRESH WORKSPACE STATE: Compact Intro & Starter Tasks */
        <div className="my-auto mx-auto w-full max-w-2xl animate-fade-in space-y-5 px-2 py-8 sm:px-4">
          {/* Compact Workspace Introduction */}
          <div className="space-y-2 text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"><Sparkles className="h-3 w-3" aria-hidden="true" /> RuangKerja</span>
            <h2 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100 sm:text-xl">
              Mulai sesuatu
            </h2>
            <p className="mx-auto max-w-md text-xs leading-relaxed text-slate-600 dark:text-slate-400 sm:text-sm">
              Analisis, tulis, riset, atau review kode. Mulai dari contoh atau ketik permintaanmu.
            </p>
          </div>

          <div className="mb-1 text-center text-[11px] font-medium text-slate-500 dark:text-slate-400">Pilih titik awal</div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {starterTasks.map((task) => (
              <button
                key={task.id}
                type="button"
                onClick={() => onSelectStarterTask(task.prompt)}
                className={`w-full p-2.5 rounded-xl text-left transition-all flex items-center justify-between group cursor-pointer active:scale-[0.99] border ${
                  task.primary
                    ? 'border-emerald-200 bg-emerald-50/70 shadow-xs hover:bg-emerald-50 dark:border-emerald-900/70 dark:bg-emerald-950/30 dark:hover:bg-emerald-950/50'
                    : 'border-slate-200 bg-white hover:border-emerald-200 hover:bg-emerald-50/40 hover:shadow-xs dark:border-slate-800 dark:bg-slate-900 dark:hover:border-emerald-900 dark:hover:bg-emerald-950/20'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0 pr-2">
                  <div className="p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700 shrink-0">
                    {task.icon}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 group-hover:text-emerald-700 dark:group-hover:text-emerald-300 transition-colors truncate">
                      {task.title}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      {task.subtitle}
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-colors shrink-0" />
              </button>
            ))}
          </div>
        </div>
      ) : (
        /* ACTIVE WORKSPACE STATE: Chat Messages Feed */
        <>
          {persistedMessageRows}

          {/* Active Streaming Preview */}
          {activeStreamingMessage && (
            <motion.div 
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-start"
            >
              <div className="flex items-center gap-1.5 mb-1 px-1 select-none text-xs text-slate-500 dark:text-slate-400">
                <Sparkles className="w-3 h-3 text-emerald-500 animate-pulse" />
                <span className="font-semibold text-slate-700 dark:text-slate-300">Asisten RuangKerja</span>
                <span>·</span>
                <span className="text-[10.5px] text-emerald-600 dark:text-emerald-400 font-medium">Menulis...</span>
              </div>

              <div className="mx-auto w-full max-w-4xl text-slate-800 dark:text-slate-100 leading-relaxed text-xs sm:text-sm">
                <div className="prose dark:prose-invert max-w-none text-xs sm:text-sm prose-p:my-1">
                  <StreamingMarkdownPreview content={activeStreamingMessage.content || '...'} />
                </div>
                <div className="mt-2.5 pt-2 border-t border-slate-200/70 dark:border-slate-800">
                  <RhythmicTypingIndicator label="Menyusun konten akademik di Canvas..." />
                </div>
              </div>
            </motion.div>
          )}
        </>
      )}

      {comparisonRun && <React.Suspense fallback={<div role="status" className="mx-auto w-full max-w-4xl py-3 text-center text-xs text-slate-500">Memuat perbandingan…</div>}>
        <WorkspaceComparisonPanel run={comparisonRun} onUseResponse={onUseComparisonResponse} onSendToCanvas={onComparisonSendToCanvas} onCompareAgain={onCompareAgain} />
      </React.Suspense>}

    </div>
  );
});

