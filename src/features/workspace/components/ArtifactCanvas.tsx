import React, { useState, useEffect, useLayoutEffect, useMemo, useRef, useCallback, useDeferredValue } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { modalBackdropVariants, modalPanelVariants } from '../../../lib/motionTokens';
import { 
  Code2, 
  FileText, 
  Quote, 
  Copy, 
  Check, 
  Download, 
  Play, 
  Sparkles, 
  BookMarked,
  Workflow,
  History,
  Loader2,
  Pencil,
  GitCompare,
  CopyPlus,
  Trash2,
  AlertTriangle
} from 'lucide-react';
import { WorkspaceArtifact, CitationStyle, ArtifactVersionRecord, ArtifactPatch, WorkspaceArtifactSelection } from '../types';
import { applyArtifactPatch } from '../utils/artifactPatch';
import { WorkspaceToolSelector } from './WorkspaceToolSelector';
import { WorkspaceToolRegistry } from '../tools/toolRegistry';
import { WorkspaceToolDefinition } from '../tools/toolTypes';
import { LazyMarkdown } from '../../../components/common/LazyMarkdown';
import { useToast } from '../../../components/Toast';
import { useArtifactAutosave } from '../hooks/useArtifactAutosave';
import { ArtifactCanvasToolbar } from './ArtifactCanvasToolbar';
import { ArtifactVersionHistoryModal } from './ArtifactVersionHistoryModal';
import { ArtifactExportHost } from './ArtifactExportHost';
import { ChartArtifactPreview, TableArtifactPreview } from './ArtifactDataPreview';
import type { SavedChartSpec, SavedTableSpec } from './ArtifactDataPreview';

const MermaidRenderer = React.lazy(() => import('./MermaidRenderer').then(m => ({ default: m.MermaidRenderer })));
const ArtifactDiffViewer = React.lazy(() => import('./ArtifactDiffViewer').then(m => ({ default: m.ArtifactDiffViewer })));
const CitationSearchModal = React.lazy(() => import('./CitationSearchModal').then(m => ({ default: m.CitationSearchModal })));
import { CodeExecutionResultPanel } from './CodeExecutionResultPanel';
import { validateCodeStatically } from '../services/codeValidationService';
import { runJavaScriptInSandbox, SandboxExecutionHandle } from '../services/sandboxExecutionService';
import { CodeValidationResult, CodeExecutionStatus } from '../services/codeExecutionTypes';
const AcademicParaphraseModal = React.lazy(() => import('./AcademicParaphraseModal').then(m => ({ default: m.AcademicParaphraseModal })));
const ArtifactCanvasEditor = React.lazy(() => import('./ArtifactCanvasEditor').then(m => ({ default: m.ArtifactCanvasEditor })));
const ArtifactTableEditor = React.lazy(() => import('./ArtifactDataEditors').then(m => ({ default: m.ArtifactTableEditor })));
const ArtifactPresentationEditor = React.lazy(() => import('./ArtifactDataEditors').then(m => ({ default: m.ArtifactPresentationEditor })));
import { 
  downloadBibTeXFile, 
  downloadRISFile, 
  parseCitations, 
  formatAsAPA7, 
  formatAsIEEE, 
  formatAsHarvard,
  generateBibTeX,
  generateRIS
} from '../utils/citationExport';

