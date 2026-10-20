import React, { useState, useRef, useEffect } from 'react';
import {
  Menu,
  FilePlus,
  FileText,
  FileCode,
  Quote,
  PanelRightClose,
  PanelRightOpen,
  MoreVertical,
  HeartHandshake,
  Sparkles,
  Trash2,
  MessageSquareText,
  Maximize2,
  Minimize2,
  Keyboard,
  Ghost
} from 'lucide-react';
import { WorkspaceArtifact, ArtifactType, WorkspaceMode, WorkspaceTab } from '../types';
import { BrandLogo } from '../../../components/ui/BrandLogo';

interface WorkspaceHeaderProps {
  workspaceTitle?: string;
  activeArtifact: WorkspaceArtifact | null;
  isCanvasOpen: boolean;
  isContextOpen?: boolean;
  isFocusMode?: boolean;
  isTemporary?: boolean;
  onToggleTemporary?: () => void;
  mobileActiveTab: WorkspaceTab;
  hasUnreadArtifact: boolean;
  onOpenSidebar?: () => void;
  onSwitchMode?: (mode: WorkspaceMode) => void;
  onSetMobileActiveTab: (tab: WorkspaceTab) => void;
  onToggleCanvas: () => void;
  onToggleContext?: () => void;
  onToggleFocusMode?: () => void;
  onCreateNewArtifact: (type: ArtifactType) => void;
  onOpenTemplateGallery: () => void;
  onConfirmClearWorkspace: () => Promise<boolean> | void;
  isClearingConversation?: boolean;
  isPreparingConversation?: boolean;
}

