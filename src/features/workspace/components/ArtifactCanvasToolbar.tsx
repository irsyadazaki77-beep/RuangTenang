import React, { useState, useEffect, useRef } from 'react';
import {
  Code2, Download, Edit3, Eye, FileText, GitCompare, History, ListTree, Maximize2,
  Minimize2, MoreHorizontal, Pencil, Quote, Save, Sparkles, Table2, BarChart3,
  Volume2, VolumeX, SlidersHorizontal, GraduationCap, Gem, Scissors, BookOpen,
  ShieldCheck, ArrowDownWideNarrow
} from 'lucide-react';
import { motion } from 'motion/react';
import { WorkspaceArtifact } from '../types';
import type { CanvasViewMode, SaveState } from './ArtifactCanvas';
import { soundscapeEngine } from '../../../lib/soundscapeEngine';

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
  hasExternalConflict?: boolean;
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
  onQuickTransform?: (instruction: string) => void;
  children: React.ReactNode;
}

export const ArtifactCanvasToolbar: React.FC<ArtifactCanvasToolbarProps> = ({
  artifact, viewMode, setViewMode, isEditingTitle, setIsEditingTitle, titleInput, setTitleInput, titleInputRef,
  isSavingTitle, titleSaveError, handleSaveTitle, saveStatus, saveFailureMessage, handleManualSave, hasExternalConflict = false,
  isDirty, editorRef, showMoreMenu, setShowMoreMenu, moreMenuRef, showHistory, showExport,
  isExpanded, toggleExpand, onClose, onQuickTransform, children
}) => {
  const [isSoundscapePlaying, setIsSoundscapePlaying] = useState(false);
  const [showTransformMenu, setShowTransformMenu] = useState(false);
  const transformMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (transformMenuRef.current && !transformMenuRef.current.contains(e.target as Node)) {
        setShowTransformMenu(false);
      }
    };
    if (showTransformMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showTransformMenu]);

  useEffect(() => {
    return () => {
      if (isSoundscapePlaying) {
        soundscapeEngine.destroy();
      }
    };
  }, [isSoundscapePlaying]);

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
  const saveStatusLabel = saveStatus === 'saving' ? 'Menyimpan…' : saveStatus === 'unsaved' ? 'Belum disimpan' : saveStatus === 'failed' ? saveFailureMessage : saveStatus === 'local' ? 'Draf lokal tab ini' : 'Tersimpan';

  return <header className="relative z-20 flex h-12 shrink-0 items-center justify-between gap-2 border-b border-slate-200/70 bg-white/95 px-3 py-1.5 dark:border-slate-800/80 dark:bg-[#0b101b]/95 backdrop-blur-md sm:px-4 @max-[600px]:h-auto @max-[600px]:min-h-12 @max-[600px]:flex-wrap">
    <div className="flex min-w-0 flex-1 items-center gap-2 sm:max-w-[34%] @max-[600px]:w-full @max-[600px]:flex-auto @max-[600px]:max-w-none">
      <span className="shrink-0 text-slate-500 dark:text-slate-400" title={`Tipe Dokumen: ${artifact.type}`}>{getArtifactIcon()}</span>
      {isEditingTitle ? <div className="min-w-0 flex-1">
      <input ref={titleInputRef} value={titleInput} onChange={event => setTitleInput(event.target.value)} onBlur={() => { if (!isSavingTitle) void handleSaveTitle(); }} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); void handleSaveTitle(); } if (event.key === 'Escape') { setTitleInput(artifact.title || ''); setIsEditingTitle(false); } }} disabled={isSavingTitle} autoFocus aria-label="Judul artifact" className="h-7 w-full rounded-lg border border-emerald-500 bg-white px-2 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:bg-slate-900 dark:text-slate-100" />
        {titleSaveError && <span role="alert" className="text-[10px] text-rose-600">{titleSaveError}</span>}
      </div> : <button type="button" disabled={hasExternalConflict} onClick={() => setIsEditingTitle(true)} className="group flex min-w-0 items-center gap-1.5 truncate text-left disabled:cursor-not-allowed disabled:opacity-60" title={hasExternalConflict ? 'Selesaikan konflik draf sebelum mengubah judul.' : 'Klik untuk mengubah judul dokumen'}>
        <span className="truncate text-xs font-semibold text-slate-900 group-hover:text-emerald-700 dark:text-slate-100">{artifact.title || 'Artefak RuangKerja'}</span><Pencil className="h-3 w-3 shrink-0 text-slate-400" />
      </button>}
      <span
        title={saveStatus === 'local' ? 'Belum tersimpan ke server; pemulihan bergantung pada penyimpanan sesi browser.' : undefined}
        className={`hidden shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition sm:inline-flex @max-[600px]:hidden ${
          saveStatus === 'failed'
            ? 'border-rose-200 bg-rose-50/80 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300'
            : saveStatus === 'unsaved' || saveStatus === 'saving'
              ? 'border-amber-200 bg-amber-50/80 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300'
              : 'border-emerald-200/70 bg-emerald-50/60 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300'
        }`}
        role="status"
        aria-live="polite"
      >
        <span className={`inline-block h-1.5 w-1.5 rounded-full ${saveStatus === 'saving' ? 'bg-amber-500 animate-ping' : saveStatus === 'unsaved' ? 'bg-amber-400' : 'bg-emerald-500'}`} />
        {saveStatusLabel}
      </span>
    </div>
    <div className="flex h-8 shrink-0 items-center rounded-xl border border-slate-200/80 bg-slate-100 p-0.5 dark:border-slate-700/80 dark:bg-slate-800/90" role="group" aria-label="Mode artifact">
      {(['preview', 'edit', 'raw', 'diff'] as const).map(mode => {
        const label = mode === 'edit' ? 'Edit' : mode === 'raw' ? 'Kode' : mode === 'diff' ? 'Diff' : 'Preview';
        const title = mode === 'edit' ? 'Edit Dokumen Langsung (Autosave)' : mode === 'raw' ? 'Lihat Markdown atau kode' : mode === 'diff' ? 'Bandingkan perubahan' : 'Preview';
        return (
          <button
            key={mode}
            type="button"
            onClick={() => mode === 'edit' ? switchToEdit() : setViewMode(mode)}
            aria-pressed={viewMode === mode}
            title={title}
            className={`relative z-10 inline-flex h-full items-center gap-1 rounded-lg px-2 sm:px-2.5 text-[11px] cursor-pointer transition-colors ${viewMode === mode ? 'font-semibold text-emerald-800 dark:text-emerald-300' : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'}`}
          >
            {viewMode === mode && <motion.span layoutId="canvasViewModePill" className="absolute inset-0 -z-10 rounded-lg bg-white shadow-2xs ring-1 ring-black/5 dark:bg-slate-900 dark:ring-white/10" transition={{ type: 'spring', stiffness: 450, damping: 32 }} />}
            {mode === 'edit' ? <Edit3 className="h-3 w-3" /> : mode === 'raw' ? <Code2 className="h-3 w-3" /> : mode === 'diff' ? <GitCompare className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
            <span className="hidden md:inline">{label}</span>
          </button>
        );
      })}
    </div>
    <div className="flex shrink-0 items-center gap-1.5">
      {/* Gemini Canvas Smart Transformation Dropdown */}
      <div className="relative" ref={transformMenuRef}>
        <button
          type="button"
          onClick={() => setShowTransformMenu(!showTransformMenu)}
          className={`inline-flex min-h-[36px] items-center gap-1.5 rounded-xl border px-2.5 text-xs font-semibold cursor-pointer transition-colors shadow-2xs ${
            showTransformMenu
              ? 'border-indigo-400 bg-indigo-100/90 text-indigo-900 dark:border-indigo-600 dark:bg-indigo-950 dark:text-indigo-200'
              : 'border-indigo-200 bg-indigo-50/70 text-indigo-700 hover:bg-indigo-100/80 dark:border-indigo-800/80 dark:bg-indigo-950/40 dark:text-indigo-300'
          }`}
          title="Transformasi Cepat Dokumen / Teks (Gemini Canvas Smart Adjusters)"
          aria-expanded={showTransformMenu}
        >
          <SlidersHorizontal className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
          <span className="hidden sm:inline">Transformasi</span>
        </button>

        {showTransformMenu && (
          <div className="absolute left-0 sm:right-0 sm:left-auto top-full z-50 mt-1.5 w-76 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-2xl backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/95 animate-in fade-in slide-in-from-top-1">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 dark:border-slate-800">
              <span className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-100">
                <Sparkles className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                Transformasi Cepat (Smart Sliders)
              </span>
              <span className="text-[10px] text-slate-400">Gemini Canvas</span>
            </div>

            {/* Academic Tone Selection */}
            <div className="space-y-1.5 mb-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Gaya Bahasa (Tone)</p>
              <div className="grid grid-cols-3 gap-1">
                <button
                  type="button"
                  onClick={() => {
                    onQuickTransform?.('Ubah gaya bahasa naskah ini menjadi penulisan skripsi akademik formal, objektif, dan baku sesuai EYD V.');
                    setShowTransformMenu(false);
                  }}
                  className="flex flex-col items-center gap-1 p-1.5 rounded-xl border border-slate-200/80 bg-slate-50 hover:bg-indigo-50 hover:border-indigo-300 text-[10px] font-medium text-slate-700 hover:text-indigo-800 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-200 text-center transition"
                >
                  <GraduationCap className="h-3.5 w-3.5 text-indigo-600" />
                  <span>Skripsi</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onQuickTransform?.('Tingkatkan standar naskah ini ke format artikel jurnal internasional bereputasi tinggi (Scopus Q1) dengan terminologi metodologis yang tajam dan presisi konseptual.');
                    setShowTransformMenu(false);
                  }}
                  className="flex flex-col items-center gap-1 p-1.5 rounded-xl border border-slate-200/80 bg-slate-50 hover:bg-amber-50 hover:border-amber-300 text-[10px] font-medium text-slate-700 hover:text-amber-800 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-200 text-center transition"
                >
                  <Gem className="h-3.5 w-3.5 text-amber-600" />
                  <span>Jurnal Q1</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onQuickTransform?.('Tulis ulang naskah ini dengan gaya bahasa populer yang komunikatif dan mudah dipahami pembaca non-akademisi tanpa mengubah esensi isi.');
                    setShowTransformMenu(false);
                  }}
                  className="flex flex-col items-center gap-1 p-1.5 rounded-xl border border-slate-200/80 bg-slate-50 hover:bg-teal-50 hover:border-teal-300 text-[10px] font-medium text-slate-700 hover:text-teal-800 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-200 text-center transition"
                >
                  <BookOpen className="h-3.5 w-3.5 text-teal-600" />
                  <span>Populer</span>
                </button>
              </div>
            </div>

            {/* Length Controls */}
            <div className="space-y-1.5 mb-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Kedalaman & Panjang Naskah</p>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    onQuickTransform?.('Ringkas naskah ini menjadi sekitar 30% lebih padat dan to the point tanpa menghilangkan esensi poin utama.');
                    setShowTransformMenu(false);
                  }}
                  className="flex items-center justify-center gap-1.5 p-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-700 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-200 transition"
                >
                  <Scissors className="h-3.5 w-3.5 text-slate-500" />
                  <span>Perpendek (-30%)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onQuickTransform?.('Elaborasi dan perluas naskah ini (+50%) dengan menambahkan penjelasan landasan konsep, contoh akademik, dan implikasi yang mendalam.');
                    setShowTransformMenu(false);
                  }}
                  className="flex items-center justify-center gap-1.5 p-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-700 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-200 transition"
                >
                  <ArrowDownWideNarrow className="h-3.5 w-3.5 text-slate-500" />
                  <span>Perluas (+50%)</span>
                </button>
              </div>
            </div>

            {/* Quality & Alignment Quick Actions */}
            <div className="space-y-1 pt-1 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  onQuickTransform?.('Periksa dan perbaiki seluruh ejaan, tanda baca, huruf kapital, dan kata serapan pada naskah ini sesuai pedoman EYD edisi V dan KBBI.');
                  setShowTransformMenu(false);
                }}
                className="w-full flex items-center gap-2 p-1.5 rounded-lg text-left text-xs text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800 transition"
              >
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                <span>Audit Standar EYD V & KBBI</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  onQuickTransform?.('Restrukturisasi paragraf-paragraf dalam naskah ini mengikuti pola piramida terbalik (gagasan umum -> perincian masalah -> fokus spesifik).');
                  setShowTransformMenu(false);
                }}
                className="w-full flex items-center gap-2 p-1.5 rounded-lg text-left text-xs text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800 transition"
              >
                <ListTree className="h-3.5 w-3.5 text-indigo-600" />
                <span>Restrukturisasi Piramida Terbalik</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {viewMode === 'edit' && isDirty && <button type="button" onClick={handleManualSave} disabled={saveStatus === 'saving' || hasExternalConflict} title={hasExternalConflict ? 'Pilih versi server atau pertahankan draf lokal sebelum menyimpan.' : 'Simpan Versi Dokumen (Ctrl+S)'} className="inline-flex min-h-[36px] items-center gap-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-3 text-xs font-semibold text-white disabled:opacity-50 cursor-pointer"><Save className="h-3.5 w-3.5" /><span className="hidden sm:inline">Simpan</span></button>}
      {viewMode === 'preview' && <button type="button" onClick={switchToEdit} className="inline-flex min-h-[36px] items-center gap-1 rounded-xl border border-emerald-200 bg-emerald-50 px-3 text-xs font-semibold text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 cursor-pointer" title="Mulai Edit Dokumen Ini"><Edit3 className="h-3.5 w-3.5" /><span className="hidden 2xl:inline">Edit Dokumen</span></button>}
      <button type="button" onClick={showHistory} className="inline-flex min-h-[36px] min-w-[36px] items-center justify-center rounded-xl border border-slate-200/80 bg-white text-slate-600 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-300 sm:w-auto sm:px-2.5 cursor-pointer" aria-label="Riwayat versi" title="Riwayat versi"><History className="h-3.5 w-3.5" /><span className="hidden text-[11px] xl:inline @max-[600px]:hidden">Riwayat</span></button>
      <button type="button" onClick={showExport} className="inline-flex min-h-[36px] min-w-[36px] items-center justify-center rounded-xl border border-slate-200/80 bg-white text-slate-600 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-300 sm:w-auto sm:px-2.5 cursor-pointer" aria-label="Ekspor artifact" title="Ekspor artifact (Ctrl+E)"><Download className="h-3.5 w-3.5" /><span className="hidden text-[11px] xl:inline @max-[600px]:hidden">Ekspor</span></button>
      <button type="button" onClick={toggleExpand} className="hidden min-h-[36px] min-w-[36px] items-center justify-center rounded-xl border border-slate-200/80 bg-white text-slate-500 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:border-slate-700 dark:bg-slate-800/80 dark:hover:bg-slate-800 sm:flex cursor-pointer" title={isExpanded ? 'Kembalikan Ukuran Layar (Alt+Z)' : 'Mode Fokus Zen / Layar Penuh (Alt+Z)'} aria-label="Toggle Fullscreen">{isExpanded ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}</button>
      {isExpanded && (
        <button
          type="button"
          onClick={() => {
            if (isSoundscapePlaying) {
              soundscapeEngine.destroy();
              setIsSoundscapePlaying(false);
            } else {
              soundscapeEngine.applyPreset('DEEP_FOCUS');
              setIsSoundscapePlaying(true);
            }
          }}
          className={`hidden min-h-[36px] min-w-[36px] items-center justify-center rounded-xl border sm:flex cursor-pointer transition-colors ${
            isSoundscapePlaying
              ? 'border-indigo-300 bg-indigo-50 text-indigo-700 dark:border-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300'
              : 'border-slate-200/80 bg-white text-slate-500 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800/80 dark:hover:bg-slate-800'
          }`}
          title={isSoundscapePlaying ? 'Matikan Suara Ambient Fokus' : 'Nyalakan Suara Ambient Zen Fokus (Lo-Fi & Frekuensi Fokus)'}
          aria-label="Toggle Soundscape Zen"
        >
          {isSoundscapePlaying ? <Volume2 className="h-3.5 w-3.5 animate-pulse text-indigo-600 dark:text-indigo-400" /> : <VolumeX className="h-3.5 w-3.5" />}
        </button>
      )}
      <div className="relative" ref={moreMenuRef}>
        <button type="button" onClick={() => setShowMoreMenu(!showMoreMenu)} className="inline-flex min-h-[36px] min-w-[36px] items-center justify-center rounded-xl border border-slate-200/80 bg-white text-slate-700 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-200 dark:hover:bg-slate-800 cursor-pointer" aria-label="Menu Opsi Lainnya" aria-expanded={showMoreMenu}><MoreHorizontal className="h-4 w-4" /></button>
        {showMoreMenu && <div className="absolute right-0 top-full z-50 mt-1.5 max-h-[min(75dvh,34rem)] w-60 space-y-0.5 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-slate-800 dark:bg-slate-900">{children}</div>}
      </div>
      {onClose && <button type="button" onClick={onClose} className="flex min-h-[36px] min-w-[36px] items-center justify-center rounded-xl border border-slate-200/80 bg-white text-slate-400 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:border-slate-700 dark:bg-slate-800/80 cursor-pointer text-base" title="Tutup Canvas (Kembali ke Obrolan)" aria-label="Tutup Canvas"><span aria-hidden="true">×</span></button>}
    </div>
  </header>;
};
