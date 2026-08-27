import React, { useState, useRef, useEffect } from 'react';
import { Send, Plus, Stethoscope, Heart, Users, AlertCircle, Square, BookOpen } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { safeLocalStorage } from '../../../lib/storage';

interface Props {
  onSend: (msg: string, plugin?: string) => void;
  isTyping: boolean;
  onStop: () => void;
  chatId?: string;
  onCommand?: (cmd: string) => void;
}

export function ChatComposer({ onSend, isTyping, onStop, chatId, onCommand }: Props) {
  const [input, setInput] = useState('');
  const [showPlugins, setShowPlugins] = useState(false);
  const [showCommands, setShowCommands] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    // Load draft
    const draft = safeLocalStorage.getItem(`draft_${chatId || 'new'}`);
    if (draft) setInput(draft);
  }, [chatId]);

  useEffect(() => {
    // Save draft
    if (input.trim()) {
      safeLocalStorage.setItem(`draft_${chatId || 'new'}`, input);
    } else {
      safeLocalStorage.removeItem(`draft_${chatId || 'new'}`);
    }

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 140) + 'px';
    }

    setShowCommands(input.startsWith('/'));
  }, [input, chatId]);

  const handleSend = () => {
    if (!input.trim() || isTyping) return;
    
    if (input.startsWith('/') && onCommand) {
       onCommand(input.trim());
    } else {
       onSend(input);
    }
    
    setInput('');
    localStorage.removeItem(`draft_${chatId || 'new'}`);
    setShowCommands(false);
  };

  const commands = [
    { cmd: '/new', label: 'Chat Baru' },
    { cmd: '/mood', label: 'Mood Tracker' },
    { cmd: '/articles', label: 'Artikel Edukasi' },
    { cmd: '/screening', label: 'Screening' },
    { cmd: '/counselor', label: 'Cari Konselor' },
    { cmd: '/summary', label: 'Ringkas Percakapan' },
  ];

  const plugins = [
    { id: 'mood', icon: Heart, label: 'Mood Tracker', color: 'text-rose-500 bg-rose-50' },
    { id: 'articles', icon: BookOpen, label: 'Artikel Edukasi', color: 'text-indigo-600 bg-indigo-50' },
    { id: 'screening', icon: Stethoscope, label: 'Screening PHQ-9', color: 'text-blue-500 bg-blue-50' },
    { id: 'counselors', icon: Users, label: 'Konselor Kampus', color: 'text-teal-600 bg-teal-50' },
    { id: 'emergency', icon: AlertCircle, label: 'Bantuan Darurat SOS', color: 'text-rose-600 bg-rose-50' },
  ];

  return (
    <div className="p-3 sm:p-4 bg-white/95 backdrop-blur-md sticky bottom-0 z-20 pb-[max(env(safe-area-inset-bottom),_0.75rem)] border-t border-slate-100/50">
      <div className="max-w-3xl mx-auto relative">
        <AnimatePresence>
          {showCommands && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="absolute bottom-full left-0 mb-2 bg-white border border-stone-200 shadow-lg rounded-2xl p-1.5 w-full max-w-sm z-20 text-xs"
            >
              <div className="text-[10px] font-bold text-slate-400 px-2.5 py-1 uppercase tracking-wider">Perintah Cepat</div>
              {commands.filter(c => c.cmd.startsWith(input.toLowerCase())).map(c => (
                <button
                  key={c.cmd}
                  onClick={() => {
                    setInput(c.cmd);
                    textareaRef.current?.focus();
                  }}
                  className="w-full text-left px-2.5 py-1.5 hover:bg-slate-50 text-slate-700 flex items-center gap-2 rounded-xl transition-colors font-medium"
                >
                  <span className="font-mono text-teal-600 bg-teal-50 px-1.5 py-0.5 rounded text-[11px] font-bold">{c.cmd}</span> {c.label}
                </button>
              ))}
            </motion.div>
          )}

          {showPlugins && !showCommands && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="absolute bottom-full left-0 mb-2 bg-white border border-stone-200 shadow-lg rounded-2xl p-1.5 w-full max-w-xs grid grid-cols-1 gap-1 z-20 text-xs"
            >
              <div className="text-[10px] font-bold text-slate-400 px-2.5 py-1 uppercase tracking-wider">Layanan Terintegrasi</div>
              {plugins.map(p => (
                <button
                  key={p.id}
                  onClick={() => {
                    setShowPlugins(false);
                    onSend(`Tolong buka fitur ${p.label}`);
                  }}
                  className="flex items-center gap-2.5 p-2 hover:bg-slate-50 rounded-xl text-left transition-colors font-medium text-slate-700"
                >
                  <div className={`p-1.5 rounded-lg ${p.color}`}>
                    <p.icon className="w-3.5 h-3.5" />
                  </div>
                  <span>{p.label}</span>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="relative flex items-center gap-1.5 bg-white border border-stone-200/90 rounded-[18px] p-2 min-h-[56px] shadow-xs focus-within:border-teal-500 focus-within:ring-2 focus-within:ring-teal-500/15 transition-all">
          <button
            onClick={() => setShowPlugins(!showPlugins)}
            className={`w-[36px] h-[36px] min-w-[36px] flex items-center justify-center rounded-xl transition-colors shrink-0 ${
              showPlugins ? 'bg-teal-100 text-teal-800' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-700'
            }`}
            title="Layanan & Fitur"
            aria-label="Layanan & Fitur"
          >
            <Plus className="w-4 h-4" />
          </button>
          
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Ceritakan apa saja di sini... Ruang amanmu & privasi terjaga 🤍"
            className="w-full max-h-24 bg-transparent border-none focus:ring-0 resize-none py-1.5 px-1 text-[16px] text-slate-900 placeholder-slate-400 leading-[1.4] outline-none placeholder:whitespace-nowrap placeholder:overflow-hidden placeholder:text-ellipsis"
            rows={1}
            disabled={isTyping}
          />
          
          {isTyping ? (
            <button
              onClick={onStop}
              className="w-[42px] h-[42px] min-w-[42px] bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-[14px] flex items-center justify-center shrink-0 transition-all"
              title="Hentikan Jawaban"
              aria-label="Hentikan Jawaban"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={!input.trim()}
              className={`w-[42px] h-[42px] min-w-[42px] rounded-[14px] flex items-center justify-center shrink-0 transition-all ${
                input.trim()
                  ? 'bg-teal-600 hover:bg-teal-700 text-white shadow-xs active:scale-95'
                  : 'bg-slate-100 text-slate-300 cursor-not-allowed'
              }`}
              title="Kirim Pesan"
              aria-label="Kirim Pesan"
            >
              <Send className="w-4 h-4" />
            </button>
          )}
        </div>
        
        <div className="flex justify-between items-start mt-1.5 px-2 text-[11px] leading-[1.4] text-slate-500 gap-2">
          <span className="line-clamp-2">🔐 Ceritamu privat & aman. RuangTenang siap mendengarkan tanpa menghakimi 🤍 (Bukan medis)</span>
          <span className={`shrink-0 ${input.length > 800 ? 'text-amber-500 font-medium' : ''}`}>{input.length}/1000</span>
        </div>
      </div>
    </div>
  );
}
