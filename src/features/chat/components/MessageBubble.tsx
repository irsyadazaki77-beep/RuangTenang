import { Brain, FileCode, ArrowUpRight } from 'lucide-react';
import React, { useState, memo, useCallback, useMemo } from 'react';
import { LazyMarkdown } from '../../../components/common/LazyMarkdown';
import { Message } from '../types';
import CounselorCard from '../../plugins/CounselorCard';
import EmergencyCard from '../../plugins/EmergencyCard';
import MoodCard from '../../plugins/MoodCard';
import ScreeningCard from '../../plugins/ScreeningCard';
import ArticlesCard from '../../plugins/ArticlesCard';
import { BurnoutInterventionCard } from './BurnoutInterventionCard';
import { AlertCircle, Copy, RefreshCw, ThumbsUp, ThumbsDown, Edit2, Check, Bookmark, GitBranch, FileText, Image as ImageIcon, Volume2, VolumeX, Loader2 } from 'lucide-react';
import { useToast } from '../../../components/Toast';
import { motion, useReducedMotion } from 'motion/react';
import { RhythmicTypingIndicator } from '../../../components/ui/RhythmicTypingIndicator';
import { BrandLogo } from '../../../components/ui/BrandLogo';
import { speechPlayer, type SpeechPlaybackStatus } from '../../../lib/speechPlayer';
import { ThinkingReasoningDrawer } from '../../../components/ai/ThinkingReasoningDrawer';
import { GroundingSourcesBar } from '../../../components/ai/GroundingSourcesBar';
import { extractQuickArtifactFromMessage, QuickCanvasArtifact } from './QuickArtifactCanvasDrawer';

function InlineCitedMarkdown({
  content,
  sources
}: {
  content: string;
  sources?: Message['sources'];
}) {
  if (!sources || sources.length === 0 || !content.includes('[cite:')) {
    return <LazyMarkdown content={content} />;
  }
  const byId = new Map(sources.filter(s => s.citationId).map(s => [s.citationId!, s]));
  const parts: Array<{ text?: string; id?: string }> = [];
  const marker = /\[cite:([A-Za-z0-9_-]+)\]/g;
  let cursor = 0;
  let match: RegExpExecArray | null;
  while ((match = marker.exec(content))) {
    if (match.index > cursor) parts.push({ text: content.slice(cursor, match.index) });
    parts.push(byId.has(match[1]) ? { id: match[1] } : { text: `[${match[1]}]` });
    cursor = marker.lastIndex;
  }
  if (cursor < content.length) parts.push({ text: content.slice(cursor) });

  return (
    <>
      {parts.map((part, idx) => {
        if (!part.id) return <LazyMarkdown key={`md_${idx}`} content={part.text || ''} />;
        const src = byId.get(part.id);
        return (
          <button
            key={`cite_${idx}`}
            type="button"
            onClick={() => {
              if (src?.url && typeof window !== 'undefined') {
                const a = document.createElement('a');
                a.href = src.url;
                a.target = '_blank';
                a.rel = 'noopener noreferrer';
                a.click();
              }
            }}
            title={src ? `${src.filename}${src.snippet ? ` — ${src.snippet}` : ''}` : part.id}
            className="inline-flex items-center gap-0.5 rounded-md bg-stone-100 dark:bg-slate-800 px-1.5 py-0.5 mx-0.5 text-[11px] font-mono font-semibold tabular-nums text-teal-700 dark:text-teal-300 hover:bg-teal-50 dark:hover:bg-teal-950/60 transition-colors cursor-pointer"
          >
            <span>[{part.id.replace('SRC_', '')}]</span>
          </button>
        );
      })}
    </>
  );
}

interface Props {
  msg: Message;
  isTyping?: boolean;
  onRegenerate?: (messageId?: string) => void;
  onOpenPlugin?: (plugin: string) => void;
  onSendPluginResult?: (result: string) => void;
  onEditMessage?: (id: string, newContent: string) => void;
  onBookmarkToggle?: (messageId: string, currentStatus: boolean) => void;
  isBookmarked?: boolean;
  onBranch?: (messageId: string, contentSnippet: string) => void;
  onOpenCanvasArtifact?: (artifact: QuickCanvasArtifact) => void;
  isSearchTarget?: boolean;
  searchHighlightQuery?: string;
}

