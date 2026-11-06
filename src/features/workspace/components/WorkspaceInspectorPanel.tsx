import React from 'react';
import { Bookmark, FileText, Sparkles, X } from 'lucide-react';
import type { WorkspaceInspector } from '../hooks/workspaceViewState';
import type { WorkspaceChapterScope, WorkspaceFileAttachment } from '../types';
import { CHAPTER_SCOPE_LABELS } from '../utils/workspaceContext';
import type { WorkspacePlan } from '../../../../shared/contracts/workspace';
import type { FileSourceReference } from '../../../../shared/contracts/files';
import { WorkspaceSourcePreview } from './WorkspaceSourcePreview';
import { WorkspaceSourceLibrary } from './WorkspaceSourceLibrary';
import { WorkspaceTasksPanel } from './WorkspaceTasksPanel';

const WorkspaceMemorySection = React.lazy(() =>
  import('./WorkspaceMemorySection').then(module => ({ default: module.WorkspaceMemorySection }))
);

const CHAPTER_SCOPES: WorkspaceChapterScope[] = ['ALL', 'BAB_1', 'BAB_2', 'BAB_3', 'BAB_4', 'BAB_5', 'LAMPIRAN'];

export interface WorkspaceInspectorPanelProps {
  isOpen: boolean;
  activeInspectorTab: 'context' | 'files' | 'sources' | 'memory' | 'plan';
  onSelectTab: (tab: Exclude<WorkspaceInspector, 'closed' | 'canvas'>) => void;
  onClose: () => void;
  isExpanded?: boolean;
  // Context state & callbacks
  selectedReadyWorkspaceFileCount: number;
  includeCanvasInContext: boolean;
  onToggleIncludeCanvasInContext: (include: boolean) => void;
  visibleActiveArtifactTitle?: string;
  selectedText?: string;
  workspaceInstructions?: string;
  isInstructionsEditing: boolean;
  onToggleInstructionsEditing: () => void;
  instructionsDraft: string;
  onChangeInstructionsDraft: (draft: string) => void;
  onSaveInstructions: () => Promise<void> | void;
  isInstructionsSaving: boolean;
  canEditInstructions: boolean;
  workspaceMetadataError?: string | null;
  // Files state & callbacks
  workspaceAttachments: WorkspaceFileAttachment[];
  isLoadingAttachments: boolean;
  selectedWorkspaceFileIds: string[];
  includeFilesInContext: boolean;
  onToggleIncludeFilesInContext: (include: boolean) => void;
  onSelectFileCheckbox: (fileId: string, checked: boolean) => void;
  onOpenFilePreview: (fileId: string) => void;
  onAddFileClick: () => void;
  // Sources state & callbacks
  selectedSource: FileSourceReference | null;
  onClearSelectedSource: () => void;
  chatId?: string;
  // Plan state & callbacks
  workspacePlan: WorkspacePlan | null;
  logicalWorkspaceIdentity: string;
  isPlanLoading: boolean;
  canPersistPlan: boolean;
  isTaskGenerating: boolean;
  isPlanExecuting: boolean;
  allowExternalSearch: boolean;
  onAllowExternalSearchChange: (allowed: boolean) => void;
  isStoppingTask?: boolean;
  isContinuousRunning: boolean;
  onStartContinuous: () => void;
  onStopContinuous: () => void;
  onOpenArtifact: (artifactId: string) => void;
  onPreviewProposal?: (taskId: string, proposal: NonNullable<WorkspacePlan['tasks'][number]['artifactProposal']>) => void;
  onOpenSource: (source: { documentId: string }) => void;
  onAcceptTaskReview: (taskId: string) => void;
  onRejectTaskReview: (taskId: string) => void;
  onUpdatePlan: (plan: WorkspacePlan) => Promise<unknown>;
  onPauseWorkflow: () => void;
  onResumeWorkflow: () => void;
  onRecoverTask: (taskId: string, executionId: string) => void;
  onTaskModelChange: (taskId: string, modelId: string | null) => void;
  onRunTask: (taskId: string, feedback?: string) => void;
  onGenerateTasks: (goal: string) => void;
  onCancelWorkflow: () => void;
  onStopTask: () => void;
  onCompleteWorkflow: () => void;
  focusedTaskId?: string;
  // Memory & Chapter Scope state
  canPersistMemory: boolean;
  activeChapterScope?: WorkspaceChapterScope;
  onChangeChapterScope?: (scope: WorkspaceChapterScope) => void;
}

