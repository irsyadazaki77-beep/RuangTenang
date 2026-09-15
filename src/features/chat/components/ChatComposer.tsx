import React, { useState, useRef, useEffect } from 'react';
import { Send, Plus, Square, Sparkles, Paperclip, X, FileText } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { safeLocalStorage } from '../../../lib/storage';
import { CHAT_COMMANDS, CHAT_PLUGINS } from '../constants/commands';
import { Attachment } from '../types';

interface Props {
  onSend: (msg: string, plugin?: string, attachments?: any[]) => void;
  isTyping: boolean;
  onStop: () => void;
  chatId?: string;
  onCommand?: (cmd: string) => void;
  onOpenPlugin?: (pluginId: string) => void;
}

export function ChatComposer({ onSend, isTyping, onStop, chatId, onCommand, onOpenPlugin }: Props) {
  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showPlugins, setShowPlugins] = useState(false);
  const [showCommands, setShowCommands] = useState(false);
  const [selectedCmdIndex, setSelectedCmdIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const composerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const draft = safeLocalStorage.getItem(`draft_${chatId || 'new'}`);
    if (draft) setInput(draft);
    setAttachments([]); // Clear attachments when switching chat
  }, [chatId]);

  useEffect(() => {
    if (input.trim()) {
      safeLocalStorage.setItem(`draft_${chatId || 'new'}`, input);
    } else {
      safeLocalStorage.removeItem(`draft_${chatId || 'new'}`);
    }

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const newHeight = Math.min(textareaRef.current.scrollHeight, 160);
      textareaRef.current.style.height = `${newHeight}px`;
    }

    const isSlash = input.startsWith('/');
    setShowCommands(isSlash);
    if (isSlash) {
      setSelectedCmdIndex(0);
    }
  }, [input, chatId]);

  // Click outside to close menus
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (composerRef.current && !composerRef.current.contains(e.target as Node)) {
        setShowPlugins(false);
        setShowCommands(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredCommands = CHAT_COMMANDS.filter(c => 
    c.cmd.toLowerCase().startsWith(input.toLowerCase()) ||
    c.label.toLowerCase().includes(input.slice(1).toLowerCase())
  );

  
  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'text/plain', 'text/markdown', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    
    if (attachments.length + files.length > 3) {
      alert('Maksimal 3 lampiran diperbolehkan.');
      return;
    }

    const newAttachments = files.map(file => {
      if (file.size > MAX_FILE_SIZE) {
        return {
          id: Math.random().toString(36).substring(7),
          file,
          status: 'error' as const,
          errorMessage: 'Ukuran file terlalu besar (Max 5MB)'
        };
      }
      if (!ALLOWED_TYPES.includes(file.type)) {
         return {
          id: Math.random().toString(36).substring(7),
          file,
          status: 'error' as const,
          errorMessage: 'Tipe file tidak diizinkan'
        };
      }

      const id = Math.random().toString(36).substring(7);
      const isImage = file.type.startsWith('image/');
      
      const newAttachment: Attachment = {
        id,
        file,
        status: 'uploading' as const,
        previewUrl: isImage ? URL.createObjectURL(file) : undefined
      };

      // Upload via FormData multipart endpoint
      const formData = new FormData();
      formData.append('files', file);

      const headers: Record<string, string> = {};
      const token = localStorage.getItem('token');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      fetch('/api/v1/chat/attachments/upload', {
        method: 'POST',
        headers,
        body: formData
      })
      .then(async res => {
        const data = await res.json();
        if (!res.ok || !data.success) {
          const errMsg = data.message || data.error?.message || 'Gagal mengunggah file';
          setAttachments(prev => prev.map(a => a.id === id ? { ...a, status: 'error', errorMessage: errMsg } : a));
          return;
        }
        const uploadedAtt = data.attachment || (data.attachments && data.attachments[0]);
        setAttachments(prev => prev.map(a => a.id === id ? {
          ...a,
          status: 'success',
          serverAttachmentId: uploadedAtt.id,
          filename: uploadedAtt.filename,
          mimeType: uploadedAtt.mimeType,
          size: uploadedAtt.size,
          url: uploadedAtt.url
        } : a));
      })
      .catch(() => {
        setAttachments(prev => prev.map(a => a.id === id ? { ...a, status: 'error', errorMessage: 'Gagal terhubung ke server' } : a));
      });

      return newAttachment;
    });

    setAttachments(prev => [...prev, ...newAttachments]);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setShowPlugins(false);
  };

  const removeAttachment = (id: string) => {
    setAttachments(prev => prev.filter(a => {
      if (a.id === id && a.previewUrl) URL.revokeObjectURL(a.previewUrl);
      return a.id !== id;
    }));
  };

  const handleExecuteCommand = (cmdStr: string) => {
    setInput('');
    safeLocalStorage.removeItem(`draft_${chatId || 'new'}`);
    setShowCommands(false);
    setShowPlugins(false);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    const commandObj = CHAT_COMMANDS.find(c => c.cmd.toLowerCase() === cmdStr.toLowerCase());
    if (commandObj?.actionType === 'plugin' && commandObj.pluginId && onOpenPlugin) {
      onOpenPlugin(commandObj.pluginId);
      return;
    }

    if (onCommand) {
      onCommand(cmdStr);
    }
  };

  const handleSend = () => {
    if ((!input.trim() && attachments.length === 0) || isTyping) return;
    
    if (input.startsWith('/')) {
      handleExecuteCommand(input.trim());
      return;
    }
    
    const validAttachments = attachments.filter(a => a.status === 'success');
    if (validAttachments.length > 0) {
      onSend(input, undefined, validAttachments);
    } else {
      onSend(input);
    }
    setAttachments([]);
    setInput('');
    safeLocalStorage.removeItem(`draft_${chatId || 'new'}`);
    setShowCommands(false);
    setShowPlugins(false);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handlePluginClick = (pluginId: string) => {
    setShowPlugins(false);
    if (onOpenPlugin) {
      onOpenPlugin(pluginId);
    }
  };

  return (
    <div 
      ref={composerRef}
      className="w-full px-3 sm:px-4 pt-1.5 pb-[max(0.75rem,env(safe-area-inset-bottom))] sticky bottom-0 z-20 shrink-0 bg-gradient-to-t from-stone-50 via-stone-50/95 to-transparent dark:from-[#0c1117] dark:via-[#0c1117]/95"
    >
      <div className="max-w-3xl mx-auto w-full relative">
        <AnimatePresence>
          {/* Quick Command Suggestions Popup */}
          {showCommands && filteredCommands.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 4, scale: 0.98 }}
              transition={{ duration: 0.12 }}
              className="absolute bottom-full left-0 mb-2 w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl rounded-xl p-1 z-30 overflow-hidden"
              role="listbox"
              aria-label="Daftar Perintah Cepat"
            >
              <div className="text-[10.5px] font-medium text-slate-400 dark:text-slate-500 px-2 py-0.5 flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-0.5 mb-0.5">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                  Perintah Cepat
                </div>
                <span className="text-[10px]">Enter / Tab</span>
              </div>
              <div className="max-h-44 overflow-y-auto space-y-0.5 custom-scrollbar">
                {filteredCommands.map((c, index) => {
                  const Icon = c.icon;
                  const isSelected = index === selectedCmdIndex;
                  return (
                    <button
                      key={c.cmd}
                      type="button"
                      onClick={() => handleExecuteCommand(c.cmd)}
                      onMouseEnter={() => setSelectedCmdIndex(index)}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg transition-colors flex items-center gap-2 cursor-pointer text-xs min-h-[36px] ${
                        isSelected 
                          ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100' 
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                      }`}
                      role="option"
                      aria-selected={isSelected}
                    >
                      <div className="w-6 h-6 rounded-md bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                        <Icon className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-semibold text-teal-600 dark:text-teal-400">{c.cmd}</span>
                          <span className="text-[10.5px] text-slate-400 truncate ml-2">{c.label}</span>
                        </div>
                        <p className="text-[10.5px] text-slate-400 truncate">{c.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* Plus / Quick Tools Popup */}
          {showPlugins && !showCommands && (
            <motion.div
              initial={{ opacity: 0, y: 6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 4, scale: 0.98 }}
              transition={{ duration: 0.12 }}
              className="absolute bottom-full left-0 mb-2 w-full max-w-[260px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl rounded-xl p-1 z-30 space-y-0.5"
              role="menu"
              aria-label="Layanan & Fitur"
            >
              <div className="text-[10.5px] font-semibold text-slate-400 dark:text-slate-500 px-2 py-0.5">
                Lampiran
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center gap-2 p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-left transition-colors cursor-pointer mb-0.5 min-h-[38px]"
                role="menuitem"
              >
                <div className="w-7 h-7 rounded-md bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                  <Paperclip className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-xs text-slate-800 dark:text-slate-200">Unggah File</div>
                  <div className="text-[10.5px] text-slate-400 truncate">PDF, Gambar, Teks (Max 5MB)</div>
                </div>
              </button>

              <div className="text-[10.5px] font-semibold text-slate-400 dark:text-slate-500 px-2 py-0.5">
                Layanan & Fitur
              </div>
              {CHAT_PLUGINS.map(p => {
                const Icon = p.icon;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handlePluginClick(p.id)}
                    className="w-full flex items-center gap-2 p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-left transition-colors cursor-pointer min-h-[38px]"
                    role="menuitem"
                  >
                    <div className="w-7 h-7 rounded-md bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                      <Icon className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-xs text-slate-800 dark:text-slate-200">{p.label}</div>
                      <div className="text-[10.5px] text-slate-400 truncate">{p.desc}</div>
                    </div>
                  </button>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>

        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-1.5 px-1">
            {attachments.map(att => (
              <div key={att.id} className="relative flex items-center gap-1.5 p-1 pr-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xs text-xs">
                {att.previewUrl ? (
                  <div className="w-8 h-8 rounded-md shrink-0 overflow-hidden bg-slate-100">
                    <img src={att.previewUrl} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-md shrink-0 flex items-center justify-center bg-slate-100 dark:bg-slate-700">
                    <FileText className="w-3.5 h-3.5 text-slate-500" />
                  </div>
                )}
                <div className="flex-1 min-w-0 max-w-[120px]">
                  <div className="font-medium text-[11.5px] text-slate-700 dark:text-slate-300 truncate">{att.file.name}</div>
                  {att.status === 'uploading' && <div className="text-[9.5px] text-teal-600">Memuat...</div>}
                  {att.status === 'error' && <div className="text-[9.5px] text-red-500 truncate">{att.errorMessage}</div>}
                </div>
                <button
                  type="button"
                  onClick={() => removeAttachment(att.id)}
                  className="min-w-[28px] min-h-[28px] rounded-md flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Input Bar: Clean Floating Capsule with balanced density */}
        <div className="relative flex items-end gap-1 sm:gap-1.5 bg-white dark:bg-slate-900 border border-stone-200/90 dark:border-slate-800 rounded-xl sm:rounded-2xl p-1 sm:p-1.5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] dark:shadow-[0_4px_16px_rgba(0,0,0,0.25)] focus-within:border-teal-500/60 dark:focus-within:border-teal-500/60 transition-all">
          {/* Plus Button */}
          <button
            type="button"
            onClick={() => {
              setShowPlugins(!showPlugins);
              setShowCommands(false);
            }}
            className={`w-9 h-9 sm:w-8.5 sm:h-8.5 min-w-[36px] min-h-[36px] rounded-full flex items-center justify-center transition-colors shrink-0 cursor-pointer ${
              showPlugins
                ? 'bg-stone-200 dark:bg-slate-800 text-stone-900 dark:text-stone-100'
                : 'text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-slate-800'
            }`}
            aria-label="Aksi tambahan"
            title="Layanan & Fitur"
            aria-expanded={showPlugins}
          >
            <Plus className={`w-4 h-4 sm:w-4.5 sm:h-4.5 transition-transform duration-150 ${showPlugins ? 'rotate-45' : ''}`} />
          </button>
          
          {/* Textarea: 16px text on mobile prevents auto-zoom on iOS */}
          <input type="file" ref={fileInputRef} className="hidden" multiple accept=".pdf,image/*,.txt,.md,.doc,.docx" onChange={handleFileSelect} />
          <textarea
            ref={textareaRef}
            value={input}
            onFocus={() => {
              setTimeout(() => {
                composerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
              }, 120);
            }}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (showCommands && filteredCommands.length > 0) {
                if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  setSelectedCmdIndex(prev => (prev + 1) % filteredCommands.length);
                  return;
                }
                if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  setSelectedCmdIndex(prev => (prev - 1 + filteredCommands.length) % filteredCommands.length);
                  return;
                }
                if (e.key === 'Tab') {
                  e.preventDefault();
                  const selected = filteredCommands[selectedCmdIndex];
                  if (selected) {
                    setInput(selected.cmd);
                  }
                  return;
                }
                if (e.key === 'Escape') {
                  setShowCommands(false);
                  return;
                }
              }

              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (showCommands && filteredCommands.length > 0) {
                  const selected = filteredCommands[selectedCmdIndex];
                  if (selected) {
                    handleExecuteCommand(selected.cmd);
                    return;
                  }
                }
                handleSend();
              }
            }}
            placeholder="Tulis pesan atau ketik '/' untuk fitur..."
            className="flex-1 max-h-32 sm:max-h-36 bg-transparent border-none focus:ring-0 resize-none py-1.5 px-1 text-[15px] sm:text-[14.5px] text-stone-800 dark:text-stone-200 placeholder-stone-400 dark:placeholder-slate-500 leading-relaxed outline-none min-w-0"
            rows={1}
            disabled={isTyping}
            aria-label="Tulis pesan konsultasi atau perintah"
          />
          
          {/* Send / Stop Button */}
          {isTyping ? (
            <button
              type="button"
              onClick={onStop}
              className="w-9 h-9 sm:w-8.5 sm:h-8.5 min-w-[36px] min-h-[36px] rounded-full bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 flex items-center justify-center shrink-0 transition-transform active:scale-95 cursor-pointer"
              aria-label="Hentikan Jawaban"
              title="Hentikan respons AI"
            >
              <Square className="w-3 h-3 fill-current" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSend}
              disabled={!input.trim() && attachments.length === 0}
              className={`w-9 h-9 sm:w-8.5 sm:h-8.5 min-w-[36px] min-h-[36px] rounded-full flex items-center justify-center shrink-0 transition-all ${
                (input.trim() || attachments.length > 0)
                  ? 'bg-teal-600 hover:bg-teal-700 text-white shadow-xs active:scale-95 cursor-pointer'
                  : 'bg-stone-100 dark:bg-slate-800 text-stone-300 dark:text-slate-600 cursor-not-allowed'
              }`}
              aria-label="Kirim Pesan"
              title="Kirim pesan (Enter)"
            >
              <Send className="w-3.5 h-3.5 ml-0.5" />
            </button>
          )}
        </div>
        
        {/* Minimal Disclaimer */}
        <p className="text-center text-[11px] text-stone-400 dark:text-slate-500 mt-1.5 select-none tracking-tight">
          RuangTenang dapat membuat kekeliruan. Selalu pertimbangkan informasi medis secara profesional.
        </p>
      </div>
    </div>
  );
}

