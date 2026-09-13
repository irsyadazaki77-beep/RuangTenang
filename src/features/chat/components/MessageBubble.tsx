import React, { useState, memo } from 'react';
import { LazyMarkdown } from '../../../components/common/LazyMarkdown';
import { Message } from '../types';
import CounselorCard from '../../plugins/CounselorCard';
import EmergencyCard from '../../plugins/EmergencyCard';
import MoodCard from '../../plugins/MoodCard';
import ScreeningCard from '../../plugins/ScreeningCard';
import ArticlesCard from '../../plugins/ArticlesCard';
import { Copy, RefreshCw, ThumbsUp, ThumbsDown, Edit2, Check, Bookmark, GitBranch, FileText } from 'lucide-react';
import { useToast } from '../../../components/Toast';
import { motion, useReducedMotion } from 'motion/react';
import { messageBubbleVariants, reducedMotionVariants } from '../../../lib/motionTokens';

interface Props {
  msg: Message;
  isTyping?: boolean;
  onRegenerate?: () => void;
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
  const shouldReduceMotion = useReducedMotion();

  const handleCopy = () => {
    navigator.clipboard.writeText(msg.content);
    setCopied(true);
    showToast('Pesan disalin ke papan klip', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveEdit = () => {
    if (editContent.trim() && editContent !== msg.content) {
      onEditMessage?.(msg.id, editContent);
    }
    setIsEditing(false);
  };

  const handleBookmark = () => {
    if (onBookmarkToggle) {
      onBookmarkToggle(msg.id, isBookmarked);
    }
  };

  const handleBranch = () => {
    if (onBranch) {
      onBranch(msg.id, msg.content.slice(0, 120));
    }
  };

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
      initial="hidden"
      animate="visible"
      variants={shouldReduceMotion ? reducedMotionVariants : messageBubbleVariants}
      className={`flex gap-3 group w-full transition-all duration-300 ${
        isSearchTarget ? 'ring-2 ring-amber-500/80 dark:ring-amber-400/80 rounded-2xl p-1.5 bg-amber-50/30 dark:bg-amber-950/30 shadow-xs' : ''
      } ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
    >
      {msg.role === 'assistant' && (
        <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 mt-1 p-0.5 border border-slate-200/60 dark:border-slate-700/60">
          <img src="/favicon.svg" alt="RuangTenang" className="w-4 h-4 object-contain" />
        </div>
      )}
      
      <div className={`relative ${
        msg.role === 'user' 
          ? 'max-w-[85%] sm:max-w-[75%]' 
          : 'flex-1 min-w-0 max-w-full'
      }`}>
        {msg.role === 'user' ? (
          <>
            {isEditing ? (
              <div className="flex flex-col gap-2 min-w-[240px] sm:min-w-[340px] bg-slate-100 dark:bg-slate-800 p-3 rounded-2xl border border-slate-300 dark:border-slate-700">
                <textarea 
                  className="w-full bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-[14px] leading-relaxed focus:ring-1 focus:ring-teal-500 outline-none resize-none"
                  value={editContent}
                  onChange={e => setEditContent(e.target.value)}
                  rows={2}
                  autoFocus
                />
                <div className="flex justify-end gap-1.5">
                  <button 
                    aria-label="Batal Edit" 
                    onClick={() => setIsEditing(false)} 
                    className="px-2.5 py-1 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg cursor-pointer transition-colors"
                  >
                    Batal
                  </button>
                  <button 
                    aria-label="Simpan Edit" 
                    onClick={handleSaveEdit} 
                    className="px-3 py-1 text-xs bg-teal-600 hover:bg-teal-700 text-white rounded-lg cursor-pointer transition-colors font-medium"
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
                        className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-200/80 dark:bg-slate-700/80 hover:bg-slate-300 dark:hover:bg-slate-600 rounded-xl text-xs text-slate-800 dark:text-slate-200 transition-colors"
                      >
                        <FileText className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                        <span className="truncate max-w-[140px] font-medium">{att.filename}</span>
                        {att.size > 0 && <span className="text-[10px] opacity-60">({(att.size / 1024).toFixed(0)}KB)</span>}
                      </a>
                    ))}
                  </div>
                )}
                <div className="bg-slate-100 dark:bg-slate-800/90 text-slate-900 dark:text-slate-100 px-4 py-2.5 rounded-3xl rounded-br-lg text-[14.5px] sm:text-[15px] leading-relaxed break-words">
                  {renderHighlightedContent(msg.content.replace('[PLUGIN_RESULT]\n', 'Hasil Fitur: '), searchHighlightQuery)}
                </div>
                
                {/* User Message Floating Actions */}
                <div className="absolute -left-20 top-1/2 -translate-y-1/2 flex items-center gap-0.5 opacity-70 sm:opacity-0 sm:group-hover/user:opacity-100 transition-opacity">
                  {onBookmarkToggle && (
                    <button
                      onClick={handleBookmark}
                      className={`p-1 text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 transition-colors cursor-pointer ${isBookmarked ? 'text-teal-600 dark:text-teal-400' : ''}`}
                      title={isBookmarked ? 'Hapus Simpanan' : 'Simpan Pesan'}
                      aria-label="Simpan Pesan"
                    >
                      <Bookmark className={`w-3.5 h-3.5 ${isBookmarked ? 'fill-teal-600 dark:fill-teal-400' : ''}`} />
                    </button>
                  )}
                  {onBranch && (
                    <button
                      onClick={handleBranch}
                      className="p-1 text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 transition-colors cursor-pointer"
                      title="Buat Cabang Obrolan dari Pesan Ini"
                      aria-label="Buat Cabang Obrolan"
                    >
                      <GitBranch className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button 
                    onClick={() => setIsEditing(true)} 
                    className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-opacity cursor-pointer"
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
          <div className="w-full min-w-0 space-y-2">
            {msg.error ? (
              <div className="p-3 rounded-xl bg-rose-50/80 dark:bg-rose-950/40 border border-rose-200/80 dark:border-rose-900/60 text-xs">
                <p className="text-rose-800 dark:text-rose-300 mb-2 font-medium">{msg.content}</p>
                <button aria-label="Coba Lagi" onClick={onRegenerate} className="px-2.5 py-1 bg-rose-100 dark:bg-rose-900 text-rose-800 dark:text-rose-200 rounded-lg font-medium hover:bg-rose-200 transition-colors cursor-pointer text-xs">
                  Coba lagi
                </button>
              </div>
            ) : isTyping && !msg.content ? (
              <div className="flex items-center gap-1.5 py-2 text-slate-400 dark:text-slate-500 text-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-pulse"></span>
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-pulse [animation-delay:200ms]"></span>
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-pulse [animation-delay:400ms]"></span>
              </div>
            ) : (
              <div className="prose prose-slate dark:prose-invert max-w-none break-words text-[14.5px] sm:text-[15.5px] leading-[1.7] text-slate-800 dark:text-slate-200 space-y-2.5">
                <LazyMarkdown content={msg.content} />
                {isTyping && (
                  <span
                    aria-hidden="true"
                    className="inline-block w-1.5 h-4 ml-1 bg-teal-500 rounded-xs animate-pulse align-middle"
                  />
                )}
              </div>
            )}
            
            {/* Plugins / Cards */}
            {msg.plugin === 'screening' && <div className="mt-3"><ScreeningCard onAction={() => onOpenPlugin?.('screening')} /></div>}
            {msg.plugin === 'mood' && <div className="mt-3"><MoodCard /></div>}
            {msg.plugin === 'counselors' && <div className="mt-3"><CounselorCard onAction={() => onOpenPlugin?.('counselors')} /></div>}
            {msg.plugin === 'emergency' && <div className="mt-3"><EmergencyCard /></div>}
            {msg.plugin === 'articles' && <div className="mt-3"><ArticlesCard onAction={() => onOpenPlugin?.('articles')} /></div>}

            {/* Subtle Action Toolbar */}
            {!isTyping && msg.content && !msg.error && (
              <div className="flex items-center gap-0.5 pt-1 opacity-70 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-150">
                <button 
                  onClick={handleCopy} 
                  className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-md transition-colors cursor-pointer" 
                  title="Salin Pesan" 
                  aria-label="Salin Pesan"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>

                {onBookmarkToggle && (
                  <button
                    onClick={handleBookmark}
                    className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                      isBookmarked ? 'text-teal-600 dark:text-teal-400' : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
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
                    className="p-1.5 text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 rounded-md transition-colors cursor-pointer"
                    title="Buat Cabang Obrolan dari Sini"
                    aria-label="Buat Cabang Obrolan"
                  >
                    <GitBranch className="w-3.5 h-3.5" />
                  </button>
                )}

                {onRegenerate && (
                  <button 
                    onClick={onRegenerate} 
                    className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-md transition-colors cursor-pointer" 
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
                  className={`p-1.5 rounded-md transition-colors cursor-pointer ${feedback === 'up' ? 'text-teal-600 dark:text-teal-400' : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`} 
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
                  className={`p-1.5 rounded-md transition-colors cursor-pointer ${feedback === 'down' ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`} 
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
});