export interface ArtifactCanvasProps {
  artifact: WorkspaceArtifact;
  initialDraftContent?: string;
  scrollStorageKey?: string;
  onUpdateArtifact?: (updated: Partial<WorkspaceArtifact>) => void;
  onClose?: () => void;
  onRequestRevision?: (revisionPrompt: string, currentArtifact: WorkspaceArtifact) => void;
  onSelectTool?: (tool: WorkspaceToolDefinition, currentArtifact: WorkspaceArtifact) => void;
  onRollbackVersion?: (targetVersion: number) => Promise<void> | void;
  onSaveArtifact?: (content: string, title?: string, createVersionSnapshot?: boolean, expectedUpdatedAt?: string, expectedVersion?: number) => Promise<unknown> | unknown;
  onDuplicateArtifact?: (id: string) => Promise<void> | void;
  onDeleteArtifact?: (id: string) => Promise<void> | void;
  onSelectedTextChange?: (text: string) => void;
  onSelectionChange?: (selection: WorkspaceArtifactSelection | null) => void;
  onRequestInlineEdit?: (selection: WorkspaceArtifactSelection, instruction: string, currentArtifact: WorkspaceArtifact) => void;
  inlineEditPatch?: ArtifactPatch | null;
  onDismissInlineEdit?: () => void;
  onDraftContentChange?: (artifactId: string, content: string) => void;
  revisionCommit?: { artifactId: string; content: string; version: number } | null;
  isStreaming?: boolean;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

export type CanvasViewMode = 'preview' | 'edit' | 'raw' | 'diff';
export type SaveState = 'idle' | 'saving' | 'saved' | 'unsaved' | 'failed' | 'local';

function isPresentationContent(content: string): boolean {
  try { return (JSON.parse(content) as { format?: string }).format === 'ruangtenang-presentation-v1'; } catch { return false; }
}

export const ArtifactCanvas: React.FC<ArtifactCanvasProps> = React.memo(({
  artifact,
  initialDraftContent,
  scrollStorageKey,
  onUpdateArtifact,
  onClose,
  onRequestRevision,
  onSelectTool,
  onRollbackVersion,
  onSaveArtifact,
  onDuplicateArtifact,
  onDeleteArtifact,
  onSelectedTextChange,
  onSelectionChange,
  onRequestInlineEdit,
  inlineEditPatch,
  onDismissInlineEdit,
  onDraftContentChange,
  revisionCommit,
  isStreaming = false,
  isExpanded: controlledExpanded,
  onToggleExpand: controlledToggleExpand
}) => {
  const { showToast } = useToast();
  const [isCopied, setIsCopied] = useState(false);
  const [internalExpanded, setInternalExpanded] = useState(false);
  const isExpanded = controlledExpanded !== undefined ? controlledExpanded : internalExpanded;
  const toggleExpand = controlledToggleExpand || (() => setInternalExpanded(prev => !prev));

  const [viewMode, setViewMode] = useState<CanvasViewMode>('preview');
  const [isPresentationStudio, setIsPresentationStudio] = useState(artifact.language === 'presentation' || isPresentationContent(artifact.content));
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(artifact.title || '');
  const [editableContent, setEditableContent] = useState(initialDraftContent ?? artifact.content);
  const editableContentRef = useRef(editableContent);
  editableContentRef.current = editableContent;
  const contentScrollRef = useRef<HTMLDivElement>(null);
  const scrollSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedChart = useMemo(() => {
    if (artifact.type !== 'CHART') return null;
    try {
      const value = JSON.parse(editableContent) as Partial<SavedChartSpec>;
      return value.type === 'bar' && typeof value.title === 'string' && typeof value.xColumn === 'string' && typeof value.yColumn === 'string' && Array.isArray(value.rows) && value.provenance ? value as SavedChartSpec : null;
    } catch { return null; }
  }, [artifact.type, editableContent]);
  const savedTable = useMemo(() => {
    if (artifact.type !== 'TABLE') return null;
    try {
      const value = JSON.parse(editableContent) as Partial<SavedTableSpec>;
      return value.type === 'table' && typeof value.title === 'string' && Array.isArray(value.columns) && Array.isArray(value.rows) && typeof value.sourceVersion === 'string' ? value as SavedTableSpec : null;
    } catch { return null; }
  }, [artifact.type, editableContent]);
  const [isDirty, setIsDirty] = useState(initialDraftContent !== undefined && initialDraftContent !== artifact.content);
  const [saveStatus, setSaveStatus] = useState<SaveState>(initialDraftContent !== undefined && initialDraftContent !== artifact.content ? 'unsaved' : artifact.persistenceStatus === 'persistent' || !artifact.persistenceStatus ? 'saved' : artifact.persistenceStatus === 'saving' ? 'saving' : artifact.persistenceStatus === 'failed' ? 'failed' : 'local');
  const [saveFailureMessage, setSaveFailureMessage] = useState('Gagal simpan');

  // Conflict handling states
  const [hasExternalConflict, setHasExternalConflict] = useState(false);
  const [conflictServerContent, setConflictServerContent] = useState<string | null>(null);
  const [conflictServerArtifact, setConflictServerArtifact] = useState<WorkspaceArtifact | null>(null);

  // Simulation & validation states
  const [validationResult, setValidationResult] = useState<CodeValidationResult | null>(null);
  const [executionStatus, setExecutionStatus] = useState<CodeExecutionStatus>('idle');
  const [citationStyle, setCitationStyle] = useState<CitationStyle>('APA7');

  // Modals & Popovers
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [isExportingDocx, setIsExportingDocx] = useState(false);
  const [showVersionHistoryModal, setShowVersionHistoryModal] = useState(false);
  const [previewingVersion, setPreviewingVersion] = useState<ArtifactVersionRecord | null>(null);
  const [isSavingTitle, setIsSavingTitle] = useState(false);
  const [titleSaveError, setTitleSaveError] = useState('');
  const [isDuplicating, setIsDuplicating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showCitationModal, setShowCitationModal] = useState(false);
  const [showParaphraseModal, setShowParaphraseModal] = useState(false);
  const [paraphraseInitialText, setParaphraseInitialText] = useState('');
  const [selection, setSelection] = useState<WorkspaceArtifactSelection | null>(null);
  const [showInlineAsk, setShowInlineAsk] = useState(false);
  const [inlineInstruction, setInlineInstruction] = useState('');
  const [inlinePatchError, setInlinePatchError] = useState('');
  const visibleInlineEditPatch = inlineEditPatch?.artifactId === artifact.id ? inlineEditPatch : null;

  // Refs for timers & concurrency guards
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const draftSyncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingDraftSyncRef = useRef<{ artifactId: string; content: string } | null>(null);
  const lastSavedContentRef = useRef<string>(artifact.content);
  const lastKnownVersionRef = useRef<number>(artifact.version || 1);
  const saveSeqRef = useRef<number>(0);
  const isApplyingInlinePatchRef = useRef(false);
  const activeSandboxHandleRef = useRef<SandboxExecutionHandle | null>(null);
  const currentExecutionIdRef = useRef<number>(0);

  const flushDraftSync = useCallback(() => {
    if (draftSyncTimerRef.current) clearTimeout(draftSyncTimerRef.current);
    draftSyncTimerRef.current = null;
    const pending = pendingDraftSyncRef.current;
    pendingDraftSyncRef.current = null;
    if (pending) onDraftContentChange?.(pending.artifactId, pending.content);
  }, [onDraftContentChange]);

  const scheduleDraftSync = useCallback((artifactId: string, content: string, immediate = false) => {
    pendingDraftSyncRef.current = { artifactId, content };
    if (draftSyncTimerRef.current) clearTimeout(draftSyncTimerRef.current);
    if (immediate) {
      flushDraftSync();
      return;
    }
    draftSyncTimerRef.current = setTimeout(flushDraftSync, 200);
  }, [flushDraftSync]);

  // Terminate active sandbox worker on component unmount
  useEffect(() => {
    return () => {
      flushDraftSync();
      if (draftSyncTimerRef.current) clearTimeout(draftSyncTimerRef.current);
      pendingDraftSyncRef.current = null;
      if (activeSandboxHandleRef.current) {
        activeSandboxHandleRef.current.stop();
        activeSandboxHandleRef.current = null;
      }
    };
  }, [flushDraftSync]);

  const currentArtifactIdRef = useRef<string>(artifact.id);

  useLayoutEffect(() => {
    if (!scrollStorageKey || !contentScrollRef.current) return;
    try {
      const saved = Number(globalThis.sessionStorage?.getItem(scrollStorageKey));
      if (Number.isFinite(saved) && saved >= 0) contentScrollRef.current.scrollTop = saved;
    } catch { /* Scrolling stays usable when session storage is unavailable. */ }
  }, [artifact.id, scrollStorageKey]);

  useEffect(() => () => {
    if (scrollSaveTimerRef.current) clearTimeout(scrollSaveTimerRef.current);
    if (!scrollStorageKey) return;
    try { globalThis.sessionStorage?.setItem(scrollStorageKey, String(contentScrollRef.current?.scrollTop || 0)); } catch { /* Scroll restoration is an enhancement only. */ }
  }, [scrollStorageKey]);

  // Sync state when active artifact changes (or changes from server)
  /* eslint-disable react-hooks/exhaustive-deps -- initialDraftContent is a snapshot for artifact switches, not a server-sync trigger. */
  useEffect(() => {
    if (isApplyingInlinePatchRef.current) return;
    const isNewArtifact = currentArtifactIdRef.current !== artifact.id;
    if (isNewArtifact) {
      saveSeqRef.current += 1;
      currentArtifactIdRef.current = artifact.id;
      // Terminate any running sandbox execution when switching artifacts
      if (activeSandboxHandleRef.current) {
        activeSandboxHandleRef.current.stop();
        activeSandboxHandleRef.current = null;
      }
      currentExecutionIdRef.current += 1;
      setValidationResult(null);
      setExecutionStatus('idle');

      // If switching to another artifact, reset all local session states
      setTitleInput(artifact.title || '');
      setIsPresentationStudio(artifact.language === 'presentation' || isPresentationContent(artifact.content));
      setEditableContent(initialDraftContent ?? artifact.content);
      lastSavedContentRef.current = artifact.content;
      lastKnownVersionRef.current = artifact.version || 1;
      setIsDirty(initialDraftContent !== undefined && initialDraftContent !== artifact.content);
      setSaveStatus(initialDraftContent !== undefined && initialDraftContent !== artifact.content ? 'unsaved' : artifact.persistenceStatus === 'persistent' || !artifact.persistenceStatus ? 'saved' : artifact.persistenceStatus === 'saving' ? 'saving' : artifact.persistenceStatus === 'failed' ? 'failed' : 'local');
      setHasExternalConflict(false);
      setConflictServerContent(null);
      setConflictServerArtifact(null);
      setShowMoreMenu(false);
      setPreviewingVersion(null);
      setShowDeleteConfirm(false);
      return;
    }

    // If external version changed while user is dirty with unsaved changes:
    if (isDirty && artifact.content !== lastSavedContentRef.current && artifact.content !== editableContent) {
      setHasExternalConflict(true);
      setConflictServerContent(artifact.content);
    } else if (!isDirty) {
      setEditableContent(artifact.content);
      lastSavedContentRef.current = artifact.content;
      lastKnownVersionRef.current = artifact.version || 1;
      setSaveStatus(artifact.persistenceStatus === 'persistent' || !artifact.persistenceStatus ? 'saved' : artifact.persistenceStatus === 'saving' ? 'saving' : artifact.persistenceStatus === 'failed' ? 'failed' : 'local');
      setHasExternalConflict(false);
      setConflictServerContent(null);
      setConflictServerArtifact(null);
    }
  }, [artifact.id, artifact.title, artifact.version, artifact.content, artifact.persistenceStatus, isDirty, editableContent]);
  /* eslint-enable react-hooks/exhaustive-deps */

  useEffect(() => {
    onSelectedTextChange?.('');
    setSelection(null);
    onSelectionChange?.(null);
    setShowInlineAsk(false);
    setInlinePatchError('');
  }, [artifact.id, onSelectedTextChange, onSelectionChange]);

  useEffect(() => {
    scheduleDraftSync(artifact.id, initialDraftContent ?? artifact.content, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- initialize the parent draft only when the artifact changes.
  }, [artifact.id, scheduleDraftSync]);

  useEffect(() => {
    if (!revisionCommit || revisionCommit.artifactId !== artifact.id || revisionCommit.version !== artifact.version || revisionCommit.content !== artifact.content) return;
    setEditableContent(revisionCommit.content);
    lastSavedContentRef.current = revisionCommit.content;
    lastKnownVersionRef.current = revisionCommit.version;
    setIsDirty(false);
    setSaveStatus(artifact.persistenceStatus === 'local' ? 'local' : 'saved');
    setHasExternalConflict(false);
    setConflictServerContent(null);
  }, [artifact.content, artifact.id, artifact.persistenceStatus, artifact.version, revisionCommit]);

  // Handle saving inline title
  const handleSaveTitle = async () => {
    const trimmed = titleInput.trim();
    if (!trimmed || trimmed === artifact.title) {
      setTitleInput(artifact.title || '');
      setIsEditingTitle(false);
      return;
    }
    if (!onSaveArtifact || isSavingTitle || saveStatus === 'saving') return;
    setIsSavingTitle(true);
    setTitleSaveError('');
    try {
      const saved = await onSaveArtifact(editableContent, trimmed);
      if (!saved || typeof saved !== 'object') throw new Error('Judul belum berhasil disimpan.');
      onUpdateArtifact?.({ ...saved as Partial<WorkspaceArtifact>, persistenceStatus: (saved as WorkspaceArtifact).persistenceStatus || 'persistent' });
      setTitleInput((saved as WorkspaceArtifact).title || trimmed);
      setIsEditingTitle(false);
      showToast((saved as WorkspaceArtifact).persistenceStatus === 'local' ? 'Judul draf lokal diperbarui.' : 'Judul dokumen berhasil diperbarui', (saved as WorkspaceArtifact).persistenceStatus === 'local' ? 'info' : 'success');
    } catch (error) {
      setTitleSaveError('Judul belum berhasil disimpan. Coba lagi.');
      setTitleInput(trimmed);
      const latest = (error as Error & { serverArtifact?: WorkspaceArtifact }).serverArtifact;
      if (latest?.id === artifact.id) {
        setConflictServerArtifact(latest);
        setConflictServerContent(latest.content);
        setHasExternalConflict(true);
      }
      showToast('Judul belum berhasil disimpan.', 'error');
    } finally {
      setIsSavingTitle(false);
    }
  };

  // Perform save with sequence guard
  const performSave = useCallback(async (contentToSave: string, titleToSave?: string): Promise<boolean> => {
    const currentSeq = ++saveSeqRef.current;
    setSaveStatus('saving');

    try {
      if (!onSaveArtifact) throw new Error('Penyimpanan Canvas tidak tersedia.');
      const saved = await onSaveArtifact(contentToSave, titleToSave || artifact.title);
      if (!saved || typeof saved !== 'object') throw new Error('Perubahan belum berhasil disimpan.');

      // Concurrency guard: Only set 'saved' if this was the latest save request
      if (currentSeq === saveSeqRef.current) {
        lastSavedContentRef.current = contentToSave;
        lastKnownVersionRef.current = (saved as WorkspaceArtifact).version || lastKnownVersionRef.current;
        setSaveFailureMessage('Gagal simpan');
        const contentChangedDuringSave = editableContentRef.current !== contentToSave;
        setIsDirty(contentChangedDuringSave);
        setSaveStatus(contentChangedDuringSave ? 'unsaved' : (saved as WorkspaceArtifact).persistenceStatus === 'local' ? 'local' : 'saved');
        onUpdateArtifact?.({ ...saved as Partial<WorkspaceArtifact> });
        return !contentChangedDuringSave;
      }
      return false;
    } catch (err) {
      console.warn('[ArtifactCanvas] Save failed:', err);
      if (currentSeq === saveSeqRef.current) {
        setSaveFailureMessage(err instanceof Error ? err.message : 'Gagal simpan. Coba lagi.');
        setSaveStatus('failed');
        const latest = (err as Error & { serverArtifact?: WorkspaceArtifact }).serverArtifact;
        if (latest?.id === artifact.id) {
          setConflictServerArtifact(latest);
          setConflictServerContent(latest.content);
          setHasExternalConflict(true);
        }
      }
      return false;
    }
  }, [artifact.id, artifact.title, onSaveArtifact, onUpdateArtifact]);

  const markDraftDirty = useCallback(() => {
    setIsDirty(true);
    setSaveStatus('unsaved');
  }, []);
  const { cancelScheduledSave } = useArtifactAutosave({
    content: editableContent,
    title: artifact.title,
    viewMode,
    lastSavedContentRef,
    onDirty: markDraftDirty,
    save: performSave
  });

  useEffect(() => {
    if (!isDirty && saveStatus !== 'saving' && saveStatus !== 'failed') return;
    const warnBeforeLeaving = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warnBeforeLeaving);
    return () => window.removeEventListener('beforeunload', warnBeforeLeaving);
  }, [isDirty, saveStatus]);

  // Manual save trigger (e.g. Save button or Ctrl/Cmd + S)
  const handleManualSave = useCallback(() => {
    if (saveStatus === 'saving') return;
    flushDraftSync();
    cancelScheduledSave();
    performSave(editableContent, artifact.title);
  }, [editableContent, artifact.title, cancelScheduledSave, performSave, saveStatus, flushDraftSync]);

  const captureSelection = (target: HTMLTextAreaElement) => {
    const start = target.selectionStart;
    const end = target.selectionEnd;
    const text = target.value.slice(start, end);
    const nextSelection = text.trim() ? { artifactId: artifact.id, start, end, text } : null;
    setSelection(nextSelection);
    onSelectedTextChange?.(nextSelection?.text || '');
    onSelectionChange?.(nextSelection);
  };

  const inlineActions = artifact.type === 'CODE' ? [
    ['Explain', 'Jelaskan kode terpilih dengan ringkas.'],
    ['Refactor', 'Refactor kode terpilih tanpa mengubah perilaku yang diharapkan.'],
    ['Fix bug', 'Cari dan perbaiki bug pada kode terpilih.'],
    ['Add comments', 'Tambahkan komentar yang membantu pada kode terpilih.']
  ] : [
    ['Improve', 'Perbaiki teks terpilih agar lebih jelas dan efektif.'],
    ['Shorten', 'Ringkas teks terpilih tanpa menghilangkan makna utama.'],
    ['Expand', 'Kembangkan teks terpilih dengan detail yang relevan.'],
    ['Rewrite', 'Tulis ulang teks terpilih dengan makna yang tetap sama.']
  ];

  const requestInlineEdit = (instruction: string) => {
    if (!selection || !onRequestInlineEdit || isStreaming) return;
    onRequestInlineEdit(selection, instruction, { ...artifact, content: editableContent });
    setShowInlineAsk(false);
    setInlineInstruction('');
  };

  const acceptInlinePatch = async () => {
    if (!visibleInlineEditPatch) return;
    const result = applyArtifactPatch({
      patch: visibleInlineEditPatch,
      artifactId: artifact.id,
      currentVersion: artifact.version,
      currentContent: editableContent
    });
    if (!result.valid) {
      setInlinePatchError('Dokumen telah berubah sejak revisi dibuat. Buat usulan baru sebelum menerapkan.');
      return;
    }
    if (!onSaveArtifact) {
      setInlinePatchError('Penyimpanan Canvas tidak tersedia. Perubahan belum diterapkan.');
      return;
    }
    cancelScheduledSave();
    saveSeqRef.current += 1;
    isApplyingInlinePatchRef.current = true;
    setSaveStatus('saving');
    setInlinePatchError('');
    try {
      let expectedUpdatedAt = artifact.updatedAt;
      if (visibleInlineEditPatch.baseContent !== artifact.content) {
        const savedBase = await onSaveArtifact(visibleInlineEditPatch.baseContent, artifact.title, true, expectedUpdatedAt);
        if (!savedBase || typeof savedBase !== 'object' || !('updatedAt' in savedBase) || typeof savedBase.updatedAt !== 'string') throw new Error('Dokumen dasar gagal disimpan');
        expectedUpdatedAt = savedBase.updatedAt;
      }
      const saved = await onSaveArtifact(result.content, artifact.title, true, expectedUpdatedAt);
      if (!saved) throw new Error('Revisi gagal disimpan');
      setEditableContent(result.content);
      lastSavedContentRef.current = result.content;
      setIsDirty(false);
      setSaveStatus('saved');
      setSaveFailureMessage('Gagal simpan');
      scheduleDraftSync(artifact.id, result.content, true);
      onDismissInlineEdit?.();
      requestAnimationFrame(() => editorRef.current?.focus());
      showToast((saved as WorkspaceArtifact).persistenceStatus === 'local' ? 'Perubahan diterapkan ke draf lokal.' : 'Perubahan diterapkan dan versi baru tersimpan.', 'success');
    } catch {
      setSaveStatus('failed');
      setSaveFailureMessage('Revisi gagal disimpan. Coba simpan lagi.');
      setInlinePatchError('Revisi gagal disimpan. Draf Anda tetap aman; coba lagi.');
    } finally {
      isApplyingInlinePatchRef.current = false;
    }
  };

  // Keyboard shortcut listener (Ctrl/Cmd + S to save, Esc to close menus)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleManualSave();
      }
      if (e.key === 'Escape') {
        setShowMoreMenu(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleManualSave]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setShowMoreMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isMermaid = useMemo(() => {
    if (artifact.type === 'CODE' && (artifact.language || '').toLowerCase().includes('mermaid')) return true;
    const trimmed = (editableContent || '').trim();
    return trimmed.startsWith('graph ') ||
           trimmed.startsWith('flowchart ') ||
           trimmed.startsWith('sequenceDiagram') ||
           trimmed.startsWith('classDiagram') ||
           trimmed.startsWith('erDiagram') ||
           trimmed.startsWith('stateDiagram') ||
           trimmed.startsWith('gantt') ||
           trimmed.startsWith('pie') ||
           trimmed.startsWith('gitGraph') ||
           trimmed.startsWith('mindmap');
  }, [artifact.type, artifact.language, editableContent]);

  const deferredContent = useDeferredValue(editableContent);
  const { wordCount, lineCount } = useMemo(() => {
    let wordCount = 0;
    let previousWasWhitespace = true;
    let lineCount = 1;
    const whitespacePattern = /\s/u;
    for (let index = 0; index < deferredContent.length; index += 1) {
      const character = deferredContent[index];
      if (character === '\n') lineCount += 1;
      const isWhitespace = whitespacePattern.test(character);
      if (!isWhitespace && previousWasWhitespace) wordCount += 1;
      previousWasWhitespace = isWhitespace;
    }
    return { wordCount, lineCount };
  }, [deferredContent]);

  const lineNumbers = useMemo(() => viewMode === 'raw'
    ? Array.from({ length: lineCount }, (_, index) => String(index + 1)).join('\n')
    : '', [lineCount, viewMode]);
  const readingTime = Math.max(1, Math.ceil(wordCount / 200));

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(editableContent);
      setIsCopied(true);
      showToast('Konten artefak berhasil disalin ke clipboard!', 'success');
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Copy failed:', err);
      showToast('Gagal menyalin konten.', 'error');
    }
  };

