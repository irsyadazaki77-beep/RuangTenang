import React, { useState, useCallback, useEffect } from 'react';
import { useReducedMotion } from 'motion/react';
import { RefreshCw, FileText, Copy, Check, FilePlus2, AlertCircle, Volume2, VolumeX, Edit2 } from 'lucide-react';
import { BrandLogo } from '../../../components/ui/BrandLogo';
import type { Message } from '../../chat/types';
import { LazyMarkdown } from '../../../components/common/LazyMarkdown';
import type { FileSourceReference } from '../../../../shared/contracts/files';

function getSourceCategoryBadge(source?: FileSourceReference) {
  if (!source) return { label: 'Inferensi AI', color: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' };
  if (source.url || source.filename.toLowerCase().includes('web') || source.documentId?.startsWith('web_')) {
    return { label: 'Web · belum diverifikasi', color: 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300' };
  }
  return { label: 'Rujukan dokumen', color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300' };
}

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
  return <>{parts.map((part, index) => {
    if (!part.id) return <LazyMarkdown key={`text-${index}`} content={part.text || ''} />;
    const src = byId.get(part.id);
    const badge = getSourceCategoryBadge(src);
    const tooltip = `${src?.sourceRef || 'Sumber'} (${badge.label})`;
    return (
      <button
        key={`cite-${index}`}
        type="button"
        onClick={() => src && onOpenSource(src)}
        title={tooltip}
        className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.2 mx-0.5 text-[11px] font-semibold underline decoration-dotted underline-offset-2 transition-colors cursor-pointer ${badge.color}`}
      >
        <span>[{part.id.replace('SRC_', '')}]</span>
      </button>
    );
  })}</>;
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
  onEditUserMessage?: (messageId: string, newContent: string) => void;
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
  onEditUserMessage,
  formatMessageTime
}: WorkspaceMessageRowProps) {
  const shouldReduceMotion = useReducedMotion();
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(msg.content);

  useEffect(() => {
    setEditContent(msg.content);
  }, [msg.content]);

  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const handleToggleSpeech = useCallback(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return;
    }

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    } else {
      window.speechSynthesis.cancel();

      const cleanText = msg.content
        .replace(/```[\s\S]*?```/g, '')
        .replace(/`([^`]+)`/g, '$1')
        .replace(/\*\*([^*]+)\*\*/g, '$1')
        .replace(/^[#\-*+]\s+/gm, '')
        .trim();

      if (!cleanText) return;

      const utterance = new SpeechSynthesisUtterance(cleanText);
      const voices = window.speechSynthesis.getVoices();
      const idVoice = voices.find(v => v.lang.includes('id') || v.lang.includes('ID'));
      if (idVoice) {
        utterance.voice = idVoice;
      }
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      window.speechSynthesis.speak(utterance);
      setIsSpeaking(true);
    }
  }, [isSpeaking, msg.content]);

  const handleSaveEdit = useCallback(() => {
    if (editContent.trim() && editContent !== msg.content) {
      onEditUserMessage?.(msg.id, editContent);
    }
    setIsEditing(false);
  }, [editContent, msg.content, msg.id, onEditUserMessage]);

  return (
    <div
      data-workspace-message-id={msg.id}
      className={`workspace-message-row workspace-message-virtualized mx-auto flex w-full max-w-4xl flex-col items-start rounded-lg transition-colors group ${shouldReduceMotion ? '' : 'animate-fade-in'} ${isHighlighted ? 'bg-indigo-50/70 ring-1 ring-indigo-300 dark:bg-indigo-950/30 dark:ring-indigo-800' : ''}`}
    >
      {msg.role === 'assistant' && (
        <div className="flex items-center gap-1.5 mb-1 px-1 select-none text-xs text-slate-500 dark:text-slate-400 flex-wrap">
          <BrandLogo mode="RUANG_KERJA" size="xs" iconOnly />
          <span className="font-semibold text-slate-700 dark:text-slate-300">Asisten RuangKerja</span>
          {msg.modelUsed && <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-medium bg-indigo-100/70 dark:bg-indigo-950/70 text-indigo-800 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60" title={msg.isFallback ? `${msg.fallbackFromName || 'Model utama'} gagal; respons diselesaikan dengan ${msg.modelName || msg.modelUsed}.` : msg.routingReason || `Model yang digunakan: ${msg.modelName || msg.modelUsed}`}>
            {msg.isFallback ? 'Fallback · ' : msg.routingMode === 'auto' ? 'Auto: ' : ''}{msg.modelName || msg.modelUsed}
          </span>}
          {msg.degradationNotice && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-medium bg-amber-100/80 dark:bg-amber-950/80 text-amber-900 dark:text-amber-200 border border-amber-300/70 dark:border-amber-800/70" title={msg.degradationNotice}>
              Penyesuaian: {msg.degradationNotice}
            </span>
          )}
          <span>·</span>
          <span className="font-mono text-[10.5px] opacity-75">{formatMessageTime(msg.createdAt)}</span>
        </div>
      )}
      {msg.role === 'user' && (
        <div className="flex items-center justify-between w-full mb-1 px-1 select-none text-[10.5px] font-mono text-slate-400">
          <div className="flex items-center gap-1">
            <span className="font-sans font-semibold text-slate-600 dark:text-slate-300">Anda</span>
            <span>·</span>
            <span>{formatMessageTime(msg.createdAt)}</span>
          </div>
          {!isEditing && onEditUserMessage && (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100 transition-opacity inline-flex items-center gap-1 text-[11px] font-sans text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer"
              aria-label="Edit pesan"
              title="Edit pertanyaan ini"
            >
              <Edit2 className="w-3 h-3" />
              <span>Edit</span>
            </button>
          )}
        </div>
      )}
      <div className={`w-full max-w-full leading-relaxed ${msg.error ? 'rounded-xl border border-rose-300 bg-rose-50/90 p-3.5 text-rose-900 shadow-xs dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-100' : msg.role === 'user' ? 'rounded-xl border border-slate-200/80 bg-slate-100/80 px-3.5 py-2.5 text-slate-900 selection:bg-indigo-200 selection:text-slate-900 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-100 dark:selection:bg-indigo-900 dark:selection:text-indigo-100 text-xs sm:text-sm font-normal' : 'w-full max-w-full text-slate-800 dark:text-slate-100 text-xs sm:text-sm selection:bg-indigo-100 selection:text-indigo-900 dark:selection:bg-indigo-950 dark:selection:text-indigo-100'}`}>
        {isEditing && msg.role === 'user' ? (
          <div className="flex flex-col gap-2">
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  handleSaveEdit();
                } else if (e.key === 'Escape') {
                  e.preventDefault();
                  setEditContent(msg.content);
                  setIsEditing(false);
                }
              }}
              className="w-full rounded-lg border border-indigo-300 bg-white p-2.5 text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-indigo-800 dark:bg-slate-950 dark:text-slate-100"
              rows={3}
              autoFocus
            />
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-400 hidden sm:inline">Tekan Ctrl+Enter untuk kirim, Esc untuk batal</span>
              <div className="flex justify-end gap-1.5 ml-auto">
                <button
                  type="button"
                  onClick={() => {
                    setEditContent(msg.content);
                    setIsEditing(false);
                  }}
                  className="rounded-md px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  disabled={!editContent.trim()}
                  className="rounded-md bg-indigo-600 px-2.5 py-1 text-xs font-semibold text-white shadow-2xs hover:bg-indigo-700 disabled:opacity-50"
                >
                  Simpan &amp; Kirim
                </button>
              </div>
            </div>
          </div>
        ) : msg.error ? (
          <div className="space-y-2">
            <div className="flex items-start gap-2 text-rose-700 dark:text-rose-300">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
              <div className="flex-1 text-xs sm:text-sm font-medium leading-relaxed">
                {msg.content}
              </div>
            </div>
            <div className="pt-2 flex items-center gap-2">
              <button
                type="button"
                disabled={!lastUserPrompt}
                onClick={() => lastUserPrompt && onRetryMessage(lastUserPrompt, msg.id)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Kirim Ulang Pesan</span>
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className={`prose max-w-none text-xs sm:text-sm prose-p:my-1.5 prose-pre:my-1.5 ${msg.role === 'user' ? 'text-slate-900 dark:text-slate-100 prose-headings:text-slate-900 dark:prose-headings:text-slate-100 prose-code:text-slate-900 dark:prose-code:text-slate-100 prose-a:text-indigo-600 dark:prose-a:text-indigo-400' : 'dark:prose-invert text-slate-800 dark:text-slate-200 prose-headings:text-slate-900 dark:prose-headings:text-slate-100 prose-code:text-slate-800 dark:prose-code:text-slate-200 prose-a:text-indigo-600 dark:prose-a:text-indigo-400'}`}>
              {msg.sources?.some(source => source.citationId) ? <ResearchCitationContent content={msg.content} sources={msg.sources} onOpenSource={onOpenSource} /> : <LazyMarkdown content={msg.content} />}
            </div>
            {msg.role === 'assistant' && msg.sources?.length ? (
              <details className="mt-2 rounded-lg border border-slate-200 bg-slate-50/70 px-2.5 py-2 text-[10px] dark:border-slate-800 dark:bg-slate-900/60">
                <summary className="cursor-pointer font-semibold text-slate-600 dark:text-slate-300">
                  Sumber yang dirujuk · {msg.sources.length}
                </summary>
                <p className="mt-1 text-slate-500 dark:text-slate-400">Daftar ini menunjukkan sumber yang dicantumkan. Dukungan sumber terhadap klaim belum diverifikasi otomatis.</p>
                <ul className="mt-2 space-y-2">
                  {msg.sources.map((source, index) => {
                    const badge = getSourceCategoryBadge(source);
                    return (
                      <li key={`${source.documentId}:${source.sourceRef}:${index}`} className="leading-5 text-slate-600 dark:text-slate-400">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => onOpenSource(source)}
                            className="text-left font-medium text-slate-700 hover:text-indigo-700 hover:underline dark:text-slate-200 dark:hover:text-indigo-300"
                          >
                            <span>{source.filename}</span>
                            {source.sourceRef && source.sourceRef !== source.filename && <span> · {source.sourceRef}</span>}
                          </button>
                          <span className={`rounded px-1.5 py-0.2 text-[9px] font-semibold ${badge.color}`}>
                            {badge.label}
                          </span>
                          {source.citationId && (
                            <span className="rounded bg-slate-200 px-1 font-mono text-[9px] dark:bg-slate-700">
                              {source.citationId}
                            </span>
                          )}
                        </div>
                        {source.snippet && <p className="mt-0.5 line-clamp-3 text-[9.5px] italic text-slate-500">{source.snippet}</p>}
                      </li>
                    );
                  })}
                </ul>
              </details>
            ) : null}
            {msg.role === 'assistant' && showArtifactLink && msg.content.includes('📦 **Artefak Aktif') && <div className="mt-2.5 pt-2 border-t border-slate-200/70 dark:border-slate-800 flex items-center justify-between"><button type="button" onClick={onOpenCanvas} className="text-xs text-indigo-700 dark:text-indigo-400 font-semibold hover:underline flex items-center gap-1 cursor-pointer"><FileText className="w-3.5 h-3.5" /><span>Buka Dokumen di Canvas &rarr;</span></button></div>}
          </>
        )}
      </div>
      {msg.role === 'assistant' && !msg.error && (
        <div className="mt-1 flex flex-wrap items-center gap-1 text-[11px] text-slate-400">
          <button
            type="button"
            onClick={() => onCopyMessage(msg)}
            className="inline-flex min-h-7 items-center gap-1.5 rounded-md px-2 py-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            aria-label="Salin jawaban"
          >
            {isCopied ? <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
            <span>{isCopied ? 'Tersalin' : 'Salin'}</span>
          </button>
          {lastUserPrompt && (
            <button
              type="button"
              onClick={() => onRetryMessage(lastUserPrompt, msg.id)}
              className="inline-flex min-h-7 items-center gap-1.5 rounded-md px-2 py-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              aria-label="Buat ulang respon ini"
              title="Buat ulang respon ini (Regenerate)"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Regenerasi</span>
            </button>
          )}
          <button
            type="button"
            onClick={handleToggleSpeech}
            className={`inline-flex min-h-7 items-center gap-1.5 rounded-md px-2 py-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
              isSpeaking
                ? 'bg-indigo-100 text-indigo-700 font-medium dark:bg-indigo-950/60 dark:text-indigo-300'
                : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200'
            }`}
            aria-label={isSpeaking ? 'Hentikan pembacaan suara' : 'Dengarkan suara (Read Aloud)'}
            title={isSpeaking ? 'Hentikan pembacaan suara' : 'Dengarkan suara (Read Aloud)'}
          >
            {isSpeaking ? <VolumeX className="h-3.5 w-3.5 animate-pulse text-indigo-600 dark:text-indigo-400" /> : <Volume2 className="h-3.5 w-3.5" />}
            <span>{isSpeaking ? 'Berhenti' : 'Baca Suara'}</span>
          </button>
          {onSendToCanvas && (
            <button
              type="button"
              onClick={() => onSendToCanvas(msg.content)}
              className="inline-flex min-h-7 items-center gap-1.5 rounded-md px-2 py-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              aria-label="Kirim ke Canvas"
            >
              <FilePlus2 className="h-3.5 w-3.5 text-indigo-500" />
              <span>Kirim ke Canvas</span>
            </button>
          )}
        </div>
      )}
    </div>
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
  previous.onEditUserMessage === next.onEditUserMessage &&
  previous.formatMessageTime === next.formatMessageTime);
