import React, { useRef, useEffect, useState } from 'react';
import {
  Paperclip, 
  Sparkles, 
  StopCircle, 
  Send,
  SlidersHorizontal
} from 'lucide-react';
import { WorkspaceFileAttachment, AcademicPromptPill, WorkspaceComposerConfig, WorkspaceResponseMode, WorkspaceResponseStyle } from '../types';
import { WorkspaceAttachmentList } from './WorkspaceAttachmentList';
import { MAX_WORKSPACE_ACTIVE_ATTACHMENTS, SUPPORTED_WORKSPACE_FILE_EXTENSIONS } from '../../../../shared/contracts/files';
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

  // Sync mode and style when active preset changes
  useEffect(() => {
    if (activePreset?.responseMode) setResponseMode(activePreset.responseMode);
    if (activePreset?.responseStyle) setResponseStyle(activePreset.responseStyle);
  }, [activePreset?.id, activePreset?.responseMode, activePreset?.responseStyle]);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
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

    if (compareMode && selectedCompareModels.length < 2) return;

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
  ].filter(Boolean).join(' · ') || 'Konteks';
  const displayedContextSummary = workspaceContextSummary || contextSummary;

  return (
    <div className="p-3 bg-white/85 dark:bg-secondary-900/85 backdrop-blur-md border-t border-slate-200/80 dark:border-slate-800 shrink-0">
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
      <div className={`relative rounded-xl bg-slate-50/90 dark:bg-slate-900/90 border transition-all duration-500 p-2 ${
        isStreaming
          ? 'border-indigo-400/60 dark:border-indigo-500/60 shadow-[0_0_16px_rgba(99,102,241,0.14)] ring-1 ring-indigo-400/25'
          : 'border-slate-200/90 dark:border-slate-800 focus-within:border-emerald-500/80 focus-within:ring-1 focus-within:ring-emerald-500/30'
      }`}>
        {modelPreferenceNotice && <p role="status" className="mb-1 px-1 text-[11px] text-amber-700 dark:text-amber-300">{modelPreferenceNotice}</p>}
        <WorkspaceAttachmentList
          attachments={activeAttachments}
          disabled={isStreaming || isDisabled}
          onRemove={attachment => onRemoveAttachment ? onRemoveAttachment(attachment) : onRemoveAttachedFile()}
          onRetry={onRetryAttachment}
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
          placeholder="Tanyakan apa saja tentang pekerjaan ini..."
          aria-label="Pesan untuk Asisten RuangKerja"
          aria-describedby="workspace-composer-hint"
          rows={1}
          disabled={isDisabled}
          maxLength={maxInputLength}
          className="w-full max-h-40 overflow-y-auto text-xs sm:text-sm px-1 py-1 bg-transparent text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none resize-none leading-relaxed min-h-10"
        />
        {(inputFocused || inputText.length >= maxInputLength * 0.8) && inputText.length > 0 && (
          <div className={`px-1 pb-1 text-right text-[10px] ${inputText.length >= maxInputLength * 0.9 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'}`} aria-live="polite">{inputText.length.toLocaleString('id-ID')} / {maxInputLength.toLocaleString('id-ID')}</div>
        )}

        {/* Action Bar Inside Composer */}
        <div className="flex items-center justify-between gap-1 pt-1 border-t border-slate-200/60 dark:border-slate-800">
          <div className="flex min-w-0 items-center gap-1">
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
              className="h-9 w-9 shrink-0 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
              title={`Lampirkan dokumen atau kode (maksimal ${MAX_WORKSPACE_ACTIVE_ATTACHMENTS})`}
              aria-label="Lampirkan dokumen atau kode"
            >
              <Paperclip className="w-4 h-4" />
            </button>
            <WorkspaceModelSelector value={selectedModel} onChange={onModelChange} disabled={isStreaming || isDisabled} overlayPlacement="viewport" />
            <button type="button" onClick={onOpenContext} aria-label={`Buka panel konteks: ${displayedContextSummary}`} title={displayedContextSummary} className="inline-flex h-8 max-w-[min(24vw,10rem)] min-w-0 items-center gap-1.5 rounded-lg px-2 text-xs text-slate-500 transition hover:bg-slate-200/70 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"><span className="truncate">{displayedContextSummary}</span></button>
            <div className="relative shrink-0">
              <button type="button" disabled={isStreaming || isDisabled} aria-label="AI & Opsi" aria-expanded={optionsOpen} aria-haspopup="dialog" aria-controls="workspace-composer-options" onClick={() => setOptionsOpen(value => !value)} className={`inline-flex h-8 items-center gap-1.5 rounded-lg px-2 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${optionsOpen ? 'relative z-50 bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-100' : 'text-slate-500 hover:bg-slate-200/70 dark:hover:bg-slate-800'}`}>
                <SlidersHorizontal className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">AI &amp; Opsi</span>
              </button>
              {optionsOpen && <>
                <button type="button" className="fixed inset-0 z-30 cursor-default" aria-label="Tutup opsi composer" onClick={() => setOptionsOpen(false)} />
                <div id="workspace-composer-options" role="dialog" aria-label="AI & Opsi" onKeyDown={event => { if (event.key === 'Escape') { event.preventDefault(); setOptionsOpen(false); } }} className="absolute bottom-full left-0 z-40 mb-2 w-[min(22rem,calc(100vw-2rem))] max-h-[min(65dvh,32rem)] overflow-y-auto rounded-xl border border-slate-200 bg-white p-3 shadow-xl dark:border-slate-700 dark:bg-slate-900">
                  <div className="flex flex-col gap-2 border-b border-slate-100 pb-2 dark:border-slate-800">
                    <div className="flex items-start justify-between gap-3">
                      <div><p className="text-xs font-semibold text-slate-800 dark:text-slate-100">Cara bekerja</p><p className="mt-0.5 text-[11px] text-slate-500">Pilih satu jawaban atau bandingkan model.</p></div>
                      <button type="button" disabled={isStreaming} aria-pressed={compareMode} onClick={() => onCompareModeChange(!compareMode)} className={`h-8 shrink-0 rounded-lg px-2.5 text-xs font-medium transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${compareMode ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' : 'border border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'}`}>{compareMode ? 'Bandingkan aktif' : 'Bandingkan'}</button>
                    </div>
                    {compareMode && <div className="rounded-lg border border-emerald-200/70 bg-emerald-50/50 p-2 dark:border-emerald-900/60 dark:bg-emerald-950/20"><p className="mb-1.5 text-[11px] font-medium text-emerald-900 dark:text-emerald-200">Pilih model untuk dibandingkan</p><WorkspaceCompareModelSelector selectedModelIds={selectedCompareModels} onChange={onCompareModelsChange} disabled={isStreaming} hasAttachment={hasAttachments} /></div>}
                    <div className="grid gap-2 sm:grid-cols-2">
                      <label className="text-[11px] font-medium text-slate-600 dark:text-slate-300">Respons<select aria-label="Mode respons" value={responseMode} onChange={event => setResponseMode(event.target.value as WorkspaceResponseMode)} className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs dark:border-slate-700 dark:bg-slate-950"><option>Ringkas</option><option>Seimbang</option><option>Mendalam</option></select></label>
                      <label className="text-[11px] font-medium text-slate-600 dark:text-slate-300">Gaya<select aria-label="Gaya (opsional)" value={responseStyle} onChange={event => setResponseStyle(event.target.value as WorkspaceResponseStyle)} className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs dark:border-slate-700 dark:bg-slate-950"><option value="Default">Default</option><option>Akademik</option><option>Langkah demi langkah</option><option>Formal</option></select></label>
                    </div>
                    <div className="rounded-lg bg-slate-50 px-2.5 py-2 text-[11px] text-slate-500 dark:bg-slate-950/70"><span className="font-medium text-slate-700 dark:text-slate-200">Konteks aktif:</span> {displayedContextSummary}</div>
                    <div className="flex flex-wrap items-center gap-1">
                    {allPresets && activePreset && onSelectPreset && onCreatePreset && onUpdatePreset && onDuplicatePreset && onDeletePreset && (
                      <WorkspacePresetSelector allPresets={allPresets} activePreset={activePreset} activePresetId={activePresetId || activePreset.id} summary={presetSummary || activePreset.name} isManualOverride={isManualModelOverride} disabled={isStreaming} onSelectPreset={onSelectPreset} onCreatePreset={onCreatePreset} onUpdatePreset={onUpdatePreset} onDuplicatePreset={onDuplicatePreset} onDeletePreset={onDeletePreset} onResetPersonalization={onResetPersonalization} />
                    )}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-1 pt-2">
                    <button type="button" onClick={onOpenTemplateGallery} disabled={isDisabled} className="h-8 rounded-lg px-2 text-xs text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"><Sparkles className="mr-1 inline h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />Template</button>
                    {onSelectTool && <WorkspaceToolSelector artifactType={activeArtifactType} hasArtifact={Boolean(activeArtifactType)} disabled={isStreaming || isDisabled || compareMode} onSelectTool={tool => { setOptionsOpen(false); onSelectTool(tool); }} triggerVariant="composer" />}
                  </div>
                </div>
              </>}
            </div>
          </div>

          {/* Right Controls: Enter Hint & Send */}
          <div className="flex items-center gap-2">
            <span id="workspace-composer-hint" className="text-[10px] text-slate-400 font-sans hidden sm:inline select-none">
              Enter ↵
            </span>

            {isStreaming ? (
              <button
                type="button"
                onClick={onAbortStream}
                className="h-9 w-9 rounded-lg bg-rose-500 hover:bg-rose-600 text-white flex items-center justify-center transition-all cursor-pointer"
                title="Hentikan respons"
                aria-label="Hentikan respons"
              >
                <StopCircle className="w-3.5 h-3.5" />
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
                  (compareMode && selectedCompareModels.length < 2)
                }
                className={`h-9 w-9 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                  (inputText.trim() || readyAttachments.length > 0) &&
                  !hasPendingAttachment && !hasFailedAttachment &&
                  (!hasAttachments || readyAttachments.length === activeAttachments.length)
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs active:scale-95'
                    : 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                }`}
                title="Kirim"
                aria-label="Kirim Pesan"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});