  const handleCopyCitationFormatted = async (format: 'APA7' | 'IEEE' | 'HARVARD' | 'BIBTEX' | 'RIS') => {
    try {
      const parsed = parseCitations(editableContent);
      let textToCopy = editableContent;
      if (format === 'APA7') {
        textToCopy = formatAsAPA7(parsed) || editableContent;
      } else if (format === 'IEEE') {
        textToCopy = formatAsIEEE(parsed) || editableContent;
      } else if (format === 'HARVARD') {
        textToCopy = formatAsHarvard(parsed) || editableContent;
      } else if (format === 'BIBTEX') {
        textToCopy = generateBibTeX(editableContent, artifact.title);
      } else if (format === 'RIS') {
        textToCopy = generateRIS(editableContent, artifact.title);
      }

      await navigator.clipboard.writeText(textToCopy);
      showToast(`Sitasi format ${format} berhasil disalin ke clipboard!`, 'success');
    } catch {
      showToast('Gagal menyalin format sitasi.', 'error');
    }
  };

  const handleDownloadBibTeX = () => {
    downloadBibTeXFile(editableContent, artifact.title);
    setShowMoreMenu(false);
    showToast('Berkas BibTeX (.bib) berhasil diunduh.', 'success');
  };

  const handleDownloadRIS = () => {
    downloadRISFile(editableContent, artifact.title);
    setShowMoreMenu(false);
    showToast('Berkas RIS (.ris) untuk Zotero/Mendeley berhasil diunduh.', 'success');
  };

