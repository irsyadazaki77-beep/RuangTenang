import React, { useState, memo } from 'react';
import ReactMarkdown from 'react-markdown';
import { Message } from '../types';
import CounselorCard from '../../plugins/CounselorCard';
import EmergencyCard from '../../plugins/EmergencyCard';
import MoodCard from '../../plugins/MoodCard';
import ScreeningCard from '../../plugins/ScreeningCard';
import ArticlesCard from '../../plugins/ArticlesCard';
import { Copy, RefreshCw, ThumbsUp, ThumbsDown, Edit2, Check, X } from 'lucide-react';
import { useToast } from '../../../components/Toast';
import { motion } from 'motion/react';

interface Props {
  msg: Message;
  isTyping?: boolean;
  onRegenerate?: () => void;
  onSendPluginResult?: (result: string) => void;
  onOpenPlugin?: (plugin: string) => void;
  onEditMessage?: (id: string, newContent: string) => void;
}

export const MessageBubble = memo(function MessageBubble({ msg, isTyping, onRegenerate, onSendPluginResult, onOpenPlugin, onEditMessage }: Props) {
  const { showToast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(msg.content);

  const handleCopy = () => {
    navigator.clipboard.writeText(msg.content);
    showToast('Pesan berhasil disalin', 'success');
  };

  const handleSaveEdit = () => {
    if (editContent.trim() && editContent !== msg.content) {
      onEditMessage?.(msg.id, editContent);
    }
    setIsEditing(false);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 8, scale: 0.99 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className={`flex gap-2 sm:gap-2.5 group w-full ${msg.role === 'user' ? 'justify-end' : ''}`}
    >
      {msg.role === 'assistant' && (
        <div className="w-5.5 h-5.5 sm:w-6 sm:h-6 rounded-lg bg-teal-50 dark:bg-teal-950/80 border border-teal-200/80 dark:border-teal-900 flex items-center justify-center shrink-0 mt-0.5 shadow-3xs p-0.5">
          <img src="/favicon.svg" alt="RuangTenang AI" className="w-full h-full object-contain" />
        </div>
      )}
      
      <div className={`max-w-[88%] sm:max-w-[80%] ${
        msg.role === 'user' 
          ? 'bg-slate-900 dark:bg-slate-800 text-white px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-xl rounded-tr-xs relative shadow-3xs border border-slate-800 dark:border-slate-700' 
          : 'text-slate-800 dark:text-slate-200 space-y-1.5 pt-0.5 w-full min-w-0'
      }`}>
        {msg.role === 'user' ? (
          <>
            {isEditing ? (
              <div className="flex flex-col gap-2 min-w-[240px] sm:min-w-[320px]">
                <textarea 
                  className="w-full bg-slate-950 text-slate-100 border border-teal-500/80 rounded-xl p-2.5 text-xs sm:text-sm focus:ring-2 focus:ring-teal-400/30 resize-none outline-none"
                  value={editContent}
                  onChange={e => setEditContent(e.target.value)}
                  rows={2}
                  autoFocus
                />
                <div className="flex justify-end gap-1.5">
                  <button 
                    aria-label="Batal Edit" 
                    onClick={() => setIsEditing(false)} 
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 min-h-[32px] min-w-[32px] flex items-center justify-center cursor-pointer transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                  <button 
                    aria-label="Simpan Edit" 
                    onClick={handleSaveEdit} 
                    className="p-1.5 bg-teal-600 hover:bg-teal-500 rounded-lg text-white min-h-[32px] min-w-[32px] flex items-center justify-center cursor-pointer transition-colors"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="whitespace-pre-wrap text-xs sm:text-sm leading-relaxed break-words">
                  {msg.content.replace('[PLUGIN_RESULT]\n', 'Hasil Fitur: ')}
                </div>
                <button 
                  onClick={() => setIsEditing(true)} 
                  className="absolute -left-8 sm:-left-9 top-1/2 -translate-y-1/2 p-1.5 opacity-80 sm:opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 min-h-[32px] min-w-[32px] flex items-center justify-center cursor-pointer"
                  title="Edit Pesan"
                  aria-label="Edit Pesan"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              </>
            )}
          </>
        ) : (
          <div className="w-full min-w-0">
            {msg.error ? (
              <div className="bg-rose-50 dark:bg-rose-950/60 p-3.5 rounded-2xl border border-rose-200 dark:border-rose-900 inline-block text-xs">
                <p className="text-rose-800 dark:text-rose-300 mb-2 font-medium">{msg.content}</p>
                <button aria-label="Coba Lagi" onClick={onRegenerate} className="px-3 py-1.5 bg-rose-100 dark:bg-rose-900 text-rose-800 dark:text-rose-200 rounded-xl font-semibold hover:bg-rose-200 dark:hover:bg-rose-800 transition-colors min-h-[36px] cursor-pointer">
                  Coba Lagi
                </button>
              </div>
            ) : isTyping && !msg.content ? (
              <div className="inline-flex items-center gap-2.5 px-3.5 py-2 rounded-2xl bg-slate-100/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800/80 shadow-3xs text-xs">
                <div className="flex items-center gap-1 text-teal-600 dark:text-teal-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-500 dark:bg-teal-400 animate-bounce [animation-delay:-0.3s]"></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-500 dark:bg-teal-400 animate-bounce [animation-delay:-0.15s]"></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-500 dark:bg-teal-400 animate-bounce"></span>
                </div>
                <span className="text-slate-600 dark:text-slate-300 font-medium tracking-tight animate-pulse">
                  RuangTenang sedang memikirkan respons...
                </span>
              </div>
            ) : (
              <div className="prose prose-slate dark:prose-invert max-w-none break-words overflow-x-auto prose-p:leading-relaxed prose-pre:bg-slate-100 dark:prose-pre:bg-slate-900 prose-pre:border prose-pre:border-slate-200 dark:prose-pre:border-slate-800 prose-pre:text-slate-800 dark:prose-pre:text-slate-200 text-xs sm:text-sm leading-relaxed">
                <ReactMarkdown>{msg.content}</ReactMarkdown>
                {isTyping && (
                  <span
                    aria-hidden="true"
                    className="inline-block w-1.5 h-3.5 ml-1 bg-teal-500 dark:bg-teal-400 rounded-xs animate-pulse align-middle"
                  />
                )}
              </div>
            )}
            
            {msg.plugin === 'screening' && <div className="mt-3"><ScreeningCard onAction={() => onOpenPlugin?.('screening')} /></div>}
            {msg.plugin === 'mood' && <div className="mt-3"><MoodCard onAction={() => onOpenPlugin?.('mood')} /></div>}
            {msg.plugin === 'counselors' && <div className="mt-3"><CounselorCard onAction={() => onOpenPlugin?.('counselors')} /></div>}
            {msg.plugin === 'emergency' && <div className="mt-3"><EmergencyCard onAction={() => onOpenPlugin?.('emergency')} /></div>}
            {msg.plugin === 'articles' && <div className="mt-3"><ArticlesCard onAction={() => onOpenPlugin?.('articles')} /></div>}

            {msg.plugin && isTyping && (
              <div className="text-xs text-teal-600 dark:text-teal-400 animate-pulse mt-2 flex items-center gap-1.5 font-medium">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                Memuat layanan {msg.plugin}...
              </div>
            )}
            
            {!isTyping && msg.content && !msg.error && (
              <div className="flex items-center gap-1 mt-2 opacity-80 sm:opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                <button onClick={handleCopy} className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors min-h-[32px] min-w-[32px] flex items-center justify-center cursor-pointer" title="Salin Pesan" aria-label="Salin Pesan">
                  <Copy className="w-3.5 h-3.5" />
                </button>
                <button onClick={onRegenerate} className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors min-h-[32px] min-w-[32px] flex items-center justify-center cursor-pointer" title="Buat Ulang Tanggapan" aria-label="Buat Ulang Tanggapan">
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => showToast('Terima kasih atas masukannya', 'success')} className="p-1.5 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-lg transition-colors min-h-[32px] min-w-[32px] flex items-center justify-center cursor-pointer" title="Bantu Suka" aria-label="Bantu Suka">
                  <ThumbsUp className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => showToast('Terima kasih atas masukannya', 'info')} className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors min-h-[32px] min-w-[32px] flex items-center justify-center cursor-pointer" title="Kurang Sesuai" aria-label="Kurang Sesuai">
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