export const WorkspaceHeader: React.FC<WorkspaceHeaderProps> = React.memo(({
  workspaceTitle = 'Workspace baru',
  activeArtifact,
  isCanvasOpen,
  isContextOpen = false,
  isFocusMode = false,
  isTemporary = false,
  onToggleTemporary,
  mobileActiveTab,
  hasUnreadArtifact,
  onOpenSidebar,
  onSwitchMode,
  onSetMobileActiveTab,
  onToggleCanvas,
  onToggleContext,
  onToggleFocusMode,
  onCreateNewArtifact,
  onOpenTemplateGallery,
  onConfirmClearWorkspace,
  isClearingConversation = false,
  isPreparingConversation = false
}) => {
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);

  const moreMenuRef = useRef<HTMLDivElement>(null);
  const moreTriggerRef = useRef<HTMLButtonElement>(null);

  // Close popovers on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setShowMoreMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowMoreMenu(false);
        setShowDeleteConfirm(false);
        setShowShortcutsModal(false);
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  return (
    <>
    <header className="grid grid-cols-[minmax(0,1fr)_auto] py-1 sm:py-0 sm:h-12 px-3 sm:px-4 bg-white/75 dark:bg-[#0b101b]/75 backdrop-blur-md border-b border-slate-200/70 dark:border-slate-800/80 sm:flex items-center justify-between gap-x-2 gap-y-1 sm:gap-3 z-30 shrink-0 min-w-0">
      {/* Left Zone: Workspace Identity & Mobile Navigation Toggle */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        {onOpenSidebar && (
          <button
            type="button"
            onClick={onOpenSidebar}
            className="xl:hidden flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            aria-label="Buka Sidebar Menu"
          >
            <Menu className="w-4 h-4" />
          </button>
        )}

        <div className="flex items-center gap-2 min-w-0">
          <BrandLogo mode="RUANG_KERJA" size="xs" iconOnly />
          <div className="min-w-0 leading-tight">
            <span className="block text-[10px] font-medium text-slate-500 dark:text-slate-400">RuangKerja</span>
            <span title={workspaceTitle} className="block max-w-[44vw] break-words text-xs font-semibold leading-tight tracking-tight text-slate-900 line-clamp-2 dark:text-slate-100 sm:max-w-[24rem] sm:truncate sm:whitespace-nowrap sm:text-[13px]">
              {workspaceTitle}
            </span>
          </div>
        </div>

        {/* Active Document Kicker (Desktop) */}
        {activeArtifact && (
          <div className="hidden md:flex items-center gap-1.5 text-xs text-slate-400 pl-2 lg:pl-3 border-l border-slate-200 dark:border-slate-800 min-w-0 max-w-[180px] lg:max-w-[240px]">
            <span className="truncate text-slate-600 dark:text-slate-300 font-medium">
              {activeArtifact.title}
            </span>
            <span className="text-[10px] font-mono opacity-60">
              v{activeArtifact.version || 1}
            </span>
          </div>
        )}
      </div>

      {/* Center / Right Zone: Segmented Switcher & Workspace Actions */}
      <div className="contents sm:flex sm:items-center sm:gap-1 sm:shrink-0">
        {/* Mobile/Tablet Tab Switcher */}
        <div role="group" aria-label="Tampilan workspace" className="col-span-2 row-start-2 xl:hidden flex items-center justify-center gap-4 sm:gap-0.5 rounded-lg border border-slate-200/60 bg-slate-100/90 p-0.5 dark:border-slate-700/60 dark:bg-slate-800/90">
          <button
            type="button"
            onClick={() => onSetMobileActiveTab('chat')}
            aria-pressed={mobileActiveTab === 'chat'}
            aria-label="Obrolan"
            title="Obrolan"
            className={`flex min-h-10 min-w-10 items-center justify-center gap-1.5 rounded-md px-2 sm:px-2.5 text-xs font-medium transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
              mobileActiveTab === 'chat'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-semibold shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <MessageSquareText className="h-4 w-4 sm:hidden" aria-hidden="true" /><span className="hidden sm:inline">Obrolan</span>
          </button>
          <button
            type="button"
            onClick={() => onSetMobileActiveTab('canvas')}
            aria-pressed={mobileActiveTab === 'canvas'}
            aria-label="Canvas"
            title="Canvas"
            className={`relative flex min-h-10 min-w-10 items-center justify-center gap-1.5 rounded-md px-2 sm:px-2.5 text-xs font-medium transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
              mobileActiveTab === 'canvas'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-semibold shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <FileText className="h-4 w-4 sm:hidden" aria-hidden="true" /><span className="hidden sm:inline">Canvas</span>
            {hasUnreadArtifact && (
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 inline-block ml-1 animate-pulse" />
            )}
          </button>
          <button type="button" onClick={() => onSetMobileActiveTab('context')} aria-label="Panel" title="Panel" aria-pressed={mobileActiveTab === 'context' || mobileActiveTab === 'sources'} className={`flex min-h-10 min-w-10 items-center justify-center gap-1.5 rounded-md px-2 sm:px-2.5 text-xs font-medium transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${mobileActiveTab === 'context' || mobileActiveTab === 'sources' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-semibold shadow-2xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'}`}><Sparkles className="h-4 w-4 sm:hidden" aria-hidden="true" /><span className="hidden sm:inline">Panel</span></button>
        </div>

        {onToggleContext && (
          <button
            type="button"
            onClick={onToggleContext}
            aria-label={isContextOpen ? 'Tutup panel' : 'Buka panel'}
            aria-pressed={isContextOpen}
            title={isContextOpen ? 'Tutup panel' : 'Files, sumber, rencana, dan konteks'}
            className={`hidden xl:inline-flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
              isContextOpen
                ? 'bg-slate-200/90 text-slate-900 font-semibold dark:bg-slate-800 dark:text-slate-100 shadow-2xs'
                : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100'
            }`}
          >
            <Sparkles className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>Panel</span>
          </button>
        )}

        {/* Primary Action: + Draf Baru Dropdown */}
        {/* Desktop Canvas Toggle */}
        <button
          type="button"
          onClick={onToggleCanvas}
          aria-pressed={isCanvasOpen}
          className={`hidden xl:flex h-9 px-2.5 rounded-lg text-xs font-medium items-center gap-1.5 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
            isCanvasOpen
              ? 'bg-slate-200/90 text-slate-900 font-semibold dark:bg-slate-800 dark:text-slate-100 shadow-2xs'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
          title={isCanvasOpen ? 'Sembunyikan Panel Canvas' : 'Tampilkan Panel Canvas'}
          aria-label={isCanvasOpen ? 'Tutup Canvas' : 'Buka Canvas'}
        >
          {isCanvasOpen ? (
            <>
              <PanelRightClose className="w-3.5 h-3.5" />
              <span className="hidden 2xl:inline">Canvas</span>
            </>
          ) : (
            <>
              <PanelRightOpen className="w-3.5 h-3.5" />
              <span>Canvas</span>
            </>
          )}
          {hasUnreadArtifact && (
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse ml-0.5" />
          )}
        </button>

        {/* Temporary / Incognito Chat Toggle */}
        {onToggleTemporary && (
          <button
            type="button"
            onClick={onToggleTemporary}
            aria-pressed={isTemporary}
            title={isTemporary ? 'Sesi Sementara Aktif: Percakapan tidak disimpan ke histori' : 'Aktifkan Sesi Sementara (Tanpa Riwayat)'}
            aria-label={isTemporary ? 'Matikan Sesi Sementara' : 'Aktifkan Sesi Sementara'}
            className={`inline-flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
              isTemporary
                ? 'bg-amber-500 text-white font-semibold shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Ghost className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{isTemporary ? 'Sesi Sementara' : 'Sementara'}</span>
          </button>
        )}

        {/* Desktop Zen / Focus Mode Toggle (Alt+Z) */}
        {onToggleFocusMode && (
          <button
            type="button"
            onClick={onToggleFocusMode}
            aria-pressed={isFocusMode}
            title={isFocusMode ? 'Keluar Mode Fokus Zen (Alt+Z)' : 'Mode Fokus Zen / Full-Width Canvas (Alt+Z)'}
            aria-label={isFocusMode ? 'Keluar Mode Fokus' : 'Mode Fokus Zen'}
            className={`hidden xl:inline-flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
              isFocusMode
                ? 'bg-emerald-600 text-white font-semibold shadow-2xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {isFocusMode ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            <span className="hidden 2xl:inline">{isFocusMode ? 'Keluar Fokus' : 'Mode Fokus'}</span>
          </button>
        )}

        {/* More Actions Menu (•••) */}
        <div className="relative col-start-2 row-start-1" ref={moreMenuRef}>
          <button
            type="button"
            onClick={() => setShowMoreMenu(!showMoreMenu)}
            ref={moreTriggerRef}
            className="h-10 w-10 flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            title="Menu Opsi Workspace"
            aria-label="Opsi Lebih Lanjut"
            aria-expanded={showMoreMenu}
            aria-haspopup="true"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {showMoreMenu && (
            <div role="group" aria-label="Opsi workspace" className="absolute right-0 top-full mt-1.5 w-[min(14rem,calc(100vw-1.5rem))] p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-50 animate-scale-up space-y-0.5">
              {onSwitchMode && (
                <button
                  type="button"
                  onClick={() => {
                    setShowMoreMenu(false);
                    onSwitchMode('RUANG_TENANG');
                  }}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-teal-50 dark:hover:bg-teal-950/50 hover:text-teal-700 dark:hover:text-teal-300 transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <HeartHandshake className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                  <span>Ke RuangTenang</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  setShowMoreMenu(false);
                  onOpenTemplateGallery();
                }}
                className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>Galeri Template</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowMoreMenu(false);
                  setShowShortcutsModal(true);
                }}
                className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center justify-between gap-2 cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <Keyboard className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Pintasan Keyboard</span>
                </span>
                <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">Alt+Z</kbd>
              </button>

              <div className="border-t border-slate-100 dark:border-slate-800 my-1" />

              <button type="button" onClick={() => { setShowMoreMenu(false); onCreateNewArtifact('DOCUMENT'); }} className="w-full rounded-lg px-2.5 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"><FilePlus className="mr-2 inline h-3.5 w-3.5 text-indigo-600" />Dokumen baru</button>
              <button type="button" onClick={() => { setShowMoreMenu(false); onCreateNewArtifact('CODE'); }} className="w-full rounded-lg px-2.5 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"><FileCode className="mr-2 inline h-3.5 w-3.5 text-indigo-600" />Kode baru</button>
              <button type="button" onClick={() => { setShowMoreMenu(false); onCreateNewArtifact('CITATION'); }} className="w-full rounded-lg px-2.5 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"><Quote className="mr-2 inline h-3.5 w-3.5 text-amber-600" />Daftar sitasi baru</button>

              <button
                type="button"
                disabled={isClearingConversation || isPreparingConversation}
                onClick={() => { setShowMoreMenu(false); setShowDeleteConfirm(true); }}
                title={isPreparingConversation ? 'Menyiapkan identitas percakapan agar penghapusan tersimpan dengan benar.' : 'Bersihkan percakapan RuangKerja'}
                className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors flex items-center gap-2 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Bersihkan Obrolan</span>
              </button>

            </div>
          )}
        </div>
      </div>
    </header>
    {showDeleteConfirm && <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/40 p-4" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget && !isClearingConversation && !isPreparingConversation) { setShowDeleteConfirm(false); moreTriggerRef.current?.focus(); } }}><section role="dialog" aria-modal="true" aria-labelledby="clear-workspace-title" className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-700 dark:bg-slate-900"><h2 id="clear-workspace-title" className="text-sm font-semibold text-slate-900 dark:text-white">Bersihkan percakapan?</h2><p className="mt-2 text-xs leading-5 text-slate-600 dark:text-slate-300">Semua pesan di RuangKerja ini akan dihapus. Dokumen dan artefak Canvas tetap tersimpan.</p><div className="mt-5 flex justify-end gap-2"><button type="button" disabled={isClearingConversation || isPreparingConversation} onClick={() => { setShowDeleteConfirm(false); moreTriggerRef.current?.focus(); }} className="h-9 rounded-lg px-3 text-xs font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-50 dark:text-slate-300 dark:hover:bg-slate-800">Batal</button><button type="button" autoFocus disabled={isClearingConversation || isPreparingConversation} onClick={async () => { const cleared = await onConfirmClearWorkspace(); if (cleared !== false) { setShowDeleteConfirm(false); moreTriggerRef.current?.focus(); } }} className="h-9 rounded-lg bg-rose-600 px-3 text-xs font-semibold text-white hover:bg-rose-700 disabled:cursor-wait disabled:opacity-60">{isClearingConversation ? 'Membersihkan…' : 'Bersihkan'}</button></div></section></div>}
    {showShortcutsModal && (
      <div
        className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-2xs"
        role="presentation"
        onMouseDown={e => { if (e.target === e.currentTarget) setShowShortcutsModal(false); }}
      >
        <section
          role="dialog"
          aria-modal="true"
          aria-label="Pintasan Keyboard RuangKerja"
          className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Keyboard className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Pintasan Keyboard & Deep Work</h2>
            </div>
            <button
              type="button"
              onClick={() => setShowShortcutsModal(false)}
              className="rounded-lg px-2 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              Tutup
            </button>
          </div>
          <div className="mt-3 space-y-2.5 text-xs">
            <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-800/60">
              <span className="font-medium text-slate-700 dark:text-slate-200">Simpan Versi Dokumen Canvas</span>
              <kbd className="rounded bg-white px-2 py-0.5 font-mono text-[11px] font-semibold text-slate-800 shadow-2xs border border-slate-200 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200">Ctrl + S</kbd>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-800/60">
              <span className="font-medium text-slate-700 dark:text-slate-200">Ekspor Dokumen (.docx / .pdf / .bib)</span>
              <kbd className="rounded bg-white px-2 py-0.5 font-mono text-[11px] font-semibold text-slate-800 shadow-2xs border border-slate-200 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200">Ctrl + E</kbd>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-800/60">
              <span className="font-medium text-slate-700 dark:text-slate-200">Mode Fokus Zen (Sembunyikan Chat)</span>
              <kbd className="rounded bg-white px-2 py-0.5 font-mono text-[11px] font-semibold text-slate-800 shadow-2xs border border-slate-200 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200">Alt + Z</kbd>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-800/60">
              <span className="font-medium text-slate-700 dark:text-slate-200">Tutup Panel / Keluar Dialog</span>
              <kbd className="rounded bg-white px-2 py-0.5 font-mono text-[11px] font-semibold text-slate-800 shadow-2xs border border-slate-200 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200">Esc</kbd>
            </div>
          </div>
        </section>
      </div>
    )}
    </>
  );
});
