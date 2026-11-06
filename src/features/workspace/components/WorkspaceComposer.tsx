import React, { useRef, useEffect, useMemo, useState } from 'react';
import {
  Plus,
  Files,
  Sparkles,
  Square,
  ArrowUp,
  SlidersHorizontal,
  Mic,
  MicOff,
  Globe,
  BrainCircuit
} from 'lucide-react';
import { useComposerVoiceInput } from '../../chat/hooks/useComposerVoiceInput';
import { WorkspaceFileAttachment, AcademicPromptPill, WorkspaceComposerConfig, WorkspaceResponseMode, WorkspaceResponseStyle } from '../types';
import { WorkspaceAttachmentList } from './WorkspaceAttachmentList';
import { MAX_UPLOAD_FILE_SIZE_BYTES, MAX_WORKSPACE_ACTIVE_ATTACHMENTS, SUPPORTED_WORKSPACE_FILE_EXTENSIONS } from '../../../../shared/contracts/files';
import { DistressDetectionResult } from '../utils/distressDetector';
import { AcademicDistressBanner } from './AcademicDistressBanner';
import { WorkspaceModelSelector } from './WorkspaceModelSelector';
import { WorkspacePresetSelector } from './WorkspacePresetSelector';
import { WorkspaceToolSelector } from './WorkspaceToolSelector';
import { WorkspaceToolDefinition } from '../tools/toolTypes';
import { WorkspaceCompareModelSelector } from './WorkspaceCompareModelSelector';
import { StoredAttachment } from '../../chat/types';
import { WorkspaceAiPreset, PresetId } from '../../../lib/aiPresets';
import { ArtifactType } from '../types';
import { useAiModelCatalog } from '../../../lib/aiModelCatalog';
import { isKerjaProfile } from '../../../lib/aiModels';
import { useProjects, buildProjectInstructionsBlock } from '../../projects/projectStore';
import {
  ACADEMIC_SLASH_COMMANDS,
  DEFAULT_CHAPTER_MENTIONS,
  detectActiveMentionQuery,
  SlashCommandPopover,
  ContextMentionPopover,
  AttachedMentionsBar,
  type SlashCommandItem,
  type ContextMentionItem,
} from './ComposerSlashAndMentionMenus';
import { BurnoutRadarBar } from './BurnoutRadarBar';

interface WorkspaceComposerProps {
  activeArtifactType?: ArtifactType | null;
  activeArtifactTitle?: string | null;
  selectedText?: string;
  onSelectTool?: (tool: WorkspaceToolDefinition) => void;
  inputText?: string;
  setInputText?: (text: string) => void;
  onInputTextChange?: (text: string) => void;
  attachments?: WorkspaceFileAttachment[];
  attachedFile?: WorkspaceFileAttachment | null;
  isStreaming: boolean;
  isDisabled?: boolean;
  distressResult: DistressDetectionResult;
  isDistressDismissed: boolean;
  promptPills: AcademicPromptPill[];
  selectedModel: string;
  compareMode?: boolean;
  onCompareModeChange?: (enabled: boolean) => void;
  selectedCompareModels?: string[];
  onCompareModelsChange?: (modelIds: string[]) => void;
  maxInputLength?: number;
  onModelChange: (modelId: string) => void;
  onOpenContext?: () => void;
  workspaceContextSummary?: string;
  modelPreferenceNotice?: string | null;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onSendMessage: (text: string, attachments?: StoredAttachment[], config?: WorkspaceComposerConfig) => boolean | void;
  onAbortStream: () => void;
  onOpenTemplateGallery: () => void;
  onRemoveAttachedFile: () => void;
  onRemoveAttachment?: (attachment: WorkspaceFileAttachment) => void;
  onRetryAttachment?: (attachment: WorkspaceFileAttachment) => void;
  onRecheckAttachment?: (attachment: WorkspaceFileAttachment) => void;
  onFileUploadChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onOpenBreathing: () => void;
  onSwitchToRuangTenang: () => void;
  onDismissDistress: () => void;
  // Preset props (F21)
  allPresets?: WorkspaceAiPreset[];
  activePreset?: WorkspaceAiPreset;
  activePresetId?: PresetId;
  presetSummary?: string;
  isManualModelOverride?: boolean;
  onSelectPreset?: (presetId: PresetId) => void;
  onCreatePreset?: (preset: Partial<WorkspaceAiPreset>) => { success: boolean; error?: string };
  onUpdatePreset?: (id: string, preset: Partial<WorkspaceAiPreset>) => { success: boolean; error?: string };
  onDuplicatePreset?: (sourceId: string) => { success: boolean; error?: string };
  onDeletePreset?: (id: string) => { success: boolean; error?: string };
  onResetPersonalization?: () => void;
  variant?: 'centered' | 'docked';
  quotedSnippet?: string | null;
  onClearQuote?: () => void;
  userTurnCount?: number;
  onRunDeepResearch?: (topic: string) => void | Promise<void>;
  isRunningDeepResearch?: boolean;
}

