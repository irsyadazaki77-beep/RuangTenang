import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Plus,
  Square,
  Paperclip,
  X,
  FileText,
  ShieldCheck,
  Command,
  Mic,
  ArrowUp,
  LucideIcon
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { safeLocalStorage } from '../../../lib/storage';
import { CHAT_COMMANDS, CHAT_PLUGINS } from '../constants/commands';
import { Attachment } from '../types';
import { useToast } from '../../../components/Toast';
import { useComposerVoiceInput } from '../hooks/useComposerVoiceInput';
import { readGuestAiConsent } from '../../../lib/guestAiConsent';

interface Props {
  onSend: (msg: string, plugin?: string, attachments?: Attachment[]) => void | boolean;
  isTyping: boolean;
  onStop: () => void;
  aiConsentAllowed?: boolean | null;
  aiConsentPromptOpen?: boolean;
  onRequestAiConsent?: () => void;
  isTemporary?: boolean;
  chatId?: string;
  draftOwnerId?: string;
  onCommand?: (cmd: string) => void;
  onOpenPlugin?: (pluginId: string) => void;
  quotaExceeded?: boolean;
  isEmptyState?: boolean;
}

export function ChatComposer({
  onSend,
  isTyping,
  onStop,
  aiConsentAllowed = true,
  aiConsentPromptOpen = false,
  onRequestAiConsent,
  isTemporary = false,
  chatId,
  draftOwnerId = 'guest',
  onCommand,
  onOpenPlugin,
  quotaExceeded = false,
  isEmptyState = false
}: Props) {
  const { showToast } = useToast();
  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [showCommands, setShowCommands] = useState(false);
  const [selectedCmdIndex, setSelectedCmdIndex] = useState(0);
  const waitingForConsentRef = useRef(false);
  const draftWasJustLoadedRef = useRef(false);
  const wasTemporaryRef = useRef(isTemporary);
  const isTemporaryRef = useRef(isTemporary);
  isTemporaryRef.current = isTemporary;
  const { isListening, toggleListening } = useComposerVoiceInput(input, setInput);

  const lastPrewarmRef = useRef<number>(0);
  const triggerPrewarm = useCallback(() => {
    const now = Date.now();
    if (now - lastPrewarmRef.current < 60_000) return;
    lastPrewarmRef.current = now;
    fetch('/api/chat/prewarm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    }).catch(() => undefined);
  }, []);

  useEffect(() => {
    triggerPrewarm();
  }, [triggerPrewarm]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const composerContainerRef = useRef<HTMLDivElement>(null);
  const attachmentsRef = useRef<Attachment[]>([]);
  attachmentsRef.current = attachments;
  const draftStorageKey = `ruangtenang:chat-draft:${encodeURIComponent(draftOwnerId)}:${encodeURIComponent(chatId || 'new')}`;

  useEffect(() => () => {
    attachmentsRef.current.forEach(attachment => {
      if (attachment.previewUrl) URL.revokeObjectURL(attachment.previewUrl);
    });
  }, []);

  // Load and persist draft per chat session
  useEffect(() => {
    const draft = isTemporaryRef.current ? null : safeLocalStorage.getItem(draftStorageKey);
    draftWasJustLoadedRef.current = true;
    wasTemporaryRef.current = isTemporaryRef.current;
    if (isTemporaryRef.current) safeLocalStorage.removeItem(draftStorageKey);
    setInput(draft || '');
    attachmentsRef.current.forEach(attachment => {
      if (attachment.previewUrl) URL.revokeObjectURL(attachment.previewUrl);
    });
    setAttachments([]);
  }, [draftStorageKey]);

  useEffect(() => {
    if (!waitingForConsentRef.current) return;
    if (aiConsentAllowed !== true && !aiConsentPromptOpen) {
      waitingForConsentRef.current = false;
      return;
    }
    if (aiConsentAllowed !== true) return;
    waitingForConsentRef.current = false;
    setInput('');
    setAttachments(current => {
      current.forEach(attachment => {
        if (attachment.previewUrl) URL.revokeObjectURL(attachment.previewUrl);
      });
      return [];
    });
    safeLocalStorage.removeItem(draftStorageKey);
    setShowActionMenu(false);
    setShowCommands(false);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  }, [aiConsentAllowed, aiConsentPromptOpen, draftStorageKey]);

  useEffect(() => {
    if (draftWasJustLoadedRef.current) {
      draftWasJustLoadedRef.current = false;
      return;
    }
    if (isTemporary || wasTemporaryRef.current) {
      safeLocalStorage.removeItem(draftStorageKey);
      wasTemporaryRef.current = isTemporary;
      return;
    }
    if (!input.trim()) {
      safeLocalStorage.removeItem(draftStorageKey);
      return;
    }
    safeLocalStorage.setItem(draftStorageKey, input);
  }, [input, isTemporary, draftStorageKey]);

  // Slash commands detector
  useEffect(() => {
    if (input.startsWith('/') && !input.includes(' ')) {
      setShowCommands(true);
      setSelectedCmdIndex(0);
    } else {
      setShowCommands(false);
    }
  }, [input]);

  // Auto-expand textarea (min 40px, max 180px)
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollH = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${Math.min(Math.max(scrollH, 40), 180)}px`;
    }
  }, [input]);

  const filteredCommands = CHAT_COMMANDS.filter(c =>
    c.cmd.toLowerCase().startsWith(input.toLowerCase())
  );

  const [isDragging, setIsDragging] = useState(false);

  const processFiles = (filesArray: File[]) => {
    const maxFiles = 3;
    if (attachments.length + filesArray.length > maxFiles) {
      showToast(`Maksimal ${maxFiles} lampiran berkas sekaligus.`, 'warning');
      return;
    }

    const newAttachments: Attachment[] = filesArray.map(file => {
      if (file.size > 5 * 1024 * 1024) {
        return {
          id: Math.random().toString(36).substring(7),
          file,
          status: 'error' as const,
          errorMessage: 'Ukuran file melebihi 5MB'
        };
      }

      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'text/plain', 'text/markdown'];
      const fileExt = file.name.split('.').pop()?.toLowerCase();
      const isAllowedExt = ['pdf', 'jpg', 'jpeg', 'png', 'webp', 'txt', 'md', 'doc', 'docx'].includes(fileExt || '');

      if (!allowedTypes.includes(file.type) && !isAllowedExt) {
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

      const formData = new FormData();
      formData.append('files', file);
      const csrfCookie = document.cookie.match(/(?:^|; )XSRF-TOKEN=([^;]+)/)?.[1];
      const uploadHeaders: Record<string, string> = {
        'X-Requested-With': 'XMLHttpRequest',
        'X-Guest-AI-Consent': String(readGuestAiConsent())
      };
      if (csrfCookie) uploadHeaders['X-CSRF-Token'] = decodeURIComponent(csrfCookie);

      fetch('/api/v1/chat/attachments/upload', {
        method: 'POST',
        headers: uploadHeaders,
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
        if (!uploadedAtt || typeof uploadedAtt.id !== 'string' || !uploadedAtt.id) {
          setAttachments(prev => prev.map(a => a.id === id ? { ...a, status: 'error', errorMessage: 'Metadata berkas dari server tidak lengkap' } : a));
          return;
        }
        const visualAnalysisAvailable = uploadedAtt.visualAnalysisAvailable === true;
        const status = visualAnalysisAvailable ? 'visual_ready' : 'ready';
        setAttachments(prev => prev.map(a => a.id === id ? {
          ...a,
          status,
          serverAttachmentId: uploadedAtt.id,
          filename: uploadedAtt.filename,
          mimeType: uploadedAtt.mimeType,
          size: uploadedAtt.size,
          url: uploadedAtt.url,
          visualAnalysisAvailable,
          ocrApplied: Boolean(uploadedAtt.ocrApplied),
          previewOnly: Boolean(uploadedAtt.previewOnly)
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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    processFiles(Array.from(e.target.files));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      if (aiConsentAllowed !== true) {
        onRequestAiConsent?.();
        showToast('Setujui pemrosesan AI terlebih dahulu sebelum melampirkan berkas.', 'info');
        return;
      }
      processFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const files = Array.from(e.clipboardData?.files ?? []).filter(f => f.type.startsWith('image/'));
    if (files.length === 0) return;
    e.preventDefault();
    if (aiConsentAllowed !== true) {
      onRequestAiConsent?.();
      showToast('Setujui pemrosesan AI terlebih dahulu sebelum melampirkan berkas.', 'info');
      return;
    }
    processFiles(files);
  };

  const removeAttachment = (id: string) => {
    setAttachments(prev => prev.filter(a => {
      if (a.id === id && a.previewUrl) URL.revokeObjectURL(a.previewUrl);
      return a.id !== id;
    }));
  };

  const handleExecuteCommand = (cmdStr: string) => {
    setInput('');
    safeLocalStorage.removeItem(draftStorageKey);
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

    if (attachments.some(attachment => attachment.status === 'uploading' || attachment.status === 'processing')) {
      showToast('Tunggu sampai semua berkas selesai diunggah sebelum mengirim pesan.', 'info');
      return;
    }
    if (attachments.some(attachment => attachment.status === 'error')) {
      showToast('Hapus berkas yang gagal diunggah sebelum mengirim. Pesan belum dikirim.', 'warning');
      return;
    }

    if (input.startsWith('/')) {
      handleExecuteCommand(input.trim());
      return;
    }

    const validAttachments = attachments.filter(a => ['success', 'ready', 'visual_ready'].includes(a.status));
    let accepted: void | boolean;
    if (validAttachments.length > 0) {
      accepted = onSend(input.trim(), undefined, validAttachments);
    } else {
      accepted = onSend(input.trim());
    }

    if (accepted === false) {
      waitingForConsentRef.current = true;
      return;
    }

    attachments.forEach(attachment => {
      if (attachment.previewUrl) URL.revokeObjectURL(attachment.previewUrl);
    });
    setInput('');
    setAttachments([]);
    safeLocalStorage.removeItem(draftStorageKey);
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
      className={`w-full z-20 shrink-0 pointer-events-none [&>*]:pointer-events-auto ${isEmptyState
        ? 'relative bg-transparent'
        : 'sticky bottom-0 bg-gradient-to-t from-[#f8f9fb]/98 via-[#f8f9fb]/88 to-transparent dark:from-[#0b0d10]/98 dark:via-[#0b0d10]/88'
      }`}
    >
      <div className={`mx-auto w-full relative ${isEmptyState ? 'max-w-2xl px-4 pt-4 pb-0 sm:px-6' : 'max-w-3xl px-3 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]'}`}>

        {/* 1. Quick Slash Commands Dropdown */}
        <AnimatePresence>
          {showCommands && filteredCommands.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              transition={{ duration: 0.15 }}
              className="absolute bottom-full mb-2 left-0 right-0 sm:right-auto sm:w-80 bg-white/95 dark:bg-[#1e1f20]/95 backdrop-blur-md rounded-2xl border border-slate-200 dark:border-white/10 shadow-2xl overflow-hidden z-30 p-1.5"
              role="listbox"
              aria-label="Pintas Perintah Cepat"
            >
              <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 px-2.5 py-1.5 flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-1 mb-1">
                <div className="flex items-center gap-1.5">
                  <Command className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                  <span>Pintas Perintah</span>
                </div>
                <span className="text-[10px] font-mono text-slate-400">↑↓ Navigasi · Enter</span>
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
                      className={`w-full text-left px-2.5 py-2 rounded-xl transition-all flex items-center gap-2.5 cursor-pointer text-xs min-h-[40px] ${
                        isSelected
                          ? 'bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 font-medium'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100/80 dark:hover:bg-white/5'
                      }`}
                      role="option"
                      aria-selected={isSelected}
                    >
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                        isSelected
                          ? 'bg-teal-100/80 dark:bg-teal-900/60 text-teal-700 dark:text-teal-300'
                          : 'bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400'
                      }`}>
                        <IconComponent className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className={`font-mono font-semibold ${isSelected ? 'text-teal-700 dark:text-teal-300' : 'text-teal-600 dark:text-teal-400'}`}>
                            {c.cmd}
                          </span>
                          <span className="text-[11px] text-slate-400 truncate ml-2">
                            {c.label}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
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
              className="absolute bottom-full left-0 mb-3 w-72 rounded-2xl border border-slate-200/90 dark:border-white/10 bg-white/95 dark:bg-[#1e1f20]/95 backdrop-blur-md p-2 shadow-2xl z-30"
              role="menu"
              aria-label="Aksi Cepat & Layanan Kampus"
            >
              <div className="px-2 pb-1.5 mb-1 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Layanan & Fitur</span>
                <span className="text-[10px] font-medium text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/80 px-2 py-0.5 rounded-full border border-teal-200/60 dark:border-teal-800/60">
                  Proses berkas
                </span>
              </div>

              {/* Upload Document / Image */}
              <button
                type="button"
                onClick={() => {
                  if (aiConsentAllowed !== true) {
                    onRequestAiConsent?.();
                    showToast('Setujui pemrosesan AI terlebih dahulu. Setelah itu, pilih ulang berkas yang ingin diunggah.', 'info');
                    setShowActionMenu(false);
                    return;
                  }
                  fileInputRef.current?.click();
                  setShowActionMenu(false);
                }}
                className="w-full flex items-center gap-2.5 p-2 rounded-xl text-left hover:bg-slate-100 dark:hover:bg-white/5 transition-colors text-xs text-slate-700 dark:text-slate-300 cursor-pointer min-h-[38px]"
                role="menuitem"
              >
                <div className="w-7 h-7 rounded-lg bg-teal-50 dark:bg-teal-950/60 flex items-center justify-center shrink-0">
                  <Paperclip className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-slate-800 dark:text-slate-200">Unggah File / Dokumen</div>
                  <div className="text-[10.5px] text-slate-400 truncate">PDF, Gambar, Teks (Maks 5MB)</div>
                </div>
              </button>

              {/* Quick Plugins List */}
              <div className="pt-1 space-y-0.5 border-t border-slate-100 dark:border-white/5 mt-1">
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
                      className="w-full flex items-center gap-2.5 p-2 rounded-xl text-left hover:bg-slate-100 dark:hover:bg-white/5 transition-colors text-xs text-slate-700 dark:text-slate-300 cursor-pointer min-h-[38px]"
                      role="menuitem"
                    >
                      <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-white/5 flex items-center justify-center shrink-0">
                        <Icon className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-slate-800 dark:text-slate-200">{p.label}</div>
                        <div className="text-[10.5px] text-slate-400 truncate">{p.desc}</div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Privacy Reassurance */}
              <div className="mt-1.5 pt-1.5 border-t border-slate-100 dark:border-white/5 flex items-center gap-1.5 px-2 text-[10.5px] text-slate-400">
                <ShieldCheck className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
                <span>Persetujuan AI aktif. Data percakapan terlindungi.</span>
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

        {/* 3. Floating Modern Capsule Card (ChatGPT / Claude Standard) */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`composer-dock relative ${
            isDragging
              ? '!border-2 !border-dashed !border-teal-500 !bg-teal-50/70 dark:!bg-teal-950/40 ring-4 ring-teal-500/20'
              : isTyping
              ? '!border-teal-400/90 dark:!border-teal-500/80 ring-2 ring-teal-400/25'
              : 'hover:border-slate-300/90 dark:hover:border-white/20'
          } ${isEmptyState ? 'p-3 sm:p-4' : 'p-2.5 sm:p-3'}`}>

          {/* Drag & Drop Overlay Feedback */}
          {isDragging && (
            <div className="absolute inset-0 z-40 bg-teal-50/95 dark:bg-slate-900/95 rounded-3xl backdrop-blur-xs border-2 border-dashed border-teal-500 flex flex-col items-center justify-center gap-1.5 text-teal-800 dark:text-teal-200 pointer-events-none animate-fade-in">
              <Paperclip className="w-5 h-5 text-teal-600 dark:text-teal-400 animate-bounce" />
              <span className="text-xs font-semibold">Lepaskan berkas di sini untuk melampirkan</span>
              <span className="text-[10.5px] text-teal-600/80 dark:text-teal-400/80">PDF, Gambar, Teks (Maks 5MB)</span>
            </div>
          )}
          {isTyping && (
            <div className="absolute inset-x-8 top-0 h-[2px] bg-gradient-to-r from-transparent via-teal-500 to-transparent animate-pulse pointer-events-none" />
          )}

          {/* Attachments Preview Bar inside Capsule */}
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2 px-1">
              {attachments.map(att => (
                <div
                  key={att.id}
                  className="relative flex items-center gap-2 p-1.5 pr-2 bg-slate-50 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 rounded-xl text-xs"
                >
                  {att.previewUrl ? (
                    <div className="w-7 h-7 rounded-lg shrink-0 overflow-hidden bg-slate-100 dark:bg-slate-800">
                      <img src={att.previewUrl} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="w-7 h-7 rounded-lg shrink-0 flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-teal-600 dark:text-teal-400">
                      <FileText className="w-3.5 h-3.5" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0 max-w-[140px]">
                    <div className="font-medium text-[11.5px] text-slate-800 dark:text-slate-200 truncate">{att.file.name}</div>
                    {att.status === 'uploading' && <div className="text-[10px] text-teal-600 dark:text-teal-400">Mengunggah...</div>}
                    {att.status === 'processing' && <div className="text-[10px] text-amber-500">Memproses...</div>}
                    {att.status === 'visual_ready' && <div className="text-[10px] text-teal-600 dark:text-teal-400 font-medium">OCR siap</div>}
                    {att.status === 'ready' && <div className="text-[10px] text-emerald-600">Siap</div>}
                    {att.status === 'success' && <div className="text-[10px] text-emerald-600">Siap</div>}
                    {att.status === 'error' && <div className="text-[10px] text-rose-500 truncate">{att.errorMessage || 'Gagal'}</div>}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeAttachment(att.id)}
                    className="w-5 h-5 rounded-md flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-slate-200/60 dark:hover:bg-white/10 transition-colors cursor-pointer"
                    aria-label="Hapus lampiran"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Gentle Voice Listening Indicator */}
          {isListening && (
            <div className="flex items-center gap-2 px-3 py-1.5 mb-1 rounded-xl bg-teal-50/80 dark:bg-teal-950/40 border border-teal-200/60 dark:border-teal-800/40 text-teal-800 dark:text-teal-300 text-xs animate-pulse">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500" />
              </span>
              <span className="font-medium">Mendengarkan suaramu... bicara santai saja</span>
            </div>
          )}

          {/* Textarea Input */}
          <textarea
            ref={textareaRef}
            value={input}
            onFocus={() => {
              triggerPrewarm();
              setTimeout(() => {
                composerContainerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
              }, 120);
            }}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder={
              quotaExceeded
                ? "Kuota harian telah digunakan. Istirahatlah sejenak dan kembali besok."
                : isListening
                  ? "Mendengarkan ucapan Anda (Bahasa Indonesia)..."
                  : isTyping
                    ? "RuangTenang sedang merenungkan respons untukmu..."
                    : isEmptyState
                      ? "Ketik apa yang kamu rasakan atau mulai dari saran di bawah..."
                      : "Ketik apa yang kamu rasakan..."
            }
            className={`w-full bg-transparent px-2 sm:px-3 pt-1 pb-1 text-[14px] sm:text-[15px] leading-relaxed text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none resize-none overflow-y-auto custom-scrollbar disabled:opacity-60 disabled:cursor-not-allowed ${
              isEmptyState ? 'min-h-14 sm:min-h-16' : 'min-h-10'
            }`}
            rows={1}
            disabled={isTyping || quotaExceeded}
            aria-label="Tulis pesan untuk asisten AI"
          />

          {/* Bottom Toolbar inside Composer */}
          <div className="flex items-center justify-between gap-1 pt-1.5 mt-0.5 border-t border-slate-100 dark:border-white/5">
            {/* Left Actions: Plus (+) menu & Voice Mic */}
            <div className="flex items-center gap-1 sm:gap-1.5">
              <motion.button
                type="button"
                whileTap={{ scale: 0.94 }}
                whileHover={{ scale: 1.06 }}
                onClick={() => {
                  setShowActionMenu(!showActionMenu);
                  setShowCommands(false);
                }}
                className={`h-8 w-8 rounded-full flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer ${
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
                className={`h-8 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                  isListening
                    ? 'px-2.5 bg-rose-500 text-white shadow-xs'
                    : 'w-8 text-slate-500 hover:text-teal-600 dark:text-slate-400 dark:hover:text-teal-400 hover:bg-slate-100 dark:hover:bg-white/10'
                }`}
                aria-label={isListening ? "Hentikan rekam suara" : "Input suara (Speech-to-Text)"}
                title={isListening ? "Hentikan rekam suara (Sedang mendengarkan...)" : "Bicara (Input Suara Speech-to-Text)"}
                aria-pressed={isListening}
              >
                {isListening ? (
                  <div className="flex items-center gap-0.5 h-3.5 px-0.5" aria-hidden="true">
                    <span className="w-0.5 rounded-full bg-white animate-[eq-wave-1_0.8s_ease-in-out_infinite]" />
                    <span className="w-0.5 rounded-full bg-white animate-[eq-wave-2_0.7s_ease-in-out_infinite]" />
                    <span className="w-0.5 rounded-full bg-white animate-[eq-wave-3_0.9s_ease-in-out_infinite]" />
                    <span className="w-0.5 rounded-full bg-white animate-[eq-wave-4_0.75s_ease-in-out_infinite]" />
                  </div>
                ) : (
                  <Mic className="w-4 h-4" />
                )}
              </motion.button>
            </div>

            {/* Right Action: Send / Stop button */}
            <div className="flex items-center gap-1">
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
                    className="h-8 w-8 sm:h-8.5 sm:w-8.5 rounded-full bg-teal-700 hover:bg-teal-800 text-white flex items-center justify-center cursor-pointer shadow-xs transition-all ring-2 ring-teal-400/50 shadow-[0_0_10px_rgba(20,184,166,0.35)] animate-pulse"
                    aria-label="Hentikan Jawaban AI"
                    title="Hentikan respons AI"
                  >
                    <Square className="w-3 h-3 fill-current" />
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
                    className={`h-8 w-8 sm:h-8.5 sm:w-8.5 rounded-full flex items-center justify-center transition-all duration-120 ${
                      hasContent
                        ? 'bg-teal-700 hover:bg-teal-800 text-white shadow-xs cursor-pointer'
                        : 'text-slate-300 dark:text-slate-600 bg-slate-100 dark:bg-white/5 cursor-not-allowed'
                    }`}
                    aria-label="Kirim Pesan"
                    title="Kirim pesan (Enter)"
                  >
                    <ArrowUp className="w-4 h-4" />
                  </motion.button>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Reassurance Caption */}
        <p className="text-[11px] text-slate-400 dark:text-slate-500 text-center mt-2 select-none">
          RuangTenang memberikan ruang refleksi dan dukungan emosional yang aman
        </p>
      </div>
    </div>
  );
}
