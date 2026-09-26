import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Plus, 
  Square, 
  Paperclip, 
  X, 
  FileText, 
  ShieldCheck, 
  Command,
  Mic,
  MicOff,
  LucideIcon
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { safeLocalStorage } from '../../../lib/storage';
import { CHAT_COMMANDS, CHAT_PLUGINS } from '../constants/commands';
import { Attachment } from '../types';
import { useToast } from '../../../components/Toast';

interface Props {
  onSend: (msg: string, plugin?: string, attachments?: any[]) => void;
  isTyping: boolean;
  onStop: () => void;
  chatId?: string;
  onCommand?: (cmd: string) => void;
  onOpenPlugin?: (pluginId: string) => void;
  quotaExceeded?: boolean;
}

export function ChatComposer({ 
  onSend, 
  isTyping, 
  onStop, 
  chatId, 
  onCommand, 
  onOpenPlugin,
  quotaExceeded = false
}: Props) {
  const { showToast } = useToast();
  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [showCommands, setShowCommands] = useState(false);
  const [selectedCmdIndex, setSelectedCmdIndex] = useState(0);
  const [isListening, setIsListening] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const composerContainerRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  // Toggle Voice Input Speech-to-Text (id-ID)
  const toggleListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      showToast('Browser Anda tidak mendukung fitur perekaman suara (Speech Recognition).', 'info');
      return;
    }

    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
    } else {
      try {
        const recognition = new SpeechRecognition();
        recognition.lang = 'id-ID';
        recognition.continuous = false;
        recognition.interimResults = true;

        const initialInput = input;

        recognition.onresult = (event: any) => {
          let transcript = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            transcript += event.results[i][0].transcript;
          }
          if (transcript) {
            const prefix = initialInput ? (initialInput.endsWith(' ') ? initialInput : initialInput + ' ') : '';
            setInput(prefix + transcript);
          }
        };

        recognition.onerror = (event: any) => {
          console.warn('[STT] Error:', event.error);
          setIsListening(false);
          if (event.error === 'not-allowed') {
            showToast('Izin mikrofon ditolak oleh browser.', 'error');
          }
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognition.start();
        recognitionRef.current = recognition;
        setIsListening(true);
        showToast('Mendengarkan suara (Bahasa Indonesia)...', 'info');
      } catch (err) {
        console.error('[STT] Failed to start:', err);
        setIsListening(false);
      }
    }
  };

  // Clean up recognition on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  // Load and persist draft per chat session
  useEffect(() => {
    const draft = safeLocalStorage.getItem(`draft_${chatId || 'new'}`);
    if (draft) setInput(draft);
    setAttachments([]);
  }, [chatId]);

  useEffect(() => {
    if (input.trim()) {
      safeLocalStorage.setItem(`draft_${chatId || 'new'}`, input);
    } else {
      safeLocalStorage.removeItem(`draft_${chatId || 'new'}`);
    }

    // Auto-grow textarea smoothly from 40px up to 120px without layout jump
    if (textareaRef.current) {
      if (!input.trim()) {
        textareaRef.current.style.height = '40px';
      } else {
        textareaRef.current.style.height = 'auto';
        const newHeight = Math.min(Math.max(textareaRef.current.scrollHeight, 40), 120);
        textareaRef.current.style.height = `${newHeight}px`;
      }
    }

    // Detect slash commands
    const isSlash = input.startsWith('/');
    setShowCommands(isSlash);
    if (isSlash) setSelectedCmdIndex(0);
  }, [input, chatId]);

  // Click outside to dismiss open menus
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (composerContainerRef.current && !composerContainerRef.current.contains(e.target as Node)) {
        setShowActionMenu(false);
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
  const ALLOWED_TYPES = [
    'application/pdf', 
    'image/jpeg', 
    'image/png', 
    'image/webp', 
    'text/plain', 
    'text/markdown', 
    'application/msword', 
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    if (attachments.length + files.length > 3) {
      showToast('Maksimal 3 lampiran diperbolehkan dalam satu pesan.', 'warning');
      return;
    }

    const newAttachments = files.map(file => {
      if (file.size > MAX_FILE_SIZE) {
        return {
          id: Math.random().toString(36).substring(7),
          file,
          status: 'error' as const,
          errorMessage: 'Ukuran file terlalu besar (Maks 5MB)'
        };
      }
      if (!ALLOWED_TYPES.includes(file.type)) {
        return {
          id: Math.random().toString(36).substring(7),
          file,
          status: 'error' as const,
          errorMessage: 'Format file tidak didukung'
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

      // Upload via backend endpoint
      const formData = new FormData();
      formData.append('files', file);

      fetch('/api/v1/chat/attachments/upload', {
        method: 'POST',
        credentials: 'include',
        body: formData
      })
      .then(async res => {
        const data = await res.json();
        if (!res.ok || !data.success) {
          const errMsg = data.message || data.error?.message || 'Gagal mengunggah berkas';
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
    setShowActionMenu(false);
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
    setShowActionMenu(false);
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
    if (isTyping) {
      onStop();
      return;
    }
    if ((!input.trim() && attachments.length === 0) || isTyping) return;

    if (input.startsWith('/')) {
      handleExecuteCommand(input.trim());
      return;
    }

    const validAttachments = attachments.filter(a => a.status === 'success');
    if (validAttachments.length > 0) {
      onSend(input.trim(), undefined, validAttachments);
    } else {
      onSend(input.trim());
    }

    setInput('');
    setAttachments([]);
    safeLocalStorage.removeItem(`draft_${chatId || 'new'}`);
    setShowActionMenu(false);
    setShowCommands(false);

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
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
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        const selected = filteredCommands[selectedCmdIndex];
        if (selected) {
          handleExecuteCommand(selected.cmd);
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
      handleSend();
    }
  };

  const hasContent = Boolean(input.trim() || attachments.length > 0);

  return (
    <div 
      ref={composerContainerRef}
      className="w-full sticky bottom-0 z-20 shrink-0 bg-gradient-to-t from-slate-50/80 via-slate-50/40 to-transparent dark:from-[#080d16]/80 dark:via-[#080d16]/40 pointer-events-none [&>*]:pointer-events-auto"
    >
      <div className="pt-1 pb-safe pb-[max(0.5rem,env(safe-area-inset-bottom))] px-3 max-w-2xl mx-auto w-full relative">
        
        {/* 1. Quick Slash Commands Dropdown */}
        <AnimatePresence>
          {showCommands && filteredCommands.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              transition={{ duration: 0.15 }}
              className="absolute bottom-full mb-2 left-0 right-0 sm:right-auto sm:w-80 bg-white dark:bg-slate-850 rounded-2xl border border-slate-200 dark:border-slate-750 shadow-xl overflow-hidden z-30 p-1.5"
              role="listbox"
              aria-label="Pintas Perintah Cepat"
            >
              <div className="text-[11px] font-semibold text-stone-500 dark:text-slate-400 px-2.5 py-1 flex items-center justify-between border-b border-stone-100 dark:border-slate-800 pb-1 mb-1">
                <div className="flex items-center gap-1.5">
                  <Command className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                  <span>Pintas Perintah</span>
                </div>
                <span className="text-[10px] font-mono text-stone-400">↑↓ Navigasi • Enter</span>
              </div>
              <div className="max-h-56 overflow-y-auto space-y-0.5 custom-scrollbar">
                {filteredCommands.map((c, index) => {
                  const IconComponent = c.icon as LucideIcon;
                  const isSelected = index === selectedCmdIndex;
                  return (
                    <button
                      key={c.cmd}
                      type="button"
                      onClick={() => handleExecuteCommand(c.cmd)}
                      onMouseEnter={() => setSelectedCmdIndex(index)}
                      className={`w-full text-left px-2.5 py-2 rounded-xl transition-all flex items-center gap-2.5 cursor-pointer text-xs min-h-[44px] ${
                        isSelected 
                          ? 'bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 font-medium shadow-2xs' 
                          : 'text-stone-700 dark:text-slate-300 hover:bg-stone-100/80 dark:hover:bg-slate-800/60'
                      }`}
                      role="option"
                      aria-selected={isSelected}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        isSelected
                          ? 'bg-teal-100/80 dark:bg-teal-900/60 text-teal-700 dark:text-teal-300'
                          : 'bg-stone-100 dark:bg-slate-800 text-stone-500 dark:text-slate-400'
                      }`}>
                        <IconComponent className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className={`font-mono font-semibold ${isSelected ? 'text-teal-700 dark:text-teal-300' : 'text-teal-600 dark:text-teal-400'}`}>
                            {c.cmd}
                          </span>
                          <span className="text-[11px] text-stone-500 dark:text-slate-400 truncate ml-2 font-medium">
                            {c.label}
                          </span>
                        </div>
                        <p className="text-[11px] text-stone-500 dark:text-slate-400 truncate mt-0.5">
                          {c.desc}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 2. Zen Action Sheet '+' (Expandable Menu) */}
        <AnimatePresence>
          {showActionMenu && (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.96 }}
              transition={{ duration: 0.16, ease: 'easeOut' }}
              className="absolute bottom-full left-0 mb-3 w-72 rounded-2xl border border-stone-200/90 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-2 shadow-2xl z-30"
              role="menu"
              aria-label="Aksi Cepat & Layanan Kampus"
            >
              <div className="px-2 pb-1.5 mb-1 border-b border-stone-100 dark:border-slate-800 flex items-center justify-between">
                <span className="text-xs font-semibold text-stone-700 dark:text-stone-300">Layanan & Fitur</span>
                <span className="text-[10px] font-medium text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/80 px-2 py-0.5 rounded-full border border-teal-200/60 dark:border-teal-800/60">
                  Rahasia & Aman
                </span>
              </div>

              {/* Upload Document / Image */}
              <button
                type="button"
                onClick={() => {
                  fileInputRef.current?.click();
                  setShowActionMenu(false);
                }}
                className="w-full flex items-center gap-2.5 p-2 rounded-xl text-left hover:bg-stone-100 dark:hover:bg-slate-800/80 transition-colors text-xs text-stone-700 dark:text-stone-300 cursor-pointer min-h-[38px]"
                role="menuitem"
              >
                <div className="w-7 h-7 rounded-lg bg-teal-50 dark:bg-teal-950/60 flex items-center justify-center shrink-0">
                  <Paperclip className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-stone-800 dark:text-stone-200">Unggah File / Jurnal</div>
                  <div className="text-[10.5px] text-stone-500 dark:text-slate-400 truncate">PDF, Gambar, Teks (Maks 5MB)</div>
                </div>
              </button>

              {/* Quick Plugins List */}
              <div className="pt-1 space-y-0.5 border-t border-stone-100 dark:border-slate-800 mt-1">
                {CHAT_PLUGINS.map(p => {
                  const Icon = p.icon;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setShowActionMenu(false);
                        onOpenPlugin?.(p.id);
                      }}
                      className="w-full flex items-center gap-2.5 p-2 rounded-xl text-left hover:bg-stone-100 dark:hover:bg-slate-800/80 transition-colors text-xs text-stone-700 dark:text-stone-300 cursor-pointer min-h-[38px]"
                      role="menuitem"
                    >
                      <div className="w-7 h-7 rounded-lg bg-stone-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                        <Icon className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-stone-800 dark:text-stone-200">{p.label}</div>
                        <div className="text-[10.5px] text-stone-500 dark:text-slate-400 truncate">{p.desc}</div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Privacy Footer Reassurance */}
              <div className="mt-1.5 pt-1.5 border-t border-stone-100 dark:border-slate-800/80 flex items-center gap-1.5 px-2 text-[10.5px] text-stone-500 dark:text-slate-400">
                <ShieldCheck className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
                <span>Enkripsi End-to-End aktif.</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Hidden File Input */}
        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          multiple 
          accept=".pdf,image/*,.txt,.md,.doc,.docx" 
          onChange={handleFileSelect} 
        />

        {/* 3. Attachments Preview Bar */}
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2 px-1">
            {attachments.map(att => (
              <div 
                key={att.id} 
                className="relative flex items-center gap-2 p-1.5 pr-2 bg-white dark:bg-slate-900 border border-stone-200/90 dark:border-slate-800 rounded-xl shadow-xs text-xs"
              >
                {att.previewUrl ? (
                  <div className="w-7 h-7 rounded-lg shrink-0 overflow-hidden bg-stone-100 dark:bg-slate-800">
                    <img src={att.previewUrl} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="w-7 h-7 rounded-lg shrink-0 flex items-center justify-center bg-stone-100 dark:bg-slate-800 text-teal-600 dark:text-teal-400">
                    <FileText className="w-3.5 h-3.5" />
                  </div>
                )}
                <div className="flex-1 min-w-0 max-w-[140px]">
                  <div className="font-medium text-[11.5px] text-stone-800 dark:text-stone-200 truncate">{att.file.name}</div>
                  {att.status === 'uploading' && <div className="text-[10px] text-teal-600 dark:text-teal-400">Mengunggah...</div>}
                  {att.status === 'error' && <div className="text-[10px] text-red-500 truncate">{att.errorMessage}</div>}
                  {att.status === 'success' && <div className="text-[10px] text-emerald-600">Siap dikirim</div>}
                </div>
                <button
                  type="button"
                  onClick={() => removeAttachment(att.id)}
                  className="w-6 h-6 rounded-md flex items-center justify-center text-stone-400 hover:text-red-500 hover:bg-stone-100 dark:hover:bg-slate-800 transition-colors"
                  aria-label="Hapus lampiran"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* 4. Floating Island Input Bar with Restrained Borders */}
        <div className="relative w-full max-w-2xl mx-auto">
          {/* Input Container */}
          <div className="relative flex items-center gap-1 sm:gap-1.5 p-1.5 sm:p-2 rounded-2xl bg-white dark:bg-slate-900 border border-stone-200/90 dark:border-slate-800 shadow-2xs transition-all duration-150 focus-within:border-teal-500/80 dark:focus-within:border-teal-500/80 focus-within:ring-1 focus-within:ring-teal-500/20">
            
            {/* Left Actions: Plus (+) & Mic */}
            <div className="flex items-center gap-0.5 shrink-0">
              <motion.button
                type="button"
                whileTap={{ scale: 0.94 }}
                onClick={() => {
                  setShowActionMenu(!showActionMenu);
                  setShowCommands(false);
                }}
                className={`w-8.5 h-8.5 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-slate-800 shrink-0 transition-colors cursor-pointer ${
                  showActionMenu ? 'rotate-45 text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/60' : ''
                }`}
                aria-label="Buka Menu Bantuan & Fitur"
                title="Layanan & Bantuan (+)"
                aria-expanded={showActionMenu}
              >
                <Plus className="w-4 h-4 transition-transform duration-200" />
              </motion.button>

              <motion.button
                type="button"
                whileTap={{ scale: 0.94 }}
                onClick={toggleListening}
                className={`w-8.5 h-8.5 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center shrink-0 transition-all cursor-pointer ${
                  isListening
                    ? 'bg-rose-500 text-white animate-pulse shadow-3xs'
                    : 'text-stone-400 hover:text-teal-600 dark:hover:text-teal-400 hover:bg-stone-100 dark:hover:bg-slate-800'
                }`}
                aria-label={isListening ? "Hentikan rekam suara" : "Input suara (Speech-to-Text)"}
                title={isListening ? "Hentikan rekam suara (Sedang mendengarkan...)" : "Bicara (Input Suara Speech-to-Text)"}
              >
                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </motion.button>
            </div>
            
            {/* Textarea Input - Font size 16px on mobile prevents iOS Safari forced viewport auto-zoom */}
            <textarea
              ref={textareaRef}
              value={input}
              onFocus={() => {
                setTimeout(() => {
                  composerContainerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
                }, 120);
              }}
              onChange={e => {
                setInput(e.target.value);
              }}
              onKeyDown={handleKeyDown}
              placeholder={
                quotaExceeded 
                  ? "Kuota harian telah digunakan. Istirahatlah sejenak dan kembali besok."
                  : isListening 
                    ? "Mendengarkan ucapan Anda (Bahasa Indonesia)..." 
                    : "Ketik apa yang kamu rasakan..."
              }
              className="flex-1 bg-transparent text-[16px] sm:text-[14px] text-stone-850 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-slate-500 focus:outline-none resize-none min-h-[38px] py-2 px-1.5 leading-relaxed overflow-y-auto custom-scrollbar disabled:opacity-60 disabled:cursor-not-allowed"
              rows={1}
              disabled={isTyping || quotaExceeded}
              aria-label="Ketik pesan konsultasi"
            />
            
            {/* Primary Conversational Send / Stop Action Button */}
            <AnimatePresence mode="wait" initial={false}>
              {isTyping ? (
                <motion.button
                  key="stop-btn"
                  type="button"
                  initial={{ scale: 0.85, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.85, opacity: 0 }}
                  transition={{ duration: 0.12 }}
                  onClick={onStop}
                  className="w-8.5 h-8.5 sm:w-9 sm:h-9 rounded-xl bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center shrink-0 cursor-pointer shadow-3xs"
                  aria-label="Hentikan Jawaban AI"
                  title="Hentikan respons AI"
                >
                  <Square className="w-3.5 h-3.5 fill-current" />
                </motion.button>
              ) : (
                <motion.button
                  key="send-btn"
                  type="button"
                  initial={{ scale: 0.85, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.85, opacity: 0 }}
                  transition={{ duration: 0.12 }}
                  whileTap={hasContent ? { scale: 0.94 } : undefined}
                  onClick={handleSend}
                  disabled={!hasContent}
                  className={`w-8.5 h-8.5 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center shrink-0 transition-all duration-120 ${
                    hasContent
                      ? 'bg-teal-600 hover:bg-teal-700 text-white shadow-3xs cursor-pointer'
                      : 'text-stone-300 dark:text-slate-600 bg-transparent cursor-not-allowed'
                  }`}
                  aria-label="Kirim Pesan"
                  title="Kirim pesan (Enter)"
                >
                  <Send className="w-3.5 h-3.5 ml-0.5" />
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </div>
        
        {/* Reassurance Caption */}
        <p className="text-[11px] text-stone-400 dark:text-slate-500 text-center mt-1.5 select-none">
          Ruang aman tanpa penghakiman <span className="opacity-40">·</span> Rahasia & Terenkripsi
        </p>
      </div>
    </div>
  );
}
