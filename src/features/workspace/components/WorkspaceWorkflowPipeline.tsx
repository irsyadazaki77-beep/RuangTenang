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
  isContinuousRunning = false,
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
  const [internalCollapsed, setInternalCollapsed] = React.useState(false);
  const isCollapsed = controlledIsCollapsed ?? internalCollapsed;
  const toggleCollapse = controlledOnToggleCollapse ?? (() => setInternalCollapsed(prev => !prev));
  const hasFiles = uploadedFilesCount > 0;
  const hasDraft = Boolean(activeArtifact && activeArtifact.id !== 'welcome-canvas-doc');

  if (isCollapsed) {
    return (
      <div className="w-full shrink-0 border-b border-slate-200/70 bg-white/60 px-3 py-1 backdrop-blur-xs transition-all dark:border-slate-800/80 dark:bg-slate-950/30 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span className="flex h-1.5 w-1.5 rounded-full bg-indigo-500 animate-pulse" />
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
            {activePlanTitle ? `Alur: ${activePlanTitle}` : 'Alur Kerja RuangKerja'}
          </span>
          {hasFiles && <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded">{readyFilesCount} berkas</span>}
          {hasDraft && <span className="text-[10px] bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300 px-1.5 py-0.5 rounded">Draf aktif</span>}
        </div>
        <button
          type="button"
          onClick={toggleCollapse}
          className="inline-flex items-center gap-1 text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
        >
          <span>Tampilkan langkah</span>
          <ChevronDown className="h-3 w-3" />
        </button>
      </div>
    );
  }

  return (
    <div
      className="w-full shrink-0 border-b border-slate-200/70 bg-white/75 px-3 py-1.5 backdrop-blur-xs transition-all dark:border-slate-800/80 dark:bg-slate-950/45"
      role="region"
      aria-label="Alur Kerja Terintegrasi RuangKerja"
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-2">
        {/* Left Badge: Workflow Indicator */}
        <div className="flex items-center gap-1.5 shrink-0 text-[11px] font-semibold text-slate-700 dark:text-slate-300">
          <span className="flex h-2 w-2 rounded-full bg-indigo-500 animate-pulse" />
          <span className="hidden sm:inline font-mono text-[10px] uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
            {activePlanTitle ? activePlanTitle.slice(0, 20) : 'Workflow'}
          </span>
          <span className="hidden md:inline text-slate-400 dark:text-slate-600">•</span>
        </div>

        {/* Pipeline Steps Flow */}
        <div className="flex flex-1 items-center justify-center gap-1 sm:gap-2 overflow-x-auto py-0.5 text-xs">
          {/* Step 1: Upload Dokumen */}
          <button
            type="button"
            onClick={onUploadClick}
            className={`group inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
              hasFiles
                ? 'bg-indigo-50 text-indigo-800 border border-indigo-200/80 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800/60'
                : 'bg-white/80 text-slate-700 border border-slate-200 hover:border-indigo-300 dark:bg-slate-800/80 dark:text-slate-300 dark:border-slate-700'
            }`}
            title="Langkah 1: Unggah atau kelola dokumen referensi"
            aria-label="Langkah 1: Unggah Dokumen"
          >
            {hasFiles ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
            ) : (
              <UploadCloud className="h-3.5 w-3.5 text-slate-500 group-hover:text-indigo-600 dark:text-slate-400 dark:group-hover:text-indigo-400 shrink-0" />
            )}
            <span className="truncate max-w-[90px] sm:max-w-none">
              1. Unggah {readyFilesCount > 0 ? `(${readyFilesCount})` : ''}
            </span>
          </button>

          <ArrowRight className="h-3 w-3 text-slate-400 shrink-0 hidden sm:inline" />

          {/* Step 2: Analisis AI & Riset */}
          <button
            type="button"
            onClick={onAnalysisClick}
            className={`group inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 ${
              isAnalyzing
                ? 'bg-amber-50 text-amber-800 border border-amber-300 animate-pulse dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-700'
                : hasWaitingReview
                  ? 'bg-indigo-50 text-indigo-800 border border-indigo-300 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-700'
                  : hasFiles
                    ? 'bg-teal-50 text-teal-800 border border-teal-200/80 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800/60'
                    : 'bg-white/80 text-slate-600 border border-slate-200 hover:border-teal-300 dark:bg-slate-800/80 dark:text-slate-400 dark:border-slate-700'
            }`}
            title={hasWaitingReview ? "Tahap selesai: Memerlukan persetujuan pengguna untuk melanjutkan" : "Langkah 2: Analisis dokumen, perbandingan, atau riset web AI"}
            aria-label="Langkah 2: Analisis AI dan Riset"
          >
            <Sparkles className={`h-3.5 w-3.5 shrink-0 ${isAnalyzing ? 'text-amber-600 animate-spin' : hasWaitingReview ? 'text-indigo-600 dark:text-indigo-400' : 'text-teal-600 dark:text-teal-400'}`} />
            <span className="truncate max-w-[90px] sm:max-w-none">
              2. {isAnalyzing ? (isContinuousRunning ? 'Eksekusi beruntun…' : 'Menganalisis…') : hasWaitingReview ? 'Perlu Tinjauan' : 'Analisis'}
            </span>
          </button>

          <ArrowRight className="h-3 w-3 text-slate-400 shrink-0 hidden sm:inline" />

          {/* Step 3: Review Draf */}
          <button
            type="button"
            onClick={onCanvasClick}
            className={`group inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 ${
              isCanvasOpen
                ? 'bg-cyan-100/90 text-cyan-900 border border-cyan-300 shadow-2xs dark:bg-cyan-950/60 dark:text-cyan-200 dark:border-cyan-700'
                : hasDraft
                  ? 'bg-cyan-50 text-cyan-800 border border-cyan-200/80 dark:bg-cyan-950/40 dark:text-cyan-300 dark:border-cyan-800/60'
                  : 'bg-white/80 text-slate-600 border border-slate-200 hover:border-cyan-300 dark:bg-slate-800/80 dark:text-slate-400 dark:border-slate-700'
            }`}
            title="Langkah 3: Buka & tinjau hasil draft pada Canvas editor"
            aria-label="Langkah 3: Tinjau Draf"
          >
            <FileText className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400 shrink-0" />
            <span className="truncate max-w-[90px] sm:max-w-none">
              3. Draf {hasDraft ? '✓' : ''}
            </span>
          </button>

          <ArrowRight className="h-3 w-3 text-slate-400 shrink-0 hidden sm:inline" />

          {/* Step 4: Ekspor */}
          <button
            type="button"
            onClick={onExportClick}
            disabled={!hasDraft}
            className={`group inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
              hasDraft
                ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-xs hover:from-indigo-700 hover:to-blue-700 cursor-pointer active:scale-95'
                : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed dark:bg-slate-800 dark:text-slate-500 dark:border-slate-700'
            }`}
            title={hasDraft ? "Langkah 4: Ekspor siap ke DOCX, PPTX, atau XLSX" : "Selesaikan draf terlebih dahulu sebelum ekspor"}
            aria-label="Langkah 4: Ekspor Dokumen"
          >
            <Download className="h-3.5 w-3.5 shrink-0" />
            <span>4. Ekspor</span>
          </button>
        </div>

        {/* Right Toggle Button */}
        <button
          type="button"
          onClick={toggleCollapse}
          className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-200/50 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
          aria-label={isCollapsed ? "Tampilkan panel alur" : "Sembunyikan panel alur"}
          title={isCollapsed ? "Tampilkan alur kerja" : "Ciutkan alur kerja"}
        >
          {isCollapsed ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
        </button>
      </div>
    </div>
  );
});