export const WorkspaceInspectorPanel: React.FC<WorkspaceInspectorPanelProps> = React.memo(({
  isOpen,
  activeInspectorTab,
  onSelectTab,
  onClose,
  isExpanded = false,
  selectedReadyWorkspaceFileCount,
  includeCanvasInContext,
  onToggleIncludeCanvasInContext,
  visibleActiveArtifactTitle,
  selectedText = '',
  workspaceInstructions,
  isInstructionsEditing,
  onToggleInstructionsEditing,
  instructionsDraft,
  onChangeInstructionsDraft,
  onSaveInstructions,
  isInstructionsSaving,
  canEditInstructions,
  workspaceMetadataError,
  workspaceAttachments,
  isLoadingAttachments,
  selectedWorkspaceFileIds,
  includeFilesInContext,
  onToggleIncludeFilesInContext,
  onSelectFileCheckbox,
  onOpenFilePreview,
  onAddFileClick,
  selectedSource,
  onClearSelectedSource,
  chatId,
  workspacePlan,
  logicalWorkspaceIdentity,
  isPlanLoading,
  canPersistPlan,
  isTaskGenerating,
  isPlanExecuting,
  allowExternalSearch,
  onAllowExternalSearchChange,
  isStoppingTask = false,
  isContinuousRunning,
  onStartContinuous,
  onStopContinuous,
  onOpenArtifact,
  onPreviewProposal,
  onOpenSource,
  onAcceptTaskReview,
  onRejectTaskReview,
  onUpdatePlan,
  onPauseWorkflow,
  onResumeWorkflow,
  onRecoverTask,
  onTaskModelChange,
  onRunTask,
  onGenerateTasks,
  onCancelWorkflow,
  onStopTask,
  onCompleteWorkflow,
  focusedTaskId,
  canPersistMemory,
  activeChapterScope = 'ALL',
  onChangeChapterScope
}) => {
  if (!isOpen) return null;

  return (
    <aside
      aria-label="Panel RuangKerja"
      className={`flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-white/80 dark:bg-slate-950/80 backdrop-blur-md xl:border-l xl:border-slate-200/80 xl:dark:border-slate-800 ${
        activeInspectorTab === 'sources'
          ? 'absolute inset-x-0 bottom-0 z-40 h-[min(65dvh,36rem)] rounded-t-2xl shadow-2xl xl:relative xl:inset-auto xl:z-auto xl:h-auto xl:rounded-none xl:shadow-none'
          : ''
      } ${isExpanded ? 'xl:flex-1' : 'xl:flex-[0_0_46%] 2xl:flex-[0_0_48%]'}`}
    >
      <div className="flex h-10 shrink-0 items-center justify-between border-b border-slate-200/80 px-3 dark:border-slate-800">
        <div className="flex h-full min-w-0 items-center gap-1 overflow-x-auto" role="tablist" aria-label="Panel Workspace">
          <button
            type="button"
            role="tab"
            aria-selected={activeInspectorTab === 'context'}
            onClick={() => onSelectTab('context')}
            className={`inline-flex min-h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-semibold transition-colors ${
              activeInspectorTab === 'context'
                ? 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Sparkles className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
            Konteks
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeInspectorTab === 'files' || activeInspectorTab === 'sources'}
            onClick={() => onSelectTab('files')}
            className={`min-h-8 rounded-md px-2.5 text-xs font-semibold transition-colors ${
              activeInspectorTab === 'files' || activeInspectorTab === 'sources'
                ? 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            File{workspaceAttachments.length > 0 && <span className="ml-1 text-[10px] text-slate-500">({workspaceAttachments.length})</span>}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeInspectorTab === 'memory'}
            onClick={() => onSelectTab('memory')}
            className={`inline-flex min-h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-semibold transition-colors ${
              activeInspectorTab === 'memory'
                ? 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Bookmark className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
            Memori
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeInspectorTab === 'plan'}
            onClick={() => onSelectTab('plan')}
            className={`min-h-8 rounded-md px-2.5 text-xs font-semibold transition-colors ${
              activeInspectorTab === 'plan'
                ? 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Rencana
            {workspacePlan?.tasks.some(task => task.status === 'running' || task.status === 'waiting_review') && (
              <span className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-amber-500" />
            )}
          </button>
        </div>
        <button
          type="button"
          aria-label="Tutup panel"
          onClick={onClose}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:hover:bg-slate-800"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      {(activeInspectorTab === 'files' || activeInspectorTab === 'sources') && (
        <div className="flex h-10 shrink-0 items-center gap-1 border-b border-slate-100 px-3 dark:border-slate-800" role="group" aria-label="Jenis referensi">
          <button type="button" aria-pressed={activeInspectorTab === 'files'} onClick={() => onSelectTab('files')} className={`min-h-8 rounded-md px-3 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${activeInspectorTab === 'files' ? 'bg-indigo-50 text-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-200' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-900'}`}>
            File
          </button>
          <button type="button" aria-pressed={activeInspectorTab === 'sources'} onClick={() => onSelectTab('sources')} className={`min-h-8 rounded-md px-3 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${activeInspectorTab === 'sources' ? 'bg-indigo-50 text-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-200' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-900'}`}>
            Sumber
          </button>
          <span className="ml-auto text-[10px] text-slate-500">File & sumber</span>
        </div>
      )}

      {activeInspectorTab === 'context' ? (
        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3" role="tabpanel" aria-label="Konteks Workspace">
          <p className="mb-3 text-[11px] text-slate-500">Instruksi Workspace, fokus bab, dan konteks terpilih dikirim bersama permintaan ke model aktif; pola data pribadi yang dikenali aplikasi disamarkan. Konteks ini tidak ditambahkan sebagai isi pesan di riwayat chat. File dan Canvas hanya dikirim jika siap dan diaktifkan.</p>
          <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
            <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">Konteks aktif</p>
            <p className="mt-1 text-[11px] text-slate-500">
              {selectedReadyWorkspaceFileCount} dokumen siap · {includeCanvasInContext && visibleActiveArtifactTitle ? visibleActiveArtifactTitle : 'Canvas tidak disertakan'} · {selectedText.trim() ? 'teks dipilih disertakan' : 'tanpa teks terpilih'}
            </p>
            {onChangeChapterScope && (
              <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Fokus Sub-Dokumen / Bab (Isolasi Konteks Bab):
                </p>
                <div className="flex flex-wrap gap-1">
                  {CHAPTER_SCOPES.map(scope => {
                    const isActive = activeChapterScope === scope;
                    return (
                      <button
                        key={scope}
                        type="button"
                        aria-pressed={isActive}
                        onClick={() => onChangeChapterScope(scope)}
                        className={`px-2 py-0.5 rounded-md text-[10.5px] font-medium transition-colors cursor-pointer ${
                          isActive
                            ? 'bg-emerald-600 text-white font-semibold'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                        }`}
                      >
                        {CHAPTER_SCOPE_LABELS[scope].shortLabel}
                      </button>
                    );
                  })}
                </div>
                {activeChapterScope !== 'ALL' && (
                  <p className="mt-1.5 text-[10px] text-emerald-700 dark:text-emerald-300">
                    Aktif: {CHAPTER_SCOPE_LABELS[activeChapterScope].fullLabel}
                  </p>
                )}
              </div>
            )}
            <button
              type="button"
              onClick={() => onSelectTab('files')}
              className="mt-2 min-h-8 rounded-md px-2 text-[11px] font-semibold text-indigo-800 hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-indigo-200 dark:hover:bg-indigo-950/40"
            >
              Kelola file konteks
            </button>
          </div>
          <label className="flex items-center gap-2 border-b border-slate-100 py-3 text-xs font-medium text-slate-700 dark:border-slate-800 dark:text-slate-200">
            <input
              type="checkbox"
              checked={includeCanvasInContext}
              onChange={event => onToggleIncludeCanvasInContext(event.target.checked)}
              className="accent-indigo-600"
            />
            Gunakan Canvas aktif <span className="ml-auto max-w-[55%] truncate text-[10px] font-normal text-slate-500">{visibleActiveArtifactTitle || 'Belum ada Canvas'}</span>
          </label>
          <div className="mt-4 border-t border-slate-100 pt-3 dark:border-slate-800">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">Instruksi Workspace</p>
                <p className="mt-1 text-[11px] text-slate-500">{workspaceInstructions || 'Belum ada instruksi khusus.'}</p>
              </div>
              <button
                type="button"
                disabled={!canEditInstructions}
                onClick={onToggleInstructionsEditing}
                className="shrink-0 rounded-md px-2 py-1 text-[11px] font-semibold text-indigo-700 hover:bg-indigo-50 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-indigo-300 dark:hover:bg-indigo-950"
              >
                {isInstructionsEditing ? 'Batal' : 'Ubah'}
              </button>
            </div>
            {isInstructionsEditing && (
              <div className="mt-2 grid gap-2">
                <textarea
                  value={instructionsDraft}
                  onChange={event => onChangeInstructionsDraft(event.target.value.slice(0, 4000))}
                  maxLength={4000}
                  rows={4}
                  aria-label="Instruksi Workspace"
                  placeholder="Contoh: Gunakan IEEE dan bahasa Indonesia formal."
                  className="w-full resize-y rounded-md border border-slate-200 bg-white p-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-slate-700 dark:bg-slate-950"
                />
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-500">{instructionsDraft.length}/4000</span>
                  <button
                    type="button"
                    disabled={isInstructionsSaving}
                    onClick={() => void onSaveInstructions()}
                    className="rounded-md bg-indigo-600 hover:bg-indigo-700 px-2.5 py-1.5 text-[11px] font-semibold text-white disabled:opacity-50"
                  >
                    {isInstructionsSaving ? 'Menyimpan…' : 'Simpan'}
                  </button>
                </div>
              </div>
            )}
          </div>
          {workspaceMetadataError && <p role="status" className="mt-3 text-[11px] text-amber-700 dark:text-amber-300">{workspaceMetadataError}</p>}
        </div>
      ) : activeInspectorTab === 'files' ? (
        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3" role="tabpanel" aria-label="File Workspace">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xs font-semibold text-slate-800 dark:text-slate-100">Dokumen konteks</h2>
              <p className="mt-1 text-[11px] text-slate-500">File hanya digunakan setelah statusnya Siap dan disertakan.</p>
            </div>
            <button
              type="button"
              onClick={onAddFileClick}
              className="min-h-9 shrink-0 rounded-lg bg-indigo-600 hover:bg-indigo-700 px-3 text-[11px] font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
              Tambah file
            </button>
          </div>
          {isLoadingAttachments ? (
            <p role="status" className="rounded-lg border border-slate-200 px-3 py-5 text-center text-xs text-slate-500 dark:border-slate-700">Memuat dokumen Workspace…</p>
          ) : workspaceAttachments.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-300 px-4 py-6 text-center dark:border-slate-700">
              <p className="text-xs font-medium text-slate-700 dark:text-slate-200">Belum ada dokumen</p>
              <p className="mt-1 text-[11px] text-slate-500">Tambahkan file untuk dianalisis bersama AI.</p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {workspaceAttachments.map(file => {
                const ready = file.status === 'ready' && Boolean(file.id);
                const status = file.status === 'ready' ? 'Siap' : file.status === 'uploading' ? 'Mengunggah…' : file.status === 'processing' ? 'Memproses…' : file.status === 'unsupported' ? 'Tidak didukung' : 'Gagal';
                return (
                  <li key={file.id || file.clientId || file.name} className="flex min-w-0 items-center gap-2 py-2.5">
                    <input
                      type="checkbox"
                      aria-label={`Gunakan ${file.name} sebagai konteks`}
                      disabled={!ready}
                      checked={ready && selectedWorkspaceFileIds.includes(file.id!)}
                      onChange={event => onSelectFileCheckbox(file.id!, event.target.checked)}
                      className="accent-indigo-600 disabled:opacity-40"
                    />
                    <FileText className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-200">
                        <span className="truncate">{file.name}</span>
                        {file.ocrApplied && (
                          <span className="shrink-0 rounded bg-emerald-100 px-1 py-0.2 text-[9px] font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                            OCR
                          </span>
                        )}
                        {file.visualAnalysisAvailable && !file.ocrApplied && (
                          <span className="shrink-0 rounded bg-sky-100 px-1 py-0.2 text-[9px] font-semibold text-sky-800 dark:bg-sky-950 dark:text-sky-300">
                            Visual
                          </span>
                        )}
                      </span>
                      <span className={`text-[10px] ${ready ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-500'}`}>
                        {status}
                        {file.status === 'ready' && includeFilesInContext ? (selectedWorkspaceFileIds.includes(file.id!) ? ' · Disertakan' : ' · Tidak disertakan') : ''}
                        {file.status === 'ready' && !includeFilesInContext ? ' · Konteks dinonaktifkan' : ''}
                        {file.errorMessage ? ` · ${file.errorMessage}` : ''}
                      </span>
                    </span>
                    {ready && (
                      <button
                        type="button"
                        aria-label={`Pratinjau ${file.name}`}
                        onClick={() => onOpenFilePreview(file.id!)}
                        className="min-h-8 rounded px-2 text-[11px] font-medium text-indigo-700 hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-indigo-300 dark:hover:bg-indigo-950/40"
                      >
                        Preview
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
          <label className="mt-3 flex min-h-10 items-center gap-2 border-t border-slate-100 pt-2 text-xs font-medium text-slate-700 dark:border-slate-800 dark:text-slate-200">
            <input
              type="checkbox"
              checked={includeFilesInContext}
              onChange={event => onToggleIncludeFilesInContext(event.target.checked)}
              className="accent-indigo-600"
            />
            Sertakan file terpilih pada respons berikutnya <span className="ml-auto text-[10px] text-slate-500">{selectedReadyWorkspaceFileCount} aktif</span>
          </label>
        </div>
      ) : activeInspectorTab === 'sources' ? (
        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2" role="tabpanel" aria-label="Sumber">
          {selectedSource && (
            <WorkspaceSourcePreview
              source={selectedSource}
              onOpenDocument={onOpenFilePreview}
              onClose={onClearSelectedSource}
            />
          )}
          <WorkspaceSourceLibrary chatId={chatId} onPreview={onOpenFilePreview} />
        </div>
      ) : activeInspectorTab === 'plan' ? (
        <div className="min-h-0 flex-1 overflow-y-auto" role="tabpanel" aria-label="Rencana">
          <WorkspaceTasksPanel
            plan={workspacePlan}
            workspaceKey={logicalWorkspaceIdentity}
            isLoading={isPlanLoading}
            canPersist={canPersistPlan}
            isGenerating={isTaskGenerating}
            isExecuting={isPlanExecuting}
            allowExternalSearch={allowExternalSearch}
            onAllowExternalSearchChange={onAllowExternalSearchChange}
            isStoppingTask={isStoppingTask}
            isContinuousRunning={isContinuousRunning}
            onStartContinuous={onStartContinuous}
            onStopContinuous={onStopContinuous}
            onOpenArtifact={onOpenArtifact}
            onPreviewProposal={onPreviewProposal}
            onOpenSource={onOpenSource}
            onAcceptReview={onAcceptTaskReview}
            onRejectReview={onRejectTaskReview}
            onUpdate={onUpdatePlan}
            onTransition={action => action === 'pause' ? onPauseWorkflow() : onResumeWorkflow()}
            onRecover={onRecoverTask}
            onModelChange={onTaskModelChange}
            onRun={onRunTask}
            onGenerate={onGenerateTasks}
            onCancel={onCancelWorkflow}
            onStopTask={onStopTask}
            onComplete={onCompleteWorkflow}
            focusedTaskId={focusedTaskId}
            hideHeader
          />
        </div>
      ) : null}

      <div className={`min-h-0 flex-1 overflow-y-auto px-3 py-3 ${activeInspectorTab === 'memory' ? 'flex flex-col' : 'hidden'}`} role="tabpanel" aria-label="Memori Workspace" aria-hidden={activeInspectorTab !== 'memory'}>
        <React.Suspense fallback={null}>
          <WorkspaceMemorySection
            key={chatId || logicalWorkspaceIdentity}
            chatId={chatId}
            canPersist={canPersistMemory}
            activeChapterScope={activeChapterScope}
            onChangeChapterScope={onChangeChapterScope}
          />
        </React.Suspense>
      </div>
    </aside>
  );
});
