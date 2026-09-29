import React, { useRef, useEffect } from 'react';
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
import { WorkspaceFileAttachment, AcademicPromptPill } from '../types';
import { DistressDetectionResult } from '../utils/distressDetector';
import { AcademicDistressBanner } from './AcademicDistressBanner';

interface WorkspaceComposerProps {
  inputText: string;
  setInputText: (text: string) => void;
  attachedFile: WorkspaceFileAttachment | null;
  isStreaming: boolean;
  distressResult: DistressDetectionResult;
  isDistressDismissed: boolean;
  promptPills: AcademicPromptPill[];
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onSendMessage: (text: string, attachments?: any[]) => void;
  onAbortStream: () => void;
  onOpenTemplateGallery: () => void;
  onRemoveAttachedFile: () => void;
  onFileUploadChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onOpenBreathing: () => void;
  onSwitchToRuangTenang: () => void;
  onDismissDistress: () => void;
}

export const WorkspaceComposer: React.FC<WorkspaceComposerProps> = React.memo(({
  inputText,
  setInputText,
  attachedFile,
  isStreaming,
  distressResult,
  isDistressDismissed,
  promptPills,
  fileInputRef,
  onSendMessage,
  onAbortStream,
  onOpenTemplateGallery,
  onRemoveAttachedFile,
  onFileUploadChange,
  onOpenBreathing,
  onSwitchToRuangTenang,
  onDismissDistress
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
      if (currentAttachment.status !== 'ready') return;
      prompt = `Mohon telaah dan analisis dokumen "${currentAttachment.name}" ini secara mendalam.`;
    }

    const attachmentsToSend = currentAttachment && currentAttachment.id ? [{
      id: currentAttachment.id,
      filename: currentAttachment.name,
      mimeType: currentAttachment.mimeType,
      size: currentAttachment.size
    }] : undefined;

    onSendMessage(prompt, attachmentsToSend);
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
          {promptPills.map((pill, idx) => (
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
        {/* Attached File Chip with Format-Aware Status */}
        {attachedFile && (
          <div className="flex items-center gap-2 mb-1.5 px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-200 animate-fade-in">
            {getFormatIcon(attachedFile.fileKind, attachedFile.mimeType)}
            <span className="truncate max-w-[200px] font-medium" title={attachedFile.name}>
              {attachedFile.name}
            </span>
            
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
            {attachedFile.status === 'failed' && (
              <span className="flex items-center gap-1 text-[11px] text-rose-600 dark:text-rose-400 font-medium ml-auto">
                <AlertCircle className="w-3 h-3" />
                <span>Gagal</span>
              </span>
            )}

            <button
              type="button"
              onClick={onRemoveAttachedFile}
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
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="Tanyakan tugas akademik, format sitasi, atau tempel draf/kode..."
          rows={1}
          className="w-full text-xs sm:text-sm px-1 py-1 bg-transparent text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none resize-none leading-relaxed min-h-[40px]"
        />

        {/* Action Bar Inside Composer */}
        <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 dark:border-slate-800">
          {/* Left Controls: Attach & Template */}
          <div className="flex items-center gap-1">
            <input
              type="file"
              ref={fileInputRef}
              onChange={onFileUploadChange}
              accept=".txt,.md,.pdf,.docx,.py,.js,.ts,.java,.cpp,.c,.json,.csv,.sql"
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="h-7 px-2 rounded-md text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer text-xs font-medium flex items-center gap-1"
              title="Lampirkan dokumen atau kode"
            >
              <Paperclip className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Lampirkan</span>
            </button>

            <button
              type="button"
              onClick={onOpenTemplateGallery}
              className="h-7 px-2 rounded-md text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors text-xs font-medium cursor-pointer flex items-center gap-1"
              title="Buka Galeri Template"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Template</span>
            </button>
          </div>

          {/* Right Controls: Enter Hint & Send */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-400 font-sans hidden sm:inline select-none">
              Enter ↵
            </span>

            {isStreaming ? (
              <button
                type="button"
                onClick={onAbortStream}
                className="h-7 w-7 rounded-lg bg-rose-500 hover:bg-rose-600 text-white flex items-center justify-center transition-all cursor-pointer"
                title="Hentikan respons"
                aria-label="Hentikan"
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
                  (attachedFile?.status === 'failed' && !inputText.trim())
                }
                className={`h-7 w-7 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                  (inputText.trim() || (attachedFile && attachedFile.status === 'ready')) &&
                  attachedFile?.status !== 'uploading' &&
                  attachedFile?.status !== 'processing'
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