export const MessageBubble = memo(function MessageBubble({
  msg,
  isTyping,
  onRegenerate,
  onOpenPlugin,
  onEditMessage,
  onBookmarkToggle,
  isBookmarked = false,
  onBranch,
  onOpenCanvasArtifact,
  isSearchTarget = false,
  searchHighlightQuery
}: Props) {
  const { showToast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(msg.content);
  const [feedback, setFeedback] = useState<'up' | 'down' | null>(null);
  const [copied, setCopied] = useState(false);
  const [speechStatus, setSpeechStatus] = useState<SpeechPlaybackStatus>('idle');
  const shouldReduceMotion = useReducedMotion();

  const detectedArtifact = useMemo(() => {
    if (msg.role !== 'assistant' || msg.error) return null;
    return extractQuickArtifactFromMessage(msg.content, msg.id);
  }, [msg.role, msg.error, msg.content, msg.id]);

  React.useEffect(() => {
    const targetId = `msg-tts-${msg.id}`;
    return speechPlayer.subscribe(state => {
      if (state.activeId === targetId) {
        setSpeechStatus(state.status);
      } else {
        setSpeechStatus('idle');
      }
    });
  }, [msg.id]);

  const handleToggleSpeech = useCallback(() => {
    void speechPlayer.toggleSpeak({
      id: `msg-tts-${msg.id}`,
      text: msg.content,
      mode: 'empathetic',
      voiceName: 'Kore',
    });
  }, [msg.id, msg.content]);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(msg.content);
    setCopied(true);
    showToast('Pesan disalin ke papan klip', 'success');
    setTimeout(() => setCopied(false), 2000);
  }, [msg.content, showToast]);

  const handleSaveEdit = useCallback(() => {
    if (editContent.trim() && editContent !== msg.content) {
      onEditMessage?.(msg.id, editContent);
    }
    setIsEditing(false);
  }, [editContent, msg.content, msg.id, onEditMessage]);

  const handleBookmark = useCallback(() => {
    if (onBookmarkToggle) {
      onBookmarkToggle(msg.id, isBookmarked);
    }
  }, [msg.id, isBookmarked, onBookmarkToggle]);

  const handleBranch = useCallback(() => {
    if (onBranch) {
      onBranch(msg.id, msg.content.slice(0, 120));
    }
  }, [msg.id, msg.content, onBranch]);

  const renderHighlightedContent = (text: string, query?: string) => {
    if (!query || !query.trim()) return text;
    const escaped = query.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escaped})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, i) =>
      regex.test(part) ? (
        <mark key={i} className="bg-amber-300 dark:bg-amber-500/80 text-slate-900 dark:text-slate-100 rounded-xs px-0.5 font-medium">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  return (
    <motion.div
      id={`msg-${msg.id}`}
      initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 14, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={shouldReduceMotion ? { duration: 0.15 } : { type: "spring", stiffness: 340, damping: 26, mass: 0.8 }}
      onAnimationComplete={() => {
        const el = document.getElementById(`msg-${msg.id}`);
        if (el) el.style.willChange = 'auto';
      }}
      style={{ willChange: 'transform, opacity' }}
      className={`render-optimized-item flex gap-3 sm:gap-3.5 group w-full transition-all duration-200 ${
        isSearchTarget ? 'ring-2 ring-amber-500/80 dark:ring-amber-400/80 rounded-2xl p-1.5 bg-amber-50/40 dark:bg-amber-950/30 shadow-xs' : ''
      } ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
    >
      {msg.role === 'assistant' && (
        <BrandLogo size="xs" iconOnly className="shrink-0 mt-0.5" />
      )}

      <div className={`relative ${
        msg.role === 'user'
          ? 'max-w-[88%] sm:max-w-[80%]'
          : 'flex-1 min-w-0 max-w-full'
      }`}>
        {msg.role === 'user' ? (
          <>
            {isEditing ? (
              <div className="flex flex-col gap-2.5 min-w-[260px] sm:min-w-[340px] bg-white dark:bg-slate-800 p-3.5 rounded-2xl border border-stone-200 dark:border-slate-700 shadow-md">
                <textarea
                  className="w-full bg-stone-50 dark:bg-slate-900 text-stone-800 dark:text-stone-100 border border-stone-200 dark:border-slate-700 rounded-xl p-2.5 text-[14px] sm:text-[14.5px] leading-relaxed focus:ring-2 focus:ring-teal-500/40 outline-none resize-none"
                  value={editContent}
                  onChange={e => setEditContent(e.target.value)}
                  rows={3}
                  autoFocus
                />
                <div className="flex justify-end gap-1.5">
                  <button
                    aria-label="Batal Edit"
                    onClick={() => setIsEditing(false)}
                    className="min-h-[40px] min-w-[40px] px-3 py-1.5 text-xs sm:text-sm text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-slate-700 rounded-lg cursor-pointer transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    aria-label="Simpan Edit"
                    onClick={handleSaveEdit}
                    className="min-h-[40px] min-w-[40px] px-3.5 py-1.5 text-xs sm:text-sm bg-teal-700 hover:bg-teal-800 text-white rounded-lg cursor-pointer transition-colors font-medium shadow-xs"
                  >
                    Kirim Perubahan
                  </button>
                </div>
              </div>
            ) : (
              <div className="group/user relative inline-block">
                {msg.attachments && msg.attachments.length > 0 && (
                  <div className="flex flex-wrap justify-end gap-1.5 mb-1.5">
                    {msg.attachments.map(att => (
                      <a
                        key={att.id}
                        href={att.url || `/api/v1/chat/attachments/${att.id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1.5 px-2.5 py-1 bg-stone-100/90 dark:bg-slate-800 hover:bg-stone-200/90 dark:hover:bg-slate-700 rounded-xl text-[11px] text-stone-800 dark:text-stone-200 transition-colors border border-stone-200/50 dark:border-slate-700"
                      >
                        {att.mimeType?.startsWith('image/') ? (
                          <ImageIcon className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
                        ) : (
                          <FileText className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
                        )}
                        <span className="truncate max-w-[140px] font-medium">{att.filename}</span>
                        {att.mimeType?.startsWith('image/') && (
                          <span className="text-[9.5px] px-1 py-0.2 rounded bg-teal-100/70 dark:bg-teal-900/60 text-teal-700 dark:text-teal-300 font-medium">Visual</span>
                        )}
                        {att.size > 0 && <span className="text-[10px] opacity-60 tabular-nums">({(att.size / 1024).toFixed(0)}KB)</span>}
                      </a>
                    ))}
                  </div>
                )}
                <div className="backdrop-blur-xs bg-stone-100/90 dark:bg-slate-800/85 text-stone-900 dark:text-stone-100 border border-stone-200/70 dark:border-slate-700/70 px-4 py-2.5 sm:px-5 sm:py-3 rounded-3xl rounded-br-md text-[15px] leading-[1.65] break-words shadow-2xs">
                  {renderHighlightedContent(msg.content.replace('[PLUGIN_RESULT]\n', 'Hasil Fitur: '), searchHighlightQuery)}
                </div>

                {/* User Message Floating Actions */}
                <div className="absolute -left-24 top-1/2 -translate-y-1/2 flex items-center gap-0.5 opacity-80 sm:opacity-0 sm:group-hover/user:opacity-100 transition-opacity">
                  {onBookmarkToggle && (
                    <button
                      onClick={handleBookmark}
                      className={`min-h-[40px] min-w-[40px] flex items-center justify-center text-stone-400 hover:text-teal-600 dark:hover:text-teal-400 transition-colors cursor-pointer rounded-lg hover:bg-stone-100 dark:hover:bg-slate-800 ${isBookmarked ? 'text-teal-600 dark:text-teal-400' : ''}`}
                      title={isBookmarked ? 'Hapus Simpanan' : 'Simpan Pesan'}
                      aria-label="Simpan Pesan"
                    >
                      <Bookmark className={`w-3.5 h-3.5 ${isBookmarked ? 'fill-teal-600 dark:fill-teal-400' : ''}`} />
                    </button>
                  )}
                  {onBranch && (
                    <button
                      onClick={handleBranch}
                      className="min-h-[40px] min-w-[40px] flex items-center justify-center text-stone-400 hover:text-teal-600 dark:hover:text-teal-400 rounded-lg hover:bg-stone-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                      title="Buat Cabang Obrolan dari Pesan Ini"
                      aria-label="Buat Cabang Obrolan"
                    >
                      <GitBranch className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    onClick={() => setIsEditing(true)}
                    className="min-h-[40px] min-w-[40px] flex items-center justify-center text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 rounded-lg hover:bg-stone-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    title="Edit Pesan"
                    aria-label="Edit Pesan"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="w-full min-w-0 space-y-2.5">
            {msg.error ? (
              <div className="p-3.5 rounded-xl bg-rose-50/90 dark:bg-rose-950/40 border border-rose-200/80 dark:border-rose-900/60 text-[13.5px]">
                <p className="text-rose-800 dark:text-rose-300 mb-2 font-medium leading-relaxed">{msg.content}</p>
                {msg.retryable === false ? (
                  <p className="text-xs text-rose-700 dark:text-rose-300">Kirim ulang pesan beserta lampiran atau konteks fiturnya untuk mencoba lagi.</p>
                ) : (
                  <button aria-label="Coba Lagi" onClick={() => onRegenerate?.(msg.id)} className="min-h-[40px] min-w-[40px] px-3.5 py-1.5 bg-rose-100 dark:bg-rose-900 text-rose-800 dark:text-rose-200 rounded-lg font-medium hover:bg-rose-200 transition-colors cursor-pointer text-xs sm:text-sm">
                    Coba lagi
                  </button>
                )}
              </div>
            ) : isTyping && !msg.content ? (
              <div className="py-1">
                <RhythmicTypingIndicator label="Menuliskan pesan yang tenang..." avatarSrc="" />
              </div>
            ) : (
              <div
                data-assistant-prose="true"
                className="prose prose-stone dark:prose-invert max-w-none break-words text-[15px] leading-[1.7] text-stone-800 dark:text-stone-200 space-y-2.5 font-normal"
              >
                {(msg.isFallback || msg.degradationNotice) && (
                  <div className="not-prose mb-1 flex flex-wrap items-center gap-1.5 text-[11px] text-stone-400 dark:text-slate-500">
                    {msg.isFallback && msg.modelUsed && (
                      <span
                        title={`${msg.fallbackFromName || 'Model utama'} gagal; respons diselesaikan dengan ${msg.modelName || msg.modelUsed}.`}
                      >
                        Fallback · {msg.modelName || msg.modelUsed}
                      </span>
                    )}
                    {msg.degradationNotice && (
                      <span
                        className="text-amber-700 dark:text-amber-400"
                        title={msg.degradationNotice}
                      >
                        {msg.isFallback ? '· ' : ''}Penyesuaian: {msg.degradationNotice}
                      </span>
                    )}
                  </div>
                )}

                {/* Transparent AI Reasoning Step Accordion */}
                {((msg.reasoningSteps && msg.reasoningSteps.length > 0) || msg.thinkingDurationMs || msg.webSearchUsed) && (
                  <ThinkingReasoningDrawer
                    steps={msg.reasoningSteps}
                    durationMs={msg.thinkingDurationMs}
                    thinkingDepth={msg.thinkingDepth}
                    webSearchUsed={msg.webSearchUsed}
                    isStreaming={false}
                    accent="teal"
                  />
                )}

                <InlineCitedMarkdown content={msg.content} sources={msg.sources} />

                {/* Interactive Artifact / Canvas Card (Claude Artifact / ChatGPT Canvas style) */}
                {detectedArtifact && onOpenCanvasArtifact && (
                  <div className="not-prose mt-3 flex items-center justify-between gap-3 rounded-2xl border border-stone-200/85 dark:border-slate-800 bg-stone-50/80 dark:bg-slate-900/65 px-4 py-3 transition-colors hover:border-teal-400/70 dark:hover:border-teal-800">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-400 border border-teal-200/60 dark:border-teal-800/60">
                        {detectedArtifact.type === 'code' ? <FileCode className="h-4.5 w-4.5" /> : <FileText className="h-4.5 w-4.5" />}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs sm:text-[13px] font-semibold text-stone-900 dark:text-slate-100 truncate">
                          {detectedArtifact.title}
                        </div>
                        <div className="text-[11px] text-stone-500 dark:text-slate-400 truncate">
                          Artefak interaktif · Klik untuk menyunting atau memoles di Live Canvas
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onOpenCanvasArtifact(detectedArtifact)}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-teal-50 dark:hover:bg-teal-950/60 px-3 py-1.5 text-xs font-semibold text-teal-700 dark:text-teal-300 border border-stone-200/80 dark:border-slate-700 transition-colors cursor-pointer shrink-0 whitespace-nowrap shadow-2xs"
                    >
                      <span>Buka di Canvas</span>
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}

                {/* Clickable Citations & Grounding Sources Bar */}
                {msg.sources && msg.sources.length > 0 && (
                  <GroundingSourcesBar sources={msg.sources} accent="teal" />
                )}

                {isTyping && (
                  <motion.span
                    aria-hidden="true"
                    className="inline-block w-1.5 h-4 ml-1 bg-teal-500 rounded-xs align-middle"
                    animate={
                      shouldReduceMotion
                        ? { opacity: [0.35, 1, 0.35] }
                        : { opacity: [0.25, 1, 0.25], scaleY: [0.85, 1.05, 0.85] }
                    }
                    transition={{
                      duration: 0.9,
                      repeat: Infinity,
                      ease: 'easeInOut'
                    }}
                  />
                )}
              </div>
            )}

            {msg.incomplete && (
              <div role="status" className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
                <span className="inline-flex items-center gap-1.5"><AlertCircle className="h-3.5 w-3.5 shrink-0" />Respons ini terputus sebelum selesai.</span>
                {msg.retryable === false ? (
                  <span className="text-[11px]">Kirim ulang pesan beserta lampiran atau konteks fiturnya.</span>
                ) : onRegenerate && (
                  <button type="button" onClick={() => onRegenerate(msg.id)} className="min-h-9 rounded-md border border-amber-400 px-2.5 font-semibold hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 dark:border-amber-800 dark:hover:bg-amber-950">Ulangi jawaban</button>
                )}
              </div>
            )}

            {/* Plugins / Cards */}
            {(msg.plugin === 'burnout' || msg.plugin === 'distress') && (
              <BurnoutInterventionCard
                distressType={(msg.pluginResult?.distressType as any) || 'overwhelm'}
                triggerReason={msg.pluginResult?.triggerReason as string}
                onOpenBreathingModal={() => onOpenPlugin?.('breathing')}
                onOpenCounselorBooking={() => onOpenPlugin?.('counselors')}
              />
            )}
            {msg.plugin === 'screening' && <div className="mt-3"><ScreeningCard onAction={() => onOpenPlugin?.('screening')} /></div>}
            {msg.plugin === 'mood' && <div className="mt-3"><MoodCard /></div>}
            {msg.plugin === 'counselors' && <div className="mt-3"><CounselorCard onAction={() => onOpenPlugin?.('counselors')} /></div>}
            {msg.plugin === 'emergency' && <div className="mt-3"><EmergencyCard /></div>}
            {msg.plugin === 'articles' && <div className="mt-3"><ArticlesCard onAction={() => onOpenPlugin?.('articles')} /></div>}
            {msg.plugin === 'ai_memory' && (
              <div className="mt-3 p-3 bg-teal-50/60 dark:bg-teal-950/30 border border-teal-100 dark:border-teal-900/60 rounded-xl text-xs sm:text-[13px] text-teal-800 dark:text-teal-300 flex items-center gap-2">
                <Brain className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
                <span className="leading-relaxed">Permintaan konteks personalisasi diterima untuk membantu percakapan ini.</span>
              </div>
            )}

            {/* Subtle Action Toolbar */}
            {!isTyping && msg.content && !msg.error && (
              <div className="flex flex-wrap items-center gap-0.5 pt-0.5 opacity-80 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-150">
                <button
                  onClick={handleToggleSpeech}
                  className={`min-h-[40px] px-2.5 flex items-center gap-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-slate-800 transition-colors cursor-pointer ${
                    speechStatus !== 'idle' ? 'text-teal-600 dark:text-teal-400 font-semibold bg-teal-50 dark:bg-teal-950/50' : 'text-stone-400 hover:text-stone-700 dark:hover:text-stone-200'
                  }`}
                  title={speechStatus === 'playing' ? 'Hentikan Suara Empatik' : speechStatus === 'loading' ? 'Menyiapkan Suara AI...' : 'Dengarkan Suara Empatik (Gemini TTS)'}
                  aria-label={speechStatus === 'playing' ? 'Hentikan Pembacaan Suara' : 'Dengarkan Suara Empatik'}
                >
                  {speechStatus === 'loading' ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : speechStatus === 'playing' ? (
                    <VolumeX className="w-3.5 h-3.5" />
                  ) : (
                    <Volume2 className="w-3.5 h-3.5" />
                  )}
                  <span className="text-[11px] whitespace-nowrap">
                    {speechStatus === 'loading' ? 'Memuat Suara...' : speechStatus === 'playing' ? 'Berhenti' : 'Suara'}
                  </span>
                </button>

                {onOpenCanvasArtifact && (
                  <button
                    type="button"
                    onClick={() =>
                      onOpenCanvasArtifact(
                        detectedArtifact || {
                          id: `canvas_${msg.id}`,
                          title: 'Catatan & Draf Percakapan',
                          content: msg.content,
                          type: 'document'
                        }
                      )
                    }
                    className="min-h-[40px] px-2.5 flex items-center gap-1 rounded-lg text-stone-400 hover:text-teal-700 dark:hover:text-teal-300 hover:bg-stone-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    title="Buka atau sunting pesan ini di Live Canvas"
                    aria-label="Buka di Canvas"
                  >
                    <FileCode className="w-3.5 h-3.5" />
                    <span className="text-[11px] whitespace-nowrap">Ke Canvas</span>
                  </button>
                )}

                <button
                  onClick={handleCopy}
                  className="min-h-[40px] min-w-[40px] flex items-center justify-center text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                  title="Salin Pesan"
                  aria-label="Salin Pesan"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>

                {onBookmarkToggle && (
                  <button
                    onClick={handleBookmark}
                    className={`min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg hover:bg-stone-100 dark:hover:bg-slate-800 transition-colors cursor-pointer ${
                      isBookmarked ? 'text-teal-600 dark:text-teal-400' : 'text-stone-400 hover:text-stone-700 dark:hover:text-stone-200'
                    }`}
                    title={isBookmarked ? 'Hapus Simpanan' : 'Simpan Pesan'}
                    aria-label="Simpan Pesan"
                  >
                    <Bookmark className={`w-3.5 h-3.5 ${isBookmarked ? 'fill-teal-600 dark:fill-teal-400' : ''}`} />
                  </button>
                )}

                {onBranch && (
                  <button
                    onClick={handleBranch}
                    className="min-h-[40px] min-w-[40px] flex items-center justify-center text-stone-400 hover:text-teal-600 dark:hover:text-teal-400 hover:bg-stone-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                    title="Buat Cabang Obrolan dari Sini"
                    aria-label="Buat Cabang Obrolan"
                  >
                    <GitBranch className="w-3.5 h-3.5" />
                  </button>
                )}

                {onRegenerate && (
                  <button
                    onClick={() => onRegenerate(msg.id)}
                    className="min-h-[40px] min-w-[40px] flex items-center justify-center text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                    title="Buat Ulang Tanggapan"
                    aria-label="Buat Ulang Tanggapan"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                )}

                <button
                  onClick={() => {
                    setFeedback('up');
                    showToast('Terima kasih atas masukannya', 'success');
                  }}
                  className={`min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg hover:bg-stone-100 dark:hover:bg-slate-800 transition-colors cursor-pointer ${feedback === 'up' ? 'text-teal-600 dark:text-teal-400' : 'text-stone-400 hover:text-stone-700 dark:hover:text-stone-200'}`}
                  title="Membantu"
                  aria-label="Membantu"
                >
                  <ThumbsUp className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => {
                    setFeedback('down');
                    showToast('Terima kasih atas masukannya', 'info');
                  }}
                  className={`min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg hover:bg-stone-100 dark:hover:bg-slate-800 transition-colors cursor-pointer ${feedback === 'down' ? 'text-rose-600 dark:text-rose-400' : 'text-stone-400 hover:text-stone-700 dark:hover:text-stone-200'}`}
                  title="Kurang Membantu"
                  aria-label="Kurang Membantu"
                >
                  <ThumbsDown className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}, (prevProps, nextProps) => {
  if (prevProps.msg.id !== nextProps.msg.id) return false;
  if (prevProps.msg.content !== nextProps.msg.content) return false;
  if (prevProps.isTyping !== nextProps.isTyping) return false;
  if (prevProps.msg.error !== nextProps.msg.error) return false;
  if (prevProps.msg.incomplete !== nextProps.msg.incomplete) return false;
  if (prevProps.msg.retryable !== nextProps.msg.retryable) return false;
  if (prevProps.msg.plugin !== nextProps.msg.plugin) return false;
  if (prevProps.isBookmarked !== nextProps.isBookmarked) return false;
  if (prevProps.isSearchTarget !== nextProps.isSearchTarget) return false;
  if (prevProps.searchHighlightQuery !== nextProps.searchHighlightQuery) return false;
  if (prevProps.msg.sources !== nextProps.msg.sources) return false;
  if (prevProps.msg.reasoningSteps !== nextProps.msg.reasoningSteps) return false;

  const prevAtt = prevProps.msg.attachments;
  const nextAtt = nextProps.msg.attachments;
  if (prevAtt !== nextAtt) {
    if (!prevAtt || !nextAtt || prevAtt.length !== nextAtt.length) return false;
    if (prevAtt[0]?.id !== nextAtt[0]?.id) return false;
  }

  return true;
});
