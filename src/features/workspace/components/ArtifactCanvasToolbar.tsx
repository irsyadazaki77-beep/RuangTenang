import React from 'react';
import { Code2, Download, Edit3, Eye, FileText, History, ListTree, Maximize2, Minimize2, MoreHorizontal, Pencil, Quote, Save, Sparkles, Table2, BarChart3 } from 'lucide-react';
import { motion } from 'motion/react';
import { WorkspaceArtifact } from '../types';
import type { CanvasViewMode, SaveState } from './ArtifactCanvas';

interface ArtifactCanvasToolbarProps {
  artifact: WorkspaceArtifact;
  viewMode: CanvasViewMode;
  setViewMode: (mode: CanvasViewMode) => void;
  isEditingTitle: boolean;
  setIsEditingTitle: (editing: boolean) => void;
  titleInput: string;
  setTitleInput: (title: string) => void;
  titleInputRef: React.RefObject<HTMLInputElement | null>;
  isSavingTitle: boolean;
  titleSaveError: string;
  handleSaveTitle: () => void;
  saveStatus: SaveState;
  saveFailureMessage: string;
  handleManualSave: () => void;
  isDirty: boolean;
  editorRef: React.RefObject<HTMLTextAreaElement | null>;
  showMoreMenu: boolean;
  setShowMoreMenu: (show: boolean) => void;
  moreMenuRef: React.RefObject<HTMLDivElement | null>;
  showHistory: () => void;
  showExport: () => void;
  isExpanded: boolean;
  toggleExpand: () => void;
  onClose?: () => void;
  children: React.ReactNode;
}

