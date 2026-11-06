import React, { useState, useRef, useEffect } from 'react';
import {
  ArrowUp,
  Plus,
  Square,
  Paperclip,
  X,
  FileText,
  ShieldCheck,
  Command,
  MicOff,
  Mic,
  Globe,
  Brain,
  Radio,
  FolderKanban,
  LucideIcon
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { safeLocalStorage } from '../../../lib/storage';
import { CHAT_COMMANDS, CHAT_PLUGINS } from '../constants/commands';
import { Attachment } from '../types';
import { useToast } from '../../../components/Toast';
import { useComposerVoiceInput } from '../hooks/useComposerVoiceInput';
import { readGuestAiConsent } from '../../../lib/guestAiConsent';
import { getStoredAuthToken, getOrCreateGuestAttachmentToken, setStoredGuestAttachmentToken } from '../../../lib/apiClient';
import {
  DEFAULT_CHAPTER_MENTIONS,
  detectActiveMentionQuery,
  ContextMentionPopover,
  AttachedMentionsBar,
  type ContextMentionItem,
} from '../../workspace/components/ComposerSlashAndMentionMenus';
import { BurnoutRadarBar } from '../../workspace/components/BurnoutRadarBar';

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
  variant?: 'centered' | 'docked';
  quotedSnippet?: string | null;
  onClearQuote?: () => void;
  webSearchEnabled?: boolean;
  onToggleWebSearch?: () => void;
  thinkingDepth?: 'auto' | 'fast' | 'deep';
  onToggleThinkingDepth?: () => void;
  onOpenLiveVoice?: () => void;
  activeProjectName?: string | null;
  onOpenProjects?: () => void;
  activeArtifactTitle?: string | null;
  userTurnCount?: number;
  onRunDeepResearch?: (topic: string) => void | Promise<void>;
  isRunningDeepResearch?: boolean;
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
  variant = 'docked',
  quotedSnippet = null,
  onClearQuote,
  webSearchEnabled = false,
  onToggleWebSearch,
  thinkingDepth = 'auto',
  onToggleThinkingDepth,
  onOpenLiveVoice,
  activeProjectName = null,
  onOpenProjects,
  activeArtifactTitle = null,
  userTurnCount = 0,
  onRunDeepResearch,
  isRunningDeepResearch = false
}: Props) {
  const { showToast } = useToast();
  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [showCommands, setShowCommands] = useState(false);
  const [selectedCmdIndex, setSelectedCmdIndex] = useState(0);
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);
  const [attachedMentions, setAttachedMentions] = useState<ContextMentionItem[]>([]);
  const [cursorPosition, setCursorPosition] = useState(0);
  const waitingForConsentRef = useRef(false);
  const draftWasJustLoadedRef = useRef(false);
  const wasTemporaryRef = useRef(isTemporary);
  const isTemporaryRef = useRef(isTemporary);
  isTemporaryRef.current = isTemporary;
  const { isListening, toggleListening } = useComposerVoiceInput(input, setInput);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const composerContainerRef = useRef<HTMLDivElement>(null);
  const attachmentsRef = useRef<Attachment[]>([]);
  attachmentsRef.current = attachments;
  const draftStorageKey = `ruangtenang:chat-draft:${encodeURIComponent(draftOwnerId)}:${encodeURIComponent(chatId || 'new')}`;

  useEffect(() => {
    if (quotedSnippet) {
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 30);
    }
  }, [quotedSnippet]);

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
    } else if (input.trim()) {
      safeLocalStorage.setItem(draftStorageKey, input);
    } else {
      safeLocalStorage.removeItem(draftStorageKey);
    }

    // Auto-grow textarea smoothly from 40px up to 140px
    if (textareaRef.current) {
      if (!input.trim()) {
        textareaRef.current.style.height = '40px';
      } else {
        textareaRef.current.style.height = 'auto';
        const newHeight = Math.min(Math.max(textareaRef.current.scrollHeight, 40), 140);
        textareaRef.current.style.height = `${newHeight}px`;
      }
    }

    // Detect slash commands (only when no space typed yet)
    const isSlash = input.startsWith('/') && !input.trimStart().split('\n')[0].includes(' ');
    setShowCommands(isSlash);
    if (isSlash) setSelectedCmdIndex(0);
  }, [input, draftStorageKey, isTemporary]);

  const availableMentions = React.useMemo<ContextMentionItem[]>(() => {
    const items: ContextMentionItem[] = [];
    for (const att of attachments) {
      if (['success', 'ready', 'visual_ready'].includes(att.status)) {
        const name = att.filename || att.file.name;
        const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        items.push({
          id: `doc-${att.id}`,
          tag: `@dokumen:${slug || 'berkas'}`,
          label: name,
          category: 'document',
          subtitle: 'Berkas terlampir pada obrolan',
          contextPrompt: `[KONTEKS DOKUMEN @dokumen:${slug}: Rujuk secara ketat berkas terlampir "${name}"]`,
        });
      }
    }
    if (activeArtifactTitle) {
      const slug = activeArtifactTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 24);
      items.push({
        id: 'art-active',
        tag: `@artefak:${slug || 'canvas'}`,
        label: `Canvas: ${activeArtifactTitle}`,
        category: 'artifact',
        subtitle: 'Artefak aktif di panel Live Canvas',
        contextPrompt: `[KONTEKS ARTEFAK @artefak:${slug}: Gunakan naskah aktif di Canvas "${activeArtifactTitle}" sebagai acuan utama]`,
      });
    }
    if (activeProjectName) {
      const slug = activeProjectName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 24);
      items.push({
        id: 'proj-active',
        tag: `@proyek:${slug || 'aktif'}`,
        label: `Proyek: ${activeProjectName}`,
        category: 'project',
        subtitle: 'Instruksi & pedoman proyek aktif',
        contextPrompt: `[KONTEKS PROYEK @proyek:${slug}: Patuhi pedoman Proyek "${activeProjectName}"]`,
      });
    }
    items.push(...DEFAULT_CHAPTER_MENTIONS);
    return items;
  }, [attachments, activeArtifactTitle, activeProjectName]);

  const activeMentionState = React.useMemo(
    () => detectActiveMentionQuery(input, cursorPosition || input.length),
    [input, cursorPosition]
  );

  const filteredMentions = React.useMemo(() => {
    if (!activeMentionState) return [];
    const q = activeMentionState.query.toLowerCase();
    if (!q) return availableMentions;
    return availableMentions.filter(
      item =>
        item.tag.toLowerCase().includes(q) ||
        item.label.toLowerCase().includes(q) ||
        item.subtitle.toLowerCase().includes(q)
    );
  }, [activeMentionState, availableMentions]);

  const handleSelectMention = (item: ContextMentionItem) => {
    if (!activeMentionState) return;
    const before = input.slice(0, activeMentionState.startIndex);
    const after = input.slice(cursorPosition || input.length);
    const nextText = `${before}${item.tag} ${after}`;
    setInput(nextText);
    setAttachedMentions(prev => (prev.some(m => m.id === item.id) ? prev : [...prev, item]));
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        const nextPos = before.length + item.tag.length + 1;
        textareaRef.current.setSelectionRange(nextPos, nextPos);
        setCursorPosition(nextPos);
      }
    }, 20);
  };

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
    if (aiConsentAllowed !== true) {
      e.target.value = '';
      onRequestAiConsent?.();
      showToast('Setujui pemrosesan AI terlebih dahulu. Setelah itu, pilih ulang berkas yang ingin diunggah.', 'info');
      return;
    }

    if (attachments.length + files.length > 3) {
      e.target.value = '';
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

      const formData = new FormData();
      formData.append('files', file);
      const csrfCookie = document.cookie.match(/(?:^|; )XSRF-TOKEN=([^;]+)/)?.[1];
      const storedToken = getStoredAuthToken();
      const guestAttachmentToken = getOrCreateGuestAttachmentToken();
      const uploadHeaders: Record<string, string> = {
        'X-Requested-With': 'XMLHttpRequest',
        'X-Guest-AI-Consent': String(readGuestAiConsent()),
        'X-Guest-Attachment-Token': guestAttachmentToken
      };
      if (csrfCookie) uploadHeaders['X-CSRF-Token'] = decodeURIComponent(csrfCookie);
      if (storedToken) uploadHeaders['Authorization'] = `Bearer ${storedToken}`;

      fetch('/api/v1/chat/attachments/upload', {
        method: 'POST',
        headers: uploadHeaders,
        credentials: 'include',
        body: formData
      })
      .then(async res => {
        const returnedGuestToken = typeof res.headers?.get === 'function' ? res.headers.get('x-guest-attachment-token') : null;
        if (returnedGuestToken) setStoredGuestAttachmentToken(returnedGuestToken);
        const data = await res.json();
        if (typeof data?.guestAttachmentToken === 'string') setStoredGuestAttachmentToken(data.guestAttachmentToken);
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

  const removeAttachment = (id: string) => {
    setAttachments(prev => prev.filter(a => {
      if (a.id === id && a.previewUrl) URL.revokeObjectURL(a.previewUrl);
      return a.id !== id;
    }));
  };

  const handleExecuteCommand = (cmdStr: string) => {
    const cleanCmd = cmdStr.trim().split(/\s+/)[0].toLowerCase();
    const commandObj = CHAT_COMMANDS.find(c => c.cmd.toLowerCase() === cleanCmd);

    if (commandObj?.actionType === 'prompt' && commandObj.promptTemplate) {
      setShowCommands(false);
      setShowActionMenu(false);
      setInput(commandObj.promptTemplate);
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          textareaRef.current.setSelectionRange(commandObj.promptTemplate!.length, commandObj.promptTemplate!.length);
        }
      }, 20);
      return;
    }

    if (cleanCmd === '/riset' && cmdStr.trim().toLowerCase() === '/riset') {
      setShowCommands(false);
      setShowActionMenu(false);
      setInput('/riset ');
      setTimeout(() => textareaRef.current?.focus(), 20);
      return;
    }

    setInput('');
    setAttachedMentions([]);
    safeLocalStorage.removeItem(draftStorageKey);
    setShowCommands(false);
    setShowActionMenu(false);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

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

    if (input.trim().toLowerCase().startsWith('/riset') && onRunDeepResearch) {
      const topic = input.trim().replace(/^\/riset\s*/i, '').trim() || activeArtifactTitle || 'Kajian Literatur & Metodologi Skripsi';
      setInput('');
      setAttachedMentions([]);
      safeLocalStorage.removeItem(draftStorageKey);
      setShowCommands(false);
      void onRunDeepResearch(topic);
      return;
    }

    if (input.startsWith('/')) {
      handleExecuteCommand(input.trim());
      return;
    }

    const validAttachments = attachments.filter(a => ['success', 'ready', 'visual_ready'].includes(a.status));
    const mentionPrefix = attachedMentions.length > 0
      ? `${attachedMentions.map(m => m.contextPrompt).join('\n')}\n\n`
      : '';
    const baseText = `${mentionPrefix}${input.trim()}`;
    const outgoingText = quotedSnippet
      ? `Mengacu pada bagian ini:\n> "${quotedSnippet.slice(0, 420)}"\n\n${baseText}`
      : baseText;
    let accepted: void | boolean;
    if (validAttachments.length > 0) {
      accepted = onSend(outgoingText, undefined, validAttachments);
    } else {
      accepted = onSend(outgoingText);
    }

    if (accepted === false) {
      waitingForConsentRef.current = true;
      return;
    }

    attachments.forEach(attachment => {
      if (attachment.previewUrl) URL.revokeObjectURL(attachment.previewUrl);
    });
    setInput('');
    setAttachedMentions([]);
    setAttachments([]);
    onClearQuote?.();
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

    if (activeMentionState && filteredMentions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedMentionIndex(prev => (prev + 1) % filteredMentions.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedMentionIndex(prev => (prev - 1 + filteredMentions.length) % filteredMentions.length);
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        const chosen = filteredMentions[selectedMentionIndex] || filteredMentions[0];
        if (chosen) handleSelectMention(chosen);
        return;
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const hasContent = Boolean(input.trim() || attachments.length > 0);
  const isCentered = variant === 'centered';

  return (
    <div
      ref={composerContainerRef}
      className={
        isCentered
          ? 'w-full relative z-20'
          : 'w-full sticky bottom-0 z-20 shrink-0 bg-gradient-to-t from-[#fafaf9] via-[#fafaf9]/85 to-transparent dark:from-[#080d16] dark:via-[#080d16]/85 pointer-events-none [&>*]:pointer-events-auto'
      }
    >
      <div className={isCentered ? 'w-full relative' : 'pt-1 pb-safe pb-[max(0.5rem,env(safe-area-inset-bottom))] px-3 sm:px-4 max-w-3xl mx-auto w-full relative'}>

        {/* 1. Quick Slash Commands Dropdown */}
        <AnimatePresence>
          {showCommands && filteredCommands.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              transition={{ duration: 0.15 }}
              className="absolute bottom-full mb-2 left-0 right-0 sm:right-auto sm:w-80 bg-white dark:bg-slate-850 rounded-2xl border border-slate-200 dark:border-slate-750 shadow-xl overflow-hidden z-30 p-1.5 text-left"
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
              className="absolute bottom-full left-0 mb-2.5 w-72 rounded-2xl border border-stone-200/90 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-2 shadow-2xl z-30 text-left"
              role="menu"
              aria-label="Aksi Cepat & Layanan Kampus"
            >
              <div className="px-2 pb-1.5 mb-1 border-b border-stone-100 dark:border-slate-800 flex items-center justify-between">
                <span className="text-xs font-semibold text-stone-700 dark:text-stone-300">Layanan & Fitur</span>
                <span className="text-[10px] text-stone-400 dark:text-slate-500">
                  RuangTenang
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
              <div className="mt-1.5 pt-1.5 border-t border-stone-100 dark:border-slate-800/80 flex items-center gap-1.5 px-2 text-[10px] text-stone-400 dark:text-slate-500">
                <ShieldCheck className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
                <span>Lampiran diproses aman setelah persetujuan AI aktif.</span>
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
                className="relative flex items-center gap-2 p-1.5 pr-2 bg-white dark:bg-slate-900 border border-stone-200/90 dark:border-slate-800 rounded-xl shadow-xs text-xs text-left"
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
                  {att.status === 'processing' && <div className="text-[10px] text-amber-500 dark:text-amber-400">Memproses...</div>}
                  {att.status === 'visual_ready' && <div className="text-[10px] text-teal-600 dark:text-teal-400 font-medium">OCR visual tersedia</div>}
                  {att.status === 'ready' && <div className="text-[10px] text-emerald-600">{att.previewOnly ? 'Pratinjau saja' : att.ocrApplied ? 'Teks OCR siap' : 'Berkas siap dikirim'}</div>}
                  {att.status === 'success' && <div className="text-[10px] text-emerald-600">Siap dikirim</div>}
                  {att.status === 'error' && <div className="text-[10px] text-rose-500 truncate">{att.errorMessage || 'Gagal diproses'}</div>}
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

        {/* Burnout Radar & Adaptive Study Rhythm Co-Pilot */}
        {!isCentered && (
          <BurnoutRadarBar
            userTurnCount={userTurnCount}
            currentInputText={input}
            activeTopicTitle={activeArtifactTitle || activeProjectName}
            onOpenBreathing={() => onOpenPlugin?.('breathing')}
            onSelectTaskPrompt={(promptText) => {
              setInput(promptText);
              setTimeout(() => textareaRef.current?.focus(), 20);
            }}
            onRunDeepResearch={onRunDeepResearch ? (topic) => void onRunDeepResearch(topic) : undefined}
            isRunningDeepResearch={isRunningDeepResearch}
          />
        )}

        {/* 4. Floating Pill Input Bar (ChatGPT / Gemini style) */}
        <div className="relative w-full">
          {/* Context Mentions (@) Popover */}
          <ContextMentionPopover
            isOpen={Boolean(activeMentionState) && filteredMentions.length > 0}
            query={activeMentionState?.query || ''}
            items={availableMentions}
            selectedIndex={selectedMentionIndex}
            onSelectIndex={setSelectedMentionIndex}
            onSelectMention={handleSelectMention}
          />

          {/* Attached @Context Mentions Chips */}
          <AttachedMentionsBar
            mentions={attachedMentions}
            onRemove={id => setAttachedMentions(prev => prev.filter(m => m.id !== id))}
          />

          {quotedSnippet && (
            <div className="mb-1.5 flex items-start justify-between gap-2 rounded-2xl bg-stone-100/90 dark:bg-slate-800/80 px-3.5 py-2 text-xs text-stone-600 dark:text-slate-300 border border-stone-200/80 dark:border-slate-700/70 text-left">
              <div className="min-w-0 flex-1">
                <div className="text-[10.5px] font-semibold text-teal-700 dark:text-teal-400 mb-0.5">
                  Menanyakan kutipan pesan
                </div>
                <p className="line-clamp-2 italic text-stone-600 dark:text-slate-300 leading-snug">
                  “{quotedSnippet}”
                </p>
              </div>
              {onClearQuote && (
                <button
                  type="button"
                  onClick={onClearQuote}
                  className="rounded-full p-1 text-stone-400 hover:bg-stone-200/80 hover:text-stone-700 dark:hover:bg-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer shrink-0"
                  aria-label="Hapus kutipan"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}
          <div className={`relative flex items-end gap-1.5 px-2.5 py-2 rounded-3xl bg-white/95 dark:bg-[#111622]/95 border border-stone-200/80 dark:border-slate-800/90 transition-all duration-150 focus-within:border-teal-500/70 dark:focus-within:border-teal-500/70 focus-within:ring-2 focus-within:ring-teal-500/15 ${
            isCentered
              ? 'shadow-[0_14px_40px_-18px_rgba(15,23,42,0.12)] dark:shadow-[0_18px_48px_-18px_rgba(0,0,0,0.65)]'
              : 'shadow-subtle dark:shadow-subtle-dark'
          }`}>

            {/* Left Actions: Plus (+) & Frontier Toggles */}
            <div className="flex items-center gap-1 shrink-0 pb-0.5">
              <motion.button
                type="button"
                whileTap={{ scale: 0.94 }}
                onClick={() => {
                  setShowActionMenu(!showActionMenu);
                  setShowCommands(false);
                }}
                className={`w-9 h-9 rounded-full flex items-center justify-center text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-slate-800 shrink-0 transition-colors cursor-pointer ${
                  showActionMenu ? 'rotate-45 text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/60' : ''
                }`}
                aria-label="Buka Menu Bantuan & Fitur"
                title="Lampirkan berkas atau buka layanan (+)"
                aria-expanded={showActionMenu}
              >
                <Plus className="w-4.5 h-4.5 transition-transform duration-200" />
              </motion.button>

              {onToggleWebSearch && (
                <button
                  type="button"
                  onClick={onToggleWebSearch}
                  aria-pressed={webSearchEnabled}
                  title={webSearchEnabled ? 'Pencarian Web Real-time Aktif (Klik untuk matikan)' : 'Aktifkan Pencarian Web Real-time & Sitasi'}
                  className={`h-8 px-2.5 rounded-full inline-flex items-center gap-1 text-xs font-medium transition-colors cursor-pointer ${
                    webSearchEnabled
                      ? 'bg-teal-50 dark:bg-teal-950/70 text-teal-700 dark:text-teal-300 border border-teal-300/70 dark:border-teal-800'
                      : 'text-stone-500 dark:text-slate-400 hover:text-stone-800 dark:hover:text-slate-200 hover:bg-stone-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <Globe className="w-3.5 h-3.5 shrink-0" />
                  <span className="hidden sm:inline">Cari Web</span>
                </button>
              )}

              {onToggleThinkingDepth && (
                <button
                  type="button"
                  onClick={onToggleThinkingDepth}
                  aria-pressed={thinkingDepth === 'deep'}
                  title={thinkingDepth === 'deep' ? 'Penalaran Mendalam (Extended Thinking) Aktif' : 'Aktifkan Penalaran Mendalam (Extended Thinking)'}
                  className={`h-8 px-2.5 rounded-full inline-flex items-center gap-1 text-xs font-medium transition-colors cursor-pointer ${
                    thinkingDepth === 'deep'
                      ? 'bg-teal-50 dark:bg-teal-950/70 text-teal-700 dark:text-teal-300 border border-teal-300/70 dark:border-teal-800'
                      : 'text-stone-500 dark:text-slate-400 hover:text-stone-800 dark:hover:text-slate-200 hover:bg-stone-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <Brain className="w-3.5 h-3.5 shrink-0" />
                  <span className="hidden sm:inline">Berpikir</span>
                </button>
              )}

              {onOpenProjects && (
                <button
                  type="button"
                  onClick={onOpenProjects}
                  title={activeProjectName ? `Proyek Aktif: ${activeProjectName}` : 'Pilih Proyek & Custom Instructions'}
                  className={`hidden md:inline-flex h-8 px-2.5 rounded-full items-center gap-1 text-xs font-medium transition-colors cursor-pointer ${
                    activeProjectName
                      ? 'bg-stone-100 dark:bg-slate-800 text-stone-800 dark:text-slate-200 border border-stone-300/70 dark:border-slate-700'
                      : 'text-stone-500 dark:text-slate-400 hover:text-stone-800 dark:hover:text-slate-200 hover:bg-stone-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <FolderKanban className="w-3.5 h-3.5 shrink-0 text-teal-600 dark:text-teal-400" />
                  <span className="truncate max-w-[100px]">{activeProjectName || 'Proyek'}</span>
                </button>
              )}
            </div>

            {/* Textarea Input */}
            <textarea
              ref={textareaRef}
              value={input}
              onFocus={() => {
                if (!isCentered) {
                  setTimeout(() => {
                    composerContainerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
                  }, 120);
                }
              }}
              onChange={e => {
                setInput(e.target.value);
                setCursorPosition(e.target.selectionStart || e.target.value.length);
              }}
              onClick={e => setCursorPosition((e.target as HTMLTextAreaElement).selectionStart || 0)}
              onKeyUp={e => setCursorPosition((e.target as HTMLTextAreaElement).selectionStart || 0)}
              onKeyDown={handleKeyDown}
              placeholder={
                quotaExceeded
                  ? "Kuota harian telah digunakan. Istirahatlah sejenak dan kembali besok."
                  : isListening
                    ? "Mendengarkan ucapan Anda (Bahasa Indonesia)..."
                    : webSearchEnabled
                      ? "Ketik /riset, @konteks, atau tanyakan apa saja untuk ditelusuri..."
                      : "Ketik / untuk pintas (/riset, /diagram) atau @ untuk konteks..."
              }
              className="flex-1 bg-transparent text-[16px] sm:text-[14.5px] text-stone-850 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-slate-500 focus:outline-none resize-none min-h-[40px] py-2 px-1 leading-relaxed overflow-y-auto custom-scrollbar disabled:opacity-60 disabled:cursor-not-allowed"
              rows={1}
              disabled={isTyping || quotaExceeded || isRunningDeepResearch}
              aria-label="Tulis pesan untuk asisten AI"
            />

            {/* Right Actions: Mic, Live Voice Mode & Circular Send/Stop */}
            <div className="flex items-center gap-1 shrink-0 pb-0.5">
              <motion.button
                type="button"
                whileTap={{ scale: 0.94 }}
                onClick={toggleListening}
                className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-all cursor-pointer ${
                  isListening
                    ? 'bg-rose-500 text-white animate-pulse shadow-3xs'
                    : 'text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-slate-800'
                }`}
                aria-label={isListening ? "Hentikan rekam suara" : "Input suara (Speech-to-Text)"}
                title={isListening ? "Hentikan rekam suara" : "Input suara"}
                aria-pressed={isListening}
              >
                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </motion.button>

              {onOpenLiveVoice && !hasContent && !isTyping && (
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.94 }}
                  onClick={onOpenLiveVoice}
                  className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-teal-700 dark:text-teal-300 bg-teal-50/90 hover:bg-teal-100 dark:bg-teal-950/70 dark:hover:bg-teal-900/70 border border-teal-200/70 dark:border-teal-800/70 transition-colors cursor-pointer"
                  aria-label="Mulai Mode Percakapan Suara Dua Arah (Live Voice)"
                  title="Mode Suara Langsung Dua Arah (Live Voice)"
                >
                  <Radio className="w-4 h-4" />
                </motion.button>
              )}

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
                    className="w-9 h-9 rounded-full bg-stone-900 dark:bg-white text-white dark:text-stone-900 flex items-center justify-center shrink-0 cursor-pointer shadow-xs"
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
                    className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-all duration-120 ${
                      hasContent
                        ? 'bg-teal-700 hover:bg-teal-800 dark:bg-teal-600 dark:hover:bg-teal-500 text-white shadow-xs cursor-pointer'
                        : 'text-stone-300 dark:text-slate-600 bg-stone-100 dark:bg-slate-800/70 cursor-not-allowed'
                    }`}
                    aria-label="Kirim Pesan"
                    title="Kirim pesan (Enter)"
                  >
                    <ArrowUp className="w-4 h-4 stroke-[2.25]" />
                  </motion.button>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Quiet 1-line caption only when docked */}
        {!isCentered && (
          <p className="text-[11px] text-stone-400 dark:text-slate-500 text-center mt-1.5 select-none">
            RuangTenang adalah pendamping refleksi AI, bukan pengganti diagnosis klinis.
          </p>
        )}
      </div>
    </div>
  );
}
