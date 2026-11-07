import { motion, AnimatePresence } from 'motion/react';
import React, { useRef, useEffect, useMemo, useState, useCallback } from 'react';
import {
  Paperclip,
  Plus,
  Files,
  Sparkles,
  Ghost,
  LayoutTemplate,
  GitCompareArrows,
  StopCircle,
  SlidersHorizontal,
  Mic,
  ArrowUp,
  ArrowUpRight,
  Info,
  X,
  Image as ImageIcon,
  FileText,
  CheckCircle2,
  ListChecks,
  PenTool,
  Award,
  BookOpen,
  Quote,
  BarChart2,
  ShieldCheck,
  Share2,
  Users
} from 'lucide-react';
import { useComposerVoiceInput } from '../../chat/hooks/useComposerVoiceInput';
import { WorkspaceFileAttachment, WorkspaceArtifact, AcademicPromptPill, WorkspaceComposerConfig, WorkspaceResponseMode, WorkspaceResponseStyle, StarterTaskItem } from '../types';
import { WorkspaceAttachmentList } from './WorkspaceAttachmentList';
import { MAX_UPLOAD_FILE_SIZE_BYTES, MAX_WORKSPACE_ACTIVE_ATTACHMENTS, SUPPORTED_WORKSPACE_FILE_EXTENSIONS } from '../../../../shared/contracts/files';
import { DistressDetectionResult } from '../utils/distressDetector';
import { AcademicDistressBanner } from './AcademicDistressBanner';
import { WorkspaceModelSelector } from './WorkspaceModelSelector';
import { WorkspacePresetSelector } from './WorkspacePresetSelector';
import { WorkspaceToolSelector } from './WorkspaceToolSelector';
import { WorkspaceSlashCommandMenu, filterSlashCommands, getSlashQuery, type SlashCommand } from './WorkspaceSlashCommandMenu';
import { WorkspaceMentionMenu, buildMentionItems, filterMentionItems, getMentionQuery, type MentionItem } from './WorkspaceMentionMenu';
import { WorkspaceToolDefinition } from '../tools/toolTypes';
import { WorkspaceCompareModelSelector } from './WorkspaceCompareModelSelector';
import { StoredAttachment } from '../../chat/types';
import { WorkspaceAiPreset, PresetId } from '../../../lib/aiPresets';
import { ArtifactType } from '../types';
import { useAiModelCatalog } from '../../../lib/aiModelCatalog';
import { isKerjaProfile } from '../../../lib/aiModels';

interface WorkspaceComposerProps {
  isFreshWorkspace?: boolean;
  isTemporary?: boolean;
  starterTasks?: StarterTaskItem[];
  onSelectStarterTask?: (prompt: string) => void;
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
  promptPills?: AcademicPromptPill[];
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
  onPasteFiles?: (files: File[]) => void;
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
  onOpenImageGenerator?: (initialPrompt?: string) => void;
  onOpenQuizModal?: (topic?: string) => void;
  onOpenLitMatrix?: () => void;
  onOpenMockDefense?: () => void;
  onOpenSupervisorNotes?: () => void;
  onOpenThesisBinder?: () => void;
  onOpenCitationAudit?: () => void;
  onOpenDataStudioChart?: () => void;
  onOpenTurnitinAudit?: () => void;
  onOpenKnowledgeGraph?: () => void;
  onOpenCouncilDebate?: () => void;
  artifacts?: WorkspaceArtifact[];
}

