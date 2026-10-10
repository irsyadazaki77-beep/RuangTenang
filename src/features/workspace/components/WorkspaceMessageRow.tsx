import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Sparkles, RefreshCw, FileText, Copy, Check, FilePlus2 } from 'lucide-react';
import type { Message } from '../../chat/types';
import { LazyMarkdown } from '../../../components/common/LazyMarkdown';
import type { FileSourceReference } from '../../../../shared/contracts/files';

function ResearchCitationContent({ content, sources, onOpenSource }: { content: string; sources: NonNullable<Message['sources']>; onOpenSource: (source: FileSourceReference) => void }) {
  const byId = new Map(sources.filter(source => source.citationId).map(source => [source.citationId!, source]));
  const parts: Array<{ text?: string; id?: string }> = [];
  const marker = /\[cite:([A-Za-z0-9_-]+)\]/g;
  let cursor = 0; let match: RegExpExecArray | null;
  while ((match = marker.exec(content))) {
    if (match.index > cursor) parts.push({ text: content.slice(cursor, match.index) });
    parts.push(byId.has(match[1]) ? { id: match[1] } : { text: '[referensi sumber tidak dikenali]' });
    cursor = marker.lastIndex;
  }
  if (cursor < content.length) parts.push({ text: content.slice(cursor) });
  return <>{parts.map((part, index) => part.id ? <button key={`cite-${index}`} type="button" onClick={() => onOpenSource(byId.get(part.id!)!)} title={byId.get(part.id!)?.sourceRef} className="rounded bg-emerald-100 px-1 font-semibold text-emerald-800 underline decoration-dotted underline-offset-2 dark:bg-emerald-950 dark:text-emerald-200">[{part.id!.replace('SRC_', '')}]</button> : <LazyMarkdown key={`text-${index}`} content={part.text || ''} />)}</>;
}

export interface WorkspaceMessageRowProps {
  message: Message;
  lastUserPrompt?: string;
  isHighlighted: boolean;
  showArtifactLink: boolean;
  isCopied: boolean;
  onRetryMessage: (lastUserPrompt: string, errorMsgId: string) => void;
  onOpenCanvas: () => void;
  onOpenSource: (source: FileSourceReference) => void;
  onSendToCanvas?: (content: string) => void;
  onCopyMessage: (message: Message) => void;
  formatMessageTime: (date?: Date | string) => string;
}

