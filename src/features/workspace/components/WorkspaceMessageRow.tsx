import React, { useState, useCallback, useEffect } from 'react';
import { useReducedMotion } from 'motion/react';
import {
  RefreshCw,
  FileText,
  Copy,
  Check,
  FilePlus2,
  AlertCircle,
  Volume2,
  VolumeX,
  Edit2,
  ArrowUpRight,
  FastForward
} from 'lucide-react';
import { BrandLogo } from '../../../components/ui/BrandLogo';
import type { Message } from '../../chat/types';
import { LazyMarkdown } from '../../../components/common/LazyMarkdown';
import type { FileSourceReference } from '../../../../shared/contracts/files';
import { ThinkingReasoningDrawer } from '../../../components/ai/ThinkingReasoningDrawer';
import { GroundingSourcesBar } from '../../../components/ai/GroundingSourcesBar';

function getSourceCategoryBadge(source?: FileSourceReference) {
  if (!source) return { label: 'Inferensi AI', color: 'text-amber-700 dark:text-amber-300' };
  if (source.url || source.filename.toLowerCase().includes('web') || source.documentId?.startsWith('web_')) {
    return { label: 'Web', color: 'text-sky-700 dark:text-sky-300' };
  }
  return { label: 'Dokumen', color: 'text-indigo-700 dark:text-indigo-300' };
}

function ResearchCitationContent({
  content,
  sources,
  onOpenSource
}: {
  content: string;
  sources: NonNullable<Message['sources']>;
  onOpenSource: (source: FileSourceReference) => void;
}) {
  const byId = new Map(sources.filter(source => source.citationId).map(source => [source.citationId!, source]));
  const parts: Array<{ text?: string; id?: string }> = [];
  const marker = /\[cite:([A-Za-z0-9_-]+)\]/g;
  let cursor = 0;
  let match: RegExpExecArray | null;
  while ((match = marker.exec(content))) {
    if (match.index > cursor) parts.push({ text: content.slice(cursor, match.index) });
    parts.push(byId.has(match[1]) ? { id: match[1] } : { text: '[referensi sumber tidak dikenali]' });
    cursor = marker.lastIndex;
  }
  if (cursor < content.length) parts.push({ text: content.slice(cursor) });
  return (
    <>
      {parts.map((part, index) => {
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
            className="inline-flex items-center gap-0.5 rounded-md bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 mx-0.5 text-[11px] font-mono font-semibold text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 transition-colors cursor-pointer"
          >
            <span>[{part.id.replace('SRC_', '')}]</span>
          </button>
        );
      })}
    </>
  );
}

export interface WorkspaceMessageRowProps {
  message: Message;
  lastUserPrompt?: string;
  isHighlighted: boolean;
  showArtifactLink: boolean;
  activeArtifactTitle?: string;
  isCopied: boolean;
  onRetryMessage: (lastUserPrompt: string, errorMsgId: string) => void;
  onOpenCanvas: () => void;
  onOpenSource: (source: FileSourceReference) => void;
  onSendToCanvas?: (content: string) => void;
  onCopyMessage: (message: Message) => void;
  onEditUserMessage?: (messageId: string, newContent: string) => void;
  onContinueMessage?: (message: Message) => void;
  formatMessageTime: (date?: Date | string) => string;
}