  const handleDownloadDocx = async (templateType: 'skripsi' | 'ieee_apa' | 'makalah' = 'skripsi') => {
    setIsExportingDocx(true);
    setShowMoreMenu(false);
    try {
      const typeLabel = templateType === 'skripsi' 
        ? 'skripsi baku 4-4-3-3' 
        : templateType === 'ieee_apa' 
        ? 'paper IEEE / APA' 
        : 'makalah';
      showToast(`Menyusun naskah format ${typeLabel} (.docx)...`, 'info');
      const { exportToAcademicDocx } = await import('../utils/exportDocx');
      await exportToAcademicDocx({
        title: artifact.title || 'Naskah Akademik',
        content: editableContent,
        templateType,
      });
      showToast(`Dokumen Word (.docx) format ${typeLabel} berhasil diunduh!`, 'success');
    } catch (err: any) {
      console.error('Docx export failed:', err);
      showToast('Gagal mengekspor berkas .docx.', 'error');
    } finally {
      setIsExportingDocx(false);
    }
  };

  const handleDownload = (forcedExt?: string) => {
    let extension = forcedExt || 'txt';
    let mimeType = 'text/plain;charset=utf-8';

    if (!forcedExt) {
      if (artifact.type === 'CODE') {
        const lang = (artifact.language || '').toLowerCase();
        if (lang.includes('python') || lang === 'py') extension = 'py';
        else if (lang.includes('typescript') || lang === 'ts') extension = 'ts';
        else if (lang.includes('javascript') || lang === 'js') extension = 'js';
        else if (lang.includes('sql')) extension = 'sql';
        else if (lang.includes('html')) extension = 'html';
        else if (lang.includes('css')) extension = 'css';
        else if (lang.includes('json')) extension = 'json';
        else extension = 'txt';
        mimeType = 'text/plain;charset=utf-8';
      } else if (artifact.type === 'DOCUMENT' || artifact.type === 'OUTLINE') {
        extension = 'md';
        mimeType = 'text/markdown;charset=utf-8';
      } else if (artifact.type === 'CITATION') {
        extension = 'txt';
        mimeType = 'text/plain;charset=utf-8';
      } else if (artifact.type === 'CHART') {
        extension = 'json';
        mimeType = 'application/json;charset=utf-8';
      } else if (artifact.type === 'TABLE') {
        extension = 'json';
        mimeType = 'application/json;charset=utf-8';
      }
    } else {
      if (forcedExt === 'md') mimeType = 'text/markdown;charset=utf-8';
      else if (forcedExt === 'bib') mimeType = 'application/x-bibtex;charset=utf-8';
      else if (forcedExt === 'ris') mimeType = 'application/x-research-info-systems;charset=utf-8';
    }

    let downloadPayload = editableContent;
    if (forcedExt === 'bib') {
      downloadPayload = generateBibTeX(editableContent, artifact.title);
    } else if (forcedExt === 'ris') {
      downloadPayload = generateRIS(editableContent, artifact.title);
    }

    const safeTitle = (artifact.title || 'artefak_ruangkerja')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .substring(0, 30);

    const blob = new Blob([downloadPayload], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${safeTitle}_v${artifact.version || 1}.${extension}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setShowMoreMenu(false);
    showToast(`Berkas .${extension} berhasil diunduh.`, 'success');
  };

  const handleContentChange = (newVal: string) => {
    saveSeqRef.current += 1;
    editableContentRef.current = newVal;
    setEditableContent(newVal);
      scheduleDraftSync(artifact.id, newVal);
    if (newVal !== lastSavedContentRef.current) {
      setIsDirty(true);
      setSaveStatus('unsaved');
    } else {
      setIsDirty(false);
      setSaveStatus(artifact.persistenceStatus === 'persistent' || !artifact.persistenceStatus ? 'saved' : 'local');
    }
  };

  const handleInsertCitation = (formattedCitation: string) => {
    const citationHeading = '\n\n## Daftar Pustaka\n';
    let newContent = editableContent;

    if (newContent.includes('## Daftar Pustaka') || newContent.includes('## Referensi')) {
      newContent = `${newContent.trimEnd()}\n- ${formattedCitation}\n`;
    } else {
      newContent = `${newContent.trimEnd()}${citationHeading}- ${formattedCitation}\n`;
    }

    handleContentChange(newContent);
    void performSave(newContent, artifact.title).then(saved => {
      if (saved) showToast('Sitasi disematkan ke draf Canvas.', 'info');
    });
  };

  const handleApplyParaphrase = (newParaphrase: string) => {
    handleContentChange(newParaphrase);
    void performSave(newParaphrase, artifact.title);
  };

  const handleOpenParaphraseWithSelection = () => {
    let textToPara = editableContent;
    if (editorRef.current) {
      const start = editorRef.current.selectionStart;
      const end = editorRef.current.selectionEnd;
      if (start !== end) {
        const selected = editableContent.substring(start, end);
        if (selected.trim().length > 5) {
          textToPara = selected;
        }
      }
    }
    setParaphraseInitialText(textToPara);
    setShowParaphraseModal(true);
  };

  const handleExecuteTool = useCallback((tool: WorkspaceToolDefinition) => {
    if (isStreaming) return;
    onSelectTool?.(tool, { ...artifact, content: editableContent });
  }, [isStreaming, artifact, editableContent, onSelectTool]);

  const handleStopExecution = useCallback(() => {
    if (activeSandboxHandleRef.current) {
      activeSandboxHandleRef.current.stop();
      activeSandboxHandleRef.current = null;
    }
    setExecutionStatus('stopped');
  }, []);

  const handleRunStaticCheck = useCallback(() => {
    if (isStreaming) return;
    if (activeSandboxHandleRef.current) {
      activeSandboxHandleRef.current.stop();
      activeSandboxHandleRef.current = null;
    }
    ++currentExecutionIdRef.current;
    setExecutionStatus('checking');
    const res = validateCodeStatically(editableContent, artifact.language);
    setValidationResult(res);
    setExecutionStatus(res.status);
  }, [editableContent, artifact.language, isStreaming]);

  const handleRunSecureSandbox = useCallback(async () => {
    if (isStreaming) return;
    if (activeSandboxHandleRef.current) {
      activeSandboxHandleRef.current.stop();
      activeSandboxHandleRef.current = null;
    }
    const execId = ++currentExecutionIdRef.current;
    const lang = (artifact.language || '').toLowerCase().trim();

    // Pastikan hanya JavaScript yang dijalankan di Web Worker sandbox
    const isJavaScript = lang === 'javascript' || lang === 'js';

    if (!isJavaScript) {
      // Bahasa tanpa runtime sandbox (Python, SQL, TypeScript mentah, dll)
      handleRunStaticCheck();
      return;
    }

    setExecutionStatus('running');
    setValidationResult(null);

    const handle = runJavaScriptInSandbox(editableContent, { timeoutMs: 2500 });
    activeSandboxHandleRef.current = handle;

    try {
      const res = await handle.promise;
      if (currentExecutionIdRef.current !== execId) return;
      setValidationResult(res);
      setExecutionStatus(res.status);
    } catch (err: any) {
      if (currentExecutionIdRef.current !== execId) return;
      setValidationResult({
        mode: 'sandbox',
        language: 'javascript',
        status: 'error',
        stdout: [],
        stderr: [err?.message || 'Terjadi kesalahan internal pada sandbox.'],
        warnings: [],
        message: 'Gagal menjalankan kode di sandbox.'
      });
      setExecutionStatus('error');
    } finally {
      if (currentExecutionIdRef.current === execId) {
        activeSandboxHandleRef.current = null;
      }
    }
  }, [editableContent, artifact.language, isStreaming, handleRunStaticCheck]);

  const quickRevisions = useMemo(() => {
    // Ambil tool yang relevan dengan tipe artefak saat ini dari WorkspaceToolRegistry
    const tools = WorkspaceToolRegistry.getToolsForArtifact(artifact.type);
    return tools.slice(0, 4).map(tool => ({
      tool,
      label: tool.name,
      prompt: tool.description
    }));
  }, [artifact.type]);

  // Conflict Resolution Handlers
  const handleKeepLocalDraft = async () => {
    if (saveStatus === 'saving') return;
    setSaveStatus('saving');
    try {
      const saved = await onSaveArtifact?.(editableContent, artifact.title, false, conflictServerArtifact?.updatedAt, conflictServerArtifact?.version);
      if (!saved) throw new Error('Penyimpanan tidak berhasil');
      lastSavedContentRef.current = editableContent;
      setIsDirty(false);
      setSaveStatus((saved as WorkspaceArtifact).persistenceStatus === 'local' ? 'local' : 'saved');
      setHasExternalConflict(false);
      setConflictServerArtifact(null);
      setConflictServerContent(null);
      onUpdateArtifact?.({ ...saved as Partial<WorkspaceArtifact> });
      showToast((saved as WorkspaceArtifact).persistenceStatus === 'local' ? 'Perubahan tetap berada di draf lokal.' : 'Draf lokal berhasil disimpan ke server.', (saved as WorkspaceArtifact).persistenceStatus === 'local' ? 'info' : 'success');
    } catch {
      showToast('Perubahan belum tersimpan. Draf lokal tetap tersedia.', 'error');
      setSaveStatus('failed');
    }
  };

  const handleUseServerVersion = () => {
    if (conflictServerContent !== null) {
      setEditableContent(conflictServerContent);
      if (conflictServerArtifact) setTitleInput(conflictServerArtifact.title);
      lastSavedContentRef.current = conflictServerContent;
      setIsDirty(false);
      setSaveStatus('saved');
      if (conflictServerArtifact) {
        lastKnownVersionRef.current = conflictServerArtifact.version;
        onUpdateArtifact?.({ ...conflictServerArtifact, persistenceStatus: 'persistent' });
      }
    }
    setHasExternalConflict(false);
    setConflictServerArtifact(null);
    showToast('Versi terbaru dari server diterapkan ke Canvas', 'info');
  };

  const handleCompareConflict = () => {
    setViewMode('diff');
  };

  return (
    <div 
      className={`flex flex-col h-full bg-slate-50/60 dark:bg-[#0B101B] transition-all duration-200 overflow-hidden ${
        isExpanded ? 'fixed inset-0 z-50 bg-white dark:bg-slate-950' : 'relative w-full'
      }`}
    >
      <ArtifactCanvasToolbar
        artifact={artifact} viewMode={viewMode} setViewMode={setViewMode}
        isEditingTitle={isEditingTitle} setIsEditingTitle={setIsEditingTitle}
        titleInput={titleInput} setTitleInput={setTitleInput} titleInputRef={titleInputRef}
        isSavingTitle={isSavingTitle} titleSaveError={titleSaveError} handleSaveTitle={handleSaveTitle}
        saveStatus={saveStatus} saveFailureMessage={saveFailureMessage} handleManualSave={handleManualSave}
        isDirty={isDirty} editorRef={editorRef} showMoreMenu={showMoreMenu} setShowMoreMenu={setShowMoreMenu}
        moreMenuRef={moreMenuRef} showHistory={() => setShowVersionHistoryModal(true)}
        showExport={() => setShowExportModal(true)} isExpanded={isExpanded} toggleExpand={toggleExpand} onClose={onClose}
      >
        <button type="button" onClick={() => { setShowMoreMenu(false); setShowVersionHistoryModal(true); }} className="w-full rounded-xl px-2.5 py-2 text-left text-xs text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"><History className="mr-2 inline h-3.5 w-3.5" />Riwayat Versi</button>
        <button type="button" onClick={() => { setShowMoreMenu(false); setShowExportModal(true); }} className="w-full rounded-xl px-2.5 py-2 text-left text-xs text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"><Download className="mr-2 inline h-3.5 w-3.5" />Ekspor dokumen</button>
        <div className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Dokumen</div>
        <button type="button" onClick={() => { setShowMoreMenu(false); setViewMode('raw'); }} className="w-full rounded-xl px-2.5 py-2 text-left text-xs text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"><Code2 className="mr-2 inline h-3.5 w-3.5" />Lihat Markdown atau kode</button>
        <button type="button" onClick={() => { setShowMoreMenu(false); setViewMode('diff'); }} className="w-full rounded-xl px-2.5 py-2 text-left text-xs text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"><GitCompare className="mr-2 inline h-3.5 w-3.5" />Bandingkan perubahan</button>
        {artifact.type === 'DOCUMENT' && <button type="button" onClick={() => { setIsPresentationStudio(true); setShowMoreMenu(false); setViewMode('edit'); if (!isPresentationContent(editableContent)) void import('./ArtifactDataEditors').then(({ createPresentationFromMarkdown }) => handleContentChange(JSON.stringify(createPresentationFromMarkdown(editableContent, artifact.title)))); }} className="w-full rounded-xl px-2.5 py-2 text-left text-xs text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"><Workflow className="mr-2 inline h-3.5 w-3.5" />Buka PowerPoint Studio</button>}
        <div className="relative z-20 px-1.5 py-1"><WorkspaceToolSelector artifactType={artifact.type} hasArtifact={artifact.id !== 'art_welcome'} disabled={isStreaming} onSelectTool={handleExecuteTool} triggerVariant="header" /></div>
        <button type="button" onClick={handleCopy} className="w-full rounded-xl px-2.5 py-2 text-left text-xs text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"><Copy className="mr-2 inline h-3.5 w-3.5" />Salin Seluruh Konten</button>
        <button type="button" onClick={() => { setShowMoreMenu(false); setShowCitationModal(true); }} className="w-full rounded-xl px-2.5 py-2 text-left text-xs text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"><Quote className="mr-2 inline h-3.5 w-3.5" />Cari Sitasi DOI</button>
        <button type="button" onClick={() => { setShowMoreMenu(false); handleOpenParaphraseWithSelection(); }} className="w-full rounded-xl px-2.5 py-2 text-left text-xs text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"><Pencil className="mr-2 inline h-3.5 w-3.5" />Parafrase Akademis</button>
        <button type="button" onClick={() => void handleDownloadDocx('skripsi')} disabled={isExportingDocx} className="w-full rounded-xl px-2.5 py-2 text-left text-xs text-slate-700 hover:bg-slate-100 disabled:opacity-50 dark:text-slate-200 dark:hover:bg-slate-800"><FileText className="mr-2 inline h-3.5 w-3.5" />Unduh Word Skripsi (.docx)</button>
        <button type="button" onClick={() => handleDownload('md')} className="w-full rounded-xl px-2.5 py-2 text-left text-xs text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"><FileText className="mr-2 inline h-3.5 w-3.5" />Unduh Markdown (.md)</button>
        <button type="button" onClick={() => handleDownload('txt')} className="w-full rounded-xl px-2.5 py-2 text-left text-xs text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"><FileText className="mr-2 inline h-3.5 w-3.5" />Unduh Teks Polos (.txt)</button>
        {artifact.type === 'CITATION' && <button type="button" onClick={handleDownloadRIS} className="w-full rounded-xl px-2.5 py-2 text-left text-xs text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800">Unduh RIS (.ris)</button>}
        {onDuplicateArtifact && <button type="button" disabled={isDuplicating} onClick={async () => { setIsDuplicating(true); try { await onDuplicateArtifact(artifact.id); setShowMoreMenu(false); } catch { showToast('Dokumen belum berhasil diduplikasi.', 'error'); } finally { setIsDuplicating(false); } }} className="w-full rounded-xl px-2.5 py-2 text-left text-xs text-slate-700 hover:bg-slate-100 disabled:opacity-50 dark:text-slate-200 dark:hover:bg-slate-800"><CopyPlus className="mr-2 inline h-3.5 w-3.5" />{isDuplicating ? 'Menduplikasi…' : 'Duplikat Dokumen'}</button>}
        {onDeleteArtifact && <button type="button" onClick={() => { setShowMoreMenu(false); setShowDeleteConfirm(true); }} className="w-full rounded-xl px-2.5 py-2 text-left text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50"><Trash2 className="mr-2 inline h-3.5 w-3.5" />Hapus Artefak Ini</button>}
      </ArtifactCanvasToolbar>

      {/* CONFLICT BANNER: Retain Local Draft with Choice */}
      {hasExternalConflict && (
        <div className="bg-amber-50 dark:bg-amber-950/80 border-b border-amber-200 dark:border-amber-800 px-4 py-2.5 flex items-center justify-between text-xs text-amber-900 dark:text-amber-200 shrink-0 z-10 animate-slide-down">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>
              <strong>Perubahan Terdeteksi di Server:</strong> Dokumen ini telah diperbarui dari sesi lain saat Anda mengedit draf lokal.
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleKeepLocalDraft}
              className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-semibold cursor-pointer shadow-2xs text-[11px]"
            >
              Pertahankan Draf Lokal
            </button>
            <button
              type="button"
              onClick={handleUseServerVersion}
              className="px-2.5 py-1 bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-700 rounded-lg text-slate-700 dark:text-slate-200 font-medium hover:bg-amber-100 cursor-pointer text-[11px]"
            >
              Pakai Versi Server
            </button>
            <button
              type="button"
              onClick={handleCompareConflict}
              className="px-2.5 py-1 bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-700 rounded-lg text-slate-700 dark:text-slate-200 font-medium hover:bg-amber-100 cursor-pointer text-[11px]"
            >
              Bandingkan (Diff)
            </button>
          </div>
        </div>
      )}

      {/* 2. AREA KONTEN KANVAS UTAMA */}
      <div ref={contentScrollRef} onScroll={event => {
        if (!scrollStorageKey) return;
        const scrollTop = event.currentTarget.scrollTop;
        if (scrollSaveTimerRef.current) clearTimeout(scrollSaveTimerRef.current);
        scrollSaveTimerRef.current = setTimeout(() => {
          scrollSaveTimerRef.current = null;
          try { globalThis.sessionStorage?.setItem(scrollStorageKey, String(scrollTop)); } catch { /* Scroll restoration is an enhancement only. */ }
        }, 120);
      }} className="flex-1 overflow-y-auto bg-slate-100/70 dark:bg-[#080d17] p-3 sm:p-5 lg:p-8 custom-scrollbar">
        {/* MODE 4: DIFF (VISUAL VERSION COMPARISON) */}
        {viewMode === 'diff' && (
          <div className="max-w-4xl mx-auto h-145 flex flex-col shadow-sm">
            <React.Suspense fallback={<div className="p-8 text-center text-xs text-slate-400">Memuat visual diff...</div>}>
              <ArtifactDiffViewer
                currentArtifact={{ ...artifact, content: editableContent }}
                baseVersion={previewingVersion}
                onCloseDiff={() => setViewMode('preview')}
              />
            </React.Suspense>
          </div>
        )}

        {viewMode === 'edit' && artifact.type === 'TABLE' && <React.Suspense fallback={<div role="status" className="mx-auto max-w-4xl p-6 text-xs text-slate-500">Memuat Spreadsheet Studio…</div>}><ArtifactTableEditor content={editableContent} onChange={handleContentChange} onBlur={flushDraftSync} /></React.Suspense>}
        {viewMode === 'edit' && isPresentationStudio && <React.Suspense fallback={<div role="status" className="mx-auto max-w-4xl p-6 text-xs text-slate-500">Memuat PowerPoint Studio…</div>}><ArtifactPresentationEditor content={editableContent} title={artifact.title} onChange={handleContentChange} onBlur={flushDraftSync} /></React.Suspense>}
        {viewMode === 'edit' && artifact.type !== 'TABLE' && !isPresentationStudio && <React.Suspense fallback={<div role="status" className="mx-auto max-w-4xl p-6 text-xs text-slate-500">Memuat editor…</div>}><ArtifactCanvasEditor
          artifactType={artifact.type} artifact={artifact} onRequestRevision={onRequestRevision} content={editableContent} editorRef={editorRef}
          onChange={handleContentChange} onBlur={flushDraftSync} selection={selection}
          onSelect={captureSelection} inlineActions={inlineActions} isStreaming={isStreaming}
          onRequestInlineEdit={requestInlineEdit} showInlineAsk={showInlineAsk}
          setShowInlineAsk={value => setShowInlineAsk(value)} inlineInstruction={inlineInstruction}
          setInlineInstruction={setInlineInstruction}
          onRequestAsk={() => { if (inlineInstruction.trim()) requestInlineEdit(inlineInstruction.trim()); }}
          patch={visibleInlineEditPatch} patchError={inlinePatchError}
          onDismissPatch={() => { onDismissInlineEdit?.(); setInlinePatchError(''); }}
          onAcceptPatch={() => void acceptInlinePatch()} isSaving={saveStatus === 'saving'} wordCount={wordCount}
        /></React.Suspense>}

        {/* MODE 3: KODE / MARKDOWN (RAW SOURCE DENGAN GUTTER NOMOR BARIS) */}
        {viewMode === 'raw' && (
          <div className="max-w-3xl mx-auto rounded-2xl overflow-hidden border border-slate-700/60 dark:border-slate-800 bg-[#0d1117] text-slate-200 shadow-md">
            <div className="px-4 py-2.5 bg-[#161b22] border-b border-slate-800 flex items-center justify-between text-xs font-mono text-slate-400">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                <span className="ml-2 text-[11px] text-slate-300 font-sans font-medium">
                  Raw Source ({artifact.type === 'CODE' ? (artifact.language || 'code') : 'Markdown'})
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span>{lineCount} baris</span>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="text-[11px] font-sans flex items-center gap-1 text-slate-300 hover:text-emerald-400 transition-colors cursor-pointer"
                  title="Salin raw code/markdown"
                >
                  {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{isCopied ? 'Tersalin' : 'Salin Raw'}</span>
                </button>
              </div>
            </div>

            <div className="p-4 sm:p-6 overflow-x-auto text-xs sm:text-sm font-mono leading-relaxed select-text flex">
              <pre aria-hidden="true" className="m-0 pr-4 select-none text-slate-600 dark:text-slate-500 text-right font-mono text-xs leading-relaxed border-r border-slate-800 mr-4 shrink-0">{lineNumbers}</pre>
              <pre className="flex-1 custom-scrollbar text-slate-100 overflow-x-auto">
                <code>{editableContent}</code>
              </pre>
            </div>
          </div>
        )}

        {/* MODE 1: PRATINJAU (PAPER SHEET AESTHETIC FOR DOCUMENTS) */}
        {viewMode === 'preview' && (
          artifact.type === 'DOCUMENT' && isPresentationStudio ? (
            <div className="mx-auto my-4 max-w-5xl space-y-4">{(() => { try { const deck = JSON.parse(editableContent) as { slides?: Array<{ title?: string; body?: string; notes?: string }>; theme?: string }; if (!Array.isArray(deck.slides)) return <p role="alert" className="rounded-lg bg-amber-50 p-4 text-sm text-amber-800">Format slide tidak valid.</p>; return <><div className="flex items-center justify-between text-xs text-slate-500"><span>Presentasi · {deck.slides.length} slide</span><span>Tema: {deck.theme || 'academic_minimal'}</span></div>{deck.slides.map((slide, index) => <article key={`${index}-${slide.title}`} className="aspect-video overflow-hidden rounded-xl border border-slate-200 bg-white p-[6%] shadow-sm dark:border-slate-800 dark:bg-slate-900"><p className="mb-4 text-[10px] uppercase tracking-wide text-emerald-600">Slide {index + 1}</p><h2 className="mb-4 text-xl font-bold text-slate-900 dark:text-slate-100">{slide.title}</h2><p className="whitespace-pre-wrap text-sm leading-7 text-slate-700 dark:text-slate-300">{slide.body}</p><details className="mt-4 text-[10px] text-slate-500"><summary>Speaker notes</summary><p className="mt-1 whitespace-pre-wrap">{slide.notes}</p></details></article>)}</>; } catch { return <p role="alert" className="rounded-lg bg-amber-50 p-4 text-sm text-amber-800">Format slide tidak valid.</p>; } })()}</div>
          ) : artifact.type === 'TABLE' ? (
            savedTable ? <TableArtifactPreview table={savedTable} /> : <p role="alert" className="m-6 rounded-lg bg-amber-50 p-4 text-xs text-amber-800">Dataset tabel ini tidak valid.</p>
          ) : artifact.type === 'CHART' ? (
            savedChart ? <ChartArtifactPreview chart={savedChart} /> : <p role="alert" className="m-6 rounded-lg bg-amber-50 p-4 text-xs text-amber-800">Spesifikasi grafik ini tidak valid.</p>
          ) : isMermaid ? (
            <div className="max-w-3xl mx-auto space-y-4">
              <React.Suspense fallback={<div className="p-8 text-center text-xs text-slate-400">Merender diagram Mermaid...</div>}>
                <MermaidRenderer 
                  chart={editableContent} 
                  title={artifact.title}
                  onRequestFixDiagram={(rawCode) => {
                    if (onRequestRevision) {
                      onRequestRevision(`Tolong perbaiki sintaks diagram Mermaid berikut agar valid dan dapat dirender secara visual:\n\`\`\`mermaid\n${rawCode}\n\`\`\``, { ...artifact, content: editableContent });
                    }
                  }}
                />
              </React.Suspense>
              <details className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-4 text-xs">
                <summary className="font-semibold text-slate-700 dark:text-slate-300 cursor-pointer select-none flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Workflow className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    Lihat Sintaks Sumber Diagram (Mermaid)
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">Buka/Tutup</span>
                </summary>
                <div className="mt-3 p-3 bg-slate-950 text-slate-200 rounded-xl font-mono text-[11px] overflow-x-auto">
                  <pre>
                    <code>{editableContent}</code>
                  </pre>
                </div>
              </details>
            </div>
          ) : artifact.type === 'CODE' ? (
            <div className="max-w-3xl mx-auto space-y-4">
              <div className="rounded-2xl overflow-hidden border border-slate-200/80 dark:border-slate-800 bg-[#1a1b26] text-slate-200 shadow-md">
                <div className="px-4 py-2.5 bg-[#16161e] border-b border-slate-700/50 flex items-center justify-between text-xs font-mono text-slate-400">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                    <span className="ml-2 text-[11px] text-slate-300 font-sans font-medium">{artifact.title}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span>{artifact.language || 'code'}</span>
                    <span>•</span>
                    <span>{lineCount} baris</span>
                  </div>
                </div>
                <div className="p-4 sm:p-6 overflow-x-auto text-xs sm:text-sm font-mono leading-relaxed select-text">
                  <pre className="custom-scrollbar">
                    <code>{editableContent}</code>
                  </pre>
                </div>
              </div>

              <CodeExecutionResultPanel
                result={validationResult}
                status={executionStatus}
                onClose={() => {
                  setValidationResult(null);
                  setExecutionStatus('idle');
                }}
                onStop={handleStopExecution}
              />
            </div>
          ) : (
            /* PAPER SHEET VIEW: Lembaran Kertas Kerja Rapi (max-w-3xl, centered, p-8 sampai p-12, shadow-sm, border tipis) */
            <div className="max-w-3xl mx-auto my-2 sm:my-4 bg-white dark:bg-slate-900 rounded-2xl p-7 sm:p-10 md:p-12 border border-slate-200/70 dark:border-slate-800 shadow-sm leading-relaxed print-document-area">
              {/* Top Citation Style Bar jika tipe CITATION */}
              {artifact.type === 'CITATION' && (
                <div className="mb-6 pb-4 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <BookMarked className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    <span className="font-semibold text-slate-700 dark:text-slate-300 mr-1">Format:</span>
                    {(['APA7', 'IEEE', 'HARVARD', 'BIBTEX'] as CitationStyle[]).map((style) => (
                      <button
                        key={style}
                        type="button"
                        onClick={() => {
                          setCitationStyle(style);
                          if (onRequestRevision) {
                            onRequestRevision(`Tolong konversi seluruh sitasi ini ke format standar ${style}.`, { ...artifact, content: editableContent });
                          }
                        }}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors cursor-pointer ${
                          citationStyle === style
                            ? 'bg-emerald-600 text-white font-semibold'
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        {style}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-1 text-[11px]">
                    <span className="text-slate-400 mr-1">Salin:</span>
                    <button
                      type="button"
                      onClick={() => handleCopyCitationFormatted('APA7')}
                      className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 text-slate-700 dark:text-slate-300 text-[10.5px] cursor-pointer font-medium"
                    >
                      APA
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCopyCitationFormatted('IEEE')}
                      className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 text-slate-700 dark:text-slate-300 text-[10.5px] cursor-pointer font-medium"
                    >
                      IEEE
                    </button>
                    <button
                      type="button"
                      onClick={handleDownloadBibTeX}
                      className="px-2 py-0.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 text-[10.5px] font-mono cursor-pointer"
                    >
                      .bib
                    </button>
                  </div>
                </div>
              )}

              {/* Clean Typography with Lora Serif & Emerald Accent Blockquotes */}
              <div className="prose dark:prose-invert max-w-none text-xs sm:text-sm md:text-base leading-relaxed font-serif prose-headings:font-heading prose-headings:tracking-tight prose-headings:text-slate-900 dark:prose-headings:text-slate-50 prose-p:leading-relaxed prose-p:my-3.5 prose-a:text-emerald-600 dark:prose-a:text-emerald-400 prose-blockquote:border-l-[3px] prose-blockquote:border-emerald-500/80 prose-blockquote:bg-emerald-50/40 dark:prose-blockquote:bg-emerald-950/20 prose-blockquote:py-2.5 prose-blockquote:px-4 prose-blockquote:rounded-r-xl prose-blockquote:italic prose-pre:bg-slate-900 prose-pre:text-slate-100 prose-hr:border-slate-200 dark:prose-hr:border-slate-800">
                <LazyMarkdown content={editableContent || '*(Artefak kosong)*'} />
              </div>

              {/* Contextual Revision Chips at Document Bottom */}
              <div className="mt-10 pt-6 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-2.5">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 select-none">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Saran Revisi Cepat:</span>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {quickRevisions.map((rev, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleExecuteTool(rev.tool)}
                      disabled={isStreaming}
                      className="px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-50 hover:bg-emerald-50 dark:bg-slate-800/80 dark:hover:bg-emerald-950/40 text-slate-700 dark:text-slate-300 hover:text-emerald-800 dark:hover:text-emerald-300 border border-slate-200/80 dark:border-slate-700 hover:border-emerald-300 transition-all cursor-pointer disabled:opacity-50"
                    >
                      {rev.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )
        )}
      </div>

      {/* 3. STATUS BAR BAWAH RAMPING (~28px - 32px) */}
      <footer className="h-8 px-4 bg-white/95 dark:bg-secondary-900/95 border-t border-slate-200/80 dark:border-slate-800/80 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between shrink-0 select-none z-10">
        {/* Kiri: Status penyimpanan + Streaming indicator */}
        <div className="flex items-center gap-2">
          {saveStatus === 'saving' ? (
            <span className="inline-flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-medium animate-pulse">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>Menyimpan otomatis...</span>
            </span>
          ) : saveStatus === 'unsaved' ? (
            <span className="inline-flex items-center gap-1.5 text-amber-600 dark:text-amber-500 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              <span>Perubahan belum disimpan</span>
            </span>
          ) : saveStatus === 'failed' ? (
            <span className="inline-flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-medium">
              <AlertTriangle className="w-3 h-3" />
              <span>Gagal menyimpan perubahan</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-slate-400 dark:text-slate-500">
              <Check className="w-3 h-3 text-emerald-500/70" />
              <span>{saveStatus === 'local' ? 'Draf lokal (belum tersimpan ke server)' : 'Tersimpan otomatis'}</span>
            </span>
          )}

          {isStreaming && (
            <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium animate-pulse ml-2 border-l border-slate-200 dark:border-slate-700 pl-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
              <span>AI sedang menyusun...</span>
            </span>
          )}
        </div>

        {/* Kanan: Info kata & waktu baca / Info kode */}
        <div className="flex items-center gap-2">
          {artifact.type === 'CODE' ? (
            <>
              <span className="font-mono">{artifact.language || 'code'}</span>
              <span>•</span>
              <span>{lineCount} baris</span>
              {viewMode === 'preview' && (
                <div className="flex items-center gap-1.5 ml-2">
                  <button
                    type="button"
                    onClick={handleRunStaticCheck}
                    disabled={executionStatus === 'running' || executionStatus === 'checking' || isStreaming}
                    aria-label="Periksa kode secara statis"
                    className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 text-[10.5px] font-semibold cursor-pointer disabled:opacity-50 transition-colors"
                  >
                    <Check className="w-2.5 h-2.5" />
                    <span>{executionStatus === 'checking' ? 'Memeriksa...' : 'Periksa kode'}</span>
                  </button>

                  {((artifact.language || '').toLowerCase() === 'javascript' || (artifact.language || '').toLowerCase() === 'js') && (
                    <button
                      type="button"
                      onClick={handleRunSecureSandbox}
                      disabled={executionStatus === 'running' || executionStatus === 'checking' || isStreaming}
                      aria-label="Jalankan kode di sandbox lokal aman"
                      className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[10.5px] font-semibold cursor-pointer disabled:opacity-50 transition-colors"
                    >
                      <Play className="w-2.5 h-2.5 fill-current" />
                      <span>{executionStatus === 'running' ? 'Menjalankan...' : 'Jalankan aman'}</span>
                    </button>
                  )}
                </div>
              )}
            </>
          ) : (
            <span>{wordCount} kata • ±{readingTime} mnt baca</span>
          )}
        </div>
      </footer>

      <ArtifactVersionHistoryModal
        isOpen={showVersionHistoryModal} artifact={artifact} setPreviewingVersion={setPreviewingVersion}
        onClose={() => setShowVersionHistoryModal(false)}
        onCompare={version => { setPreviewingVersion(version); setViewMode('diff'); setShowVersionHistoryModal(false); }}
        onRollback={onRollbackVersion} showToast={showToast}
      />

      {/* 5. MODAL KONFIRMASI HAPUS DOKUMEN */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div 
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs select-none"
            variants={modalBackdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={() => { if (!isDeleting) setShowDeleteConfirm(false); }}
          >
            <motion.div 
              className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-5 space-y-4"
              variants={modalPanelVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 flex items-center justify-center text-rose-600 shrink-0">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm sm:text-base">
                    Hapus Dokumen Artefak?
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    "{artifact.title}"
                  </p>
                </div>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Tindakan ini akan menghapus artefak dokumen ini secara permanen dari sesi dan basis data. Seluruh riwayat versi terkait juga akan dibersihkan.
              </p>
              {deleteError && <p role="alert" className="text-xs font-medium text-rose-600">{deleteError}</p>}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={isDeleting || !onDeleteArtifact || saveStatus === 'saving'}
                  onClick={async () => {
                    if (!onDeleteArtifact || isDeleting || saveStatus === 'saving') return;
                    setIsDeleting(true);
                    setDeleteError('');
                    try {
                      await onDeleteArtifact(artifact.id);
                      setShowDeleteConfirm(false);
                    } catch {
                      setDeleteError('Dokumen belum berhasil dihapus. Coba lagi.');
                    } finally {
                      setIsDeleting(false);
                    }
                  }}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white transition-colors cursor-pointer shadow-2xs disabled:opacity-50"
                >
                  {isDeleting ? 'Menghapus…' : 'Ya, Hapus Dokumen'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ArtifactExportHost
        isOpen={showExportModal} onClose={() => setShowExportModal(false)} artifact={artifact}
        content={editableContent} showToast={showToast} onGenerateBibTeX={generateBibTeX} onGenerateRIS={generateRIS}
      />

      {/* 7. MODAL PENCARI & GENERATOR SITASI DOI ILMIAH */}
      {showCitationModal && (
        <React.Suspense fallback={null}>
          <CitationSearchModal
            isOpen={showCitationModal}
            onClose={() => setShowCitationModal(false)}
            onInsertCitation={(formattedCitation) => handleInsertCitation(formattedCitation)}
          />
        </React.Suspense>
      )}

      {/* 8. MODAL PARAFRASE AKADEMIK BERETIKA */}
      {showParaphraseModal && (
        <React.Suspense fallback={null}>
          <AcademicParaphraseModal
            isOpen={showParaphraseModal}
            initialText={paraphraseInitialText}
            onClose={() => setShowParaphraseModal(false)}
            onApplyParaphrase={(newText) => handleApplyParaphrase(newText)}
          />
        </React.Suspense>
      )}
    </div>
  );
});
