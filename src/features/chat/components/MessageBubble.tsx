import { Brain } from 'lucide-react';
import React, { useState, memo, useCallback } from 'react';
import { LazyMarkdown } from '../../../components/common/LazyMarkdown';
import { Message } from '../types';
import CounselorCard from '../../plugins/CounselorCard';
import EmergencyCard from '../../plugins/EmergencyCard';
import MoodCard from '../../plugins/MoodCard';
import ScreeningCard from '../../plugins/ScreeningCard';
import ArticlesCard from '../../plugins/ArticlesCard';
import { BurnoutInterventionCard } from './BurnoutInterventionCard';
import { Copy, RefreshCw, ThumbsUp, ThumbsDown, Edit2, Check, Bookmark, GitBranch, FileText, Volume2, VolumeX } from 'lucide-react';
import { useToast } from '../../../components/Toast';
import { motion, useReducedMotion } from 'motion/react';
import { RhythmicTypingIndicator } from '../../../components/ui/RhythmicTypingIndicator';

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
  isSearchTarget = false,
  searchHighlightQuery
}: Props) {
  const { showToast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(msg.content);
  const [feedback, setFeedback] = useState<'up' | 'down' | null>(null);
  const [copied, setCopied] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  const handleToggleSpeech = useCallback(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      showToast('Browser Anda tidak mendukung fitur pembacaan suara (Speech Synthesis).', 'info');
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
        .replace(/\*([^*]+)\*/g, '$1')
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        .replace(/^[#\-*+]\s+/gm, '')
        .trim();

      if (!cleanText) return;

      const utterance = new SpeechSynthesisUtterance(cleanText);
      const voices = window.speechSynthesis.getVoices();
      const idVoice = voices.find(v => v.lang.includes('id') || v.lang.includes('ID'));
      if (idVoice) {
        utterance.voice = idVoice;
      } else {
        utterance.lang = 'id-ID';
      }

      utterance.pitch = 0.95;
      utterance.rate = 0.92;

      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      window.speechSynthesis.speak(utterance);
      setIsSpeaking(true);
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
      initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 14, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={shouldReduceMotion ? { duration: 0.15 } : { type: "spring", stiffness: 340, damping: 26, mass: 0.8 }}
      onAnimationComplete={() => {
        // Hapus willChange setelah animasi masuk selesai agar memori GPU tidak bocor
        const el = document.getElementById(`msg-${msg.id}`);
        if (el) el.style.willChange = 'auto';
      }}
      style={{ willChange: 'transform, opacity' }}
      className={`render-optimized-item flex gap-3 sm:gap-3.5 group w-full transition-all duration-200 ${
        isSearchTarget ? 'ring-2 ring-amber-500/80 dark:ring-amber-400/80 rounded-2xl p-1.5 bg-amber-50/40 dark:bg-amber-950/30 shadow-xs' : ''
      } ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
    >
      {msg.role === 'assistant' && (
        <div className="w-7 h-7 rounded-xl bg-teal-50 dark:bg-teal-950/60 flex items-center justify-center shrink-0 mt-0.5 p-1 border border-teal-100/80 dark:border-teal-900/60 shadow-xs">
          <img src="/favicon.svg" alt="RuangTenang" className="w-4 h-4 object-contain" />
        </div>
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
                    className="min-h-[40px] min-w-[40px] px-3.5 py-1.5 text-xs sm:text-sm bg-teal-600 hover:bg-teal-700 text-white rounded-lg cursor-pointer transition-colors font-medium shadow-xs"
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
                        <FileText className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                        <span className="truncate max-w-[140px] font-medium">{att.filename}</span>
                        {att.size > 0 && <span className="text-[10px] opacity-60">({(att.size / 1024).toFixed(0)}KB)</span>}
                      </a>
                    ))}
                  </div>
                )}
                <div className="backdrop-blur-xs bg-teal-50/85 dark:bg-teal-950/50 text-stone-900 dark:text-stone-100 border border-teal-100/70 dark:border-teal-900/40 px-4 py-2.5 sm:px-4.5 sm:py-3 rounded-2xl rounded-br-sm text-[14px] sm:text-[14.5px] leading-relaxed break-words shadow-2xs">
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
                <button aria-label="Coba Lagi" onClick={() => onRegenerate?.(msg.id)} className="min-h-[40px] min-w-[40px] px-3.5 py-1.5 bg-rose-100 dark:bg-rose-900 text-rose-800 dark:text-rose-200 rounded-lg font-medium hover:bg-rose-200 transition-colors cursor-pointer text-xs sm:text-sm">
                  Coba lagi
                </button>
              </div>
            ) : isTyping && !msg.content ? (
              <div className="py-1">
                <RhythmicTypingIndicator label="Menuliskan pesan yang tenang..." avatarSrc="" />
              </div>
            ) : (
              <div className="prose prose-stone dark:prose-invert max-w-none break-words text-[14.5px] sm:text-[15px] leading-[1.65] text-stone-800 dark:text-stone-200 space-y-2.5 font-normal">
                <LazyMarkdown content={msg.content} />
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
                <span className="leading-relaxed">Konteks personalisasi disimpan ke memori jangka panjang untuk sesi mendatang.</span>
              </div>
            )}

            {/* Subtle Action Toolbar */}
            {!isTyping && msg.content && !msg.error && (
              <div className="flex items-center gap-0.5 pt-0.5 opacity-80 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-150">
                <button
                  onClick={handleToggleSpeech}
                  className={`min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg hover:bg-stone-100 dark:hover:bg-slate-800 transition-colors cursor-pointer ${
                    isSpeaking ? 'text-teal-600 dark:text-teal-400 font-bold bg-teal-50 dark:bg-teal-950/50' : 'text-stone-400 hover:text-stone-700 dark:hover:text-stone-200'
                  }`}
                  title={isSpeaking ? 'Hentikan Pembacaan Suara' : 'Dengarkan Suara (Audio Reader)'}
                  aria-label={isSpeaking ? 'Hentikan Pembacaan Suara' : 'Dengarkan Suara'}
                >
                  {isSpeaking ? <VolumeX className="w-3.5 h-3.5 animate-pulse" /> : <Volume2 className="w-3.5 h-3.5" />}
                </button>

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
  if (prevProps.msg.plugin !== nextProps.msg.plugin) return false;
  if (prevProps.isBookmarked !== nextProps.isBookmarked) return false;
  if (prevProps.isSearchTarget !== nextProps.isSearchTarget) return false;
  if (prevProps.searchHighlightQuery !== nextProps.searchHighlightQuery) return false;
  
  // Fast reference & length comparison for attachments to avoid heavy JSON.stringify
  const prevAtt = prevProps.msg.attachments;
  const nextAtt = nextProps.msg.attachments;
  if (prevAtt !== nextAtt) {
    if (!prevAtt || !nextAtt || prevAtt.length !== nextAtt.length) return false;
    if (prevAtt[0]?.id !== nextAtt[0]?.id) return false;
  }

  return true;
});