export const WorkspaceComposer: React.FC<WorkspaceComposerProps> = React.memo(({
  isFreshWorkspace = false,
  isTemporary = false,
  starterTasks = [],
  onSelectStarterTask,
  activeArtifactType,
  activeArtifactTitle,
  selectedText = '',
  onSelectTool,
  inputText: controlledInputText,
  setInputText: setControlledInputText,
  onInputTextChange,
  attachedFile,
  attachments,
  artifacts = [],
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
  onPasteFiles,  onOpenBreathing,
  onSwitchToRuangTenang,
  onDismissDistress,
  onOpenImageGenerator,
  onOpenQuizModal,
  onOpenLitMatrix,
  onOpenMockDefense,
  onOpenSupervisorNotes,
  onOpenThesisBinder,
  onOpenCitationAudit,
  onOpenDataStudioChart,
  onOpenTurnitinAudit,
  onOpenKnowledgeGraph,
  onOpenCouncilDebate,
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
  onResetPersonalization
}) => {
  const { models: catalogModels, profiles: catalogProfiles, loading: isModelCatalogLoading } = useAiModelCatalog();
  const [infoModalOpen, setInfoModalOpen] = useState(false);
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
  const isComparisonSelectionValid = useMemo(() => {
    if (selectedCompareModels.length < 2 || selectedCompareModels.length > 3) return false;
    return selectedCompareModels.every(modelId => isKerjaProfile(modelId)
      ? catalogProfiles.some(profile => profile.scope === 'kerja' && profile.id === modelId && profile.selectable)
      : catalogModels.some(model => model.id === modelId && model.selectable && model.capabilities.includes('chat') && model.capabilities.includes('streaming')));
  }, [catalogModels, catalogProfiles, selectedCompareModels]);

  // Sync mode and style when active preset changes
  useEffect(() => {
    if (activePreset?.responseMode) setResponseMode(activePreset.responseMode);
    if (activePreset?.responseStyle) setResponseStyle(activePreset.responseStyle);
  }, [activePreset?.id, activePreset?.responseMode, activePreset?.responseStyle]);
  const [optionsOpen, setOptionsOpen] = useState(compareMode);
  const [thesisToolsOpen, setThesisToolsOpen] = useState(false);
  const [showAllFreshTools, setShowAllFreshTools] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  const { isListening, toggleListening } = useComposerVoiceInput(inputText, setInputText);
  useEffect(() => {
    if (compareMode) setOptionsOpen(true);
  }, [compareMode]);

  // Auto-expand textarea (min 44px, max 180px)
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollH = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${Math.min(Math.max(scrollH, 44), 180)}px`;
    }
  }, [inputText]);

  const [slashIndex, setSlashIndex] = useState(0);
  const slashQuery = getSlashQuery(inputText);
  const slashCommands = useMemo(() => (slashQuery === null ? [] : filterSlashCommands(slashQuery)), [slashQuery]);
  const isSlashMenuOpen = slashCommands.length > 0 && inputFocused;
  useEffect(() => { setSlashIndex(0); }, [slashQuery]);

  const applySlashCommand = (command: SlashCommand) => {
    if (command.id === 'gambar' && onOpenImageGenerator) {
      setInputText('');
      onOpenImageGenerator('');
      return;
    }
    if (command.id === 'matrix' && onOpenLitMatrix) {
      setInputText('');
      onOpenLitMatrix();
      return;
    }
    if (command.id === 'sidang' && onOpenMockDefense) {
      setInputText('');
      onOpenMockDefense();
      return;
    }
    if (command.id === 'bimbingan' && onOpenSupervisorNotes) {
      setInputText('');
      onOpenSupervisorNotes();
      return;
    }
    if (command.id === 'binder' && onOpenThesisBinder) {
      setInputText('');
      onOpenThesisBinder();
      return;
    }
    if (command.id === 'auditsitasi' && onOpenCitationAudit) {
      setInputText('');
      onOpenCitationAudit();
      return;
    }
    if (command.id === 'grafik' && onOpenDataStudioChart) {
      setInputText('');
      onOpenDataStudioChart();
      return;
    }
    if (command.id === 'turnitin' && onOpenTurnitinAudit) {
      setInputText('');
      onOpenTurnitinAudit();
      return;
    }
    setInputText(command.template || `${command.label} `);
    requestAnimationFrame(() => textareaRef.current?.focus());
  };

  const [mentionCursorIndex, setMentionCursorIndex] = useState(0);
  const mentionQueryData = useMemo(() => {
    return getMentionQuery(inputText, mentionCursorIndex);
  }, [inputText, mentionCursorIndex]);

  const allMentionItems = useMemo(() => {
    return buildMentionItems(artifacts || [], attachments || []);
  }, [artifacts, attachments]);

  const filteredMentionItems = useMemo(() => {
    if (!mentionQueryData) return [];
    return filterMentionItems(allMentionItems, mentionQueryData.query);
  }, [allMentionItems, mentionQueryData]);

  const [mentionIndex, setMentionIndex] = useState(0);
  const isMentionMenuOpen = filteredMentionItems.length > 0 && inputFocused && !isSlashMenuOpen;

  useEffect(() => { setMentionIndex(0); }, [mentionQueryData?.query]);

  const applyMention = (item: MentionItem) => {
    if (!mentionQueryData) return;
    const { mentionStartIndex } = mentionQueryData;
    const before = inputText.slice(0, mentionStartIndex);
    const after = inputText.slice(mentionCursorIndex);
    const inserted = `@"${item.title}" `;
    const nextText = before + inserted + after;
    setInputText(nextText);
    const nextCursor = before.length + inserted.length;
    setMentionCursorIndex(nextCursor);
    requestAnimationFrame(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(nextCursor, nextCursor);
      }
    });
  };

  const handleSend = () => {
    let prompt = inputText.trim();
    if (!prompt && !hasAttachments) return;

    // Command interceptor for /gambar or /image
    const lowerPrompt = prompt.toLowerCase();
    if (lowerPrompt.startsWith('/gambar') || lowerPrompt.startsWith('/image')) {
      const extracted = prompt.replace(/^\/(gambar|image)\s*/i, '').trim();
      setInputText('');
      if (onOpenImageGenerator) {
        onOpenImageGenerator(extracted);
        return;
      }
    }

    // Command interceptor for /matrix
    if (lowerPrompt.startsWith('/matrix')) {
      setInputText('');
      if (onOpenLitMatrix) {
        onOpenLitMatrix();
        return;
      }
    }

    // Command interceptor for /sidang
    if (lowerPrompt.startsWith('/sidang') || lowerPrompt.startsWith('/defense')) {
      setInputText('');
      if (onOpenMockDefense) {
        onOpenMockDefense();
        return;
      }
    }

    // Command interceptor for /bimbingan
    if (lowerPrompt.startsWith('/bimbingan') || lowerPrompt.startsWith('/revisi')) {
      setInputText('');
      if (onOpenSupervisorNotes) {
        onOpenSupervisorNotes();
        return;
      }
    }

    // Command interceptor for /binder
    if (lowerPrompt.startsWith('/binder')) {
      setInputText('');
      if (onOpenThesisBinder) {
        onOpenThesisBinder();
        return;
      }
    }

    // Command interceptor for /auditsitasi
    if (lowerPrompt.startsWith('/auditsitasi') || lowerPrompt.startsWith('/audit-sitasi')) {
      setInputText('');
      if (onOpenCitationAudit) {
        onOpenCitationAudit();
        return;
      }
    }

    // Command interceptor for /grafik or /chart
    if (lowerPrompt.startsWith('/grafik') || lowerPrompt.startsWith('/chart')) {
      setInputText('');
      if (onOpenDataStudioChart) {
        onOpenDataStudioChart();
        return;
      }
    }

    // Command interceptor for /turnitin
    if (lowerPrompt.startsWith('/turnitin')) {
      setInputText('');
      if (onOpenTurnitinAudit) {
        onOpenTurnitinAudit();
        return;
      }
    }

    if (hasPendingAttachment || hasFailedAttachment || readyAttachments.length !== activeAttachments.length) return;
    if (!prompt && readyAttachments.length) {
      prompt = `Mohon telaah dan analisis dokumen berikut secara mendalam: ${readyAttachments.map(attachment => `"${attachment.name}"`).join(', ')}.`;
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
      comparisonModelIds: compareMode ? [...selectedCompareModels] : undefined
    });
    if (accepted !== false) setInputText('');
  };

  const handleSynthesizeMatrix = useCallback(() => {
    const prompt = 'Bantu saya menyusun Matriks Sintesis Literatur Penelitian Terdahulu (Bab 2 Skripsi) secara komparatif dari dokumen jurnal aktif di atas. Wajib sajikan dalam tabel kanvas artefak lengkap dengan APA 7th, variabel X/Y, metodologi, temuan empiris, research gap, dan draf narasi skripsi.';
    setInputText(prompt);
    const attachmentsToSend: StoredAttachment[] | undefined = readyAttachments.length ? readyAttachments.map(attachment => ({
      id: attachment.id,
      filename: attachment.name,
      mimeType: attachment.mimeType || 'application/octet-stream',
      size: attachment.size ?? 0,
      url: attachment.url
    })) : undefined;
    onSendMessage(prompt, attachmentsToSend);
  }, [readyAttachments, onSendMessage, setInputText]);

  const contextSummary = [
    readyAttachments.length ? `${readyAttachments.length} file` : '',
    activeArtifactTitle || '',
    selectedText.trim() ? 'teks dipilih' : ''
  ].filter(Boolean).join(' · ') || 'Konteks kosong';
  const displayedContextSummary = workspaceContextSummary || contextSummary;
  const hasActiveContext = displayedContextSummary !== 'Konteks kosong' && displayedContextSummary !== 'Konteks';

  return (
    <div className={`pb-safe pb-[max(0.75rem,env(safe-area-inset-bottom))] ${
      isFreshWorkspace
        ? 'relative flex flex-1 min-h-0 flex-col items-center overflow-y-auto bg-transparent px-4 py-6 sm:px-6 sm:py-10'
        : 'shrink-0 bg-transparent px-3 pb-3 sm:px-4 sm:pb-4'
    }`}>
      {/* Academic Distress Regulation Banner */}
      {distressResult.isDistressed && !isDistressDismissed && (
        <div className="mx-auto w-full max-w-3xl xl:max-w-4xl mb-3">
          <AcademicDistressBanner
            distressResult={distressResult}
            onOpenBreathing={onOpenBreathing}
            onSwitchToRuangTenang={onSwitchToRuangTenang}
            onDismiss={onDismissDistress}
          />
        </div>
      )}

      {/* Floating Composer Container (ChatGPT / Claude / Gemini Standard) */}
      <div className={`mx-auto w-full transition-all duration-200 ${isFreshWorkspace ? 'my-auto max-w-2xl' : 'max-w-3xl xl:max-w-4xl'}`}>
        {isFreshWorkspace && (
          <div className="mx-auto mb-6 max-w-2xl animate-fade-in text-center sm:mb-8">
            {isTemporary && (
              <p className="mb-4 inline-flex items-center gap-1.5 text-xs font-medium text-amber-800 dark:text-amber-300 sm:hidden">
                <Ghost className="h-3.5 w-3.5" aria-hidden="true" />
                Sesi sementara · pesan tidak disimpan
              </p>
            )}
            <h2 className="text-2xl font-bold leading-tight tracking-tight text-slate-900 dark:text-slate-100 sm:text-4xl">
              Apa yang ingin kamu kerjakan?
            </h2>
            <p className="mx-auto mt-2 max-w-lg text-xs sm:text-sm leading-relaxed text-slate-500 dark:text-slate-400">
              Tulis pertanyaan, lampirkan dokumen, atau mulai dari draf Canvas.
            </p>
          </div>
        )}

        <div className={`relative rounded-3xl border transition-all duration-300 bg-white/92 dark:bg-[#1e1f20]/95 backdrop-blur-xl ring-1 ring-black/[0.03] dark:ring-white/[0.05] ${
          isStreaming
            ? 'border-indigo-400/90 dark:border-indigo-500/70 ring-2 ring-indigo-500/20 shadow-[0_12px_36px_-4px_rgba(99,102,241,0.18)]'
            : inputFocused
            ? 'border-indigo-400/60 dark:border-indigo-400/50 ring-2 ring-indigo-500/15 shadow-[0_12px_38px_-4px_rgba(99,102,241,0.14)]'
            : 'border-slate-200/80 dark:border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.05)] dark:shadow-[0_8px_32px_rgb(0,0,0,0.38)] hover:border-slate-300 dark:hover:border-white/20'
        } ${isFreshWorkspace ? 'p-3.5 sm:p-4' : 'p-2.5'}`}>
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
            onSynthesizeMatrix={handleSynthesizeMatrix}
          />

          {/* Quick Action Chips when documents are ready */}
          {readyAttachments.length > 0 && !isStreaming && (
            <div className="flex flex-wrap items-center gap-1.5 px-1 py-1.5 mb-1" role="group" aria-label="Aksi Cepat Dokumen">
              {onOpenQuizModal && (
                <button
                  type="button"
                  onClick={() => onOpenQuizModal(readyAttachments[0]?.name?.replace(/\.[^/.]+$/, ''))}
                  className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full bg-slate-100/90 hover:bg-slate-200/80 text-slate-700 dark:bg-white/5 dark:hover:bg-white/10 dark:text-slate-300 border border-slate-200/70 dark:border-white/10 transition-colors cursor-pointer"
                  title="Buat Simulasi Ujian & Kuis AI dari dokumen ini"
                >
                  <Award className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  <span>Simulasi Ujian & Kuis</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  const text = `Mohon buatkan rangkuman eksekutif terstruktur dari dokumen ${readyAttachments.map(a => `"${a.name}"`).join(', ')}, mencakup poin utama, tujuan, dan temuan kunci.`;
                  setInputText(text);
                  textareaRef.current?.focus();
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full bg-slate-100/90 hover:bg-slate-200/80 text-slate-700 dark:bg-white/5 dark:hover:bg-white/10 dark:text-slate-300 border border-slate-200/70 dark:border-white/10 transition-colors cursor-pointer"
                title="Rangkum isi dokumen secara eksekutif"
              >
                <FileText className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                <span>Rangkum Eksekutif</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  const text = `Mohon telaah, evaluasi, dan berikan kritik konstruktif terhadap dokumen ${readyAttachments.map(a => `"${a.name}"`).join(', ')}. Apa saja kelebihan, kekurangan, dan rekomendasi perbaikannya?`;
                  setInputText(text);
                  textareaRef.current?.focus();
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full bg-slate-100/90 hover:bg-slate-200/80 text-slate-700 dark:bg-white/5 dark:hover:bg-white/10 dark:text-slate-300 border border-slate-200/70 dark:border-white/10 transition-colors cursor-pointer"
                title="Evaluasi dan beri masukan kritis"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                <span>Evaluasi & Masukan</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  const text = `Ekstrak daftar poin kunci penting dan action items yang harus ditindaklanjuti dari dokumen ${readyAttachments.map(a => `"${a.name}"`).join(', ')}.`;
                  setInputText(text);
                  textareaRef.current?.focus();
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full bg-slate-100/90 hover:bg-slate-200/80 text-slate-700 dark:bg-white/5 dark:hover:bg-white/10 dark:text-slate-300 border border-slate-200/70 dark:border-white/10 transition-colors cursor-pointer"
                title="Daftar poin kunci dan to-do"
              >
                <ListChecks className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                <span>Poin Kunci & Tindak Lanjut</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  const text = `Bantu saya membuat draf naskah perbaikan akademik di Canvas berdasarkan isi dokumen ${readyAttachments.map(a => `"${a.name}"`).join(', ')}.`;
                  setInputText(text);
                  textareaRef.current?.focus();
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full bg-slate-100/90 hover:bg-slate-200/80 text-slate-700 dark:bg-white/5 dark:hover:bg-white/10 dark:text-slate-300 border border-slate-200/70 dark:border-white/10 transition-colors cursor-pointer"
                title="Susun draf revisi untuk Canvas"
              >
                <PenTool className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                <span>Drafkan ke Canvas</span>
              </button>
            </div>
          )}

          {/* Textarea */}
          {isSlashMenuOpen && <WorkspaceSlashCommandMenu commands={slashCommands} activeIndex={slashIndex} onSelect={applySlashCommand} onHover={setSlashIndex} />}
          {isMentionMenuOpen && <WorkspaceMentionMenu items={filteredMentionItems} activeIndex={mentionIndex} onSelect={applyMention} onHover={setMentionIndex} />}
          <textarea
            ref={textareaRef}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onFocus={() => setInputFocused(true)}
            onBlur={() => setInputFocused(false)}
            onSelect={(e) => setMentionCursorIndex(e.currentTarget.selectionStart)}
            onClick={(e) => setMentionCursorIndex(e.currentTarget.selectionStart)}
            onPaste={(e) => {
              const images = Array.from(e.clipboardData?.files ?? []).filter(f => f.type.startsWith('image/'));
              if (images.length === 0 || !onPasteFiles) return;
              e.preventDefault();
              onPasteFiles(images);
            }}
            onKeyUp={(e) => setMentionCursorIndex(e.currentTarget.selectionStart)}
            onKeyDown={(e) => {
              if (isSlashMenuOpen) {
                if (e.key === 'ArrowDown') { e.preventDefault(); setSlashIndex(i => (i + 1) % slashCommands.length); return; }
                if (e.key === 'ArrowUp') { e.preventDefault(); setSlashIndex(i => (i - 1 + slashCommands.length) % slashCommands.length); return; }
                if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); applySlashCommand(slashCommands[slashIndex]); return; }
                if (e.key === 'Escape') { e.preventDefault(); setInputText(''); return; }
              }
              if (isMentionMenuOpen) {
                if (e.key === 'ArrowDown') { e.preventDefault(); setMentionIndex(i => (i + 1) % filteredMentionItems.length); return; }
                if (e.key === 'ArrowUp') { e.preventDefault(); setMentionIndex(i => (i - 1 + filteredMentionItems.length) % filteredMentionItems.length); return; }
                if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); applyMention(filteredMentionItems[mentionIndex]); return; }
                if (e.key === 'Escape') { e.preventDefault(); setMentionCursorIndex(0); return; }
              }
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={isFreshWorkspace ? 'Tanyakan apa saja atau berikan instruksi...' : 'Tanyakan apa saja tentang pekerjaan ini...'}
            aria-label="Pesan untuk Asisten RuangKerja"
            aria-describedby="workspace-composer-hint"
            rows={1}
            disabled={isDisabled}
            maxLength={maxInputLength}
            className={`w-full max-h-48 overflow-y-auto bg-transparent px-2 sm:px-3 pt-1 pb-1 text-[14px] sm:text-[15px] leading-relaxed text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none resize-none ${
              isFreshWorkspace ? 'min-h-14 sm:min-h-16' : 'min-h-10'
            }`}
          />
          {(inputFocused || inputText.length >= maxInputLength * 0.8) && inputText.length > 0 && (
            <div className={`px-2 pb-1 text-right text-[10px] ${inputText.length >= maxInputLength * 0.9 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'}`} aria-live="polite">
              {inputText.length.toLocaleString('id-ID')} / {maxInputLength.toLocaleString('id-ID')}
            </div>
          )}

          {/* Bottom Toolbar inside Composer (Sleek ChatGPT / Claude style) */}
          <div className="flex items-center justify-between gap-1 pt-1.5 mt-0.5 border-t border-slate-100 dark:border-white/5">
            <div className="flex min-w-0 items-center gap-1 sm:gap-1.5">
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
                className="h-8 w-8 rounded-full flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer disabled:opacity-40"
                title={`Lampirkan berkas (PDF, DOCX, TXT, kode, gambar; maks. ${Math.floor(MAX_UPLOAD_FILE_SIZE_BYTES / (1024 * 1024))} MB; maks ${MAX_WORKSPACE_ACTIVE_ATTACHMENTS} berkas)`}
                aria-label="Lampirkan berkas dokumen atau kode"
              >
                {isFreshWorkspace ? <Plus className="h-4 w-4" /> : <Paperclip className="h-4 w-4" />}
              </button>

              <WorkspaceModelSelector value={selectedModel} onChange={onModelChange} disabled={isStreaming || isDisabled} overlayPlacement="anchored" />

              <button
                type="button"
                onClick={onOpenContext}
                aria-label={`Buka panel konteks: ${displayedContextSummary}`}
                title={displayedContextSummary}
                className="relative inline-flex h-8 shrink-0 items-center justify-center rounded-full px-2 text-xs text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-slate-100 transition-colors cursor-pointer"
              >
                <Files className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                {hasActiveContext && <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-indigo-500" aria-hidden="true" />}
                <span className="hidden truncate ml-1.5 2xl:inline max-w-[120px]">{displayedContextSummary}</span>
              </button>

              {/* Unified Alat Skripsi & Riset Popover */}
              {(onOpenLitMatrix || onOpenMockDefense || onOpenCitationAudit || onOpenSupervisorNotes || onOpenDataStudioChart || onOpenThesisBinder || onOpenTurnitinAudit || onOpenKnowledgeGraph || onOpenCouncilDebate || onOpenImageGenerator) && (
                <div className="relative shrink-0">
                  <button
                    type="button"
                    disabled={isStreaming || isDisabled}
                    aria-label="Alat Skripsi & Riset"
                    aria-expanded={thesisToolsOpen}
                    onClick={() => {
                      setThesisToolsOpen(prev => !prev);
                      setOptionsOpen(false);
                    }}
                    className={`inline-flex h-8 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium transition-colors cursor-pointer ${
                      thesisToolsOpen
                        ? 'bg-indigo-600 text-white shadow-2xs'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white'
                    }`}
                    title="Buka Alat Skripsi, Sitasi, Simulasi Sidang & Visualisasi"
                  >
                    <Sparkles className={`h-3.5 w-3.5 shrink-0 ${thesisToolsOpen ? 'text-white' : 'text-indigo-500'}`} />
                    <span className="hidden sm:inline">Alat Skripsi</span>
                  </button>

                  {thesisToolsOpen && (
                    <>
                      <button
                        type="button"
                        className="fixed inset-0 z-30 cursor-default"
                        aria-label="Tutup menu alat skripsi"
                        onClick={() => setThesisToolsOpen(false)}
                      />
                      <div
                        role="dialog"
                        aria-label="Alat Skripsi & Riset"
                        className="rt-popover fixed inset-x-2 bottom-16 z-50 max-h-[min(65dvh,28rem)] overflow-y-auto p-3 rounded-2xl border border-slate-200/80 bg-white/95 shadow-xl backdrop-blur-md dark:border-white/10 dark:bg-slate-900/95 sm:absolute sm:inset-auto sm:bottom-full sm:left-0 sm:mb-2 sm:w-72 space-y-2 text-xs"
                      >
                        <div className="px-2 py-1 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
                          <span className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                            <span>Alat Skripsi &amp; Riset</span>
                          </span>
                          <span className="text-[10px] text-slate-400">Pilih Fitur</span>
                        </div>

                        <div className="grid grid-cols-1 gap-0.5">
                          {onOpenLitMatrix && (
                            <button
                              type="button"
                              onClick={() => { setThesisToolsOpen(false); onOpenLitMatrix(); }}
                              className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
                            >
                              <BookOpen className="w-4 h-4 text-indigo-500 shrink-0" />
                              <div>
                                <div className="font-medium">Matriks Literatur Bab 2</div>
                                <div className="text-[10px] text-slate-400">Sintesis komparatif multi-jurnal</div>
                              </div>
                            </button>
                          )}
                          {onOpenCitationAudit && (
                            <button
                              type="button"
                              onClick={() => { setThesisToolsOpen(false); onOpenCitationAudit(); }}
                              className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
                            >
                              <Quote className="w-4 h-4 text-indigo-500 shrink-0" />
                              <div>
                                <div className="font-medium">Audit Sitasi &amp; Daftar Pustaka</div>
                                <div className="text-[10px] text-slate-400">Cek konsistensi APA 7th / IEEE</div>
                              </div>
                            </button>
                          )}
                          {onOpenTurnitinAudit && (
                            <button
                              type="button"
                              onClick={() => { setThesisToolsOpen(false); onOpenTurnitinAudit(); }}
                              className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
                            >
                              <ShieldCheck className="w-4 h-4 text-indigo-500 shrink-0" />
                              <div>
                                <div className="font-medium">Audit Integritas &amp; Turnitin</div>
                                <div className="text-[10px] text-slate-400">Deteksi kesamaan &amp; parafrase ilmiah</div>
                              </div>
                            </button>
                          )}
                          {onOpenThesisBinder && (
                            <button
                              type="button"
                              onClick={() => { setThesisToolsOpen(false); onOpenThesisBinder(); }}
                              className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
                            >
                              <Files className="w-4 h-4 text-indigo-500 shrink-0" />
                              <div>
                                <div className="font-medium">Binder Bab Skripsi</div>
                                <div className="text-[10px] text-slate-400">Gabungkan Bab 1–5 menjadi dokumen utuh</div>
                              </div>
                            </button>
                          )}
                          {onOpenMockDefense && (
                            <button
                              type="button"
                              onClick={() => { setThesisToolsOpen(false); onOpenMockDefense(); }}
                              className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
                            >
                              <Award className="w-4 h-4 text-indigo-500 shrink-0" />
                              <div>
                                <div className="font-medium">Simulasi Sidang Skripsi</div>
                                <div className="text-[10px] text-slate-400">Latihan tanya jawab dosen penguji</div>
                              </div>
                            </button>
                          )}
                          {onOpenSupervisorNotes && (
                            <button
                              type="button"
                              onClick={() => { setThesisToolsOpen(false); onOpenSupervisorNotes(); }}
                              className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
                            >
                              <FileText className="w-4 h-4 text-indigo-500 shrink-0" />
                              <div>
                                <div className="font-medium">Catatan Dosen Pembimbing</div>
                                <div className="text-[10px] text-slate-400">Ubah catatan revisi jadi daftar aksi</div>
                              </div>
                            </button>
                          )}
                          {onOpenDataStudioChart && (
                            <button
                              type="button"
                              onClick={() => { setThesisToolsOpen(false); onOpenDataStudioChart(); }}
                              className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
                            >
                              <BarChart2 className="w-4 h-4 text-indigo-500 shrink-0" />
                              <div>
                                <div className="font-medium">Data Studio (Grafik &amp; Bagan)</div>
                                <div className="text-[10px] text-slate-400">Visualisasi data penelitian kuantitatif</div>
                              </div>
                            </button>
                          )}
                          {onOpenKnowledgeGraph && (
                            <button
                              type="button"
                              onClick={() => { setThesisToolsOpen(false); onOpenKnowledgeGraph(); }}
                              className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
                            >
                              <Share2 className="w-4 h-4 text-indigo-500 shrink-0" />
                              <div>
                                <div className="font-medium">Peta Konsep (Knowledge Graph)</div>
                                <div className="text-[10px] text-slate-400">Jaringan relasi topik &amp; variabel</div>
                              </div>
                            </button>
                          )}
                          {onOpenCouncilDebate && (
                            <button
                              type="button"
                              onClick={() => { setThesisToolsOpen(false); onOpenCouncilDebate(); }}
                              className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
                            >
                              <Users className="w-4 h-4 text-indigo-500 shrink-0" />
                              <div>
                                <div className="font-medium">Debat Dewan AI</div>
                                <div className="text-[10px] text-slate-400">Uji argumen dari berbagai sudut pandang</div>
                              </div>
                            </button>
                          )}
                          {onOpenImageGenerator && (
                            <button
                              type="button"
                              onClick={() => { setThesisToolsOpen(false); onOpenImageGenerator(); }}
                              className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
                            >
                              <ImageIcon className="w-4 h-4 text-indigo-500 shrink-0" />
                              <div>
                                <div className="font-medium">Ilustrasi &amp; Gambar AI</div>
                                <div className="text-[10px] text-slate-400">Buat visual pendukung presentasi</div>
                              </div>
                            </button>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              <div className="relative shrink-0">
                <button
                  type="button"
                  disabled={isStreaming || isDisabled}
                  aria-label="AI & Opsi"
                  aria-expanded={optionsOpen}
                  aria-haspopup="dialog"
                  aria-controls="workspace-composer-options"
                  onClick={() => setOptionsOpen(value => !value)}
                  className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium transition-colors cursor-pointer ${
                    optionsOpen ? 'bg-slate-200 text-slate-800 dark:bg-white/15 dark:text-slate-100' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10'
                  }`}
                  title="Opsi Model & Perbandingan"
                >
                  <SlidersHorizontal className="h-3.5 w-3.5" />
                </button>
                {optionsOpen && (
                  <>
                    <button type="button" className="fixed inset-0 z-30 cursor-default" aria-label="Tutup opsi composer" onClick={() => setOptionsOpen(false)} />
                    <div id="workspace-composer-options" role="dialog" aria-label="AI & Opsi" onKeyDown={event => { if (event.key === 'Escape') { event.preventDefault(); setOptionsOpen(false); } }} className="rt-popover fixed inset-x-2 bottom-16 z-50 max-h-[min(65dvh,32rem)] overflow-y-auto p-4 rounded-2xl border border-slate-200/80 bg-white/95 shadow-xl backdrop-blur-md dark:border-white/10 dark:bg-slate-900/95 sm:absolute sm:inset-auto sm:bottom-full sm:left-auto sm:right-0 sm:mb-2 sm:w-[min(22rem,calc(100vw-2rem))]">
                      <div className="flex flex-col gap-2.5 border-b border-slate-100 pb-2.5 dark:border-white/5">
                        <div className="rounded-xl border border-slate-200/70 bg-slate-50/80 p-2 text-xs text-slate-500 dark:border-white/10 dark:bg-white/5"><span className="font-medium text-slate-700 dark:text-slate-200">Konteks tambahan untuk pesan berikutnya:</span> {displayedContextSummary}</div>
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">Mode Respons</p>
                            <p className="mt-0.5 text-[11px] text-slate-500">Sesuaikan kedalaman dan gaya jawaban.</p>
                          </div>
                          <button
                            type="button"
                            disabled={isStreaming}
                            aria-pressed={compareMode}
                            onClick={() => onCompareModeChange(!compareMode)}
                            className={`h-7 shrink-0 rounded-lg px-2 text-xs font-medium transition-colors disabled:opacity-50 cursor-pointer ${
                              compareMode ? 'bg-indigo-600 text-white shadow-3xs' : 'border border-slate-200/80 text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5'
                            }`}
                          >
                            {compareMode ? 'Bandingkan aktif' : 'Bandingkan'}
                          </button>
                        </div>
                        {compareMode && (
                          <div className="rounded-xl border border-indigo-200/70 bg-indigo-50/50 p-2 dark:border-indigo-900/60 dark:bg-indigo-950/20">
                            <p className="mb-1.5 text-[11px] font-medium text-indigo-900 dark:text-indigo-200">Pilih model untuk dibandingkan</p>
                            <WorkspaceCompareModelSelector selectedModelIds={selectedCompareModels} onChange={onCompareModelsChange} disabled={isStreaming} hasAttachment={hasAttachments} />
                          </div>
                        )}
                        {compareMode && !isModelCatalogLoading && !isComparisonSelectionValid && (
                          <p role="status" className="text-[10.5px] text-amber-700 dark:text-amber-300">Pilih setidaknya dua model atau profil yang tersedia sebelum mengirim.</p>
                        )}
                        <div className="grid gap-2 sm:grid-cols-2">
                          <label className="text-[11px] font-medium text-slate-600 dark:text-slate-300">
                            Respons
                            <select aria-label="Mode respons" value={responseMode} onChange={event => setResponseMode(event.target.value as WorkspaceResponseMode)} className="rt-select mt-1 text-xs">
                              <option>Ringkas</option>
                              <option>Seimbang</option>
                              <option>Mendalam</option>
                            </select>
                          </label>
                          <label className="text-[11px] font-medium text-slate-600 dark:text-slate-300">
                            Gaya
                            <select aria-label="Gaya (opsional)" value={responseStyle} onChange={event => setResponseStyle(event.target.value as WorkspaceResponseStyle)} className="rt-select mt-1 text-xs">
                              <option value="Default">Default</option>
                              <option>Akademik</option>
                              <option>Langkah demi langkah</option>
                              <option>Formal</option>
                            </select>
                          </label>
                        </div>
                        <div className="flex flex-wrap items-center gap-1">
                          {allPresets && activePreset && onSelectPreset && onCreatePreset && onUpdatePreset && onDuplicatePreset && onDeletePreset && (
                            <WorkspacePresetSelector allPresets={allPresets} activePreset={activePreset} activePresetId={activePresetId || activePreset.id} summary={presetSummary || activePreset.name} isManualOverride={isManualModelOverride} disabled={isStreaming} onSelectPreset={onSelectPreset} onCreatePreset={onCreatePreset} onUpdatePreset={onUpdatePreset} onDuplicatePreset={onDuplicatePreset} onDeletePreset={onDeletePreset} onResetPersonalization={onResetPersonalization} />
                          )}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center justify-between gap-1 pt-2">
                        <div className="flex items-center gap-1">
                          <button type="button" onClick={onOpenTemplateGallery} disabled={isDisabled} className="h-7 rounded-lg px-2 text-xs text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">
                            <Sparkles className="mr-1 inline h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                            Template
                          </button>
                          {onSelectTool && <WorkspaceToolSelector artifactType={activeArtifactType} hasArtifact={Boolean(activeArtifactType)} disabled={isStreaming || isDisabled || compareMode} onSelectTool={tool => { setOptionsOpen(false); onSelectTool(tool); }} triggerVariant="composer" />}
                        </div>
                        <button type="button" onClick={() => { setOptionsOpen(false); setInfoModalOpen(true); }} className="h-7 rounded-lg px-2 text-[11px] text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
                          <Info className="mr-1 inline h-3 w-3" />
                          Info AI
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Right Controls: Voice Input & Crisp Circular Send Button */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={toggleListening}
                disabled={isStreaming || isDisabled}
                aria-label={isListening ? "Hentikan rekam suara" : "Input suara (Speech-to-Text)"}
                title={isListening ? "Hentikan rekam suara (Sedang mendengarkan...)" : "Input Suara (Speech-to-Text)"}
                className={`h-8 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                  isListening
                    ? "px-2.5 bg-rose-500 text-white shadow-xs"
                    : "w-8 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10"
                }`}
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
              </button>

              <AnimatePresence mode="wait" initial={false}>
              {isStreaming ? (
                <motion.button
                  key="stop-btn"
                  layout
                  type="button"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  whileHover={{ scale: 1.06 }}
                  whileTap={{ scale: 0.92 }}
                  transition={{ type: "spring", stiffness: 450, damping: 28 }}
                  onClick={onAbortStream}
                  className="h-8 w-8 sm:h-8.5 sm:w-8.5 rounded-full bg-slate-900 text-white shadow-xs flex items-center justify-center cursor-pointer dark:bg-white dark:text-slate-900"
                  title="Hentikan respons"
                  aria-label="Hentikan respons"
                >
                  <StopCircle className="w-4 h-4 text-rose-500 dark:text-rose-600" />
                </motion.button>
              ) : (
                <motion.button
                  key="send-btn"
                  layout
                  type="button"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  whileHover={
                    (inputText.trim() || readyAttachments.length > 0) &&
                    !hasPendingAttachment && !hasFailedAttachment &&
                    (!hasAttachments || readyAttachments.length === activeAttachments.length) &&
                    (!compareMode || isComparisonSelectionValid)
                      ? { scale: 1.06 }
                      : undefined
                  }
                  whileTap={
                    (inputText.trim() || readyAttachments.length > 0) &&
                    !hasPendingAttachment && !hasFailedAttachment &&
                    (!hasAttachments || readyAttachments.length === activeAttachments.length) &&
                    (!compareMode || isComparisonSelectionValid)
                      ? { scale: 0.92 }
                      : undefined
                  }
                  transition={{ type: "spring", stiffness: 450, damping: 28 }}
                  onClick={handleSend}
                  disabled={
                    isDisabled ||
                    (!inputText.trim() && !hasAttachments) ||
                    hasPendingAttachment || hasFailedAttachment ||
                    (hasAttachments && readyAttachments.length !== activeAttachments.length) ||
                    (compareMode && !isComparisonSelectionValid)
                  }
                  className={`h-8 w-8 sm:h-8.5 sm:w-8.5 rounded-full flex items-center justify-center transition-colors cursor-pointer disabled:cursor-not-allowed ${
                    (inputText.trim() || readyAttachments.length > 0) &&
                    !hasPendingAttachment && !hasFailedAttachment &&
                    (!hasAttachments || readyAttachments.length === activeAttachments.length) &&
                    (!compareMode || isComparisonSelectionValid)
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                      : 'bg-slate-100 text-slate-300 dark:bg-white/10 dark:text-slate-600'
                  }`}
                  title="Kirim (Enter)"
                  aria-label="Kirim Pesan"
                >
                  <ArrowUp className="w-4 h-4 stroke-[2.5]" />
                </motion.button>
              )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {isFreshWorkspace && starterTasks.length > 0 && onSelectStarterTask && (
          <nav aria-label="Mulai dengan contoh tugas" className="mx-auto mt-8 grid max-w-2xl grid-cols-2 gap-2.5 sm:mt-10 sm:gap-3">
            {starterTasks.map(task => (
              <button
                key={task.id}
                type="button"
                onClick={() => onSelectStarterTask(task.prompt)}
                disabled={isStreaming || isDisabled}
                className="group flex min-h-16 items-center gap-2.5 rounded-2xl border border-slate-200/80 bg-white/85 backdrop-blur-md p-3 text-left text-slate-800 shadow-2xs transition-all duration-200 hover:-translate-y-0.5 hover:border-indigo-300/80 hover:bg-white hover:shadow-md active:scale-[0.98] dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:hover:border-indigo-500/40 dark:hover:bg-white/10 sm:p-3.5 cursor-pointer"
              >
                <span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300 transition-colors group-hover:bg-indigo-50 group-hover:text-indigo-600 dark:group-hover:bg-indigo-950/60 dark:group-hover:text-indigo-400">{task.icon}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-semibold sm:text-sm">{task.title}</span>
                  <span className="mt-0.5 hidden text-[11px] leading-snug text-slate-500 dark:text-slate-400 sm:block">{task.subtitle}</span>
                </span>
                <ArrowUpRight className="hidden h-3.5 w-3.5 shrink-0 text-slate-300 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-indigo-500 sm:block" aria-hidden="true" />
              </button>
            ))}
          </nav>
        )}
        {isFreshWorkspace && (
          <nav aria-label="Fitur RuangKerja" className="mx-auto mt-5 flex max-w-2xl flex-col items-center gap-2.5">
            <div className="flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={onOpenTemplateGallery}
                disabled={isDisabled}
                className="group inline-flex min-h-8.5 items-center gap-1.5 rounded-full border border-slate-200/80 bg-white/80 px-3.5 py-1.5 text-xs font-medium text-slate-700 shadow-3xs transition-all hover:border-indigo-400 hover:bg-indigo-50/40 hover:text-indigo-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:border-indigo-500/50 dark:hover:bg-indigo-950/30 dark:hover:text-indigo-200 cursor-pointer"
              >
                <LayoutTemplate className="h-3.5 w-3.5 text-slate-400 transition-colors group-hover:text-indigo-600 dark:text-slate-500 dark:group-hover:text-indigo-400" aria-hidden="true" />
                Galeri Template
              </button>
              <button
                type="button"
                onClick={() => { onCompareModeChange(true); setOptionsOpen(true); }}
                disabled={isStreaming || isDisabled}
                className="group inline-flex min-h-8.5 items-center gap-1.5 rounded-full border border-slate-200/80 bg-white/80 px-3.5 py-1.5 text-xs font-medium text-slate-700 shadow-3xs transition-all hover:border-indigo-400 hover:bg-indigo-50/40 hover:text-indigo-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:border-indigo-500/50 dark:hover:bg-indigo-950/30 dark:hover:text-indigo-200 cursor-pointer"
              >
                <GitCompareArrows className="h-3.5 w-3.5 text-slate-400 transition-colors group-hover:text-indigo-600 dark:text-slate-500 dark:group-hover:text-indigo-400" aria-hidden="true" />
                Bandingkan Model
              </button>
              {onOpenMockDefense && (
                <button
                  type="button"
                  onClick={onOpenMockDefense}
                  disabled={isStreaming || isDisabled}
                  className="group inline-flex min-h-8.5 items-center gap-1.5 rounded-full border border-slate-200/80 bg-white/80 px-3.5 py-1.5 text-xs font-medium text-slate-700 shadow-3xs transition-all hover:border-indigo-400 hover:bg-indigo-50/40 hover:text-indigo-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:border-indigo-500/50 dark:hover:bg-indigo-950/30 dark:hover:text-indigo-200 cursor-pointer"
                >
                  <Sparkles className="h-3.5 w-3.5 text-slate-400 transition-colors group-hover:text-indigo-600 dark:text-slate-500 dark:group-hover:text-indigo-400" aria-hidden="true" />
                  Simulasi Sidang (AI)
                </button>
              )}
              {(onOpenSupervisorNotes || onOpenThesisBinder || onOpenCitationAudit || onOpenDataStudioChart || onOpenTurnitinAudit || onOpenKnowledgeGraph || onOpenCouncilDebate) && (
                <button
                  type="button"
                  onClick={() => setShowAllFreshTools(prev => !prev)}
                  aria-expanded={showAllFreshTools}
                  className="inline-flex min-h-8.5 items-center gap-1 rounded-full border border-dashed border-slate-300/90 bg-transparent px-3 py-1.5 text-xs font-medium text-slate-500 transition-colors hover:border-indigo-400 hover:text-indigo-600 dark:border-white/15 dark:text-slate-400 dark:hover:border-indigo-400 dark:hover:text-indigo-300 cursor-pointer"
                >
                  <span>{showAllFreshTools ? 'Sembunyikan Alat Lainnya' : '+ Alat Riset & Skripsi'}</span>
                </button>
              )}
            </div>

            {showAllFreshTools && (
              <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1 animate-fade-in">
                {onOpenSupervisorNotes && (
                  <button
                    type="button"
                    onClick={onOpenSupervisorNotes}
                    disabled={isStreaming || isDisabled}
                    className="group inline-flex min-h-8 items-center gap-1.5 rounded-full border border-slate-200/70 bg-white/70 px-3 py-1 text-[11.5px] font-medium text-slate-600 shadow-3xs transition-all hover:border-indigo-400 hover:bg-indigo-50/40 hover:text-indigo-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:border-indigo-500/50 dark:hover:bg-indigo-950/30 dark:hover:text-indigo-200 cursor-pointer"
                  >
                    <FileText className="h-3 w-3 text-slate-400 transition-colors group-hover:text-indigo-600 dark:text-slate-500 dark:group-hover:text-indigo-400" aria-hidden="true" />
                    Notulensi Bimbingan
                  </button>
                )}
                {onOpenThesisBinder && (
                  <button
                    type="button"
                    onClick={onOpenThesisBinder}
                    disabled={isStreaming || isDisabled}
                    className="group inline-flex min-h-8 items-center gap-1.5 rounded-full border border-slate-200/70 bg-white/70 px-3 py-1 text-[11.5px] font-medium text-slate-600 shadow-3xs transition-all hover:border-indigo-400 hover:bg-indigo-50/40 hover:text-indigo-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:border-indigo-500/50 dark:hover:bg-indigo-950/30 dark:hover:text-indigo-200 cursor-pointer"
                  >
                    <BookOpen className="h-3 w-3 text-slate-400 transition-colors group-hover:text-indigo-600 dark:text-slate-500 dark:group-hover:text-indigo-400" aria-hidden="true" />
                    Binder Skripsi
                  </button>
                )}
                {onOpenCitationAudit && (
                  <button
                    type="button"
                    onClick={onOpenCitationAudit}
                    disabled={isStreaming || isDisabled}
                    className="group inline-flex min-h-8 items-center gap-1.5 rounded-full border border-slate-200/70 bg-white/70 px-3 py-1 text-[11.5px] font-medium text-slate-600 shadow-3xs transition-all hover:border-indigo-400 hover:bg-indigo-50/40 hover:text-indigo-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:border-indigo-500/50 dark:hover:bg-indigo-950/30 dark:hover:text-indigo-200 cursor-pointer"
                  >
                    <Quote className="h-3 w-3 text-slate-400 transition-colors group-hover:text-indigo-600 dark:text-slate-500 dark:group-hover:text-indigo-400" aria-hidden="true" />
                    Audit Sitasi
                  </button>
                )}
                {onOpenDataStudioChart && (
                  <button
                    type="button"
                    onClick={onOpenDataStudioChart}
                    disabled={isStreaming || isDisabled}
                    className="group inline-flex min-h-8 items-center gap-1.5 rounded-full border border-slate-200/70 bg-white/70 px-3 py-1 text-[11.5px] font-medium text-slate-600 shadow-3xs transition-all hover:border-indigo-400 hover:bg-indigo-50/40 hover:text-indigo-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:border-indigo-500/50 dark:hover:bg-indigo-950/30 dark:hover:text-indigo-200 cursor-pointer"
                  >
                    <BarChart2 className="h-3 w-3 text-slate-400 transition-colors group-hover:text-indigo-600 dark:text-slate-500 dark:group-hover:text-indigo-400" aria-hidden="true" />
                    Data Studio
                  </button>
                )}
                {onOpenTurnitinAudit && (
                  <button
                    type="button"
                    onClick={onOpenTurnitinAudit}
                    disabled={isStreaming || isDisabled}
                    className="group inline-flex min-h-8 items-center gap-1.5 rounded-full border border-slate-200/70 bg-white/70 px-3 py-1 text-[11.5px] font-medium text-slate-600 shadow-3xs transition-all hover:border-indigo-400 hover:bg-indigo-50/40 hover:text-indigo-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:border-indigo-500/50 dark:hover:bg-indigo-950/30 dark:hover:text-indigo-200 cursor-pointer"
                  >
                    <ShieldCheck className="h-3 w-3 text-slate-400 transition-colors group-hover:text-indigo-600 dark:text-slate-500 dark:group-hover:text-indigo-400" aria-hidden="true" />
                    Audit Turnitin
                  </button>
                )}
                {onOpenKnowledgeGraph && (
                  <button
                    type="button"
                    onClick={onOpenKnowledgeGraph}
                    disabled={isStreaming || isDisabled}
                    className="group inline-flex min-h-8 items-center gap-1.5 rounded-full border border-slate-200/70 bg-white/70 px-3 py-1 text-[11.5px] font-medium text-slate-600 shadow-3xs transition-all hover:border-indigo-400 hover:bg-indigo-50/40 hover:text-indigo-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:border-indigo-500/50 dark:hover:bg-indigo-950/30 dark:hover:text-indigo-200 cursor-pointer"
                  >
                    <Share2 className="h-3 w-3 text-slate-400 transition-colors group-hover:text-indigo-600 dark:text-slate-500 dark:group-hover:text-indigo-400" aria-hidden="true" />
                    Knowledge Graph
                  </button>
                )}
                {onOpenCouncilDebate && (
                  <button
                    type="button"
                    onClick={onOpenCouncilDebate}
                    disabled={isStreaming || isDisabled}
                    className="group inline-flex min-h-8 items-center gap-1.5 rounded-full border border-slate-200/70 bg-white/70 px-3 py-1 text-[11.5px] font-medium text-slate-600 shadow-3xs transition-all hover:border-indigo-400 hover:bg-indigo-50/40 hover:text-indigo-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:border-indigo-500/50 dark:hover:bg-indigo-950/30 dark:hover:text-indigo-200 cursor-pointer"
                  >
                    <Users className="h-3 w-3 text-slate-400 transition-colors group-hover:text-indigo-600 dark:text-slate-500 dark:group-hover:text-indigo-400" aria-hidden="true" />
                    Debat Dewan AI
                  </button>
                )}
              </div>
            )}
          </nav>
        )}
      </div>

      {/* Modal / Dialog Info Privasi & Pemrosesan Berkas */}
      {infoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fade-in" role="dialog" aria-modal="true" aria-labelledby="privacy-info-title">
          <div className="rt-modal max-w-md w-full p-5 space-y-3 rounded-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <h3 id="privacy-info-title" className="text-sm font-semibold text-slate-900 dark:text-slate-100">Pemrosesan Berkas &amp; Layanan AI</h3>
              </div>
              <button
                type="button"
                onClick={() => setInfoModalOpen(false)}
                className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                aria-label="Tutup info"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Berkas yang dilampirkan diproses untuk ekstraksi teks &amp; sitasi. Konteks yang dipakai diteruskan ke model AI yang kamu pilih.
            </p>
            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setInfoModalOpen(false)}
                className="px-3.5 py-1.5 bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-xs font-semibold rounded-xl hover:opacity-90 transition-opacity cursor-pointer"
              >
                Mengerti
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});