export const ArtifactCanvasToolbar: React.FC<ArtifactCanvasToolbarProps> = ({
  artifact, viewMode, setViewMode, isEditingTitle, setIsEditingTitle, titleInput, setTitleInput, titleInputRef,
  isSavingTitle, titleSaveError, handleSaveTitle, saveStatus, saveFailureMessage, handleManualSave,
  isDirty, editorRef, showMoreMenu, setShowMoreMenu, moreMenuRef, showHistory, showExport,
  isExpanded, toggleExpand, onClose, children
}) => {
  const getArtifactIcon = () => {
    const className = 'h-4 w-4';
    switch (artifact.type) {
      case 'CODE': return <Code2 className={`${className} text-emerald-600 dark:text-emerald-400`} />;
      case 'CITATION': return <Quote className={`${className} text-amber-500`} />;
      case 'OUTLINE': return <ListTree className={`${className} text-teal-500`} />;
      case 'CHART': return <BarChart3 className={`${className} text-sky-600 dark:text-sky-400`} />;
      case 'TABLE': return <Table2 className={`${className} text-emerald-600 dark:text-emerald-400`} />;
      case 'DOCUMENT': return <FileText className={`${className} text-emerald-600 dark:text-emerald-400`} />;
      default: return <Sparkles className={`${className} text-emerald-600 dark:text-emerald-400`} />;
    }
  };
  const switchToEdit = () => { setViewMode('edit'); requestAnimationFrame(() => editorRef.current?.focus()); };
  const saveStatusLabel = saveStatus === 'saving' ? 'Menyimpan…' : saveStatus === 'unsaved' ? 'Belum disimpan' : saveStatus === 'failed' ? saveFailureMessage : saveStatus === 'local' ? 'Draf lokal' : 'Tersimpan';

  return <header className="relative z-20 flex h-12 shrink-0 items-center justify-between gap-2 border-b border-slate-200/70 bg-white px-3 py-1.5 dark:border-slate-800/80 dark:bg-secondary-900 sm:px-4">
    <div className="flex min-w-0 flex-1 items-center gap-2 sm:max-w-[34%]">
      <span className="shrink-0 text-slate-500 dark:text-slate-400" title={`Tipe Dokumen: ${artifact.type}`}>{getArtifactIcon()}</span>
      {isEditingTitle ? <div className="min-w-0 flex-1">
      <input ref={titleInputRef} value={titleInput} onChange={event => setTitleInput(event.target.value)} onBlur={() => { if (!isSavingTitle) void handleSaveTitle(); }} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); void handleSaveTitle(); } if (event.key === 'Escape') { setTitleInput(artifact.title || ''); setIsEditingTitle(false); } }} disabled={isSavingTitle} autoFocus aria-label="Judul artifact" className="h-7 w-full rounded-lg border border-emerald-500 bg-white px-2 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:bg-slate-900 dark:text-slate-100" />
        {titleSaveError && <span role="alert" className="text-[10px] text-rose-600">{titleSaveError}</span>}
      </div> : <button type="button" onClick={() => setIsEditingTitle(true)} className="group flex min-w-0 items-center gap-1.5 truncate text-left" title="Klik untuk mengubah judul dokumen">
        <span className="truncate text-xs font-semibold text-slate-900 group-hover:text-emerald-700 dark:text-slate-100">{artifact.title || 'Artefak RuangKerja'}</span><Pencil className="h-3 w-3 shrink-0 text-slate-400" />
      </button>}
      <span className={`hidden shrink-0 items-center text-[11px] sm:inline-flex ${saveStatus === 'failed' ? 'text-rose-600' : saveStatus === 'unsaved' || saveStatus === 'saving' ? 'text-amber-600' : 'text-emerald-600'}`} role="status" aria-live="polite">{saveStatusLabel}</span>
    </div>
    <div className="flex h-8 shrink-0 items-center rounded-xl border border-slate-200/80 bg-slate-100 p-0.5 dark:border-slate-700/80 dark:bg-slate-800/90" role="group" aria-label="Mode artifact">
      {(['preview', 'edit'] as const).map(mode => <button key={mode} type="button" onClick={() => mode === 'edit' ? switchToEdit() : setViewMode('preview')} aria-pressed={viewMode === mode} title={mode === 'edit' ? 'Edit Dokumen Langsung (Autosave)' : 'Preview'} className={`relative z-10 inline-flex h-full items-center gap-1.5 rounded-lg px-2.5 text-[11px] ${viewMode === mode ? 'font-semibold text-emerald-800 dark:text-emerald-300' : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'}`}>
        {viewMode === mode && <motion.span layoutId="canvasViewModePill" className="absolute inset-0 -z-10 rounded-lg bg-white shadow-2xs ring-1 ring-black/5 dark:bg-slate-900 dark:ring-white/10" transition={{ type: 'spring', stiffness: 450, damping: 32 }} />}
        {mode === 'edit' ? <Edit3 className="h-3 w-3" /> : <Eye className="h-3 w-3" />}<span className="hidden sm:inline">{mode === 'edit' ? 'Edit' : 'Preview'}</span>
      </button>)}
    </div>
    <div className="flex shrink-0 items-center gap-1.5">
      {viewMode === 'edit' && isDirty && <button type="button" onClick={handleManualSave} disabled={saveStatus === 'saving'} className="inline-flex h-8 items-center gap-1 rounded-xl bg-emerald-600 px-2.5 text-xs font-semibold text-white disabled:opacity-50"><Save className="h-3.5 w-3.5" /><span className="hidden sm:inline">Simpan</span></button>}
      {viewMode === 'preview' && <button type="button" onClick={switchToEdit} className="inline-flex h-8 items-center gap-1 rounded-xl border border-emerald-200 bg-emerald-50 px-2.5 text-xs font-semibold text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300" title="Mulai Edit Dokumen Ini"><Edit3 className="h-3.5 w-3.5" /><span className="hidden 2xl:inline">Edit Dokumen</span></button>}
      <button type="button" onClick={showHistory} className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200/80 bg-white text-slate-600 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-300 sm:w-auto sm:px-2.5" aria-label="Riwayat versi" title="Riwayat versi"><History className="h-3.5 w-3.5" /><span className="hidden text-[11px] xl:inline">Riwayat</span></button>
      <button type="button" onClick={showExport} className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200/80 bg-white text-slate-600 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-300 sm:w-auto sm:px-2.5" aria-label="Ekspor artifact" title="Ekspor artifact"><Download className="h-3.5 w-3.5" /><span className="hidden text-[11px] xl:inline">Ekspor</span></button>
      <button type="button" onClick={toggleExpand} className="hidden h-8 w-8 items-center justify-center rounded-xl border border-slate-200/80 bg-white text-slate-500 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:border-slate-700 dark:bg-slate-800/80 dark:hover:bg-slate-800 sm:flex" title={isExpanded ? 'Kembalikan Ukuran Layar' : 'Mode Layar Penuh (Fokus)'} aria-label="Toggle Fullscreen">{isExpanded ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}</button>
      <div className="relative" ref={moreMenuRef}>
        <button type="button" onClick={() => setShowMoreMenu(!showMoreMenu)} className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200/80 bg-white text-slate-700 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-200 dark:hover:bg-slate-800" aria-label="Menu Opsi Lainnya" aria-expanded={showMoreMenu}><MoreHorizontal className="h-4 w-4" /></button>
        {showMoreMenu && <div className="absolute right-0 top-full z-50 mt-1.5 max-h-[min(75dvh,34rem)] w-60 space-y-0.5 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-slate-800 dark:bg-slate-900">{children}</div>}
      </div>
      {onClose && <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200/80 bg-white text-slate-400 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:border-slate-700 dark:bg-slate-800/80" title="Tutup Canvas (Kembali ke Obrolan)" aria-label="Tutup Canvas"><span aria-hidden="true">×</span></button>}
    </div>
  </header>;
};

