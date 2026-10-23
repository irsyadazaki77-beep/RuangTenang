import React, { useRef, useEffect, useMemo, useState } from 'react';
import {
  Paperclip,
  Plus,
  Files,
  Sparkles,
  Ghost,
  LayoutTemplate,
  GitCompareArrows,
  StopCircle,
  Send,
  SlidersHorizontal,
  Mic,
  MicOff,
  ArrowUp,
  ArrowUpRight,
  Info,
  X
} from 'lucide-react';
import { useComposerVoiceInput } from '../../chat/hooks/useComposerVoiceInput';
import { WorkspaceFileAttachment, AcademicPromptPill, WorkspaceComposerConfig, WorkspaceResponseMode, WorkspaceResponseStyle, StarterTaskItem } from '../types';
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
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  const { isListening, toggleListening } = useComposerVoiceInput(inputText, setInputText);
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
        : 'shrink-0 border-t border-slate-200/70 bg-white/75 p-3 backdrop-blur-md dark:border-slate-800/80 dark:bg-[#0b101b]/75'
    }`}>
      {/* Academic Distress Regulation Banner */}
      {distressResult.isDistressed && !isDistressDismissed && (
        <AcademicDistressBanner
          distressResult={distressResult}
          onOpenBreathing={onOpenBreathing}
          onSwitchToRuangTenang={onSwitchToRuangTenang}
          onDismiss={onDismissDistress}
        />
      )}

      {/* Compact Floating Composer Container */}
      <div className={isFreshWorkspace ? 'my-auto w-full max-w-3xl' : 'w-full'}>
      {isFreshWorkspace && (
        <div className="mx-auto mb-6 max-w-2xl animate-fade-in text-center sm:mb-8">
          {isTemporary && <p className="mb-4 inline-flex items-center gap-1.5 text-xs font-medium text-amber-800 dark:text-amber-300 sm:hidden"><Ghost className="h-3.5 w-3.5" aria-hidden="true" />Sesi sementara · pesan tidak disimpan</p>}
          <h2 className="text-[1.75rem] font-semibold leading-tight tracking-tight text-slate-900 dark:text-slate-100 sm:text-4xl">
            Apa yang ingin kamu kerjakan?
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-slate-600 dark:text-slate-300">Tulis pertanyaan, lampirkan berkas, atau pilih contoh di bawah.</p>
        </div>
      )}
      <div className={`relative rounded-3xl border bg-white/95 backdrop-blur-xl ${isFreshWorkspace ? 'p-3.5 sm:p-5' : 'p-2.5 sm:p-3.5'} shadow-[0_12px_32px_-12px_rgba(15,23,42,0.12)] transition-all duration-300 dark:bg-[#16181d]/95 dark:shadow-[0_12px_32px_-12px_rgba(0,0,0,0.5)] ${
        isStreaming
          ? 'border-indigo-400/80 dark:border-indigo-500/80 shadow-[0_0_24px_rgba(99,102,241,0.18)] ring-2 ring-indigo-400/25'
          : 'border-slate-200/90 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 focus-within:border-indigo-500/80 focus-within:ring-2 focus-within:ring-indigo-500/20'
      }`}>
        {modelPreferenceNotice && <p role="status" className="mb-1 px-1 text-[11px] text-amber-700 dark:text-amber-300">{modelPreferenceNotice}</p>}
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
          onChange={(e) => setInputText(e.target.value)}
          onFocus={() => setInputFocused(true)}
          onBlur={() => setInputFocused(false)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder={isFreshWorkspace ? 'Tulis pesan atau pertanyaan...' : 'Tanyakan apa saja tentang pekerjaan ini...'}
          aria-label="Pesan untuk Asisten RuangKerja"
          aria-describedby="workspace-composer-hint"
          rows={1}
          disabled={isDisabled}
          maxLength={maxInputLength}
          className={`w-full max-h-40 overflow-y-auto bg-transparent px-2 py-2 text-sm leading-relaxed text-slate-900 placeholder:text-slate-400 focus:outline-none resize-none dark:text-slate-100 ${isFreshWorkspace ? 'min-h-14 px-2 sm:min-h-16 sm:px-3 sm:text-base' : 'min-h-10 text-xs sm:text-sm'}`}
        />
        {(inputFocused || inputText.length >= maxInputLength * 0.8) && inputText.length > 0 && (
          <div className={`px-1 pb-1 text-right text-[10px] ${inputText.length >= maxInputLength * 0.9 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'}`} aria-live="polite">{inputText.length.toLocaleString('id-ID')} / {maxInputLength.toLocaleString('id-ID')}</div>
        )}

        {/* Action Bar Inside Composer */}
        <div className="flex items-center justify-between gap-1 pt-1.5 mt-0.5 border-t border-slate-100 dark:border-white/5">
          <div className="flex min-w-0 items-center gap-1.5">
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
              className="h-8.5 w-8.5 shrink-0 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              title={`Lampirkan teks, kode, sitasi, PDF/Office, atau gambar (maks. ${Math.floor(MAX_UPLOAD_FILE_SIZE_BYTES / (1024 * 1024))} MB per berkas; ${MAX_WORKSPACE_ACTIVE_ATTACHMENTS} dokumen aktif)`}
              aria-label="Lampirkan dokumen atau kode"
            >
              {isFreshWorkspace ? <Plus className="h-4.5 w-4.5" /> : <Paperclip className="h-4 w-4" />}
            </button>
            <WorkspaceModelSelector value={selectedModel} onChange={onModelChange} disabled={isStreaming || isDisabled} overlayPlacement="anchored" />
            <button type="button" onClick={onOpenContext} aria-label={`Buka panel konteks: ${displayedContextSummary}`} title={displayedContextSummary} className="relative inline-flex h-8.5 w-8.5 shrink-0 items-center justify-center rounded-xl px-0 text-xs text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-slate-100 sm:h-8 sm:w-auto sm:max-w-[min(22vw,8.5rem)] sm:min-w-0 sm:justify-start sm:gap-1.5 sm:px-2.5"><Files className="h-4 w-4 shrink-0 sm:hidden" aria-hidden="true" />{hasActiveContext && <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-indigo-500 sm:hidden" aria-hidden="true" />}<span className="hidden truncate sm:inline">{displayedContextSummary}</span></button>
            <div className="relative shrink-0">
              <button type="button" disabled={isStreaming || isDisabled} aria-label="AI & Opsi" aria-expanded={optionsOpen} aria-haspopup="dialog" aria-controls="workspace-composer-options" onClick={() => setOptionsOpen(value => !value)} className={`inline-flex h-8.5 w-8.5 shrink-0 items-center justify-center gap-1.5 rounded-xl px-0 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 sm:h-8 sm:w-auto sm:justify-start sm:px-2.5 ${optionsOpen ? 'relative z-50 bg-slate-200 text-slate-800 dark:bg-white/15 dark:text-slate-100' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10'}`}>
                <SlidersHorizontal className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">AI &amp; Opsi</span>
              </button>
              {optionsOpen && <>
                <button type="button" className="fixed inset-0 z-30 cursor-default" aria-label="Tutup opsi composer" onClick={() => setOptionsOpen(false)} />
                <div id="workspace-composer-options" role="dialog" aria-label="AI & Opsi" onKeyDown={event => { if (event.key === 'Escape') { event.preventDefault(); setOptionsOpen(false); } }} className="fixed inset-x-2 bottom-16 z-50 max-h-[min(65dvh,32rem)] overflow-y-auto rounded-xl border border-slate-200 bg-white p-3 shadow-2xl dark:border-slate-700 dark:bg-slate-900 sm:absolute sm:inset-auto sm:bottom-full sm:left-auto sm:right-0 sm:mb-2 sm:w-[min(22rem,calc(100vw-2rem))]">
                  <div className="flex flex-col gap-2 border-b border-slate-100 pb-2 dark:border-slate-800">
                    <div className="flex items-start justify-between gap-3">
                      <div><p className="text-xs font-semibold text-slate-800 dark:text-slate-100">Cara bekerja</p><p className="mt-0.5 text-[11px] text-slate-500">Pilih satu jawaban atau bandingkan model.</p></div>
                      <button type="button" disabled={isStreaming} aria-pressed={compareMode} onClick={() => onCompareModeChange(!compareMode)} className={`h-8 shrink-0 rounded-lg px-2.5 text-xs font-medium transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${compareMode ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300' : 'border border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'}`}>{compareMode ? 'Bandingkan aktif' : 'Bandingkan'}</button>
                    </div>
                    {compareMode && <div className="rounded-lg border border-indigo-200/70 bg-indigo-50/50 p-2 dark:border-indigo-900/60 dark:bg-indigo-950/20"><p className="mb-1.5 text-[11px] font-medium text-indigo-900 dark:text-indigo-200">Pilih model untuk dibandingkan</p><WorkspaceCompareModelSelector selectedModelIds={selectedCompareModels} onChange={onCompareModelsChange} disabled={isStreaming} hasAttachment={hasAttachments} /></div>}
                    {compareMode && !isModelCatalogLoading && !isComparisonSelectionValid && <p role="status" className="text-[10.5px] text-amber-700 dark:text-amber-300">Pilih setidaknya dua model atau profil yang tersedia sebelum mengirim.</p>}
                    <div className="grid gap-2 sm:grid-cols-2">
                      <label className="text-[11px] font-medium text-slate-600 dark:text-slate-300">Respons<select aria-label="Mode respons" value={responseMode} onChange={event => setResponseMode(event.target.value as WorkspaceResponseMode)} className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs dark:border-slate-700 dark:bg-slate-950"><option>Ringkas</option><option>Seimbang</option><option>Mendalam</option></select></label>
                      <label className="text-[11px] font-medium text-slate-600 dark:text-slate-300">Gaya<select aria-label="Gaya (opsional)" value={responseStyle} onChange={event => setResponseStyle(event.target.value as WorkspaceResponseStyle)} className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs dark:border-slate-700 dark:bg-slate-950"><option value="Default">Default</option><option>Akademik</option><option>Langkah demi langkah</option><option>Formal</option></select></label>
                    </div>
                    <div className="rounded-lg bg-slate-50 px-2.5 py-2 text-[11px] text-slate-500 dark:bg-slate-950/70"><span className="font-medium text-slate-700 dark:text-slate-200">Konteks tambahan untuk pesan berikutnya:</span> {displayedContextSummary}</div>
                    <div className="flex flex-wrap items-center gap-1">
                    {allPresets && activePreset && onSelectPreset && onCreatePreset && onUpdatePreset && onDuplicatePreset && onDeletePreset && (
                      <WorkspacePresetSelector allPresets={allPresets} activePreset={activePreset} activePresetId={activePresetId || activePreset.id} summary={presetSummary || activePreset.name} isManualOverride={isManualModelOverride} disabled={isStreaming} onSelectPreset={onSelectPreset} onCreatePreset={onCreatePreset} onUpdatePreset={onUpdatePreset} onDuplicatePreset={onDuplicatePreset} onDeletePreset={onDeletePreset} onResetPersonalization={onResetPersonalization} />
                    )}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-1 pt-2">
                    <button type="button" onClick={onOpenTemplateGallery} disabled={isDisabled} className="h-8 rounded-lg px-2 text-xs text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"><Sparkles className="mr-1 inline h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />Template</button>
                    {onSelectTool && <WorkspaceToolSelector artifactType={activeArtifactType} hasArtifact={Boolean(activeArtifactType)} disabled={isStreaming || isDisabled || compareMode} onSelectTool={tool => { setOptionsOpen(false); onSelectTool(tool); }} triggerVariant="composer" />}
                    <button type="button" onClick={() => { setOptionsOpen(false); setInfoModalOpen(true); }} className="h-8 rounded-lg px-2 text-xs text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 sm:hidden"><Info className="mr-1 inline h-3.5 w-3.5" />Privasi &amp; AI</button>
                  </div>
                </div>
              </>}
            </div>
          </div>

          {/* Right Controls: Voice Input, Enter Hint & Send */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={toggleListening}
              disabled={isStreaming || isDisabled}
              aria-label={isListening ? "Hentikan rekam suara" : "Input suara (Speech-to-Text)"}
              title={isListening ? "Hentikan rekam suara (Sedang mendengarkan...)" : "Bicara (Input Suara Speech-to-Text)"}
              className={`h-8.5 w-8.5 shrink-0 rounded-xl flex items-center justify-center transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                isListening
                  ? "bg-rose-500 text-white animate-pulse shadow-md hover:bg-rose-600 ring-2 ring-rose-400"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10"
              }`}
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>

            <span id="workspace-composer-hint" className="text-[10px] text-slate-400 font-sans hidden sm:inline select-none">
              ↵
            </span>

            {isStreaming ? (
              <button
                type="button"
                onClick={onAbortStream}
                className="h-8.5 w-8.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center transition-all cursor-pointer shadow-sm hover:scale-105 active:scale-95"
                title="Hentikan respons"
                aria-label="Hentikan respons"
              >
                <StopCircle className="w-4 h-4 text-rose-500 dark:text-rose-600 animate-pulse" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSend}
                disabled={
                  isDisabled ||
                  (!inputText.trim() && !hasAttachments) ||
                  hasPendingAttachment || hasFailedAttachment ||
                  (hasAttachments && readyAttachments.length !== activeAttachments.length) ||
                  (compareMode && !isComparisonSelectionValid)
                }
                className={`h-8.5 w-8.5 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer ${
                  (inputText.trim() || readyAttachments.length > 0) &&
                  !hasPendingAttachment && !hasFailedAttachment &&
                  (!hasAttachments || readyAttachments.length === activeAttachments.length)
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-md hover:opacity-90 active:scale-95'
                    : 'bg-slate-100 dark:bg-white/5 text-slate-300 dark:text-slate-600 cursor-not-allowed'
                }`}
                title="Kirim"
                aria-label="Kirim Pesan"
              >
                <ArrowUp className="w-4 h-4 stroke-[2.5]" />
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => setInfoModalOpen(true)}
            className="hidden items-center gap-1 text-[11px] text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors cursor-pointer sm:inline-flex"
            title="Informasi pemrosesan berkas dan AI"
            aria-label="Informasi pemrosesan berkas dan AI"
          >
            <Info className="w-3 h-3" />
            <span className="hidden sm:inline">Info Privasi &amp; AI</span>
          </button>
        </div>
      </div>

      {isFreshWorkspace && starterTasks.length > 0 && onSelectStarterTask && (
        <nav aria-label="Mulai dengan contoh tugas" className="mx-auto mt-8 grid max-w-3xl grid-cols-2 gap-2.5 sm:mt-10 sm:gap-3">
          {starterTasks.map(task => (
            <button
              key={task.id}
              type="button"
              onClick={() => onSelectStarterTask(task.prompt)}
              disabled={isStreaming || isDisabled}
              className="group flex min-h-17 items-center gap-2 rounded-xl border border-slate-200 bg-white p-3 text-left text-slate-800 shadow-sm transition-colors hover:border-indigo-300 hover:bg-indigo-50/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:bg-[#17191d] dark:text-slate-100 dark:hover:border-indigo-700 dark:hover:bg-indigo-950/20 sm:min-h-20 sm:items-start sm:gap-3 sm:p-4"
            >
              <span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-950/50">{task.icon}</span>
              <span className="min-w-0 flex-1"><span className="block text-xs font-semibold sm:text-sm">{task.title}</span><span className="mt-1 hidden text-[11px] leading-snug text-slate-600 dark:text-slate-400 sm:block sm:text-xs">{task.subtitle}</span></span>
              <ArrowUpRight className="hidden h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 sm:block" aria-hidden="true" />
            </button>
          ))}
        </nav>
      )}
      {isFreshWorkspace && (
        <nav aria-label="Fitur RuangKerja" className="mx-auto mt-4 flex max-w-3xl flex-wrap justify-center gap-2">
          <button
            type="button"
            onClick={onOpenTemplateGallery}
            disabled={isDisabled}
            className="inline-flex min-h-10 items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-slate-600 transition hover:bg-white hover:text-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-indigo-300 sm:text-sm"
          >
            <LayoutTemplate className="h-4 w-4 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
            Galeri Template
          </button>
          <button
            type="button"
            onClick={() => { onCompareModeChange(true); setOptionsOpen(true); }}
            disabled={isStreaming || isDisabled}
            className="inline-flex min-h-10 items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-slate-600 transition hover:bg-white hover:text-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-indigo-300 sm:text-sm"
          >
            <GitCompareArrows className="h-4 w-4 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
            Bandingkan Model
          </button>
        </nav>
      )}
      </div>

      {/* Modal / Dialog Info Privasi & Pemrosesan Berkas */}
      {infoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fade-in" role="dialog" aria-modal="true" aria-labelledby="privacy-info-title">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <h3 id="privacy-info-title" className="text-sm font-semibold text-slate-900 dark:text-slate-100">Pemrosesan Berkas &amp; Layanan AI</h3>
              </div>
              <button
                type="button"
                onClick={() => setInfoModalOpen(false)}
                className="h-7 w-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                aria-label="Tutup info"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Berkas yang dilampirkan diunggah ke server RuangKerja untuk ekstraksi; konteks yang dipakai kemudian dikirim ke endpoint model terpilih. Endpoint Ollama dapat berada di host lain. Jika provider cloud aktif, OCR gambar/PDF pindai dapat memakai Gemini atau OpenAI secara terpisah dari model chat yang dipilih.
            </p>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Workflow riset dapat memakai Tavily dan pencarian sitasi memakai Crossref; keduanya layanan eksternal terpisah dari model AI. Hindari mengirim data pribadi atau sensitif jika tidak diperlukan.
            </p>
            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setInfoModalOpen(false)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium rounded-lg transition-colors cursor-pointer"
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
