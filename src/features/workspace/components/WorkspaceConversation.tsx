import React, { useRef, useEffect } from 'react';
import { Sparkles, ChevronRight, RefreshCw, FileText } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { Message } from '../../chat/types';
import { StarterTaskItem, WorkspaceArtifact } from '../types';
import { LazyMarkdown } from '../../../components/common/LazyMarkdown';
import { RhythmicTypingIndicator } from '../../../components/ui/RhythmicTypingIndicator';

interface WorkspaceConversationProps {
  messages: Message[];
  activeStreamingMessage: Message | null;
  isStreaming: boolean;
  artifacts: WorkspaceArtifact[];
  starterTasks: StarterTaskItem[];
  onSelectStarterTask: (prompt: string) => void;
  onRetryMessage: (lastUserPrompt: string, errorMsgId: string) => void;
  onOpenCanvas: () => void;
}

export const WorkspaceConversation: React.FC<WorkspaceConversationProps> = ({
  messages,
  activeStreamingMessage,
  isStreaming,
  artifacts,
  starterTasks,
  onSelectStarterTask,
  onRetryMessage,
  onOpenCanvas
}) => {
  const shouldReduceMotion = useReducedMotion();
  const scrollRafRef = useRef<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const hasUserSentMessage = messages.some(m => m.role === 'user') || isStreaming || messages.length > 1;

  // Auto scroll to latest chat message
  useEffect(() => {
    if (scrollRafRef.current) {
      cancelAnimationFrame(scrollRafRef.current);
    }

    scrollRafRef.current = requestAnimationFrame(() => {
      if (!messagesEndRef.current) return;
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    });

    return () => {
      if (scrollRafRef.current) {
        cancelAnimationFrame(scrollRafRef.current);
      }
    };
  }, [messages, activeStreamingMessage]);

  const formatMessageTime = (date?: Date | string) => {
    if (!date) return '';
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex-1 overflow-y-auto p-3.5 sm:p-5 space-y-4 custom-scrollbar flex flex-col min-h-0">
      {!hasUserSentMessage && !activeStreamingMessage ? (
        /* FRESH WORKSPACE STATE: Compact Intro & Starter Tasks */
        <div className="my-auto py-6 px-2 space-y-6 animate-fade-in max-w-lg mx-auto w-full">
          {/* Compact Workspace Introduction */}
          <div className="text-center space-y-1.5">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
              Asisten Akademik
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
              Bantu riset, tulisan, coding, dan pekerjaan akademik secara terstruktur.
            </p>
          </div>

          {/* Compact Starter Actions List */}
          <div className="space-y-1.5">
            {starterTasks.map((task) => (
              <button
                key={task.id}
                type="button"
                onClick={() => onSelectStarterTask(task.prompt)}
                className={`w-full p-2.5 rounded-xl text-left transition-all flex items-center justify-between group cursor-pointer active:scale-[0.99] border ${
                  task.primary
                    ? 'bg-emerald-50/50 dark:bg-emerald-950/30 border-emerald-300/80 dark:border-emerald-800/80 hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/50'
                    : 'bg-slate-50/70 dark:bg-slate-900/70 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-100/60 dark:hover:bg-slate-800/60'
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
          {messages.map((msg) => (
            <motion.div 
              key={msg.id}
              initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={shouldReduceMotion ? { duration: 0.1 } : { duration: 0.15 }}
              className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              {/* Assistant Message Header */}
              {msg.role === 'assistant' && (
                <div className="flex items-center gap-1.5 mb-1 px-1 select-none text-xs text-slate-500 dark:text-slate-400">
                  <Sparkles className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Asisten RuangKerja</span>
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

              {/* Message Content Bubble */}
              <div 
                className={`max-w-[92%] sm:max-w-[88%] leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-xl rounded-tr-xs px-3.5 py-2.5 text-xs sm:text-sm font-normal'
                    : 'bg-slate-50/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 text-slate-800 dark:text-slate-100 rounded-xl rounded-tl-xs p-3.5 text-xs sm:text-sm'
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
            </motion.div>
          ))}

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

              <div className="max-w-[92%] sm:max-w-[88%] rounded-xl rounded-tl-xs p-3.5 bg-slate-50/90 dark:bg-slate-900/90 border border-emerald-300/80 dark:border-emerald-800/80 text-slate-800 dark:text-slate-100 leading-relaxed text-xs sm:text-sm">
                <div className="prose dark:prose-invert max-w-none text-xs sm:text-sm prose-p:my-1">
                  <LazyMarkdown content={activeStreamingMessage.content || '...'} />
                </div>
                <div className="mt-2.5 pt-2 border-t border-slate-200/70 dark:border-slate-800">
                  <RhythmicTypingIndicator label="Menyusun konten akademik di Canvas..." />
                </div>
              </div>
            </motion.div>
          )}
        </>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
};
