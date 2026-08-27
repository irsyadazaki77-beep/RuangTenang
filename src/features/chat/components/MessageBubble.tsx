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
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={`flex gap-3 group w-full ${msg.role === 'user' ? 'justify-end' : ''}`}
    >
      {msg.role === 'assistant' && (
        <div className="w-6 h-6 rounded-lg bg-teal-50/80 border border-teal-200/80 flex items-center justify-center shrink-0 mt-1 shadow-2xs p-0.5">
          <img src="/favicon.svg" alt="RuangTenang AI" className="w-4 h-4 object-contain" />
        </div>
      )}
      
      <div className={`max-w-[85%] md:max-w-[80%] ${msg.role === 'user' ? 'bg-slate-800 text-white px-4 py-2.5 rounded-2xl rounded-tr-xs relative shadow-2xs' : 'text-slate-800 space-y-3 pt-0.5 w-full'}`}>
        {msg.role === 'user' ? (
          <>
            {isEditing ? (
              <div className="flex flex-col gap-2">
                <textarea 
                  className="w-full bg-slate-900 text-white border border-teal-400 rounded-xl p-2.5 text-base sm:text-base sm:text-xs focus:ring-2 focus:ring-teal-400/30 resize-none outline-none"
                  value={editContent}
                  onChange={e => setEditContent(e.target.value)}
                  rows={2}
                />
                <div className="flex justify-end gap-1.5">
                  <button aria-label="Batal Edit" onClick={() => setIsEditing(false)} className="p-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-200 min-h-[32px] min-w-[32px] flex items-center justify-center">
                    <X className="w-3.5 h-3.5" />
                  </button>
                  <button aria-label="Simpan Edit" onClick={handleSaveEdit} className="p-1.5 bg-teal-500 hover:bg-teal-600 rounded-lg text-white min-h-[32px] min-w-[32px] flex items-center justify-center">
                    <Check className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="whitespace-pre-wrap text-[13px] sm:text-sm leading-relaxed">{msg.content.replace('[PLUGIN_RESULT]\n', 'Hasil Fitur: ')}</div>
                <button 
                  onClick={() => setIsEditing(true)} 
                  className="absolute -left-9 top-1/2 -translate-y-1/2 p-1.5 opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 min-h-[32px] min-w-[32px] flex items-center justify-center"
                  title="Edit Pesan"
                  aria-label="Edit Pesan"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              </>
            )}
          </>
        ) : (
          <div className="w-full">
            {msg.error ? (
              <div className="bg-rose-50 p-3.5 rounded-2xl border border-rose-200 inline-block text-xs">
                <p className="text-rose-700 mb-2 font-medium">{msg.content}</p>
                <button aria-label="Coba Lagi" onClick={onRegenerate} className="px-3 py-1.5 bg-rose-100 text-rose-800 rounded-xl font-semibold hover:bg-rose-200 transition-colors min-h-[36px]">
                  Coba Lagi
                </button>
              </div>
            ) : (
              <div className="prose prose-slate max-w-none break-words overflow-hidden prose-p:leading-relaxed prose-pre:bg-stone-100/80 prose-pre:border prose-pre:border-stone-200 prose-pre:text-slate-800 text-[13px] sm:text-sm leading-relaxed">
                <ReactMarkdown>{msg.content}</ReactMarkdown>
              </div>
            )}
            
            {msg.plugin === 'screening' && <div className="mt-3"><ScreeningCard onAction={() => onOpenPlugin?.('screening')} /></div>}
            {msg.plugin === 'mood' && <div className="mt-3"><MoodCard onAction={() => onOpenPlugin?.('mood')} /></div>}
            {msg.plugin === 'counselors' && <div className="mt-3"><CounselorCard onAction={() => onOpenPlugin?.('counselors')} /></div>}
            {msg.plugin === 'emergency' && <div className="mt-3"><EmergencyCard onAction={() => onOpenPlugin?.('emergency')} /></div>}
            {msg.plugin === 'articles' && <div className="mt-3"><ArticlesCard onAction={() => onOpenPlugin?.('articles')} /></div>}

            {msg.plugin && isTyping && (
              <div className="text-xs text-teal-600 animate-pulse mt-2 flex items-center gap-1.5 font-medium">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                Memuat layanan {msg.plugin}...
              </div>
            )}
            
            {!isTyping && msg.content && !msg.error && (
              <div className="flex items-center gap-1 mt-2.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                <button onClick={handleCopy} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors min-h-[32px] min-w-[32px] flex items-center justify-center" title="Salin Pesan" aria-label="Salin Pesan">
                  <Copy className="w-3.5 h-3.5" />
                </button>
                <button onClick={onRegenerate} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors min-h-[32px] min-w-[32px] flex items-center justify-center" title="Buat Ulang Tanggapan" aria-label="Buat Ulang Tanggapan">
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => showToast('Terima kasih atas masukannya', 'success')} className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors min-h-[32px] min-w-[32px] flex items-center justify-center" title="Bantu Suka" aria-label="Bantu Suka">
                  <ThumbsUp className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => showToast('Terima kasih atas masukannya', 'info')} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors min-h-[32px] min-w-[32px] flex items-center justify-center" title="Kurang Sesuai" aria-label="Kurang Sesuai">
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


