import React, { useState, memo, useCallback, useMemo } from 'react';
import {
  Brain,
  AlertCircle,
  Copy,
  RefreshCw,
  ThumbsUp,
  ThumbsDown,
  Edit2,
  Check,
  Bookmark,
  GitBranch,
  FileText,
  Image as ImageIcon,
  Volume2,
  VolumeX,
  ExternalLink,
  Zap
} from 'lucide-react';
import { LazyMarkdown } from '../../../components/common/LazyMarkdown';
import { Message } from '../types';
import CounselorCard from '../../plugins/CounselorCard';
import EmergencyCard from '../../plugins/EmergencyCard';
import MoodCard from '../../plugins/MoodCard';
import ScreeningCard from '../../plugins/ScreeningCard';
import ArticlesCard from '../../plugins/ArticlesCard';
import { BurnoutInterventionCard } from './BurnoutInterventionCard';
import { GeneratedImageCard } from './GeneratedImageCard';
import { useToast } from '../../../components/Toast';
import { empathicVoiceService } from '../utils/empathicVoiceService';
import { motion, useReducedMotion } from 'motion/react';
import { RhythmicTypingIndicator } from '../../../components/ui/RhythmicTypingIndicator';
import { BrandLogo } from '../../../components/ui/BrandLogo';
import { ReasoningAccordion } from './ReasoningAccordion';
import { InteractiveSourcePills } from './InteractiveSourcePills';
import { parseReasoning } from '../utils/parseReasoning';

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
  isSearchTarget?: boolean;
  searchHighlightQuery?: string;
  onTransferToWorkspace?: (content: string) => void;
  onResumeStream?: (lastContent: string) => void;
  versionNav?: { index: number; total: number; onChange: (index: number) => void };
}