export const WorkspaceComposer: React.FC<WorkspaceComposerProps> = React.memo(({
  activeArtifactType,
  activeArtifactTitle,
  selectedText = '',
  onSelectTool,
  inputText: controlledInputText,
  setInputText: setControlledInputText,
  onInputTextChange,
  attachedFile,
  attachments,
  isStreaming,
  isDisabled = false,
  distressResult,
  isDistressDismissed,
  selectedModel,
  compareMode = false,
  onCompareModeChange = () => undefined,
  selectedCompareModels = [],
  onCompareModelsChange = () => undefined,
  maxInputLength = 2000,
  onModelChange,
  onOpenContext,
  workspaceContextSummary,
  modelPreferenceNotice = null,
  fileInputRef,
  onSendMessage,
  onAbortStream,
  onOpenTemplateGallery,
  onRemoveAttachedFile,
  onRemoveAttachment,
  onRetryAttachment = () => undefined,
  onRecheckAttachment = () => undefined,
  onFileUploadChange,
  onOpenBreathing,
  onSwitchToRuangTenang,
  onDismissDistress,
  allPresets,
  activePreset,
  activePresetId,
  presetSummary,
  isManualModelOverride = false,
  onSelectPreset,
  onCreatePreset,
  onUpdatePreset,
  onDuplicatePreset,
  onDeletePreset,
  onResetPersonalization,
  variant = 'docked',
  quotedSnippet = null,
  onClearQuote,
  userTurnCount = 0,
  onRunDeepResearch,
  isRunningDeepResearch = false
}) => {
  const { models: catalogModels, profiles: catalogProfiles, loading: isModelCatalogLoading } = useAiModelCatalog();
  const [localInputText, setLocalInputText] = useState('');
  const inputText = controlledInputText ?? localInputText;
  const inputNotificationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const setInputText = React.useCallback((text: string) => {
    if (setControlledInputText) setControlledInputText(text);
    else setLocalInputText(text);
    if (inputNotificationTimerRef.current) clearTimeout(inputNotificationTimerRef.current);
    if (!text) {
      inputNotificationTimerRef.current = null;
      onInputTextChange?.('');
      return;
    }
    inputNotificationTimerRef.current = setTimeout(() => {
      inputNotificationTimerRef.current = null;
      onInputTextChange?.(text);
    }, 250);
  }, [onInputTextChange, setControlledInputText]);

  useEffect(() => () => {
    if (inputNotificationTimerRef.current) clearTimeout(inputNotificationTimerRef.current);
  }, []);

  const activeAttachments = attachments ?? (attachedFile ? [attachedFile] : []);
  const hasAttachments = activeAttachments.length > 0;
  const hasPendingAttachment = activeAttachments.some(attachment => attachment.status === 'uploading' || attachment.status === 'processing');
  const hasFailedAttachment = activeAttachments.some(attachment => attachment.status === 'failed' || attachment.status === 'error');
  const readyAttachments = activeAttachments.filter((attachment): attachment is WorkspaceFileAttachment & { id: string } => attachment.status === 'ready' && Boolean(attachment.id));
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [responseMode, setResponseMode] = useState<WorkspaceResponseMode>(activePreset?.responseMode || 'Seimbang');
  const [responseStyle, setResponseStyle] = useState<WorkspaceResponseStyle>(activePreset?.responseStyle || 'Default');

  useEffect(() => {
    if (quotedSnippet) {
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 30);
    }
  }, [quotedSnippet]);

  const isComparisonSelectionValid = useMemo(() => {
    if (selectedCompareModels.length < 2 || selectedCompareModels.length > 3) return false;
    return selectedCompareModels.every(modelId => isKerjaProfile(modelId)
      ? catalogProfiles.some(profile => profile.scope === 'kerja' && profile.id === modelId && profile.selectable)
      : catalogModels.some(model => model.id === modelId && model.selectable && model.capabilities.includes('chat') && model.capabilities.includes('streaming')));
  }, [catalogModels, catalogProfiles, selectedCompareModels]);

  useEffect(() => {
    if (activePreset?.responseMode) setResponseMode(activePreset.responseMode);
    if (activePreset?.responseStyle) setResponseStyle(activePreset.responseStyle);
  }, [activePreset?.id, activePreset?.responseMode, activePreset?.responseStyle]);

  const [optionsOpen, setOptionsOpen] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  const [webSearchEnabled, setWebSearchEnabled] = useState(false);
  const [thinkingDepth, setThinkingDepth] = useState<'auto' | 'fast' | 'deep'>('auto');
  const [selectedSlashIndex, setSelectedSlashIndex] = useState(0);
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);
  const [attachedMentions, setAttachedMentions] = useState<ContextMentionItem[]>([]);
  const [cursorPosition, setCursorPosition] = useState(0);
  const { activeProject } = useProjects();
  const { isListening, toggleListening } = useComposerVoiceInput(inputText, setInputText);

  const isSlashMenuOpen = useMemo(() => {
    const trimmed = inputText.trimStart();
    if (!trimmed.startsWith('/')) return false;
    const firstLine = trimmed.split('\n')[0];
    return !firstLine.includes(' ');
  }, [inputText]);

  const slashQuery = useMemo(() => {
    if (!isSlashMenuOpen) return '';
    return inputText.trimStart();
  }, [inputText, isSlashMenuOpen]);

  const filteredSlashCommands = useMemo(() => {
    if (!isSlashMenuOpen) return [];
    const q = slashQuery.toLowerCase();
    return ACADEMIC_SLASH_COMMANDS.filter(
      c =>
        c.cmd.toLowerCase().includes(q) ||
        c.label.toLowerCase().includes(q.replace(/^\//, '')) ||
        c.desc.toLowerCase().includes(q.replace(/^\//, ''))
    );
  }, [isSlashMenuOpen, slashQuery]);

  const availableMentions = useMemo<ContextMentionItem[]>(() => {
    const items: ContextMentionItem[] = [];
    for (const att of readyAttachments) {
      const slug = att.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      items.push({
        id: `doc-${att.id}`,
        tag: `@dokumen:${slug || 'berkas'}`,
        label: att.name,
        category: 'document',
        subtitle: 'Dokumen terlampir di Workspace',
        contextPrompt: `[KONTEKS DOKUMEN @dokumen:${slug}: Rujuk secara ketat berkas terlampir "${att.name}"]`,
      });
    }
    if (activeArtifactTitle) {
      const slug = activeArtifactTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 24);
      items.push({
        id: 'art-active',
        tag: `@artefak:${slug || 'canvas'}`,
        label: `Canvas: ${activeArtifactTitle}`,
        category: 'artifact',
        subtitle: 'Artefak aktif di panel Canvas',
        contextPrompt: `[KONTEKS ARTEFAK @artefak:${slug}: Gunakan naskah aktif di Canvas "${activeArtifactTitle}" sebagai acuan utama]`,
      });
    }
    if (activeProject) {
      const slug = activeProject.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 24);
      items.push({
        id: `proj-${activeProject.id}`,
        tag: `@proyek:${slug || 'aktif'}`,
        label: `Proyek: ${activeProject.name}`,
        category: 'project',
        subtitle: 'Instruksi & pedoman proyek aktif',
        contextPrompt: `[KONTEKS PROYEK @proyek:${slug}: Patuhi pedoman Proyek "${activeProject.name}"]`,
      });
    }
    items.push(...DEFAULT_CHAPTER_MENTIONS);
    return items;
  }, [readyAttachments, activeArtifactTitle, activeProject]);

  const activeMentionState = useMemo(
    () => detectActiveMentionQuery(inputText, cursorPosition || inputText.length),
    [inputText, cursorPosition]
  );

  const filteredMentions = useMemo(() => {
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

  useEffect(() => {
    setSelectedSlashIndex(0);
  }, [slashQuery]);

  useEffect(() => {
    setSelectedMentionIndex(0);
  }, [activeMentionState?.query]);

  const handleSelectSlashCommand = (cmd: SlashCommandItem) => {
    if (cmd.actionType === 'breathing') {
      setInputText('');
      onOpenBreathing();
      return;
    }
    if (cmd.actionType === 'deep_research') {
      setWebSearchEnabled(true);
      setThinkingDepth('deep');
      const nextText = '/riset ';
      setInputText(nextText);
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 20);
      return;
    }
    if (cmd.cmd === '/sitasi') {
      setWebSearchEnabled(true);
    }
    const tpl = cmd.promptTemplate || cmd.templatePrompt || '';
    setInputText(tpl);
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(tpl.length, tpl.length);
      }
    }, 20);
  };

  const handleSelectMention = (item: ContextMentionItem) => {
    if (!activeMentionState) return;
    const before = inputText.slice(0, activeMentionState.startIndex);
    const after = inputText.slice(cursorPosition || inputText.length);
    const nextText = `${before}${item.tag} ${after}`;
    setInputText(nextText);
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

  useEffect(() => {
    if (compareMode) setOptionsOpen(true);
  }, [compareMode]);

  // Auto-expand textarea (min 44px, max 160px)
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollH = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${Math.min(Math.max(scrollH, 44), 160)}px`;
    }
  }, [inputText]);

  const handleSend = () => {
    let prompt = inputText.trim();
    if (!prompt && !hasAttachments) return;
    if (hasPendingAttachment || hasFailedAttachment || readyAttachments.length !== activeAttachments.length) return;

    // Intercept /riset <topik> to trigger Deep Research Agent directly if available
    if (prompt.toLowerCase().startsWith('/riset') && onRunDeepResearch) {
      const topic = prompt.replace(/^\/riset\s*/i, '').trim() || activeArtifactTitle || 'Kajian Ilmiah Skripsi';
      setInputText('');
      setAttachedMentions([]);
      void onRunDeepResearch(topic);
      return;
    }

    if (!prompt && readyAttachments.length) {
      prompt = `Mohon telaah dan analisis dokumen berikut secara mendalam: ${readyAttachments.map(attachment => `"${attachment.name}"`).join(', ')}.`;
    }
    if (attachedMentions.length > 0) {
      const mentionInstructions = attachedMentions.map(m => m.contextPrompt).join('\n');
      prompt = `${mentionInstructions}\n\n${prompt}`;
    }
    if (quotedSnippet) {
      prompt = `Mengacu pada bagian ini:\n> "${quotedSnippet.slice(0, 420)}"\n\n${prompt}`;
    }

    const attachmentsToSend: StoredAttachment[] | undefined = readyAttachments.length ? readyAttachments.map(attachment => ({
      id: attachment.id,
      filename: attachment.name,
      mimeType: attachment.mimeType || 'application/octet-stream',
      size: attachment.size ?? 0,
      url: attachment.url
    })) : undefined;

    if (compareMode && !isComparisonSelectionValid) return;

    const accepted = onSendMessage(prompt, attachmentsToSend, {
      aiModel: selectedModel,
      responseMode,
      responseStyle,
      presetId: activePreset?.id,
      taskCategory: activePreset?.taskCategory,
      latencyPreference: activePreset?.latencyPreference,
      qualityPreference: activePreset?.qualityPreference,
      comparisonModelIds: compareMode ? [...selectedCompareModels] : undefined,
      webSearchEnabled,
      thinkingDepth,
      projectInstructions: buildProjectInstructionsBlock(activeProject) || undefined
    });
    if (accepted !== false) {
      setInputText('');
      setAttachedMentions([]);
      onClearQuote?.();
    }
  };

  const contextSummary = [
    readyAttachments.length ? `${readyAttachments.length} file` : '',
    activeArtifactTitle || '',
    selectedText.trim() ? 'teks dipilih' : ''
  ].filter(Boolean).join(' · ') || 'Konteks kosong';
  const displayedContextSummary = workspaceContextSummary || contextSummary;
  const hasActiveContext = displayedContextSummary !== 'Konteks kosong' && displayedContextSummary !== 'Konteks';
  const isCentered = variant === 'centered';
  const canSend =
    (inputText.trim() || readyAttachments.length > 0) &&
    !hasPendingAttachment &&
    !hasFailedAttachment &&
    (!hasAttachments || readyAttachments.length === activeAttachments.length) &&
    (!compareMode || isComparisonSelectionValid);

  return (
    <div
      className={
        isCentered
          ? 'w-full relative z-20'
          : 'px-3 sm:px-4 pt-1 pb-safe pb-[max(0.75rem,env(safe-area-inset-bottom))] bg-gradient-to-t from-[#f8fafc] via-[#f8fafc]/85 to-transparent dark:from-[#080d16] dark:via-[#080d16]/85 shrink-0'
      }
    >
      <div className={isCentered ? 'w-full' : 'max-w-3xl mx-auto w-full'}>
        {/* Academic Distress Regulation Banner */}
        {distressResult.isDistressed && !isDistressDismissed && (
          <AcademicDistressBanner
            distressResult={distressResult}
            onOpenBreathing={onOpenBreathing}
            onSwitchToRuangTenang={onSwitchToRuangTenang}
            onDismiss={onDismissDistress}
          />
        )}

        {/* Burnout Radar & Adaptive Study Rhythm Co-Pilot */}
        <BurnoutRadarBar
          userTurnCount={userTurnCount}
          currentInputText={inputText}
          distressDetected={distressResult.isDistressed}
          activeTopicTitle={activeArtifactTitle || activeProject?.name}
          onOpenBreathing={onOpenBreathing}
          onSelectTaskPrompt={(promptText) => {
            setInputText(promptText);
            setTimeout(() => textareaRef.current?.focus(), 20);
          }}
          onRunDeepResearch={onRunDeepResearch ? (topic) => void onRunDeepResearch(topic) : undefined}
          isRunningDeepResearch={isRunningDeepResearch}
        />

        {/* Floating Pill Composer Container */}
        <div
          className={`relative bg-white/95 dark:bg-[#111622]/95 border transition-all duration-200 px-3 py-2.5 rounded-3xl text-left ${
            isStreaming || isRunningDeepResearch
              ? 'border-indigo-400/60 dark:border-indigo-500/60 shadow-[0_0_20px_rgba(99,102,241,0.14)] ring-1 ring-indigo-400/25'
              : isCentered
                ? 'border-slate-200/85 dark:border-slate-800/90 shadow-[0_14px_40px_-18px_rgba(15,23,42,0.12)] dark:shadow-[0_18px_48px_-18px_rgba(0,0,0,0.65)] focus-within:border-indigo-500/70 focus-within:ring-2 focus-within:ring-indigo-500/15'
                : 'border-slate-200/85 dark:border-slate-800/90 shadow-subtle dark:shadow-subtle-dark focus-within:border-indigo-500/70 focus-within:ring-2 focus-within:ring-indigo-500/15'
          }`}
        >
          {/* Slash Commands (/) Popover */}
          <SlashCommandPopover
            isOpen={isSlashMenuOpen && filteredSlashCommands.length > 0}
            query={slashQuery}
            selectedIndex={selectedSlashIndex}
            onSelectIndex={setSelectedSlashIndex}
            onSelectCommand={handleSelectSlashCommand}
          />

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
            <div className="mb-2 flex items-start justify-between gap-2 rounded-2xl bg-slate-100/85 dark:bg-slate-800/75 px-3 py-2 text-xs text-slate-600 dark:text-slate-300 border border-slate-200/70 dark:border-slate-700/70">
              <div className="min-w-0 flex-1">
                <div className="text-[10.5px] font-semibold text-indigo-600 dark:text-indigo-400 mb-0.5">
                  Menanyakan kutipan jawaban AI
                </div>
                <p className="line-clamp-2 italic text-slate-600 dark:text-slate-300 leading-snug">
                  “{quotedSnippet}”
                </p>
              </div>
              {onClearQuote && (
                <button
                  type="button"
                  onClick={onClearQuote}
                  className="rounded-full p-1 text-slate-400 hover:bg-slate-200/80 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer shrink-0"
                  aria-label="Hapus kutipan"
                >
                  <span aria-hidden="true" className="text-xs font-bold leading-none">×</span>
                </button>
              )}
            </div>
          )}
          {modelPreferenceNotice && (
            <p role="status" className="mb-1 px-1 text-[11px] text-amber-700 dark:text-amber-300">
              {modelPreferenceNotice}
            </p>
          )}
          <WorkspaceAttachmentList
            attachments={activeAttachments}
            disabled={isStreaming || isDisabled}
            onRemove={attachment => onRemoveAttachment ? onRemoveAttachment(attachment) : onRemoveAttachedFile()}
            onRetry={onRetryAttachment}
            onRecheck={onRecheckAttachment}
          />

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={inputText}
            onChange={(e) => {
              setInputText(e.target.value);
              setCursorPosition(e.target.selectionStart || e.target.value.length);
            }}
            onClick={(e) => setCursorPosition((e.target as HTMLTextAreaElement).selectionStart || 0)}
            onKeyUp={(e) => setCursorPosition((e.target as HTMLTextAreaElement).selectionStart || 0)}
            onFocus={() => setInputFocused(true)}
            onBlur={() => setInputFocused(false)}
            onKeyDown={(e) => {
              if (isSlashMenuOpen && filteredSlashCommands.length > 0) {
                if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  setSelectedSlashIndex(idx => (idx + 1) % filteredSlashCommands.length);
                  return;
                }
                if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  setSelectedSlashIndex(idx => (idx - 1 + filteredSlashCommands.length) % filteredSlashCommands.length);
                  return;
                }
                if (e.key === 'Tab' || (e.key === 'Enter' && !e.shiftKey)) {
                  e.preventDefault();
                  const chosen = filteredSlashCommands[selectedSlashIndex] || filteredSlashCommands[0];
                  if (chosen) handleSelectSlashCommand(chosen);
                  return;
                }
              }

              if (activeMentionState && filteredMentions.length > 0) {
                if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  setSelectedMentionIndex(idx => (idx + 1) % filteredMentions.length);
                  return;
                }
                if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  setSelectedMentionIndex(idx => (idx - 1 + filteredMentions.length) % filteredMentions.length);
                  return;
                }
                if (e.key === 'Tab' || (e.key === 'Enter' && !e.shiftKey)) {
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
            }}
            placeholder="Ketik / untuk alur skripsi (/riset, /diagram, /grafik) atau @ untuk konteks (@dokumen, @bab2)..."
            aria-label="Pesan untuk Asisten RuangKerja"
            rows={1}
            disabled={isDisabled || isRunningDeepResearch}
            maxLength={maxInputLength}
            className="w-full max-h-40 overflow-y-auto text-[15px] sm:text-sm px-1.5 py-1 bg-transparent text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none resize-none leading-relaxed min-h-11"
          />

          {(inputFocused || inputText.length >= maxInputLength * 0.8) && inputText.length > 0 && (
            <div
              className={`px-1.5 pb-1 text-right text-[10px] tabular-nums ${
                inputText.length >= maxInputLength * 0.9 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'
              }`}
              aria-live="polite"
            >
              {inputText.length.toLocaleString('id-ID')} / {maxInputLength.toLocaleString('id-ID')}
            </div>
          )}

          {/* Action Bar Inside Composer (Minimalist Pill Controls) */}
          <div className="flex items-center justify-between gap-1.5 pt-1">
            <div className="flex min-w-0 items-center gap-1 flex-wrap">
              <input
                type="file"
                ref={fileInputRef}
                onChange={onFileUploadChange}
                multiple
                disabled={isStreaming || isDisabled}
                accept={SUPPORTED_WORKSPACE_FILE_EXTENSIONS.map(extension => `.${extension}`).join(',')}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isStreaming || isDisabled}
                className="h-8.5 w-8.5 shrink-0 rounded-full text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                title={`Lampirkan berkas (maks. ${Math.floor(MAX_UPLOAD_FILE_SIZE_BYTES / (1024 * 1024))} MB per berkas; ${MAX_WORKSPACE_ACTIVE_ATTACHMENTS} dokumen aktif)`}
                aria-label={`Lampirkan berkas; maksimal ${Math.floor(MAX_UPLOAD_FILE_SIZE_BYTES / (1024 * 1024))} MB per berkas`}
              >
                <Plus className="w-4.5 h-4.5" />
              </button>

              <WorkspaceModelSelector
                value={selectedModel}
                onChange={onModelChange}
                disabled={isStreaming || isDisabled}
                overlayPlacement="anchored"
              />

              <button
                type="button"
                onClick={() => setWebSearchEnabled(prev => !prev)}
                disabled={isStreaming || isDisabled}
                aria-pressed={webSearchEnabled}
                title={webSearchEnabled ? 'Pencarian Web Real-time Aktif' : 'Aktifkan Pencarian Web Real-time'}
                className={`inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-full px-2.5 text-xs transition-colors cursor-pointer whitespace-nowrap border ${
                  webSearchEnabled
                    ? 'border-sky-300 bg-sky-50 text-sky-700 font-medium dark:border-sky-800 dark:bg-sky-950/60 dark:text-sky-300'
                    : 'border-transparent text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100'
                }`}
              >
                <Globe className="h-3.5 w-3.5 shrink-0" />
                <span className="hidden sm:inline">Cari Web</span>
              </button>

              <button
                type="button"
                onClick={() => setThinkingDepth(prev => (prev === 'deep' ? 'auto' : 'deep'))}
                disabled={isStreaming || isDisabled}
                aria-pressed={thinkingDepth === 'deep'}
                title={thinkingDepth === 'deep' ? 'Mode Penalaran Mendalam (Deep Thinking) Aktif' : 'Aktifkan Mode Penalaran Mendalam (Deep Thinking)'}
                className={`inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-full px-2.5 text-xs transition-colors cursor-pointer whitespace-nowrap border ${
                  thinkingDepth === 'deep'
                    ? 'border-indigo-300 bg-indigo-50 text-indigo-700 font-medium dark:border-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300'
                    : 'border-transparent text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100'
                }`}
              >
                <BrainCircuit className="h-3.5 w-3.5 shrink-0" />
                <span className="hidden sm:inline">Berpikir</span>
              </button>

              <button
                type="button"
                onClick={onOpenContext}
                aria-label={`Buka panel konteks: ${displayedContextSummary}`}
                title={displayedContextSummary}
                className={`relative inline-flex h-8 shrink-0 items-center justify-center rounded-full px-2.5 text-xs transition cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                  hasActiveContext
                    ? 'bg-indigo-50/80 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 font-medium'
                    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100'
                }`}
              >
                <Files className="h-3.5 w-3.5 shrink-0 sm:mr-1.5" aria-hidden="true" />
                {hasActiveContext && (
                  <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-indigo-500 sm:hidden" aria-hidden="true" />
                )}
                <span className="hidden truncate max-w-[9rem] sm:inline">
                  {hasActiveContext ? displayedContextSummary : 'Konteks'}
                </span>
              </button>

              <div className="relative shrink-0">
                <button
                  type="button"
                  disabled={isStreaming || isDisabled}
                  aria-label="AI & Opsi"
                  aria-expanded={optionsOpen}
                  aria-haspopup="dialog"
                  aria-controls="workspace-composer-options"
                  onClick={() => setOptionsOpen(value => !value)}
                  className={`inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-full px-2.5 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                    optionsOpen || compareMode
                      ? 'bg-slate-200/80 text-slate-900 dark:bg-slate-800 dark:text-slate-100'
                      : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100'
                  }`}
                >
                  <SlidersHorizontal className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{compareMode ? 'Bandingkan' : 'Opsi'}</span>
                </button>

                {optionsOpen && (
                  <>
                    <button
                      type="button"
                      className="fixed inset-0 z-30 cursor-default"
                      aria-label="Tutup opsi composer"
                      onClick={() => setOptionsOpen(false)}
                    />
                    <div
                      id="workspace-composer-options"
                      role="dialog"
                      aria-label="AI & Opsi"
                      onKeyDown={event => {
                        if (event.key === 'Escape') {
                          event.preventDefault();
                          setOptionsOpen(false);
                        }
                      }}
                      className="fixed inset-x-2 bottom-16 z-50 max-h-[min(65dvh,32rem)] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-3.5 shadow-2xl dark:border-slate-700 dark:bg-slate-900 sm:absolute sm:inset-auto sm:bottom-full sm:left-0 sm:mb-2 sm:w-[min(22rem,calc(100vw-2rem))]"
                    >
                      <div className="flex flex-col gap-2.5 border-b border-slate-100 pb-2.5 dark:border-slate-800">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">Cara bekerja</p>
                            <p className="mt-0.5 text-[11px] text-slate-500">Pilih satu jawaban atau bandingkan profil AI.</p>
                          </div>
                          <button
                            type="button"
                            disabled={isStreaming}
                            aria-pressed={compareMode}
                            onClick={() => onCompareModeChange(!compareMode)}
                            className={`h-8 shrink-0 rounded-xl px-2.5 text-xs font-medium transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                              compareMode
                                ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300'
                                : 'border border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
                            }`}
                          >
                            {compareMode ? 'Bandingkan aktif' : 'Bandingkan'}
                          </button>
                        </div>

                        {compareMode && (
                          <div className="rounded-xl border border-indigo-200/70 bg-indigo-50/50 p-2.5 dark:border-indigo-900/60 dark:bg-indigo-950/20">
                            <p className="mb-1.5 text-[11px] font-medium text-indigo-900 dark:text-indigo-200">
                              Pilih profil AI untuk dibandingkan
                            </p>
                            <WorkspaceCompareModelSelector
                              selectedModelIds={selectedCompareModels}
                              onChange={onCompareModelsChange}
                              disabled={isStreaming}
                              hasAttachment={hasAttachments}
                            />
                          </div>
                        )}

                        {compareMode && !isModelCatalogLoading && !isComparisonSelectionValid && (
                          <p role="status" className="text-[10.5px] text-amber-700 dark:text-amber-300">
                            Pilih setidaknya dua profil AI yang tersedia sebelum mengirim.
                          </p>
                        )}

                        <div className="grid gap-2 sm:grid-cols-2">
                          <label className="text-[11px] font-medium text-slate-600 dark:text-slate-300">
                            Respons
                            <select
                              aria-label="Mode respons"
                              value={responseMode}
                              onChange={event => setResponseMode(event.target.value as WorkspaceResponseMode)}
                              className="mt-1 h-9 w-full rounded-xl border border-slate-200 bg-white px-2 text-xs dark:border-slate-700 dark:bg-slate-950"
                            >
                              <option>Ringkas</option>
                              <option>Seimbang</option>
                              <option>Mendalam</option>
                            </select>
                          </label>
                          <label className="text-[11px] font-medium text-slate-600 dark:text-slate-300">
                            Gaya
                            <select
                              aria-label="Gaya (opsional)"
                              value={responseStyle}
                              onChange={event => setResponseStyle(event.target.value as WorkspaceResponseStyle)}
                              className="mt-1 h-9 w-full rounded-xl border border-slate-200 bg-white px-2 text-xs dark:border-slate-700 dark:bg-slate-950"
                            >
                              <option value="Default">Default</option>
                              <option>Akademik</option>
                              <option>Langkah demi langkah</option>
                              <option>Formal</option>
                            </select>
                          </label>
                        </div>

                        <div className="rounded-xl bg-slate-50 px-2.5 py-2 text-[11px] text-slate-500 dark:bg-slate-950/70">
                          <span className="font-medium text-slate-700 dark:text-slate-200">Konteks aktif:</span> {displayedContextSummary}
                        </div>

                        <div className="flex flex-wrap items-center gap-1">
                          {allPresets && activePreset && onSelectPreset && onCreatePreset && onUpdatePreset && onDuplicatePreset && onDeletePreset && (
                            <WorkspacePresetSelector
                              allPresets={allPresets}
                              activePreset={activePreset}
                              activePresetId={activePresetId || activePreset.id}
                              summary={presetSummary || activePreset.name}
                              isManualOverride={isManualModelOverride}
                              disabled={isStreaming}
                              onSelectPreset={onSelectPreset}
                              onCreatePreset={onCreatePreset}
                              onUpdatePreset={onUpdatePreset}
                              onDuplicatePreset={onDuplicatePreset}
                              onDeletePreset={onDeletePreset}
                              onResetPersonalization={onResetPersonalization}
                            />
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 pt-2.5">
                        <button
                          type="button"
                          onClick={() => {
                            setOptionsOpen(false);
                            onOpenTemplateGallery();
                          }}
                          disabled={isDisabled}
                          className="h-8 rounded-xl px-2.5 text-xs text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                        >
                          <Sparkles className="mr-1 inline h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                          Template
                        </button>
                        {onSelectTool && (
                          <WorkspaceToolSelector
                            artifactType={activeArtifactType}
                            hasArtifact={Boolean(activeArtifactType)}
                            disabled={isStreaming || isDisabled || compareMode}
                            onSelectTool={tool => {
                              setOptionsOpen(false);
                              onSelectTool(tool);
                            }}
                            triggerVariant="composer"
                          />
                        )}
                      </div>

                      <details className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 text-[10px] leading-relaxed text-slate-400 dark:text-slate-500">
                        <summary className="w-fit cursor-pointer font-medium hover:text-slate-600 dark:hover:text-slate-300">
                          Info pemrosesan berkas & layanan eksternal
                        </summary>
                        <p className="mt-1">
                          Berkas diunggah ke server untuk ekstraksi konteks menuju endpoint model terpilih. Workflow riset memakai Tavily dan pencarian sitasi memakai Crossref. Hindari mengirim data rahasia bila tidak diperlukan.
                        </p>
                      </details>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Right Controls: Voice Input & Circular Send/Stop */}
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={toggleListening}
                disabled={isStreaming || isDisabled}
                aria-label={isListening ? "Hentikan rekam suara" : "Input suara (Speech-to-Text)"}
                title={isListening ? "Hentikan rekam suara" : "Input suara"}
                className={`h-8.5 w-8.5 shrink-0 rounded-full flex items-center justify-center transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                  isListening
                    ? "bg-rose-500 text-white animate-pulse shadow-xs hover:bg-rose-600"
                    : "text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>

              {isStreaming ? (
                <button
                  type="button"
                  onClick={onAbortStream}
                  className="h-8.5 w-8.5 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center transition-all cursor-pointer shadow-xs"
                  title="Hentikan respons"
                  aria-label="Hentikan respons"
                >
                  <Square className="w-3.5 h-3.5 fill-current" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={isDisabled || !canSend}
                  className={`h-8.5 w-8.5 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                    canSend
                      ? 'bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-400 text-white shadow-xs active:scale-95'
                      : 'bg-slate-100 dark:bg-slate-800/80 text-slate-300 dark:text-slate-600 cursor-not-allowed'
                  }`}
                  title="Kirim"
                  aria-label="Kirim Pesan"
                >
                  <ArrowUp className="w-4 h-4 stroke-[2.25]" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});
