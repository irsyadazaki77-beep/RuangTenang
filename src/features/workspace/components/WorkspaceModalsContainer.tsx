import React from 'react';
import type { WorkspaceArtifact, AcademicTaskTemplate } from '../types';
import type { WorkspaceToolDefinition } from '../tools/toolTypes';

const WorkspaceFilePreviewModal = React.lazy(() =>
  import('./WorkspaceFilePreviewModal').then(module => ({ default: module.WorkspaceFilePreviewModal }))
);
const ExportModal = React.lazy(() =>
  import('./ExportModal').then(module => ({ default: module.ExportModal }))
);
const WorkspaceTemplateModal = React.lazy(() =>
  import('./WorkspaceTemplateModal').then(module => ({ default: module.WorkspaceTemplateModal }))
);
const MicroBreathingModal = React.lazy(() =>
  import('./MicroBreathingModal').then(module => ({ default: module.MicroBreathingModal }))
);
const WorkspaceToolConfigModal = React.lazy(() =>
  import('./WorkspaceToolConfigModal').then(module => ({ default: module.WorkspaceToolConfigModal }))
);

export interface PendingCanvasTransferState {
  id: string;
  content: string;
  title: string;
}

export interface PendingRevisionState {
  artifactId: string;
  title: string;
  baseContent: string;
  baseVersion: number;
  proposedContent: string;
}

export interface WorkspaceModalsContainerProps {
  // Canvas transfer dialog
  pendingCanvasTransfer: PendingCanvasTransferState | null;
  onApplyCanvasTransfer: (action: 'create' | 'replace' | 'append') => Promise<void> | void;
  onCancelCanvasTransfer: () => void;
  visibleActiveArtifact: WorkspaceArtifact | null;

  // Revision preview dialog
  pendingRevision: PendingRevisionState | null;
  pendingRevisionConflict: boolean;
  onApplyRevision: () => Promise<void> | void;
  onCancelRevision: () => void;

  // Template modal
  selectedTemplateForModal: AcademicTaskTemplate | null;
  templateInputSnippet: string;
  onTemplateSnippetChange: (snippet: string) => void;
  onCloseTemplateModal: () => void;
  onSubmitTemplate: (template: AcademicTaskTemplate, snippet: string) => void;

  // Breathing modal
  isBreathingModalOpen: boolean;
  onCloseBreathingModal: () => void;
  breathingReason: string;

  // Tool config modal
  pendingTool: { tool: WorkspaceToolDefinition } | null;
  onCancelPendingTool: () => void;
  onExecutePendingTool: (input: Record<string, unknown>) => void;

  // File preview modal
  previewAttachmentId: string | null;
  onCloseFilePreview: () => void;
  onArtifactCreatedFromFilePreview: (artifact: WorkspaceArtifact) => void;

