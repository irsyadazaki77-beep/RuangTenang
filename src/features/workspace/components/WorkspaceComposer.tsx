import React, { useRef, useEffect, useState } from 'react';
import { 
  FileText, 
  FileSpreadsheet, 
  Presentation, 
  FileCode, 
  Image as ImageIcon, 
  X, 
  Paperclip, 
  Sparkles, 
  StopCircle, 
  Send,
  CheckCircle2,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { WorkspaceFileAttachment, AcademicPromptPill, WorkspaceComposerConfig, WorkspaceResponseMode, WorkspaceResponseStyle } from '../types';
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
  onSelectTool?: (tool: WorkspaceToolDefinition) => void;
  inputText: string;
  setInputText: (text: string) => void;
  attachedFile: WorkspaceFileAttachment | null;
  isStreaming: boolean;
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
  onSelectTool,
  inputText,
  setInputText,
  attachedFile,
  isStreaming,
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [responseMode, setResponseMode] = useState<WorkspaceResponseMode>(activePreset?.responseMode || 'Seimbang');
  const [responseStyle, setResponseStyle] = useState<WorkspaceResponseStyle>(activePreset?.responseStyle || 'Default');

  // Sync mode and style when active preset changes
  useEffect(() => {
    if (activePreset?.responseMode) setResponseMode(activePreset.responseMode);
    if (activePreset?.responseStyle) setResponseStyle(activePreset.responseStyle);
  }, [activePreset?.id, activePreset?.responseMode, activePreset?.responseStyle]);
  const [advancedOpen, setAdvancedOpen] = useState(false);
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
    const currentAttachment = attachedFile;
    if (!prompt && !currentAttachment) return;

    // If there is an attachment but it's not ready, don't allow sending
    if (currentAttachment && (currentAttachment.status === 'uploading' || currentAttachment.status === 'processing')) {
      return;
    }

    if (!prompt && currentAttachment) {
      if (currentAttachment.status !== 'ready' || !currentAttachment.id) return;
      prompt = `Mohon telaah dan analisis dokumen "${currentAttachment.name}" ini secara mendalam.`;
    }

    const attachmentsToSend: StoredAttachment[] | undefined = currentAttachment && currentAttachment.id ? [{
      id: currentAttachment.id,
      filename: currentAttachment.name,
      mimeType: currentAttachment.mimeType,
      size: currentAttachment.size ?? 0,
      url: currentAttachment.url
    }] : undefined;

    if (compareMode && selectedCompareModels.length < 2) return;
    if (compareMode && attachmentsToSend?.length) return;

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
    onRemoveAttachedFile();
    setInputText('');
  };

  const getFormatIcon = (kind?: string, mime?: string) => {
    if (kind === 'xlsx' || mime?.includes('spreadsheet')) {
      return <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />;
    }
    if (kind === 'pptx' || mime?.includes('presentation')) {
      return <Presentation className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />;
    }
    if (kind === 'code' || kind === 'json' || kind === 'csv') {
      return <FileCode className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />;
    }
    if (kind === 'image' || mime?.startsWith('image/')) {
      return <ImageIcon className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 shrink-0" />;
    }
    return <FileText className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 shrink-0" />;
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
      <div className="relative w-full mb-1.5 overflow-hidden">
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5 text-xs text-slate-500">
          <span className="shrink-0 font-medium select-none pr-1 text-[11px]">Coba:</span>
          {promptPills.slice(0, 5).map((pill, idx) => (
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
        {/* Attached File Chip with Format-Aware Status */}
        {attachedFile && (
          <div aria-live="polite" className="flex items-center gap-2 mb-1.5 px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-200 animate-fade-in min-w-0 max-w-full overflow-hidden">
            {getFormatIcon(attachedFile.fileKind, attachedFile.mimeType)}
            <span className="truncate min-w-0 max-w-[200px] font-medium" title={attachedFile.name}>
              {attachedFile.name}
            </span>
            {typeof attachedFile.size === 'number' && (
              <span className="shrink-0 text-[10px] text-slate-400">
                {attachedFile.size < 1024 * 1024
                  ? `${Math.max(1, Math.round(attachedFile.size / 1024))} KB`
                  : `${(attachedFile.size / (1024 * 1024)).toFixed(1)} MB`}
              </span>
            )}
            
            {/* Status indicator */}
            {attachedFile.status === 'uploading' && (
              <span className="flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400 font-normal ml-auto">
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>Mengunggah...</span>
              </span>
            )}
            {attachedFile.status === 'processing' && (
              <span className="flex items-center gap-1 text-[11px] text-blue-600 dark:text-blue-400 font-normal ml-auto">
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>Memproses...</span>
              </span>
            )}
            {attachedFile.status === 'ready' && (
              <span className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium ml-auto">
                <CheckCircle2 className="w-3 h-3" />
                <span>
                  {attachedFile.pageCount 
                    ? `${attachedFile.pageCount} hal` 
                    : attachedFile.slideCount 
                      ? `${attachedFile.slideCount} slide` 
                      : attachedFile.sheetCount 
                        ? `${attachedFile.sheetCount} sheet` 
                        : 'Siap'}
                </span>
              </span>
            )}
            {(attachedFile.status === 'failed' || attachedFile.status === 'error') && (
              <span className="flex items-center gap-1 text-[11px] text-rose-600 dark:text-rose-400 font-medium ml-auto">
                <AlertCircle className="w-3 h-3" />
                <span title={attachedFile.errorMessage || 'Dokumen belum selesai diproses. Coba pilih file lagi.'}>Gagal</span>
              </span>
            )}

            <button
              type="button"
              onClick={onRemoveAttachedFile}
              disabled={isStreaming}
              className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer ml-1"
              title="Hapus lampiran"
              aria-label="Hapus lampiran dokumen"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

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
          maxLength={maxInputLength}
          className="w-full max-h-40 overflow-y-auto text-xs sm:text-sm px-1 py-1 bg-transparent text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none resize-none leading-relaxed min-h-[40px]"
        />
        {(inputFocused || inputText.length >= maxInputLength * 0.8) && inputText.length > 0 && (
          <div className={`px-1 pb-1 text-right text-[10px] ${inputText.length >= maxInputLength * 0.9 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'}`} aria-live="polite">{inputText.length.toLocaleString('id-ID')} / {maxInputLength.toLocaleString('id-ID')}</div>
        )}

        {/* Action Bar Inside Composer */}
        <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 dark:border-slate-800">
          {/* Left Controls: Preset, Model, Mode/Style, Attach, Template */}
          <div className="flex min-w-0 items-center gap-1 overflow-x-auto no-scrollbar">
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
            {compareMode ? (
              <WorkspaceCompareModelSelector selectedModelIds={selectedCompareModels} onChange={onCompareModelsChange} disabled={isStreaming} hasAttachment={Boolean(attachedFile)} />
            ) : <WorkspaceModelSelector value={selectedModel} onChange={onModelChange} disabled={isStreaming} />}
            <button type="button" disabled={isStreaming} aria-pressed={compareMode} onClick={() => onCompareModeChange(!compareMode)} className={`h-8 rounded-lg px-2 text-xs font-medium transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${compareMode ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' : 'text-slate-500 hover:bg-slate-200/70 dark:hover:bg-slate-800'}`} title={compareMode ? 'Kembali ke mode Normal' : 'Aktifkan mode Compare'} aria-label={compareMode ? 'Nonaktifkan mode Compare' : 'Aktifkan mode Compare'}>{compareMode ? 'Keluar' : 'Normal'}</button>
            <div className="relative shrink-0">
              <button ref={advancedTriggerRef} type="button" aria-expanded={advancedOpen} aria-haspopup="dialog" onClick={() => setAdvancedOpen(value => !value)} className="h-9 rounded-lg px-2 text-xs text-slate-500 hover:bg-slate-200/70 dark:hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500">Mode · Gaya</button>
              {advancedOpen && <>
                <button type="button" className="fixed inset-0 z-30 cursor-default" aria-label="Tutup pengaturan respons" onClick={closeAdvanced} />
                <div role="dialog" aria-label="Pengaturan respons dan konteks" onKeyDown={event => { if (event.key === 'Escape') { event.preventDefault(); closeAdvanced(); } }} className="fixed inset-x-2 bottom-20 z-40 w-auto rounded-xl border border-slate-200 bg-white p-3 shadow-xl dark:border-slate-700 dark:bg-slate-900 md:absolute md:inset-x-auto md:bottom-full md:left-0 md:mb-2 md:w-[min(18rem,calc(100vw-2rem))]">
                  <label className="block text-xs font-medium">Mode respons
                    <select value={responseMode} onChange={event => setResponseMode(event.target.value as WorkspaceResponseMode)} className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-transparent px-2 dark:border-slate-700">
                      <option>Ringkas</option><option>Seimbang</option><option>Mendalam</option>
                    </select>
                  </label>
                  <label className="mt-3 block text-xs font-medium">Gaya (opsional)
                    <select value={responseStyle} onChange={event => setResponseStyle(event.target.value as WorkspaceResponseStyle)} className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-transparent px-2 dark:border-slate-700">
                      <option value="Default">Default</option><option>Akademik</option><option>Langkah demi langkah</option><option>Formal</option>
                    </select>
                  </label>
                  <div className="mt-3 border-t border-slate-100 pt-2 text-[11px] text-slate-500 dark:border-slate-800">
                    <div className="font-medium text-slate-600 dark:text-slate-300">Konteks sesi</div>
                    <div>{attachedFile ? `1 lampiran · ${attachedFile.name}` : 'Tanpa lampiran'}</div>
                    <div>Percakapan ini · riwayat percakapan aktif</div>
                  </div>
                </div>
              </>}
            </div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={onFileUploadChange}
              disabled={isStreaming}
              accept=".txt,.md,.pdf,.docx,.py,.js,.ts,.java,.cpp,.c,.json,.csv,.sql"
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isStreaming}
              className="h-7 px-2 rounded-md text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer text-xs font-medium flex items-center gap-1"
              title="Lampirkan dokumen atau kode"
              aria-label="Lampirkan dokumen atau kode"
            >
              <Paperclip className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Lampirkan</span>
            </button>

            <button
              type="button"
              onClick={onOpenTemplateGallery}
              className="h-7 px-2 rounded-md text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors text-xs font-medium cursor-pointer flex items-center gap-1"
              title="Buka Galeri Template"
              aria-label="Template"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span className="hidden sm:inline">Template</span>
            </button>

            {/* Workspace Tool Selector Shortcut */}
            {onSelectTool && (
              <WorkspaceToolSelector
                artifactType={activeArtifactType}
                hasArtifact={Boolean(activeArtifactType)}
                disabled={isStreaming || compareMode}
                onSelectTool={onSelectTool}
                triggerVariant="composer"
              />
            )}
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
                  (!inputText.trim() && !attachedFile) ||
                  (attachedFile?.status === 'uploading') ||
                  (attachedFile?.status === 'processing') ||
                  (attachedFile?.status === 'ready' && !attachedFile.id) ||
                  (attachedFile?.status === 'failed' && !inputText.trim()) ||
                  (compareMode && (selectedCompareModels.length < 2 || Boolean(attachedFile)))
                }
                className={`h-7 w-7 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                  (inputText.trim() || (attachedFile && attachedFile.status === 'ready')) &&
                  attachedFile?.status !== 'uploading' &&
                  attachedFile?.status !== 'processing' &&
                  !(attachedFile?.status === 'ready' && !attachedFile.id)
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
