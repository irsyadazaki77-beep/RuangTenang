import React from 'react';
import {
  UploadCloud,
  Sparkles,
  FileText,
  Download,
  CheckCircle2,
  ArrowRight,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { WorkspaceArtifact } from '../types';

interface WorkspaceWorkflowPipelineProps {
  uploadedFilesCount: number;
  readyFilesCount: number;
  isAnalyzing: boolean;
  hasWaitingReview?: boolean;
  isContinuousRunning?: boolean;
  activePlanTitle?: string;
  activeArtifact: WorkspaceArtifact | null;
  isCanvasOpen: boolean;
  onUploadClick: () => void;
  onAnalysisClick: () => void;
  onCanvasClick: () => void;
  onExportClick: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const WorkspaceWorkflowPipeline: React.FC<WorkspaceWorkflowPipelineProps> = React.memo(({
  uploadedFilesCount,
  readyFilesCount,
  isAnalyzing,
  hasWaitingReview = false,
  isContinuousRunning: _isContinuousRunning = false,
  activePlanTitle,
  activeArtifact,
  isCanvasOpen,
  onUploadClick,
  onAnalysisClick,
  onCanvasClick,
  onExportClick,
  isCollapsed: controlledIsCollapsed,
  onToggleCollapse: controlledOnToggleCollapse
}) => {
  // Default to compact / collapsed mode so it stays out of the user's way like ChatGPT / Claude
  const [internalCollapsed, setInternalCollapsed] = React.useState(true);
  const isCollapsed = controlledIsCollapsed ?? internalCollapsed;
  const toggleCollapse = controlledOnToggleCollapse ?? (() => setInternalCollapsed(prev => !prev));
  const hasFiles = uploadedFilesCount > 0;
  const hasDraft = Boolean(activeArtifact && activeArtifact.id !== 'welcome-canvas-doc');

  if (isCollapsed) {
    return (
      <div className="w-full shrink-0 bg-transparent px-3 pt-1 flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 max-w-[80%] truncate">
          <span className={`flex h-1.5 w-1.5 rounded-full bg-indigo-500 shrink-0 ${isAnalyzing ? 'animate-pulse' : ''}`} />
          <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
            {activePlanTitle ? `Alur: ${activePlanTitle}` : isAnalyzing ? 'Sedang menganalisis...' : 'Alur Tugas'}
          </span>
          {hasFiles && (
            <span className="text-[10px] text-slate-500 dark:text-slate-400 shrink-0">
              · {readyFilesCount} berkas
            </span>
          )}
          {hasDraft && (
            <span className="text-[10px] text-indigo-600 dark:text-indigo-300 font-medium shrink-0">
              · Draf aktif
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={toggleCollapse}
          className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
        >
          <span>Langkah</span>
          <ChevronDown className="h-3 w-3" />
        </button>
      </div>
    );
  }

  return (
    <div
      className="w-full shrink-0 border-b border-slate-200/70 bg-white/90 px-3 py-1.5 backdrop-blur-md transition-all dark:border-white/5 dark:bg-[#15171c]/90"
      role="region"
      aria-label="Alur Kerja Terintegrasi RuangKerja"
    >
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 shrink-0 text-xs font-medium text-slate-600 dark:text-slate-300">
          <span className="flex h-2 w-2 rounded-full bg-indigo-500 animate-pulse" />
          <span className="hidden sm:inline text-xs font-semibold text-slate-800 dark:text-slate-200">
            {activePlanTitle ? activePlanTitle.slice(0, 24) : 'Alur Kerja'}
          </span>
        </div>

        {/* Pipeline Steps Flow: Sleek Pills */}
        <div className="flex flex-1 items-center justify-center gap-1 sm:gap-2 overflow-x-auto py-0.5 text-xs">
          {/* Step 1: Upload Dokumen */}
          <button
            type="button"
            onClick={onUploadClick}
            aria-label="Unggah Dokumen"
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer ${
              hasFiles
                ? 'bg-slate-100 text-slate-900 dark:bg-white/10 dark:text-slate-100 font-semibold'
                : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/5'
            }`}
          >
            {hasFiles ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            ) : (
              <UploadCloud className="h-3.5 w-3.5 shrink-0" />
            )}
            <span>1. Unggah {readyFilesCount > 0 ? `(${readyFilesCount})` : ''}</span>
          </button>

          <ArrowRight className="h-3 w-3 text-slate-300 dark:text-slate-600 shrink-0 hidden sm:inline" />

          {/* Step 2: Analisis */}
          <button
            type="button"
            onClick={onAnalysisClick}
            aria-label="Analisis AI"
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer ${
              isAnalyzing
                ? 'bg-amber-100/70 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300 animate-pulse'
                : hasWaitingReview
                ? 'bg-indigo-100 text-indigo-900 dark:bg-indigo-950 dark:text-indigo-300'
                : hasFiles
                ? 'bg-slate-100 text-slate-900 dark:bg-white/10 dark:text-slate-100'
                : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/5'
            }`}
          >
            <Sparkles className={`h-3.5 w-3.5 shrink-0 ${isAnalyzing ? 'animate-spin text-amber-600' : ''}`} />
            <span>2. {isAnalyzing ? 'Menganalisis…' : hasWaitingReview ? 'Perlu Tinjauan' : 'Analisis'}</span>
          </button>

          <ArrowRight className="h-3 w-3 text-slate-300 dark:text-slate-600 shrink-0 hidden sm:inline" />

          {/* Step 3: Draf */}
          <button
            type="button"
            onClick={onCanvasClick}
            aria-label="Tinjau Draf"
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer ${
              isCanvasOpen
                ? 'bg-indigo-100 text-indigo-900 dark:bg-indigo-950 dark:text-indigo-200 font-semibold'
                : hasDraft
                ? 'bg-slate-100 text-slate-900 dark:bg-white/10 dark:text-slate-100'
                : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/5'
            }`}
          >
            <FileText className="h-3.5 w-3.5 shrink-0 text-indigo-500" />
            <span>3. Draf {hasDraft ? '✓' : ''}</span>
          </button>

          <ArrowRight className="h-3 w-3 text-slate-300 dark:text-slate-600 shrink-0 hidden sm:inline" />

          {/* Step 4: Ekspor */}
          <button
            type="button"
            onClick={onExportClick}
            disabled={!hasDraft}
            aria-label="Ekspor Dokumen"
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
              hasDraft
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 hover:opacity-90 cursor-pointer shadow-xs'
                : 'text-slate-300 dark:text-slate-600 cursor-not-allowed'
            }`}
          >
            <Download className="h-3.5 w-3.5 shrink-0" />
            <span>4. Ekspor</span>
          </button>
        </div>

        {/* Right Toggle Button */}
        <button
          type="button"
          onClick={toggleCollapse}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-slate-200 transition-colors cursor-pointer"
          aria-label={isCollapsed ? "Tampilkan panel alur" : "Ciutkan alur kerja"}
        >
          {isCollapsed ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
        </button>
      </div>
    </div>
  );
});
