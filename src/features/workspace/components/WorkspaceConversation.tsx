import React, { useRef, useEffect, useMemo, useCallback } from 'react';
import { Sparkles, ChevronRight, RefreshCw, FileText, Copy, Check, FilePlus2 } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { Message } from '../../chat/types';
import { StarterTaskItem, WorkspaceArtifact } from '../types';
import { LazyMarkdown } from '../../../components/common/LazyMarkdown';
import { RhythmicTypingIndicator } from '../../../components/ui/RhythmicTypingIndicator';
import { WorkspaceComparisonPanel } from './WorkspaceComparisonPanel';
import type { WorkspaceComparisonCandidate, WorkspaceComparisonRun } from '../types';

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
  onUseComparisonResponse = () => undefined,
  onComparisonSendToCanvas = () => undefined,
  onCompareAgain = () => undefined
}) => {
  const shouldReduceMotion = useReducedMotion();
  const scrollRafRef = useRef<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [copiedMessageId, setCopiedMessageId] = React.useState<string | null>(null);

  const hasUserSentMessage = messages.some(m => m.role === 'user') || isStreaming || messages.length > 1;

  // Follow new messages only while the reader is already near the bottom.
  useEffect(() => {
    if (scrollRafRef.current) {
      cancelAnimationFrame(scrollRafRef.current);
    }

    scrollRafRef.current = requestAnimationFrame(() => {
      const end = messagesEndRef.current;
      const scroller = end?.parentElement;
      if (!end || !scroller) return;
      const isNearBottom = scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight < 120;
      if (!isNearBottom) return;
      scroller.scrollTo({ top: scroller.scrollHeight, behavior: 'auto' });
    });

    return () => {
      if (scrollRafRef.current) {
        cancelAnimationFrame(scrollRafRef.current);
      }
    };
  }, [messages, activeStreamingMessage]);

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
      window.setTimeout(() => setCopiedMessageId(current => current === message.id ? null : current), 1400);
    } catch {
      setCopiedMessageId(null);
    }
  }, []);

  const persistedMessageRows = useMemo(() => (messages.map((msg) => (
            <motion.div 
              key={msg.id}
              initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={shouldReduceMotion ? { duration: 0.1 } : { duration: 0.15 }}
              className={`mx-auto flex w-full max-w-[56rem] flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              {/* Assistant Message Header */}
              {msg.role === 'assistant' && (
                <div className="flex items-center gap-1.5 mb-1 px-1 select-none text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                  <Sparkles className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Asisten RuangKerja</span>
                  {msg.modelUsed && (
                    <span 
                      className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-medium bg-emerald-100/70 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60"
                      title={msg.isFallback ? `${msg.fallbackFrom || 'Model utama'} gagal; respons diselesaikan dengan ${msg.modelUsed}.` : msg.routingReason || `Model yang digunakan: ${msg.modelUsed}`}
                    >
                      {msg.isFallback ? 'Fallback · ' : msg.routingMode === 'auto' ? 'Auto: ' : ''}{msg.modelUsed}
                    </span>
                  )}
                  <span>·</span>
                  <span className="font-mono text-[10.5px] opacity-75">{formatMessageTime(msg.createdAt)}</span>
                </div>
              )}

              {/* User Message Header */}
              {msg.role === 'user' && (
                <div className="flex items-center gap-1 mb-1 px-1 select-none text-[10.5px] font-mono text-slate-400">
                  <span>{formatMessageTime(msg.createdAt)}</span>
                </div>
              )}

              {/* User prompts stay compact; assistant content reads like a document. */}
              <div 
                className={`max-w-[92%] sm:max-w-[88%] leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-slate-100 dark:bg-slate-800/80 text-slate-800 dark:text-slate-100 rounded-xl rounded-tr-sm px-3 py-2 text-xs sm:text-sm font-normal'
                    : 'w-full max-w-full text-slate-800 dark:text-slate-100 text-xs sm:text-sm'
                }`}
              >
                <div className={`prose max-w-none text-xs sm:text-sm prose-p:my-1.5 prose-pre:my-1.5 ${
                  msg.role === 'user' 
                    ? 'text-white dark:text-slate-900 prose-headings:text-white dark:prose-headings:text-slate-900 prose-code:text-white dark:prose-code:text-slate-900' 
                    : 'dark:prose-invert text-slate-800 dark:text-slate-200'
                }`}>
                  <LazyMarkdown content={msg.content} />
                </div>

                {/* Error Retry Option */}
                {msg.error && (
                  <div className="mt-2.5 pt-2 border-t border-rose-200 dark:border-rose-900/50 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
                        if (lastUserMsg) {
                          onRetryMessage(lastUserMsg.content, msg.id);
                        }
                      }}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 dark:hover:bg-rose-900/80 text-rose-700 dark:text-rose-300 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Kirim Ulang Pesan</span>
                    </button>
                  </div>
                )}

                {/* Canvas Link Shortcut */}
                {msg.role === 'assistant' && artifacts.length > 0 && msg.content.includes('📦 **Artefak Aktif') && (
                  <div className="mt-2.5 pt-2 border-t border-slate-200/70 dark:border-slate-800 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={onOpenCanvas}
                      className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Buka Dokumen di Canvas &rarr;</span>
                    </button>
                  </div>
                )}
              </div>
              {msg.role === 'assistant' && !msg.error && (
                <div className="mt-1 flex items-center gap-0.5 text-[11px] text-slate-400">
                  <button type="button" onClick={() => { void copyMessage(msg); }} className="inline-flex h-7 items-center gap-1 rounded-md px-2 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500" aria-label="Salin jawaban">
                    {copiedMessageId === msg.id ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}{copiedMessageId === msg.id ? 'Tersalin' : 'Salin'}
                  </button>
                  {onSendToCanvas && <button type="button" onClick={() => onSendToCanvas(msg.content)} className="inline-flex h-7 items-center gap-1 rounded-md px-2 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"><FilePlus2 className="h-3.5 w-3.5" />Kirim ke Canvas</button>}
                </div>
              )}
            </motion.div>
))), [messages, shouldReduceMotion, artifacts, onRetryMessage, onOpenCanvas, onSendToCanvas, copiedMessageId, copyMessage, formatMessageTime]);

  return (
    <div role="log" aria-label="Percakapan RuangKerja" aria-live={isStreaming ? 'off' : 'polite'} className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-3.5 sm:p-5 space-y-4 custom-scrollbar flex flex-col">
      {isLoading ? (
        <div role="status" aria-label="Memuat percakapan" className="my-auto w-full max-w-lg mx-auto space-y-3 px-2">
          <div className="h-3 w-28 rounded bg-slate-200 dark:bg-slate-800 animate-pulse" />
          <div className="h-16 rounded-xl bg-slate-100 dark:bg-slate-900 animate-pulse" />
          <div className="h-12 w-4/5 ml-auto rounded-xl bg-slate-100 dark:bg-slate-900 animate-pulse" />
        </div>
      ) : !hasUserSentMessage && !activeStreamingMessage ? (
        /* FRESH WORKSPACE STATE: Compact Intro & Starter Tasks */
        <div className="my-auto py-6 px-2 space-y-4 animate-fade-in max-w-2xl mx-auto w-full">
          {/* Compact Workspace Introduction */}
          <div className="text-center space-y-1.5">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
              Mulai sesuatu
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
              Bantu riset, tulisan, coding, dan pekerjaan akademik secara terstruktur.
            </p>
          </div>

          {/* Compact Starter Actions List */}
          <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
            {starterTasks.map((task) => (
              <button
                key={task.id}
                type="button"
                onClick={() => onSelectStarterTask(task.prompt)}
                className={`w-full p-2.5 rounded-xl text-left transition-all flex items-center justify-between group cursor-pointer active:scale-[0.99] border ${
                  task.primary
                    ? 'bg-emerald-50/60 dark:bg-emerald-950/25 border-emerald-200/70 dark:border-emerald-900/70 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                    : 'bg-transparent border-transparent hover:border-slate-200/70 dark:hover:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900'
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

              <div className="mx-auto w-full max-w-[56rem] text-slate-800 dark:text-slate-100 leading-relaxed text-xs sm:text-sm">
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

      <WorkspaceComparisonPanel run={comparisonRun} onUseResponse={onUseComparisonResponse} onSendToCanvas={onComparisonSendToCanvas} onCompareAgain={onCompareAgain} />

      <div ref={messagesEndRef} />
    </div>
  );
});