export const WorkspaceMessageRow = React.memo(function WorkspaceMessageRow({
  message: msg,
  lastUserPrompt,
  isHighlighted,
  showArtifactLink,
  isCopied,
  onRetryMessage,
  onOpenCanvas,
  onOpenSource,
  onSendToCanvas,
  onCopyMessage,
  formatMessageTime
}: WorkspaceMessageRowProps) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      data-workspace-message-id={msg.id}
      initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={shouldReduceMotion ? { duration: 0.1 } : { duration: 0.15 }}
      className={`mx-auto flex w-full max-w-4xl flex-col items-start rounded-lg transition-colors ${isHighlighted ? 'bg-emerald-50/70 ring-1 ring-emerald-300 dark:bg-emerald-950/30 dark:ring-emerald-800' : ''}`}
    >
      {msg.role === 'assistant' && (
        <div className="flex items-center gap-1.5 mb-1 px-1 select-none text-xs text-slate-500 dark:text-slate-400 flex-wrap">
          <Sparkles className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
          <span className="font-semibold text-slate-700 dark:text-slate-300">Asisten RuangKerja</span>
          {msg.modelUsed && <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-medium bg-emerald-100/70 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60" title={msg.isFallback ? `${msg.fallbackFrom || 'Model utama'} gagal; respons diselesaikan dengan ${msg.modelUsed}.` : msg.routingReason || `Model yang digunakan: ${msg.modelUsed}`}>
            {msg.isFallback ? 'Fallback · ' : msg.routingMode === 'auto' ? 'Auto: ' : ''}{msg.modelUsed}
          </span>}
          <span>·</span>
          <span className="font-mono text-[10.5px] opacity-75">{formatMessageTime(msg.createdAt)}</span>
        </div>
      )}
      {msg.role === 'user' && <div className="flex items-center gap-1 mb-1 px-1 select-none text-[10.5px] font-mono text-slate-400"><span className="font-sans font-semibold text-slate-500 dark:text-slate-400">Anda</span><span>·</span><span>{formatMessageTime(msg.createdAt)}</span></div>}
      <div className={`w-full max-w-full leading-relaxed ${msg.role === 'user' ? 'border-l-2 border-slate-200 bg-slate-50/70 px-3 py-2 text-slate-800 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-100 text-xs sm:text-sm font-normal' : 'w-full max-w-full text-slate-800 dark:text-slate-100 text-xs sm:text-sm'}`}>
        <div className={`prose max-w-none text-xs sm:text-sm prose-p:my-1.5 prose-pre:my-1.5 ${msg.role === 'user' ? 'text-white dark:text-slate-900 prose-headings:text-white dark:prose-headings:text-slate-900 prose-code:text-white dark:prose-code:text-slate-900' : 'dark:prose-invert text-slate-800 dark:text-slate-200'}`}>
          {msg.sources?.some(source => source.citationId) ? <ResearchCitationContent content={msg.content} sources={msg.sources} onOpenSource={onOpenSource} /> : <LazyMarkdown content={msg.content} />}
        </div>
        {msg.role === 'assistant' && msg.sources?.length ? <details className="mt-2 rounded-lg border border-slate-200 bg-slate-50/70 px-2.5 py-2 text-[10px] dark:border-slate-800 dark:bg-slate-900/60"><summary className="cursor-pointer font-semibold text-slate-600 dark:text-slate-300">Evidence · {msg.sources.length}</summary><ul className="mt-2 space-y-1.5">{msg.sources.map((source, index) => <li key={`${source.documentId}:${source.sourceRef}:${index}`} className="leading-5 text-slate-600 dark:text-slate-400"><button type="button" onClick={() => onOpenSource(source)} className="text-left hover:text-emerald-700 dark:hover:text-emerald-300"><span className="font-medium text-slate-700 dark:text-slate-200">{source.filename}</span>{source.sourceRef && source.sourceRef !== source.filename && <span> · {source.sourceRef}</span>}</button>{source.citationId && <span className="ml-1 rounded bg-slate-200 px-1 dark:bg-slate-700">{source.citationId}</span>}{source.snippet && <p className="mt-0.5 line-clamp-3">{source.snippet}</p>}</li>)}</ul></details> : null}
        {msg.error && <div className="mt-2.5 pt-2 border-t border-rose-200 dark:border-rose-900/50 flex items-center gap-2"><button type="button" disabled={!lastUserPrompt} onClick={() => lastUserPrompt && onRetryMessage(lastUserPrompt, msg.id)} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 dark:hover:bg-rose-900/80 text-rose-700 dark:text-rose-300 rounded-lg text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"><RefreshCw className="w-3.5 h-3.5" /><span>Kirim Ulang Pesan</span></button></div>}
        {msg.role === 'assistant' && showArtifactLink && msg.content.includes('📦 **Artefak Aktif') && <div className="mt-2.5 pt-2 border-t border-slate-200/70 dark:border-slate-800 flex items-center justify-between"><button type="button" onClick={onOpenCanvas} className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold hover:underline flex items-center gap-1 cursor-pointer"><FileText className="w-3.5 h-3.5" /><span>Buka Dokumen di Canvas &rarr;</span></button></div>}
      </div>
      {msg.role === 'assistant' && !msg.error && <div className="mt-1 flex items-center gap-0.5 text-[11px] text-slate-400"><button type="button" onClick={() => onCopyMessage(msg)} className="inline-flex h-7 items-center gap-1 rounded-md px-2 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500" aria-label="Salin jawaban">{isCopied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}{isCopied ? 'Tersalin' : 'Salin'}</button>{onSendToCanvas && <button type="button" onClick={() => onSendToCanvas(msg.content)} className="inline-flex h-7 items-center gap-1 rounded-md px-2 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"><FilePlus2 className="h-3.5 w-3.5" />Kirim ke Canvas</button>}</div>}
    </motion.div>
  );
}, (previous, next) => previous.message === next.message &&
  previous.lastUserPrompt === next.lastUserPrompt &&
  previous.isHighlighted === next.isHighlighted &&
  previous.showArtifactLink === next.showArtifactLink &&
  previous.isCopied === next.isCopied &&
  previous.onRetryMessage === next.onRetryMessage &&
  previous.onOpenCanvas === next.onOpenCanvas &&
  previous.onOpenSource === next.onOpenSource &&
  previous.onSendToCanvas === next.onSendToCanvas &&
  previous.onCopyMessage === next.onCopyMessage &&
  previous.formatMessageTime === next.formatMessageTime);
