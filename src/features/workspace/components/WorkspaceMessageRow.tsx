import React, { useState, useCallback, useEffect } from 'react';
import { useReducedMotion } from 'motion/react';
import { RefreshCw, FileText, Copy, Check, FilePlus2, AlertCircle, Volume2, VolumeX, Edit2, Sparkles, ChevronDown, Laptop, Play } from 'lucide-react';
import { BrandLogo } from '../../../components/ui/BrandLogo';
import type { Message } from '../../chat/types';
import { LazyMarkdown } from '../../../components/common/LazyMarkdown';
import type { FileSourceReference } from '../../../../shared/contracts/files';

function getCleanModelName(rawName?: string, rawUsed?: string): string {
  const name = rawName || rawUsed || '';
  if (!name) return '';
  // Clean up Ollama verbose strings like "Auto: Qwen 3 1.7B via Ollama" -> "Qwen 3 1.7B"
  return name.replace(/^(?:Auto:\s*|Manual:\s*)/i, '').replace(/\s*via\s+Ollama/i, '').trim();
}

function getSourceCategoryBadge(source?: FileSourceReference) {
  if (!source) return { label: 'Inferensi AI', color: 'bg-amber-100/70 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300' };
  if (source.url || source.filename.toLowerCase().includes('web') || source.documentId?.startsWith('web_')) {
    return { label: 'Web', color: 'bg-sky-100/70 text-sky-800 dark:bg-sky-950/50 dark:text-sky-300' };
  }
  return { label: 'Dokumen', color: 'bg-indigo-100/70 text-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-300' };
}

function ResearchCitationContent({ content, sources = [], onOpenSource }: { content: string; sources?: FileSourceReference[]; onOpenSource: (source: FileSourceReference) => void }) {
  const safeSources = sources || [];
  const byId = new Map(safeSources.filter(source => source.citationId).map(source => [source.citationId!, source]));
  const parts: Array<{ text?: string; id?: string }> = [];
  const marker = /\[cite:([A-Za-z0-9_-]+)\]/g;
  let cursor = 0; let match: RegExpExecArray | null;
  while ((match = marker.exec(content))) {
    if (match.index > cursor) parts.push({ text: content.slice(cursor, match.index) });
    parts.push({ id: match[1] });
    cursor = marker.lastIndex;
  }
  if (cursor < content.length) parts.push({ text: content.slice(cursor) });
  return <>{parts.map((part, index) => {
    if (!part.id) return <LazyMarkdown key={`text-${index}`} content={part.text || ''} />;
    const src: FileSourceReference = byId.get(part.id) || {
      citationId: part.id,
      documentId: `doc_${part.id}`,
      filename: `Rujukan Dokumen #${part.id.replace('SRC_', '')}`,
      sourceRef: `Bagian rujukan #${part.id.replace('SRC_', '')}`,
      snippet: 'Rujukan data yang diekstraksi dari dokumen terlampir pengguna.'
    };
    const badge = getSourceCategoryBadge(src);
    const tooltip = `${src.sourceRef || src.filename} (${badge.label}) - Klik untuk pratinjau sumber`;
    return (
      <button
        key={`cite-${index}`}
        type="button"
        onClick={() => onOpenSource(src)}
        title={tooltip}
        className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 mx-0.5 text-[11px] font-medium bg-slate-100/90 text-indigo-600 hover:bg-indigo-50/80 hover:text-indigo-700 dark:bg-white/10 dark:text-indigo-300 dark:hover:bg-indigo-950/50 transition-colors cursor-pointer border border-slate-200/80 dark:border-white/10 shadow-3xs"
      >
        <span>📌 [{part.id.replace('SRC_', '')}]</span>
      </button>
    );
  })}</>;
}

interface ParsedPlanData {
  title: string;
  tasks: Array<{ title: string; description?: string; type?: string; dependsOn?: number[] }>;
}