export const MessageBubble = memo(function MessageBubble({
  msg,
  isTyping,
  onRegenerate,
  onOpenPlugin,
  onSendPluginResult,
  onEditMessage,
  onBookmarkToggle,
  isBookmarked = false,
  onBranch,
  isSearchTarget = false,
  searchHighlightQuery,
  onTransferToWorkspace,
  onResumeStream,
  versionNav
}: Props) {
  const { showToast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(msg.content);
  const [feedback, setFeedback] = useState<'up' | 'down' | null>(null);
  const [copied, setCopied] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const shouldReduceMotion = useReducedMotion();
  const reasoning = useMemo(() => parseReasoning(msg.content), [msg.content]);

  const timeString = useMemo(() => {
    if (!msg.createdAt) return '';
    const d = typeof msg.createdAt === 'string' ? new Date(msg.createdAt) : msg.createdAt;
    if (isNaN(d.getTime())) return '';
    return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  }, [msg.createdAt]);

  const handleToggleSpeech = useCallback(() => {
    if (isSpeaking) {
      empathicVoiceService.stop();
      setIsSpeaking(false);
    } else {
      const ok = empathicVoiceService.speak(msg.content, {
        onStart: () => setIsSpeaking(true),
        onEnd: () => setIsSpeaking(false),
        onError: () => setIsSpeaking(false)
      });
      if (!ok) {
        showToast('Browser Anda tidak mendukung fitur suara (Speech Synthesis).', 'info');
      }
    }
  }, [isSpeaking, msg.content, showToast]);

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
      initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 10, scale: 0.99 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={shouldReduceMotion ? { duration: 0.15 } : { type: "spring", stiffness: 360, damping: 28, mass: 0.7 }}
      onAnimationComplete={() => {
        const el = document.getElementById(`msg-${msg.id}`);
        if (el) el.style.willChange = 'auto';
      }}
      className={`render-optimized-item group flex w-full transition-colors duration-150 ${
        isSearchTarget ? 'ring-2 ring-amber-500/80 dark:ring-amber-400/80 rounded-2xl p-2 bg-amber-50/40 dark:bg-amber-950/30' : ''
      } ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
    >
      {msg.role === 'user' ? (
        /* USER MESSAGE ROW (ChatGPT / Claude Style Right-Aligned Bubble) */
        <div className="flex flex-col items-end max-w-[85%] sm:max-w-[78%]">
          {isEditing ? (
            <div className="w-full min-w-[280px] sm:min-w-[360px] bg-white dark:bg-[#1e1f20] p-3 rounded-2xl border border-slate-200 dark:border-white/10 shadow-lg space-y-2">
              <textarea
                className="w-full bg-slate-50 dark:bg-white/5 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-white/10 rounded-xl p-3 text-[14px] sm:text-[15px] leading-relaxed focus:outline-none focus:ring-2 focus:ring-teal-500/30 resize-none"
                value={editContent}
                onChange={e => setEditContent(e.target.value)}
                rows={3}
                autoFocus
              />
              <div className="flex justify-end gap-1.5">
                <button
                  type="button"
                  aria-label="Batal Edit"
                  onClick={() => setIsEditing(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  aria-label="Simpan Edit"
                  onClick={handleSaveEdit}
                  className="px-3.5 py-1.5 text-xs font-medium bg-teal-700 hover:bg-teal-800 text-white rounded-lg transition-colors cursor-pointer shadow-xs"
                >
                  Kirim Perubahan
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Attachments (if any) */}
              {msg.attachments && msg.attachments.length > 0 && (
                <div className="flex flex-wrap justify-end gap-1.5 mb-1.5">
                  {msg.attachments.map(att => (
                    <a
                      key={att.id}
                      href={att.url || `/api/v1/chat/attachments/${att.id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-100 dark:bg-white/10 hover:bg-slate-200/80 dark:hover:bg-white/15 rounded-xl text-xs text-slate-800 dark:text-slate-200 transition-colors border border-slate-200/60 dark:border-white/10"
                    >
                      {att.mimeType?.startsWith('image/') ? (
                        <ImageIcon className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
                      ) : (
                        <FileText className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
                      )}
                      <span className="truncate max-w-[140px] font-medium">{att.filename}</span>
                      {att.size > 0 && <span className="text-[10px] text-slate-400">({(att.size / 1024).toFixed(0)}KB)</span>}
                    </a>
                  ))}
                </div>
              )}

              {/* Chat Bubble */}
              <div className="rounded-3xl rounded-br-lg bg-teal-700 dark:bg-teal-800/95 text-white px-4 sm:px-5 py-2.5 sm:py-3 text-[14.5px] sm:text-[15px] leading-relaxed break-words shadow-xs font-normal selection:bg-teal-900 selection:text-white">
                {renderHighlightedContent(msg.content.replace('[PLUGIN_RESULT]\n', 'Hasil Fitur: '), searchHighlightQuery)}
              </div>

              {/* Quick Hover Controls below user bubble */}
              <div className="flex items-center gap-1.5 mt-1 pr-1 text-[11px] text-slate-400 dark:text-slate-500">
                {timeString && (
                  <span className="text-[10px] font-mono text-slate-400/80 dark:text-slate-500 select-none mr-0.5">
                    {timeString}
                  </span>
                )}
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                {onBookmarkToggle && (
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.92 }}
                    type="button"
                    onClick={handleBookmark}
                    className={`p-1 rounded-md text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer ${isBookmarked ? 'text-teal-600 dark:text-teal-400' : ''}`}
                    title={isBookmarked ? 'Hapus Simpanan' : 'Simpan Pesan'}
                    aria-label="Simpan Pesan"
                  >
                    <Bookmark className={`w-3.5 h-3.5 ${isBookmarked ? 'fill-teal-600 dark:fill-teal-400' : ''}`} />
                  </motion.button>
                )}
                {onBranch && (
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.92 }}
                    type="button"
                    onClick={handleBranch}
                    className="p-1 rounded-md text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
                    title="Buat Cabang Obrolan dari Pesan Ini"
                    aria-label="Buat Cabang Obrolan"
                  >
                    <GitBranch className="w-3.5 h-3.5" />
                  </motion.button>
                )}
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.92 }}
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
                  title="Edit Pesan"
                  aria-label="Edit Pesan"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </motion.button>
                </div>
              </div>
            </>
          )}
        </div>
      ) : (
        /* ASSISTANT MESSAGE ROW (Claude / ChatGPT Editorial Standard) */
        <div className="flex gap-3 sm:gap-3.5 w-full min-w-0 max-w-full">
          <div className="shrink-0 mt-0.5">
            <BrandLogo size="xs" iconOnly />
          </div>

          <div className="flex-1 min-w-0 max-w-full space-y-2.5">
            {/* Header Identity & Model pill */}
            <div className="flex items-center gap-2 select-none text-xs text-slate-500 dark:text-slate-400">
              <span className="font-semibold text-slate-900 dark:text-slate-100 text-xs">RuangTenang</span>
              {(msg.modelUsed || msg.degradationNotice) && (
                <>
                  <span className="text-slate-300 dark:text-slate-600">·</span>
                  <span className="text-[11px] text-slate-400 dark:text-slate-500">
                    {msg.isFallback ? 'Mode Hemat · ' : ''}{msg.modelName || msg.modelUsed}
                  </span>
                </>
              )}
              {timeString && (
                <>
                  <span className="text-slate-300 dark:text-slate-600">·</span>
                  <span className="text-[10.5px] text-slate-400 dark:text-slate-500 font-mono">
                    {timeString}
                  </span>
                </>
              )}
            </div>

            {msg.error ? (
              <div className="p-3.5 rounded-2xl bg-rose-50/90 dark:bg-rose-950/30 border border-rose-200/80 dark:border-rose-900/40 text-xs sm:text-sm text-rose-800 dark:text-rose-200">
                <p className="mb-2 font-medium leading-relaxed">{msg.content}</p>
                {msg.retryable === false ? (
                  <p className="text-xs text-rose-600 dark:text-rose-400">Kirim ulang pesan beserta lampiran atau konteks fiturnya untuk mencoba lagi.</p>
                ) : (
                  <button
                    type="button"
                    aria-label="Coba Lagi"
                    onClick={() => onRegenerate?.(msg.id)}
                    className="px-3 py-1.5 bg-rose-100 hover:bg-rose-200 dark:bg-rose-900/60 dark:hover:bg-rose-900 text-rose-800 dark:text-rose-200 rounded-xl font-medium transition-colors cursor-pointer text-xs"
                  >
                    Coba lagi
                  </button>
                )}
              </div>
            ) : isTyping && !msg.content ? (
              <div className="py-1">
                <RhythmicTypingIndicator label="Menuliskan pesan yang tenang..." avatarSrc="" mode="RUANG_TENANG" hideAvatar />
              </div>
            ) : (
              <div className="prose prose-slate dark:prose-invert max-w-[720px] break-words text-[14.5px] sm:text-[15px] leading-[1.7] text-slate-800 dark:text-slate-100 space-y-2.5">
                {reasoning.thinking || reasoning.isThinking ? (
                  <ReasoningAccordion thinking={reasoning.thinking} isThinking={reasoning.isThinking} />
                ) : null}
                <LazyMarkdown content={reasoning.answer} />

                {/* Verified Citations / Sources (Perplexity/Gemini style interactive pill cards) */}
                {msg.sources && msg.sources.length > 0 && (
                  <InteractiveSourcePills sources={msg.sources} />
                )}
              </div>
            )}

            {msg.incomplete && (
              <div role="status" className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50/70 px-3 py-2 text-xs text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/20 dark:text-amber-200">
                <span className="inline-flex items-center gap-1.5"><AlertCircle className="h-3.5 w-3.5 shrink-0" />Respons ini terputus sebelum selesai.</span>
                {msg.retryable === false ? (
                  <span className="text-[11px]">Kirim ulang pesan untuk mencoba lagi.</span>
                ) : (
                  <div className="flex items-center gap-1.5">
                    {onSendPluginResult && msg.content && msg.content.length > 20 && (
                      <button
                        type="button"
                        onClick={() => onSendPluginResult('Lanjutkan penjelasan sebelumnya dari bagian terakhir yang terputus.')}
                        className="rounded-lg bg-amber-600 px-2.5 py-1 text-xs font-semibold text-white shadow-2xs hover:bg-amber-700 transition-colors cursor-pointer"
                      >
                        Lanjutkan
                      </button>
                    )}
                    {onRegenerate && (
                      <button type="button" onClick={() => onRegenerate(msg.id)} className="rounded-lg border border-amber-400 px-2.5 py-1 text-xs font-semibold hover:bg-amber-100 dark:border-amber-800 dark:hover:bg-amber-950/50 cursor-pointer">Ulangi jawaban</button>
                    )}
                    {onResumeStream && (
                      <button
                        type="button"
                        onClick={() => onResumeStream(msg.content)}
                        className="rounded-lg bg-teal-600 hover:bg-teal-700 text-white px-2.5 py-1 text-xs font-semibold transition cursor-pointer flex items-center gap-1 shadow-xs"
                      >
                        <Zap className="h-3 w-3" />
                        Lanjutkan Respon
                      </button>
                    )}
                  </div>
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
            {msg.plugin === 'generate_image' && (
              <GeneratedImageCard
                prompt={(msg.pluginResult?.prompt as string) || (msg.content?.startsWith('![') ? '' : msg.content)}
                imageUrl={(msg.pluginResult?.imageUrl as string) || (msg.content?.match(/!\[.*?\]\((.*?)\)/)?.[1])}
                provider={msg.pluginResult?.provider as string}
                error={msg.pluginResult?.error as string}
              />
            )}

            {/* Bottom Action Toolbar (Clean Claude / ChatGPT Style) */}
            {!isTyping && msg.content && !msg.error && (
              <div className="flex items-center gap-1 pt-1 opacity-80 sm:opacity-0 sm:group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-150">
                {versionNav && versionNav.total > 1 && (
                  <div className="flex items-center gap-0.5 mr-1 text-[11px] text-slate-500 dark:text-slate-400 select-none" aria-label="Versi jawaban">
                    <button
                      type="button"
                      onClick={() => versionNav.onChange(Math.max(0, versionNav.index - 1))}
                      disabled={versionNav.index === 0}
                      aria-label="Versi sebelumnya"
                      className="px-1.5 py-0.5 rounded-md hover:bg-slate-100 dark:hover:bg-white/10 disabled:opacity-30 cursor-pointer"
                    >
                      &lt;
                    </button>
                    <span className="font-mono tabular-nums">{versionNav.index + 1} / {versionNav.total}</span>
                    <button
                      type="button"
                      onClick={() => versionNav.onChange(Math.min(versionNav.total - 1, versionNav.index + 1))}
                      disabled={versionNav.index === versionNav.total - 1}
                      aria-label="Versi berikutnya"
                      className="px-1.5 py-0.5 rounded-md hover:bg-slate-100 dark:hover:bg-white/10 disabled:opacity-30 cursor-pointer"
                    >
                      &gt;
                    </button>
                  </div>
                )}
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.92 }}
                  type="button"
                  onClick={handleToggleSpeech}
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                    isSpeaking ? 'text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/50' : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10'
                  }`}
                  title={isSpeaking ? 'Hentikan Pembacaan Suara' : 'Dengarkan Suara'}
                  aria-label={isSpeaking ? 'Hentikan Pembacaan Suara' : 'Dengarkan Suara'}
                >
                  {isSpeaking ? <VolumeX className="w-4 h-4 animate-pulse" /> : <Volume2 className="w-4 h-4" />}
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.92 }}
                  type="button"
                  onClick={handleCopy}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
                  title="Salin Pesan"
                  aria-label="Salin Pesan"
                >
                  {copied ? <Check className="w-4 h-4 text-teal-600 dark:text-teal-400" /> : <Copy className="w-4 h-4" />}
                </motion.button>

                {onBookmarkToggle && (
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.92 }}
                    type="button"
                    onClick={handleBookmark}
                    className={`p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer ${
                      isBookmarked ? 'text-teal-600 dark:text-teal-400' : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                    }`}
                    title={isBookmarked ? 'Hapus Simpanan' : 'Simpan Pesan'}
                    aria-label="Simpan Pesan"
                  >
                    <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-teal-600 dark:fill-teal-400' : ''}`} />
                  </motion.button>
                )}

                {onBranch && (
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.92 }}
                    type="button"
                    onClick={handleBranch}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
                    title="Buat Cabang Obrolan dari Sini"
                    aria-label="Buat Cabang Obrolan"
                  >
                    <GitBranch className="w-4 h-4" />
                  </motion.button>
                )}

                {onRegenerate && (
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.92 }}
                    type="button"
                    onClick={() => onRegenerate(msg.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
                    title="Buat Ulang Tanggapan"
                    aria-label="Buat Ulang Tanggapan"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </motion.button>
                )}

                <div className="h-3 w-px bg-slate-200 dark:bg-white/10 mx-0.5" />

                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.92 }}
                  type="button"
                  onClick={() => {
                    setFeedback('up');
                    showToast('Terima kasih atas masukannya', 'success');
                  }}
                  className={`p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer ${feedback === 'up' ? 'text-teal-600 dark:text-teal-400' : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                  title="Membantu"
                  aria-label="Membantu"
                >
                  <ThumbsUp className="w-4 h-4" />
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.92 }}
                  type="button"
                  onClick={() => {
                    setFeedback('down');
                    showToast('Terima kasih atas masukannya', 'info');
                  }}
                  className={`p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer ${feedback === 'down' ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                  title="Kurang Membantu"
                  aria-label="Kurang Membantu"
                >
                  <ThumbsDown className="w-4 h-4" />
                </motion.button>

                {onTransferToWorkspace && msg.content && (
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.92 }}
                    type="button"
                    onClick={() => {
                      onTransferToWorkspace(msg.content);
                      showToast('Draf dikirim ke RuangKerja Canvas', 'success');
                    }}
                    className="p-1.5 rounded-lg hover:bg-teal-50 dark:hover:bg-teal-900/30 text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 transition-colors cursor-pointer"
                    title="Buka di RuangKerja (Canvas)"
                    aria-label="Buka di RuangKerja (Canvas)"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </motion.button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
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
  if (prevProps.onTransferToWorkspace !== nextProps.onTransferToWorkspace) return false;
  if (prevProps.onResumeStream !== nextProps.onResumeStream) return false;
  if (prevProps.versionNav?.index !== nextProps.versionNav?.index) return false;
  if (prevProps.versionNav?.total !== nextProps.versionNav?.total) return false;

  const prevAtt = prevProps.msg.attachments;
  const nextAtt = nextProps.msg.attachments;
  if (prevAtt !== nextAtt) {
    if (!prevAtt || !nextAtt || prevAtt.length !== nextAtt.length) return false;
    if (prevAtt[0]?.id !== nextAtt[0]?.id) return false;
  }

  return true;
});

MessageBubble.displayName = 'MessageBubble';