export const WorkspaceMessageRow = React.memo(function WorkspaceMessageRow({
  message: msg,
  lastUserPrompt,
  isHighlighted,
  showArtifactLink,
  activeArtifactTitle,
  isCopied,
  onRetryMessage,
  onOpenCanvas,
  onOpenSource,
  onSendToCanvas,
  onCopyMessage,
  onEditUserMessage,
  onContinueMessage,
  formatMessageTime: _formatMessageTime
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

  const hasArtifactMarker = msg.content.includes('📦 **Artefak Aktif') || msg.content.includes('<artifact') || msg.content.includes(':::artifact');
  const isDefaultWelcomeArtifact = !activeArtifactTitle || activeArtifactTitle === 'Panduan Asisten RuangKerja';
  const shouldShowInlineCanvasCard =
    msg.role === 'assistant' &&
    !msg.error &&
    showArtifactLink &&
    hasArtifactMarker &&
    !isDefaultWelcomeArtifact;

  const cleanTrimmed = msg.content.trim();
  const isPotentiallyTruncated =
    msg.role === 'assistant' &&
    !msg.error &&
    cleanTrimmed.length > 80 &&
    !/[.!?:;\n)\]*`~"']$/.test(cleanTrimmed) &&
    !cleanTrimmed.endsWith('```');

  if (msg.role === 'user') {
    return (
      <div
        data-workspace-message-id={msg.id}
        className={`workspace-message-row workspace-message-virtualized mx-auto flex w-full max-w-3xl justify-end group ${
          shouldReduceMotion ? '' : 'animate-fade-in'
        } ${isHighlighted ? 'rounded-2xl bg-indigo-50/70 p-1.5 ring-1 ring-indigo-300 dark:bg-indigo-950/30 dark:ring-indigo-800' : ''}`}
      >
        <div className="relative max-w-[85%] sm:max-w-[75%]">
          {isEditing ? (
            <div className="flex flex-col gap-2.5 min-w-[260px] sm:min-w-[360px] rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3.5 shadow-md">
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
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 p-2.5 text-[15px] leading-relaxed text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 resize-none"
                rows={3}
                autoFocus
              />
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10.5px] text-slate-400 hidden sm:inline">Ctrl+Enter untuk kirim · Esc batal</span>
                <div className="flex justify-end gap-1.5 ml-auto">
                  <button
                    type="button"
                    onClick={() => {
                      setEditContent(msg.content);
                      setIsEditing(false);
                    }}
                    className="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveEdit}
                    disabled={!editContent.trim()}
                    className="rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-indigo-700 disabled:opacity-50 cursor-pointer"
                  >
                    Simpan &amp; Kirim
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="group/user relative inline-block">
              <div className="rounded-3xl rounded-br-md border border-slate-200/75 dark:border-slate-800 bg-slate-100/90 dark:bg-slate-800/85 px-4 py-2.5 sm:px-5 sm:py-3 text-[15px] leading-[1.65] text-slate-900 dark:text-slate-100 break-words shadow-2xs selection:bg-indigo-200 selection:text-slate-900 dark:selection:bg-indigo-900 dark:selection:text-indigo-100">
                <div className="prose max-w-none text-[15px] leading-[1.65] prose-p:my-1 text-slate-900 dark:text-slate-100 prose-headings:text-slate-900 dark:prose-headings:text-slate-100 prose-code:text-slate-900 dark:prose-code:text-slate-100">
                  <LazyMarkdown content={msg.content} />
                </div>
              </div>

              {/* Hover actions for user message */}
              <div className="absolute -left-20 top-1/2 -translate-y-1/2 flex items-center gap-0.5 opacity-80 sm:opacity-0 sm:group-hover/user:opacity-100 transition-opacity">
                <button
                  type="button"
                  onClick={() => onCopyMessage(msg)}
                  className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
                  title="Salin pesan"
                  aria-label="Salin pesan"
                >
                  {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
                {onEditUserMessage && (
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
                    aria-label="Edit pesan"
                    title="Edit pertanyaan ini"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      data-workspace-message-id={msg.id}
      className={`workspace-message-row workspace-message-virtualized mx-auto flex w-full max-w-3xl gap-3 sm:gap-3.5 items-start rounded-2xl transition-colors group ${
        shouldReduceMotion ? '' : 'animate-fade-in'
      } ${isHighlighted ? 'bg-indigo-50/70 p-2 ring-1 ring-indigo-300 dark:bg-indigo-950/30 dark:ring-indigo-800' : ''}`}
    >
      <BrandLogo mode="RUANG_KERJA" size="xs" iconOnly className="shrink-0 mt-1" />

      <div className="flex-1 min-w-0 max-w-full space-y-2.5">
        {(msg.isFallback || msg.degradationNotice) && (
          <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500 select-none">
            {msg.isFallback && msg.modelUsed && (
              <span
                title={`${msg.fallbackFromName || 'Model utama'} gagal; respons diselesaikan dengan ${msg.modelName || msg.modelUsed}.`}
              >
                Fallback · {msg.modelName || msg.modelUsed}
              </span>
            )}
            {msg.degradationNotice && (
              <span className="text-amber-700 dark:text-amber-400" title={msg.degradationNotice}>
                {msg.isFallback ? '· ' : ''}Penyesuaian: {msg.degradationNotice}
              </span>
            )}
          </div>
        )}

        {msg.error ? (
          <div className="rounded-2xl border border-rose-300 bg-rose-50/90 p-3.5 text-rose-900 shadow-xs dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-100 space-y-2">
            <div className="flex items-start gap-2 text-rose-700 dark:text-rose-300">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
              <div className="flex-1 text-xs sm:text-sm font-medium leading-relaxed">
                {msg.content}
              </div>
            </div>
            <div className="pt-1 flex items-center gap-2">
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
            {msg.reasoningSteps && msg.reasoningSteps.length > 0 && (
              <ThinkingReasoningDrawer
                steps={msg.reasoningSteps}
                durationMs={msg.thinkingDurationMs}
                thinkingDepth={msg.thinkingDepth}
                webSearchUsed={msg.webSearchUsed}
                isStreaming={false}
                accent="indigo"
              />
            )}
            <div
              data-assistant-prose="true"
              className="prose dark:prose-invert max-w-none break-words text-[15px] leading-[1.7] prose-p:my-2 prose-pre:my-2.5 text-slate-800 dark:text-slate-200 prose-headings:text-slate-900 dark:prose-headings:text-slate-100 prose-code:text-slate-800 dark:prose-code:text-slate-200 prose-a:text-indigo-600 dark:prose-a:text-indigo-400 selection:bg-indigo-100 selection:text-indigo-900 dark:selection:bg-indigo-950 dark:selection:text-indigo-100"
            >
              {msg.sources?.some(source => source.citationId) ? (
                <ResearchCitationContent content={msg.content} sources={msg.sources} onOpenSource={onOpenSource} />
              ) : (
                <LazyMarkdown content={msg.content} />
              )}
            </div>

            {/* Inline Canvas / Artifact Preview Card (ChatGPT Canvas / Claude Artifact style) */}
            {shouldShowInlineCanvasCard && (
              <div className="not-prose mt-3 flex items-center justify-between gap-3 rounded-2xl border border-slate-200/85 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-900/65 px-4 py-3 transition-colors hover:border-indigo-300/80 dark:hover:border-indigo-800/80">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/60">
                    <FileText className="h-4.5 w-4.5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs sm:text-[13px] font-semibold text-slate-900 dark:text-slate-100 truncate">
                      {activeArtifactTitle || 'Dokumen Canvas RuangKerja'}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      Naskah kerja interaktif · Klik untuk menyunting atau mengekspor di Canvas
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onOpenCanvas}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 px-3 py-1.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300 border border-slate-200/80 dark:border-slate-700 transition-colors cursor-pointer shrink-0 whitespace-nowrap shadow-2xs"
                >
                  <span>Buka di Canvas</span>
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            {/* Dedicated Truncation Recovery Pill */}
            {isPotentiallyTruncated && onContinueMessage && (
              <div className="not-prose pt-1">
                <button
                  type="button"
                  onClick={() => onContinueMessage(msg)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50/90 dark:border-indigo-800 dark:bg-indigo-950/70 px-3.5 py-1 text-[11px] font-semibold text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/80 transition-all cursor-pointer shadow-2xs hover:scale-[1.01] active:scale-[0.98]"
                >
                  <FastForward className="h-3.5 w-3.5 animate-pulse text-indigo-600 dark:text-indigo-400" />
                  <span>Jawaban terpotong? Klik untuk lanjutkan otomatis</span>
                </button>
              </div>
            )}

            {/* Grounding & Source Citations Bar */}
            {msg.sources && msg.sources.length > 0 && (
              <div className="not-prose pt-1">
                <GroundingSourcesBar
                  sources={msg.sources}
                  accent="indigo"
                  onOpenSource={onOpenSource}
                />
              </div>
            )}
          </>
        )}

        {/* Subtle Assistant Action Toolbar */}
        {!msg.error && (
          <div className="flex flex-wrap items-center gap-0.5 pt-0.5 text-[11px] text-slate-400 opacity-85 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-150">
            <button
              type="button"
              onClick={() => onCopyMessage(msg)}
              className="inline-flex min-h-8 items-center gap-1.5 rounded-lg px-2 py-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
              aria-label="Salin jawaban"
            >
              {isCopied ? <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{isCopied ? 'Tersalin' : 'Salin'}</span>
            </button>
            {onContinueMessage && (
              <button
                type="button"
                onClick={() => onContinueMessage(msg)}
                className="inline-flex min-h-8 items-center gap-1.5 rounded-lg px-2 py-1 text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950/60 transition-colors cursor-pointer"
                aria-label="Lanjutkan jawaban ini"
                title="Lanjutkan jawaban dari bagian yang terpotong"
              >
                <FastForward className="h-3.5 w-3.5" />
                <span>Lanjutkan</span>
              </button>
            )}
            {lastUserPrompt && (
              <button
                type="button"
                onClick={() => onRetryMessage(lastUserPrompt, msg.id)}
                className="inline-flex min-h-8 items-center gap-1.5 rounded-lg px-2 py-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
                aria-label="Buat ulang respon ini"
                title="Buat ulang respon ini (Regenerate)"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Ulangi</span>
              </button>
            )}
            <button
              type="button"
              onClick={handleToggleSpeech}
              className={`inline-flex min-h-8 items-center gap-1.5 rounded-lg px-2 py-1 transition-colors cursor-pointer ${
                isSpeaking
                  ? 'bg-indigo-50 text-indigo-700 font-medium dark:bg-indigo-950/60 dark:text-indigo-300'
                  : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200'
              }`}
              aria-label={isSpeaking ? 'Hentikan pembacaan suara' : 'Dengarkan suara'}
              title={isSpeaking ? 'Hentikan pembacaan suara' : 'Dengarkan suara'}
            >
              {isSpeaking ? <VolumeX className="h-3.5 w-3.5 animate-pulse text-indigo-600 dark:text-indigo-400" /> : <Volume2 className="h-3.5 w-3.5" />}
              <span>{isSpeaking ? 'Berhenti' : 'Suara'}</span>
            </button>
            {onSendToCanvas && (
              <button
                type="button"
                onClick={() => onSendToCanvas(msg.content)}
                className="inline-flex min-h-8 items-center gap-1.5 rounded-lg px-2 py-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
                aria-label="Kirim ke Canvas"
              >
                <FilePlus2 className="h-3.5 w-3.5 text-indigo-500" />
                <span>Ke Canvas</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}, (previous, next) =>
  previous.message === next.message &&
  previous.lastUserPrompt === next.lastUserPrompt &&
  previous.isHighlighted === next.isHighlighted &&
  previous.showArtifactLink === next.showArtifactLink &&
  previous.activeArtifactTitle === next.activeArtifactTitle &&
  previous.isCopied === next.isCopied &&
  previous.onRetryMessage === next.onRetryMessage &&
  previous.onOpenCanvas === next.onOpenCanvas &&
  previous.onOpenSource === next.onOpenSource &&
  previous.onSendToCanvas === next.onSendToCanvas &&
  previous.onCopyMessage === next.onCopyMessage &&
  previous.onEditUserMessage === next.onEditUserMessage &&
  previous.onContinueMessage === next.onContinueMessage &&
  previous.formatMessageTime === next.formatMessageTime
);
