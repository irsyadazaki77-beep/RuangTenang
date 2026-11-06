import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Menu,
  FilePlus,
  FileText,
  FileCode,
  Quote,
  PanelRightClose,
  PanelRightOpen,
  MoreHorizontal,
  HeartHandshake,
  Sparkles,
  Trash2,
  MessageSquareText,
  Maximize2,
  Minimize2,
  Keyboard,
  Ghost,
  FolderKanban
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
  const navigate = useNavigate();
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);

  const moreMenuRef = useRef<HTMLDivElement>(null);
  const moreTriggerRef = useRef<HTMLButtonElement>(null);

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

  const hasCustomTitle = Boolean(workspaceTitle && workspaceTitle !== 'Workspace baru');

  return (
    <>
      <header className="sticky top-0 z-30 shrink-0 min-w-0 grid grid-cols-[minmax(0,1fr)_auto] py-1.5 sm:py-0 sm:min-h-[3.25rem] px-3 sm:px-5 bg-transparent sm:flex items-center justify-between gap-x-3 gap-y-1.5">
        {/* Zone 1: Brand & Contextual Breadcrumb */}
        <div className="flex items-center gap-2 min-w-0">
          {onOpenSidebar && (
            <button
              type="button"
              onClick={onOpenSidebar}
              className="xl:hidden flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-200/50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              aria-label="Buka Sidebar Menu"
            >
              <Menu className="w-4.5 h-4.5" />
            </button>
          )}

          <div className="flex items-center gap-1.5 min-w-0">
            <BrandLogo mode="RUANG_KERJA" size="xs" iconOnly />
            <span className="font-semibold text-sm tracking-tight text-slate-900 dark:text-slate-100 whitespace-nowrap shrink-0">
              RuangKerja
            </span>
            {hasCustomTitle && (
              <>
                <span aria-hidden="true" className="text-slate-300 dark:text-slate-700 shrink-0">·</span>
                <span
                  title={workspaceTitle}
                  className="text-xs font-medium text-slate-500 dark:text-slate-400 truncate max-w-[36vw] sm:max-w-[18rem]"
                >
                  {workspaceTitle}
                </span>
              </>
            )}
          </div>

          {/* Active Document Kicker (Desktop, unboxed metadata) */}
          {activeArtifact && (
            <div className="hidden md:flex items-center gap-1.5 text-xs text-slate-400 min-w-0 max-w-[200px] lg:max-w-[240px]">
              <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">·</span>
              <span className="truncate text-slate-600 dark:text-slate-300 font-medium">
                {activeArtifact.title}
              </span>
              <span className="text-[11px] font-mono tabular-nums opacity-60 shrink-0">
                v{activeArtifact.version || 1}
              </span>
            </div>
          )}

          {isTemporary && (
            <span className="hidden sm:inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 font-medium whitespace-nowrap shrink-0">
              <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">·</span>
              <Ghost className="w-3 h-3" />
              <span>Sementara</span>
            </span>
          )}
        </div>

        {/* Zone 2 & 3: View Switchers & Minimal Actions */}
        <div className="contents sm:flex sm:items-center sm:gap-1.5 sm:shrink-0">
          {/* Mobile/Tablet Segmented Switcher */}
          <div
            role="group"
            aria-label="Tampilan workspace"
            className="col-span-2 row-start-2 xl:hidden flex items-center justify-center gap-1 rounded-xl border border-slate-200/70 bg-slate-100/80 p-0.5 dark:border-slate-800 dark:bg-slate-900/80"
          >
            <button
              type="button"
              onClick={() => onSetMobileActiveTab('chat')}
              aria-pressed={mobileActiveTab === 'chat'}
              aria-label="Obrolan"
              title="Obrolan"
              className={`flex min-h-8 min-w-10 items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                mobileActiveTab === 'chat'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-semibold shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <MessageSquareText className="h-3.5 w-3.5 sm:hidden" aria-hidden="true" />
              <span>Obrolan</span>
            </button>
            <button
              type="button"
              onClick={() => onSetMobileActiveTab('canvas')}
              aria-pressed={mobileActiveTab === 'canvas'}
              aria-label="Canvas"
              title="Canvas"
              className={`relative flex min-h-8 min-w-10 items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                mobileActiveTab === 'canvas'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-semibold shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <FileText className="h-3.5 w-3.5 sm:hidden" aria-hidden="true" />
              <span>Canvas</span>
              {hasUnreadArtifact && (
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 inline-block ml-1" />
              )}
            </button>
            <button
              type="button"
              onClick={() => onSetMobileActiveTab('context')}
              aria-label="Panel"
              title="Panel"
              aria-pressed={mobileActiveTab === 'context' || mobileActiveTab === 'sources'}
              className={`flex min-h-8 min-w-10 items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                mobileActiveTab === 'context' || mobileActiveTab === 'sources'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-semibold shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <Sparkles className="h-3.5 w-3.5 sm:hidden" aria-hidden="true" />
              <span>Panel</span>
            </button>
          </div>

          {/* Desktop Panel Toggle */}
          {onToggleContext && (
            <button
              type="button"
              onClick={onToggleContext}
              aria-label={isContextOpen ? 'Tutup panel' : 'Buka panel'}
              aria-pressed={isContextOpen}
              title={isContextOpen ? 'Tutup panel' : 'Files, sumber, rencana, dan konteks'}
              className={`hidden xl:inline-flex h-8.5 items-center gap-1.5 rounded-xl px-2.5 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                isContextOpen
                  ? 'bg-slate-200/80 text-slate-900 font-semibold dark:bg-slate-800 dark:text-slate-100'
                  : 'text-slate-500 hover:bg-slate-200/50 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-slate-100'
              }`}
            >
              <Sparkles className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Panel</span>
            </button>
          )}

          {/* Desktop Canvas Toggle */}
          <button
            type="button"
            onClick={onToggleCanvas}
            aria-pressed={isCanvasOpen}
            className={`hidden xl:inline-flex h-8.5 px-2.5 rounded-xl text-xs font-medium items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
              isCanvasOpen
                ? 'bg-slate-200/80 text-slate-900 font-semibold dark:bg-slate-800 dark:text-slate-100'
                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200/50 hover:text-slate-800 dark:hover:bg-slate-800/60 dark:hover:text-slate-100'
            }`}
            title={isCanvasOpen ? 'Sembunyikan Panel Canvas' : 'Tampilkan Panel Canvas'}
            aria-label={isCanvasOpen ? 'Tutup Canvas' : 'Buka Canvas'}
          >
            {isCanvasOpen ? (
              <PanelRightClose className="w-3.5 h-3.5" />
            ) : (
              <PanelRightOpen className="w-3.5 h-3.5" />
            )}
            <span>Canvas</span>
            {hasUnreadArtifact && (
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 ml-0.5" />
            )}
          </button>

          {/* More Actions Menu (•••) */}
          <div className="relative col-start-2 row-start-1" ref={moreMenuRef}>
            <button
              type="button"
              onClick={() => setShowMoreMenu(!showMoreMenu)}
              ref={moreTriggerRef}
              className="h-9 w-9 flex items-center justify-center rounded-xl text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              title="Menu Opsi Workspace"
              aria-label="Opsi Lebih Lanjut"
              aria-expanded={showMoreMenu}
              aria-haspopup="true"
            >
              <MoreHorizontal className="w-4.5 h-4.5" />
            </button>

            {showMoreMenu && (
              <div
                role="group"
                aria-label="Opsi workspace"
                className="absolute right-0 top-full mt-1.5 w-[min(15rem,calc(100vw-1.5rem))] p-1.5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xl z-50 animate-scale-up space-y-0.5"
              >
                {onToggleTemporary && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowMoreMenu(false);
                      onToggleTemporary();
                    }}
                    className="w-full text-left px-2.5 py-2 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center justify-between gap-2 cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <Ghost className="w-3.5 h-3.5 text-amber-500" />
                      <span>Sesi Sementara</span>
                    </span>
                    <span className="text-[10px] text-slate-400">{isTemporary ? 'Aktif' : 'Nonaktif'}</span>
                  </button>
                )}

                {onToggleFocusMode && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowMoreMenu(false);
                      onToggleFocusMode();
                    }}
                    className="w-full text-left px-2.5 py-2 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center justify-between gap-2 cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      {isFocusMode ? <Minimize2 className="w-3.5 h-3.5 text-emerald-600" /> : <Maximize2 className="w-3.5 h-3.5 text-emerald-600" />}
                      <span>{isFocusMode ? 'Keluar Mode Fokus' : 'Mode Fokus Zen'}</span>
                    </span>
                    <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">Alt+Z</kbd>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setShowMoreMenu(false);
                    onOpenTemplateGallery();
                  }}
                  className="w-full text-left px-2.5 py-2 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  <span>Galeri Template</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowMoreMenu(false);
                    navigate('/workspace/projects');
                  }}
                  className="w-full text-left px-2.5 py-2 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <FolderKanban className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  <span>Semua Proyek & Pencarian</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowMoreMenu(false);
                    setShowShortcutsModal(true);
                  }}
                  className="w-full text-left px-2.5 py-2 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center justify-between gap-2 cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Keyboard className="w-3.5 h-3.5 text-slate-500" />
                    <span>Pintasan Keyboard</span>
                  </span>
                </button>

                <div className="border-t border-slate-100 dark:border-slate-800 my-1" />

                <button
                  type="button"
                  onClick={() => { setShowMoreMenu(false); onCreateNewArtifact('DOCUMENT'); }}
                  className="w-full rounded-xl px-2.5 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <FilePlus className="mr-2 inline h-3.5 w-3.5 text-indigo-600" />
                  Dokumen baru
                </button>
                <button
                  type="button"
                  onClick={() => { setShowMoreMenu(false); onCreateNewArtifact('CODE'); }}
                  className="w-full rounded-xl px-2.5 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <FileCode className="mr-2 inline h-3.5 w-3.5 text-indigo-600" />
                  Kode baru
                </button>
                <button
                  type="button"
                  onClick={() => { setShowMoreMenu(false); onCreateNewArtifact('CITATION'); }}
                  className="w-full rounded-xl px-2.5 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <Quote className="mr-2 inline h-3.5 w-3.5 text-amber-600" />
                  Daftar sitasi baru
                </button>

                <div className="border-t border-slate-100 dark:border-slate-800 my-1" />

                {onSwitchMode && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowMoreMenu(false);
                      onSwitchMode('RUANG_TENANG');
                    }}
                    className="w-full text-left px-2.5 py-2 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-teal-50 dark:hover:bg-teal-950/50 hover:text-teal-700 dark:hover:text-teal-300 transition-colors flex items-center gap-2 cursor-pointer"
                  >
                    <HeartHandshake className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                    <span>Ke RuangTenang</span>
                  </button>
                )}

                <button
                  type="button"
                  disabled={isClearingConversation || isPreparingConversation}
                  onClick={() => { setShowMoreMenu(false); setShowDeleteConfirm(true); }}
                  title={isPreparingConversation ? 'Menyiapkan identitas percakapan agar penghapusan tersimpan dengan benar.' : 'Bersihkan percakapan RuangKerja'}
                  className="w-full text-left px-2.5 py-2 rounded-xl text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Bersihkan Obrolan</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {showDeleteConfirm && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/40 p-4"
          role="presentation"
          onMouseDown={event => {
            if (event.target === event.currentTarget && !isClearingConversation && !isPreparingConversation) {
              setShowDeleteConfirm(false);
              moreTriggerRef.current?.focus();
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="clear-workspace-title"
            className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-700 dark:bg-slate-900"
          >
            <h2 id="clear-workspace-title" className="text-sm font-semibold text-slate-900 dark:text-white">
              Bersihkan percakapan?
            </h2>
            <p className="mt-2 text-xs leading-5 text-slate-600 dark:text-slate-300">
              Semua pesan di RuangKerja ini akan dihapus. Dokumen dan artefak Canvas tetap tersimpan.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                disabled={isClearingConversation || isPreparingConversation}
                onClick={() => {
                  setShowDeleteConfirm(false);
                  moreTriggerRef.current?.focus();
                }}
                className="h-9 rounded-xl px-3 text-xs font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-50 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Batal
              </button>
              <button
                type="button"
                autoFocus
                disabled={isClearingConversation || isPreparingConversation}
                onClick={async () => {
                  const cleared = await onConfirmClearWorkspace();
                  if (cleared !== false) {
                    setShowDeleteConfirm(false);
                    moreTriggerRef.current?.focus();
                  }
                }}
                className="h-9 rounded-xl bg-rose-600 px-3 text-xs font-semibold text-white hover:bg-rose-700 disabled:cursor-wait disabled:opacity-60"
              >
                {isClearingConversation ? 'Membersihkan…' : 'Bersihkan'}
              </button>
            </div>
          </section>
        </div>
      )}

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
