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
  modelPreferenceNotice?: string | null;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onSendMessage: (text: string, attachments?: StoredAttachment[], config?: WorkspaceComposerConfig) => void;
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
  promptPills,
  selectedModel,
  compareMode = false,
  onCompareModeChange = () => undefined,
  selectedCompareModels = [],
  onCompareModelsChange = () => undefined,
  maxInputLength = 2000,
  onModelChange,
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
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  const advancedTriggerRef = useRef<HTMLButtonElement>(null);

  const closeAdvanced = () => {
    setAdvancedOpen(false);
    advancedTriggerRef.current?.focus();
  };

  // Auto-expand textarea (min 44px, max 160px)
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollH = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${Math.min(Math.max(scrollH, 44), 160)}px`;
    }
  }, [inputText]);

  const handleApplyPromptPill = (promptText: string) => {
    setInputText(promptText);
    if (textareaRef.current) {
      textareaRef.current.focus();
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = textareaRef.current.value.length;
          textareaRef.current.selectionEnd = textareaRef.current.value.length;
        }
      }, 50);
    }
  };

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

    onSendMessage(prompt, attachmentsToSend, {
      aiModel: selectedModel,
      responseMode,
      responseStyle,
      presetId: activePreset?.id,
      taskCategory: activePreset?.taskCategory,
      latencyPreference: activePreset?.latencyPreference,
      qualityPreference: activePreset?.qualityPreference,
      comparisonModelIds: compareMode ? [...selectedCompareModels] : undefined
    });
    setInputText('');
  };

  return (
    <div className="p-3 bg-white/95 dark:bg-[#0F172A]/95 border-t border-slate-200/80 dark:border-slate-800 shrink-0">
      {/* Academic Distress Regulation Banner */}
      {distressResult.isDistressed && !isDistressDismissed && (
        <AcademicDistressBanner
          distressResult={distressResult}
          onOpenBreathing={onOpenBreathing}
          onSwitchToRuangTenang={onSwitchToRuangTenang}
          onDismiss={onDismissDistress}
        />
      )}

      {/* Quiet Contextual Suggestions Strip */}
      {(activeAttachments.some(item => item.status === 'ready') || activeArtifactTitle || selectedText.trim()) && (
        <details className="group mb-1.5 text-[11px] text-slate-500 dark:text-slate-400">
          <summary className="w-fit max-w-full cursor-pointer list-none rounded-md px-1.5 py-1 hover:bg-slate-100 dark:hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500">
            <span className="font-medium">Konteks:</span>{' '}
            {[
              activeAttachments.filter(item => item.status === 'ready').length ? `${activeAttachments.filter(item => item.status === 'ready').length} sumber` : '',
              activeArtifactTitle || '',
              selectedText.trim() ? 'pilihan teks' : ''
            ].filter(Boolean).join(' · ')}
            <span className="ml-1 text-slate-400 group-open:hidden">Detail</span>
          </summary>
          <div className="mt-1 max-w-xl space-y-0.5 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-[11px] dark:border-slate-700 dark:bg-slate-900">
            {activeAttachments.filter(item => item.status === 'ready').map(file => <div key={file.id || file.clientId}>Sumber: {file.name}</div>)}
            {activeArtifactTitle && <div>Canvas: {activeArtifactTitle}</div>}
            {selectedText.trim() && <div>Teks terpilih diprioritaskan ({selectedText.length.toLocaleString('id-ID')} karakter)</div>}
            <div>Percakapan aktif digunakan sebagai konteks pendukung.</div>
          </div>
        </details>
      )}
      <div className={`relative w-full mb-1.5 overflow-hidden ${inputText.trim() ? 'hidden' : ''}`}>
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5 text-xs text-slate-500">
          <span className="shrink-0 font-medium select-none pr-1 text-[11px]">Mulai:</span>
          {promptPills.slice(0, 3).map((pill, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleApplyPromptPill(pill.prompt)}
              className="px-2 py-0.5 rounded-md text-[11px] font-medium text-slate-600 dark:text-slate-400 hover:text-emerald-700 dark:hover:text-emerald-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {pill.label}
            </button>
          ))}
        </div>
      </div>

      {/* Compact Floating Composer Container */}
      <div className="relative rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 focus-within:border-emerald-500/80 focus-within:ring-1 focus-within:ring-emerald-500/30 transition-all p-2">
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
          placeholder="Tanyakan tugas akademik, format sitasi, atau tempel draf/kode..."
          aria-label="Pesan untuk Asisten RuangKerja"
          aria-describedby="workspace-composer-hint"
          rows={1}
          disabled={isDisabled}
          maxLength={maxInputLength}
          className="w-full max-h-40 overflow-y-auto text-xs sm:text-sm px-1 py-1 bg-transparent text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none resize-none leading-relaxed min-h-[40px]"
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
              className="h-8 w-8 shrink-0 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
              title={`Lampirkan dokumen atau kode (maksimal ${MAX_WORKSPACE_ACTIVE_ATTACHMENTS})`}
              aria-label="Lampirkan dokumen atau kode"
            >
              <Paperclip className="w-4 h-4" />
            </button>
            {compareMode ? (
              <WorkspaceCompareModelSelector selectedModelIds={selectedCompareModels} onChange={onCompareModelsChange} disabled={isStreaming} hasAttachment={hasAttachments} />
            ) : <WorkspaceModelSelector value={selectedModel} onChange={onModelChange} disabled={isStreaming} />}
            <div className="relative shrink-0">
              <button type="button" disabled={isStreaming || isDisabled} aria-label="Opsi Workspace" aria-expanded={optionsOpen} aria-haspopup="dialog" aria-controls="workspace-composer-options" onClick={() => setOptionsOpen(value => !value)} className={`inline-flex h-8 items-center gap-1.5 rounded-lg px-2 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${optionsOpen ? 'relative z-50 bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-100' : 'text-slate-500 hover:bg-slate-200/70 dark:hover:bg-slate-800'}`}>
                <SlidersHorizontal className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Opsi</span>
              </button>
              {optionsOpen && <>
                <button type="button" className="fixed inset-0 z-30 cursor-default" aria-label="Tutup opsi composer" onClick={() => { setOptionsOpen(false); setAdvancedOpen(false); }} />
                <div id="workspace-composer-options" role="dialog" aria-label="Opsi Workspace" onKeyDown={event => { if (event.key === 'Escape') { event.preventDefault(); setOptionsOpen(false); setAdvancedOpen(false); } }} className="absolute bottom-full left-0 z-40 mb-2 w-[min(22rem,calc(100vw-2rem))] max-h-[min(65dvh,32rem)] overflow-y-auto rounded-xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-700 dark:bg-slate-900">
                  <div className="flex flex-wrap items-center gap-1 border-b border-slate-100 pb-2 dark:border-slate-800">
                    {allPresets && activePreset && onSelectPreset && onCreatePreset && onUpdatePreset && onDuplicatePreset && onDeletePreset && (
                      <WorkspacePresetSelector allPresets={allPresets} activePreset={activePreset} activePresetId={activePresetId || activePreset.id} summary={presetSummary || activePreset.name} isManualOverride={isManualModelOverride} disabled={isStreaming} onSelectPreset={onSelectPreset} onCreatePreset={onCreatePreset} onUpdatePreset={onUpdatePreset} onDuplicatePreset={onDuplicatePreset} onDeletePreset={onDeletePreset} onResetPersonalization={onResetPersonalization} />
                    )}
                    <button type="button" disabled={isStreaming} aria-pressed={compareMode} onClick={() => onCompareModeChange(!compareMode)} className={`h-8 rounded-lg px-2 text-xs font-medium transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${compareMode ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`} title={compareMode ? 'Kembali ke mode Normal' : 'Bandingkan jawaban dari beberapa model'}>{compareMode ? 'Compare aktif' : 'Compare'}</button>
                    <div className="relative shrink-0">
                      <button ref={advancedTriggerRef} type="button" aria-expanded={advancedOpen} aria-haspopup="dialog" onClick={() => setAdvancedOpen(value => !value)} className="h-8 rounded-lg px-2 text-xs text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500">Respons</button>
                      {advancedOpen && <>
                        <button type="button" className="fixed inset-0 z-30 cursor-default" aria-label="Tutup pengaturan respons" onClick={closeAdvanced} />
                        <div role="dialog" aria-label="Pengaturan respons dan konteks" onKeyDown={event => { if (event.key === 'Escape') { event.preventDefault(); closeAdvanced(); } }} className="fixed inset-x-2 bottom-20 z-40 w-auto rounded-xl border border-slate-200 bg-white p-3 shadow-xl dark:border-slate-700 dark:bg-slate-900 md:absolute md:inset-x-auto md:bottom-full md:left-0 md:mb-2 md:w-[min(18rem,calc(100vw-2rem))]">
                          <label className="block text-xs font-medium">Mode respons<select value={responseMode} onChange={event => setResponseMode(event.target.value as WorkspaceResponseMode)} className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-transparent px-2 dark:border-slate-700"><option>Ringkas</option><option>Seimbang</option><option>Mendalam</option></select></label>
                          <label className="mt-3 block text-xs font-medium">Gaya (opsional)<select value={responseStyle} onChange={event => setResponseStyle(event.target.value as WorkspaceResponseStyle)} className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-transparent px-2 dark:border-slate-700"><option value="Default">Default</option><option>Akademik</option><option>Langkah demi langkah</option><option>Formal</option></select></label>
                          <div className="mt-3 border-t border-slate-100 pt-2 text-[11px] text-slate-500 dark:border-slate-800"><div className="font-medium text-slate-600 dark:text-slate-300">Konteks sesi</div><div>{hasAttachments ? `${activeAttachments.length} dokumen · ${activeAttachments.slice(0, 2).map(attachment => attachment.name).join(', ')}${activeAttachments.length > 2 ? ', …' : ''}` : 'Tanpa dokumen'}</div><div>Percakapan ini · riwayat percakapan aktif</div></div>
                        </div>
                      </>}
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
                className="h-7 w-7 rounded-lg bg-rose-500 hover:bg-rose-600 text-white flex items-center justify-center transition-all cursor-pointer"
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
                className={`h-7 w-7 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
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