  // Export modal
  isWorkflowExportOpen: boolean;
  onCloseWorkflowExport: () => void;
  exportContent?: string;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const WorkspaceModalsContainer: React.FC<WorkspaceModalsContainerProps> = React.memo(({
  pendingCanvasTransfer,
  onApplyCanvasTransfer,
  onCancelCanvasTransfer,
  visibleActiveArtifact,
  pendingRevision,
  pendingRevisionConflict,
  onApplyRevision,
  onCancelRevision,
  selectedTemplateForModal,
  templateInputSnippet,
  onTemplateSnippetChange,
  onCloseTemplateModal,
  onSubmitTemplate,
  isBreathingModalOpen,
  onCloseBreathingModal,
  breathingReason,
  pendingTool,
  onCancelPendingTool,
  onExecutePendingTool,
  previewAttachmentId,
  onCloseFilePreview,
  onArtifactCreatedFromFilePreview,
  isWorkflowExportOpen,
  onCloseWorkflowExport,
  exportContent,
  showToast,
}) => {
  return (
    <>
      {/* Canvas Transfer Modal */}
      {pendingCanvasTransfer && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4"
          role="presentation"
          onMouseDown={event => {
            if (event.target === event.currentTarget) onCancelCanvasTransfer();
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="canvas-transfer-title"
            onKeyDown={event => {
              if (event.key === 'Escape') {
                event.preventDefault();
                onCancelCanvasTransfer();
              }
            }}
            className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl dark:border-slate-700 dark:bg-slate-900"
          >
            <h2 id="canvas-transfer-title" className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Kirim jawaban ke Canvas
            </h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {visibleActiveArtifact
                ? `Pilih cara menggunakan jawaban pada “${visibleActiveArtifact.title}”.`
                : 'Jawaban ini akan disimpan sebagai dokumen baru.'}
            </p>
            <div className="mt-4 grid gap-2">
              <button
                autoFocus
                type="button"
                onClick={() => void onApplyCanvasTransfer('create')}
                className="rounded-lg bg-emerald-600 px-3 py-2 text-left text-xs font-semibold text-white hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
              >
                Buat dokumen baru
              </button>
              {visibleActiveArtifact && (
                <>
                  <button
                    type="button"
                    onClick={() => void onApplyCanvasTransfer('replace')}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    Ganti isi dokumen aktif
                  </button>
                  <button
                    type="button"
                    onClick={() => void onApplyCanvasTransfer('append')}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    Tambahkan di akhir dokumen
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={onCancelCanvasTransfer}
                className="rounded-lg px-3 py-2 text-xs text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Batal
              </button>
            </div>
          </section>
        </div>
      )}

      {/* Revision Preview Modal */}
      {pendingRevision && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-950/45 p-4" role="presentation">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="revision-preview-title"
            onKeyDown={event => {
              if (event.key === 'Escape') {
                event.preventDefault();
                onCancelRevision();
              }
            }}
            className="flex max-h-[85dvh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
          >
            <header className="border-b border-slate-200 p-4 dark:border-slate-700">
              <h2 id="revision-preview-title" className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Tinjau revisi: {pendingRevision.title}
              </h2>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Periksa bagian yang dihapus dan ditambahkan sebelum menerapkan versi baru.
              </p>
            </header>
            {pendingRevisionConflict && (
              <p role="alert" className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
                Dokumen berubah sejak revisi dimulai. Coba ulang revisi.
              </p>
            )}
            <div className="grid min-h-0 flex-1 gap-3 overflow-auto p-4 md:grid-cols-2">
              <div className="min-h-40 rounded-xl border border-rose-200 bg-rose-50/60 p-3 dark:border-rose-900/60 dark:bg-rose-950/20">
                <h3 className="mb-2 text-xs font-semibold text-rose-700 dark:text-rose-300">− Dihapus</h3>
                <pre className="whitespace-pre-wrap wrap-break-word text-[11px] leading-relaxed text-slate-700 dark:text-slate-300">
                  {pendingRevision.baseContent || '(kosong)'}
                </pre>
              </div>
              <div className="min-h-40 rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 dark:border-emerald-900/60 dark:bg-emerald-950/20">
                <h3 className="mb-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300">+ Ditambahkan</h3>
                <pre className="whitespace-pre-wrap wrap-break-word text-[11px] leading-relaxed text-slate-700 dark:text-slate-300">
                  {pendingRevision.proposedContent || '(kosong)'}
                </pre>
              </div>
            </div>
            <footer className="flex justify-end gap-2 border-t border-slate-200 p-3 dark:border-slate-700">
              <button
                type="button"
                onClick={onCancelRevision}
                className="rounded-lg px-3 py-2 text-xs text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={pendingRevisionConflict}
                onClick={() => void onApplyRevision()}
                className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Terapkan revisi
              </button>
            </footer>
          </section>
        </div>
      )}

      {/* Workspace Template Modal */}
      {selectedTemplateForModal && (
        <React.Suspense
          fallback={
            <div role="status" className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/40 p-4">
              <span className="rounded-xl bg-white px-4 py-3 text-sm text-slate-600 shadow-xl dark:bg-slate-900 dark:text-slate-300">
                Memuat template…
              </span>
            </div>
          }
        >
          <WorkspaceTemplateModal
            template={selectedTemplateForModal}
            snippet={templateInputSnippet}
            onSnippetChange={onTemplateSnippetChange}
            onClose={onCloseTemplateModal}
            onSubmit={onSubmitTemplate}
          />
        </React.Suspense>
      )}

      {/* Micro-Breathing Modal */}
      {isBreathingModalOpen && (
        <React.Suspense
          fallback={
            <div role="status" className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/40 p-4">
              <span className="rounded-xl bg-white px-4 py-3 text-sm text-slate-600 shadow-xl dark:bg-slate-900 dark:text-slate-300">
                Menyiapkan jeda…
              </span>
            </div>
          }
        >
          <MicroBreathingModal
            isOpen={isBreathingModalOpen}
            onClose={onCloseBreathingModal}
            reason={breathingReason}
          />
        </React.Suspense>
      )}

      {/* Tool Config Modal */}
      {pendingTool && (
        <React.Suspense
          fallback={
            <div role="status" className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/40 p-4">
              <span className="rounded-xl bg-white px-4 py-3 text-sm text-slate-600 shadow-xl dark:bg-slate-900 dark:text-slate-300">
                Memuat pengaturan tool…
              </span>
            </div>
          }
        >
          <WorkspaceToolConfigModal
            tool={pendingTool.tool}
            onCancel={onCancelPendingTool}
            onExecute={onExecutePendingTool}
          />
        </React.Suspense>
      )}

      {/* File Preview Modal */}
      {previewAttachmentId && (
        <React.Suspense
          fallback={
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
              <div role="status" className="rounded-xl bg-white px-4 py-3 text-sm text-slate-600 shadow-xl dark:bg-slate-900 dark:text-slate-300">
                Memuat pratinjau file…
              </div>
            </div>
          }
        >
          <WorkspaceFilePreviewModal
            attachmentId={previewAttachmentId}
            onClose={onCloseFilePreview}
            onArtifactCreated={onArtifactCreatedFromFilePreview}
          />
        </React.Suspense>
      )}

      {/* Export Modal */}
      {isWorkflowExportOpen && visibleActiveArtifact && (
        <React.Suspense fallback={null}>
          <ExportModal
            isOpen={isWorkflowExportOpen}
            onClose={onCloseWorkflowExport}
            artifact={visibleActiveArtifact}
            content={exportContent ?? visibleActiveArtifact.content}
            showToast={showToast}
          />
        </React.Suspense>
      )}
    </>
  );
});

WorkspaceModalsContainer.displayName = 'WorkspaceModalsContainer';