function tryExtractPlanData(content: string): ParsedPlanData | null {
  try {
    const trimmed = content.trim();
    if (!trimmed.includes('"tasks"') || !trimmed.includes('"title"')) return null;
    const jsonStr = trimmed.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    const parsed = JSON.parse(jsonStr) as ParsedPlanData;
    if (parsed && typeof parsed.title === 'string' && Array.isArray(parsed.tasks) && parsed.tasks.length > 0) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
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
  isLastMessage?: boolean;
  onSelectFollowUp?: (prompt: string) => void;
  onOpenPlan?: () => void;
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
  formatMessageTime,
  isLastMessage = false,
  onSelectFollowUp,
  onOpenPlan
}: WorkspaceMessageRowProps) {
  const shouldReduceMotion = useReducedMotion();
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(msg.content);
  const [showSourcesExpanded, setShowSourcesExpanded] = useState(false);

  // Extract thinking/reasoning if present
  const { thoughtText, mainContent } = React.useMemo(() => {
    const raw = msg.content || '';
    const match = raw.match(/<(?:thought|think)>([\s\S]*?)<\/(?:thought|think)>/i);
    if (match) {
      return {
        thoughtText: match[1].trim(),
        mainContent: raw.replace(match[0], '').trim()
      };
    }
    const anyMsg = msg as unknown as Record<string, unknown>;
    const directThought = typeof anyMsg.reasoning === 'string' ? anyMsg.reasoning : typeof anyMsg.thought === 'string' ? anyMsg.thought : '';
    return {
      thoughtText: directThought.trim(),
      mainContent: raw
    };
  }, [msg]);

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

  const cleanModelName = getCleanModelName(msg.modelName, msg.modelUsed);

  // USER MESSAGE VIEW: Right-aligned pill, sleek ChatGPT / Claude aesthetic
  if (msg.role === 'user') {
    return (
      <div
        data-workspace-message-id={msg.id}
        className={`workspace-message-row workspace-message-virtualized flex flex-col items-end self-end w-full max-w-[85%] sm:max-w-[78%] group ${shouldReduceMotion ? '' : 'animate-fade-in'} ${isHighlighted ? 'ring-2 ring-indigo-400 rounded-3xl' : ''}`}
      >
        <div className="w-full">
          {isEditing ? (
            <div className="flex flex-col gap-2 rounded-2xl border border-indigo-300 bg-white p-3 shadow-lg dark:border-indigo-800 dark:bg-slate-900">
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
                className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                rows={3}
                autoFocus
              />
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-400 hidden sm:inline">Ctrl+Enter untuk kirim, Esc batal</span>
                <div className="flex justify-end gap-1.5 ml-auto">
                  <button
                    type="button"
                    onClick={() => {
                      setEditContent(msg.content);
                      setIsEditing(false);
                    }}
                    className="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveEdit}
                    disabled={!editContent.trim()}
                    className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 disabled:opacity-50"
                  >
                    Simpan &amp; Kirim
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-end">
              <div className="rounded-xl border border-slate-200/90 dark:border-white/10 rounded-tr-md bg-slate-100/90 dark:bg-white/10 text-slate-900 dark:text-slate-100 px-4 py-2.5 text-[14px] leading-relaxed shadow-xs break-words">
                <div className="whitespace-pre-wrap selection:bg-indigo-200 dark:selection:bg-indigo-900">
                  {msg.content}
                </div>
              </div>

              {/* User message hover controls (Edit, Copy, Timestamp) */}
              <div className="flex items-center gap-2 mt-1 px-2 text-[11px] text-slate-400 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                <span>{formatMessageTime(msg.createdAt)}</span>
                {onEditUserMessage && (
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="inline-flex items-center gap-1 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                    aria-label="Edit pesan"
                    title="Edit pertanyaan ini"
                  >
                    <Edit2 className="w-3 h-3" />
                    <span>Edit</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onCopyMessage(msg)}
                  className="inline-flex items-center gap-1 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                  aria-label="Salin teks"
                >
                  <Copy className="w-3 h-3" />
                  <span>{isCopied ? 'Tersalin' : 'Salin'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ASSISTANT MESSAGE VIEW: Clean, editorial, ChatGPT/Claude/Gemini style
  return (
    <div
      data-workspace-message-id={msg.id}
      className={`workspace-message-row workspace-message-virtualized flex flex-col items-start self-start w-full group ${shouldReduceMotion ? '' : 'animate-fade-in'} ${isHighlighted ? 'bg-indigo-50/50 p-3 rounded-2xl ring-1 ring-indigo-300 dark:bg-indigo-950/20' : ''}`}
    >
      {/* Header bar: Sleek avatar & clean model tag */}
      <div className="flex items-center gap-2 mb-1.5 select-none text-xs text-slate-500 dark:text-slate-400 flex-wrap">
        <BrandLogo mode="RUANG_KERJA" size="xs" iconOnly />
        <span className="font-semibold text-slate-900 dark:text-slate-100 text-xs">RuangKerja</span>
        {cleanModelName && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-medium bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300" title={msg.routingReason || `Model: ${cleanModelName}`}>
            {cleanModelName}
          </span>
        )}
        {msg.degradationNotice && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-medium bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50" title={msg.degradationNotice}>
            {msg.degradationNotice}
          </span>
        )}
        <span className="text-slate-300 dark:text-slate-600">·</span>
        <span className="text-[11px] text-slate-400">{formatMessageTime(msg.createdAt)}</span>
      </div>

      {/* Main Content Area */}
      <div className="w-full max-w-full leading-relaxed text-slate-800 dark:text-slate-100 text-[14px] sm:text-[15px] selection:bg-indigo-100 selection:text-indigo-900 dark:selection:bg-indigo-950 dark:selection:text-indigo-100">
        {msg.error ? (
          <div className="space-y-3 rounded-2xl border border-rose-200/80 bg-rose-50/70 p-4 text-rose-900 shadow-xs dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-100">
            <div className="flex items-start gap-2 text-rose-700 dark:text-rose-300">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
              <div className="flex-1 text-sm font-medium leading-relaxed">
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
            {thoughtText && (
              <details className="group mb-3 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-[#f0f4f9]/80 dark:bg-[#1e1f20]/80 overflow-hidden text-xs">
                <summary className="flex items-center gap-2 px-3.5 py-2 cursor-pointer font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 select-none list-none transition-colors">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                  <span>Alur Berpikir AI</span>
                  <ChevronDown className="w-3.5 h-3.5 ml-auto text-slate-400 group-open:rotate-180 transition-transform shrink-0" />
                </summary>
                <div className="px-3.5 pb-3 pt-1 text-slate-600 dark:text-slate-300 border-t border-slate-200/50 dark:border-white/5 leading-relaxed font-mono text-[11px] whitespace-pre-wrap">
                  {thoughtText}
                </div>
              </details>
            )}
            <div className="prose dark:prose-invert max-w-none text-[14px] sm:text-[15px] leading-relaxed prose-p:my-2 prose-pre:my-2 prose-headings:font-semibold prose-headings:tracking-tight prose-a:text-indigo-600 dark:prose-a:text-indigo-400">
              {msg.sources?.some(source => source.citationId) || /\[cite:[A-Za-z0-9_-]+\]/.test(mainContent) ? (
                <ResearchCitationContent content={mainContent} sources={msg.sources} onOpenSource={onOpenSource} />
              ) : (
                <LazyMarkdown content={mainContent} />
              )}
            </div>

            {/* Perplexity/Gemini style Sources Strip */}
            {msg.sources && msg.sources.length > 0 && (
              <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-white/5">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 dark:text-slate-400 mr-1 select-none">
                    <FileText className="h-3 w-3" aria-hidden="true" />
                    Sumber ({msg.sources.length})
                  </span>
                  {msg.sources.slice(0, showSourcesExpanded ? undefined : 3).map((source, index) => {
                    const badge = getSourceCategoryBadge(source);
                    return (
                      <button
                        key={`${source.documentId}:${source.sourceRef}:${index}`}
                        type="button"
                        onClick={() => onOpenSource(source)}
                        className="group/chip inline-flex items-center gap-1.5 rounded-full border border-slate-200/80 bg-white/80 px-2.5 py-0.5 text-[11px] text-slate-600 shadow-3xs transition-all hover:border-indigo-400 hover:text-indigo-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:border-indigo-500/50 cursor-pointer"
                        title={`${source.filename}${source.sourceRef ? ' · ' + source.sourceRef : ''} (${badge.label})`}
                      >
                        <span className="text-[10px] font-semibold text-slate-400 group-hover/chip:text-indigo-500">{index + 1}</span>
                        <span className="max-w-[110px] truncate">{source.filename}</span>
                      </button>
                    );
                  })}
                  {msg.sources.length > 3 && (
                    <button
                      type="button"
                      onClick={() => setShowSourcesExpanded(prev => !prev)}
                      className="text-[11px] font-medium text-indigo-600 dark:text-indigo-400 hover:underline px-1 py-0.5 cursor-pointer"
                    >
                      {showSourcesExpanded ? 'Lebih sedikit' : `+${msg.sources.length - 3} lainnya`}
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Artifact shortcut button */}
            {showArtifactLink && (msg.content.includes('📦 **Artefak Aktif') || msg.content.includes(':::artifact') || msg.content.includes('<artifact')) && (
              <div className="mt-3 pt-2 border-t border-slate-100 dark:border-white/5 flex items-center justify-between">
                <button
                  type="button"
                  onClick={onOpenCanvas}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-xs font-semibold text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Buka Dokumen di Canvas &rarr;</span>
                </button>
              </div>
            )}

            {/* Smart Follow-up Prompt Pills (Gemini style) */}
            {isLastMessage && onSelectFollowUp && !msg.error && mainContent.trim().length > 0 && (
              <div className="mt-3.5 pt-2.5 border-t border-slate-100 dark:border-white/5 flex flex-wrap items-center gap-1.5" aria-label="Saran pertanyaan lanjutan">
                <span className="text-[11px] font-medium text-slate-400 select-none mr-1">Lanjutkan:</span>
                {[
                  { label: '💡 Beri contoh konkret', prompt: 'Bisa berikan contoh kasus konkret untuk penjelasan ini?' },
                  { label: '⚡ Sederhanakan bahasa', prompt: 'Tolong jelaskan kembali poin utama di atas dengan bahasa yang lebih sederhana dan mudah dipahami.' },
                  { label: '📊 Buat tabel rangkuman', prompt: 'Tolong buatkan tabel perbandingan/rangkuman terstruktur dari poin-poin di atas.' }
                ].map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => onSelectFollowUp(item.prompt)}
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border border-slate-200/80 bg-white hover:bg-slate-50 hover:border-slate-300 text-slate-700 dark:border-white/10 dark:bg-[#1e1f20] dark:text-slate-300 dark:hover:bg-[#282a2c] transition-all cursor-pointer shadow-3xs active:scale-95"
                  >
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Modern Minimalist Action Bar (ChatGPT / Claude / Gemini style) */}
      {!msg.error && (
        <div className="mt-2 flex items-center gap-0.5 text-slate-400 opacity-90 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100 transition-opacity duration-150">
          <button
            type="button"
            onClick={() => onCopyMessage(msg)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-slate-200 transition-colors cursor-pointer"
            aria-label="Salin jawaban"
            title={isCopied ? 'Tersalin' : 'Salin jawaban'}
          >
            {isCopied ? <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" /> : <Copy className="h-4 w-4" />}
          </button>
          {lastUserPrompt && (
            <button
              type="button"
              onClick={() => onRetryMessage(lastUserPrompt, msg.id)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-slate-200 transition-colors cursor-pointer"
              aria-label="Buat ulang respons"
              title="Buat ulang respons (Regenerate)"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          )}
          <button
            type="button"
            onClick={handleToggleSpeech}
            className={`inline-flex h-8 w-8 items-center justify-center rounded-lg transition-colors cursor-pointer ${
              isSpeaking
                ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
                : 'hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-slate-200'
            }`}
            aria-label={isSpeaking ? 'Hentikan pembacaan' : 'Dengarkan suara'}
            title={isSpeaking ? 'Hentikan pembacaan suara' : 'Dengarkan suara'}
          >
            {isSpeaking ? <VolumeX className="h-4 w-4 text-indigo-600 animate-pulse" /> : <Volume2 className="h-4 w-4" />}
          </button>
          {onSendToCanvas && (
            <button
              type="button"
              onClick={() => onSendToCanvas(msg.content)}
              className="inline-flex h-7.5 items-center gap-1.5 px-2.5 rounded-full text-xs font-medium text-indigo-700 bg-indigo-50/70 hover:bg-indigo-100 hover:text-indigo-900 dark:text-indigo-300 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/50 dark:hover:text-indigo-100 border border-indigo-200/60 dark:border-indigo-800/40 transition-colors cursor-pointer shadow-3xs"
              aria-label="Kirim ke Canvas"
              title="Pindahkan teks ini ke editor dokumen Canvas"
            >
              <FilePlus2 className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Buka di Canvas</span>
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
  previous.formatMessageTime === next.formatMessageTime &&
  previous.isLastMessage === next.isLastMessage &&
  previous.onSelectFollowUp === next.onSelectFollowUp &&
  previous.onOpenPlan === next.onOpenPlan);
