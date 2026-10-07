import React, { useState, useRef, useEffect } from 'react';
import { 
  Layers, 
  FilePlus, 
  ChevronDown, 
  FileText, 
  FileCode, 
  Quote, 
  PanelRightClose, 
  PanelRightOpen, 
  MoreVertical, 
  HeartHandshake, 
  Sparkles, 
  Trash2 
} from 'lucide-react';
import { WorkspaceArtifact, ArtifactType, WorkspaceMode, WorkspaceTab } from '../types';
import { BrandLogo } from '../../../components/ui/BrandLogo';

interface WorkspaceHeaderProps {
  workspaceTitle?: string;
  activeArtifact: WorkspaceArtifact | null;
  isCanvasOpen: boolean;
  mobileActiveTab: WorkspaceTab;
  hasUnreadArtifact: boolean;
  onOpenSidebar?: () => void;
  onSwitchMode?: (mode: WorkspaceMode) => void;
  onSetMobileActiveTab: (tab: WorkspaceTab) => void;
  onToggleCanvas: () => void;
  onToggleContext?: () => void;
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
  mobileActiveTab,
  hasUnreadArtifact,
  onOpenSidebar,
  onSwitchMode,
  onSetMobileActiveTab,
  onToggleCanvas,
  onToggleContext,
  onCreateNewArtifact,
  onOpenTemplateGallery,
  onConfirmClearWorkspace,
  isClearingConversation = false,
  isPreparingConversation = false
}) => {
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showNewArtifactMenu, setShowNewArtifactMenu] = useState(false);

  const moreMenuRef = useRef<HTMLDivElement>(null);
  const newArtifactMenuRef = useRef<HTMLDivElement>(null);

  // Close popovers on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setShowMoreMenu(false);
        setShowDeleteConfirm(false);
      }
      if (newArtifactMenuRef.current && !newArtifactMenuRef.current.contains(e.target as Node)) {
        setShowNewArtifactMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowMoreMenu(false);
        setShowDeleteConfirm(false);
        setShowNewArtifactMenu(false);
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  return (
    <header className="h-12 px-3 sm:px-4 bg-white dark:bg-[#0F172A] border-b border-slate-200/70 dark:border-slate-800/80 flex items-center justify-between gap-2 sm:gap-3 z-30 shrink-0 min-w-0">
      {/* Left Zone: Workspace Identity & Mobile Navigation Toggle */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        {onOpenSidebar && (
          <button
            type="button"
            onClick={onOpenSidebar}
            className="xl:hidden p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Buka Sidebar Menu"
          >
            <Layers className="w-4 h-4" />
          </button>
        )}

        <div className="flex items-center gap-2 min-w-0">
          <span className="hidden sm:inline-flex"><BrandLogo mode="RUANG_KERJA" size="xs" /></span>
          <div className="min-w-0 leading-tight">
            <span className="hidden text-[10px] font-medium text-slate-400 sm:block">RuangKerja</span>
            <span className="block max-w-[30vw] truncate text-xs font-semibold tracking-tight text-slate-900 dark:text-slate-100 sm:max-w-[24rem] sm:text-[13px]">
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
      <div className="flex items-center gap-2 shrink-0">
        {/* Mobile/Tablet Tab Switcher */}
        <div className="xl:hidden flex items-center p-0.5 bg-slate-100/90 dark:bg-slate-800/90 rounded-lg border border-slate-200/60 dark:border-slate-700/60">
          <button
            type="button"
            onClick={() => onSetMobileActiveTab('chat')}
            aria-pressed={mobileActiveTab === 'chat'}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
              mobileActiveTab === 'chat'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-semibold shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Obrolan
          </button>
          <button
            type="button"
            onClick={() => onSetMobileActiveTab('canvas')}
            aria-pressed={mobileActiveTab === 'canvas'}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer relative ${
              mobileActiveTab === 'canvas'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-semibold shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Canvas
            {hasUnreadArtifact && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block ml-1 animate-pulse" />
            )}
          </button>
          <button type="button" onClick={() => onSetMobileActiveTab('context')} aria-pressed={mobileActiveTab === 'context'} className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${mobileActiveTab === 'context' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-semibold shadow-2xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'}`}>Context</button>
        </div>

        {onToggleContext && <button type="button" onClick={onToggleContext} aria-label="Buka panel context" title="Context" className="hidden xl:inline-flex h-8 items-center gap-1.5 rounded-lg px-2 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:hover:bg-slate-800 dark:hover:text-slate-100"><Sparkles className="h-3.5 w-3.5" /><span>Context</span></button>}

        {/* Primary Action: + Draf Baru Dropdown */}
        <div className="relative hidden sm:block" ref={newArtifactMenuRef}>
          <button
            type="button"
            onClick={() => setShowNewArtifactMenu(!showNewArtifactMenu)}
            className="h-8 px-2 rounded-lg text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5"
            title="Buat Berkas / Draf Baru"
            aria-label="Buat draf baru"
            aria-expanded={showNewArtifactMenu}
            aria-haspopup="true"
          >
            <FilePlus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Artefak</span>
            <ChevronDown className="w-3 h-3 opacity-80" />
          </button>

          {showNewArtifactMenu && (
            <div role="group" aria-label="Jenis draf baru" className="absolute right-0 top-full mt-1.5 w-48 p-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-50 animate-scale-up space-y-0.5">
              <button
                type="button"
                onClick={() => {
                  setShowNewArtifactMenu(false);
                  onCreateNewArtifact('DOCUMENT');
                }}
                className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-2 cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Draf Dokumen (.md)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowNewArtifactMenu(false);
                  onCreateNewArtifact('CODE');
                }}
                className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-2 cursor-pointer"
              >
                <FileCode className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Skrip Kode (.py/.ts)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowNewArtifactMenu(false);
                  onCreateNewArtifact('CITATION');
                }}
                className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-2 cursor-pointer"
              >
                <Quote className="w-3.5 h-3.5 text-amber-500" />
                <span>Daftar Sitasi (.bib)</span>
              </button>
            </div>
          )}
        </div>

        {/* Desktop Canvas Toggle */}
        <button
          type="button"
          onClick={onToggleCanvas}
          className="hidden xl:flex h-8 px-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium items-center gap-1.5 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
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
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse ml-0.5" />
          )}
        </button>

        {/* More Actions Menu (•••) */}
        <div className="relative" ref={moreMenuRef}>
          <button
            type="button"
            onClick={() => setShowMoreMenu(!showMoreMenu)}
            className="h-8 w-8 flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Menu Opsi Workspace"
            aria-label="Opsi Lebih Lanjut"
            aria-expanded={showMoreMenu}
            aria-haspopup="true"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {showMoreMenu && (
            <div role="group" aria-label="Opsi workspace" className="absolute right-0 top-full mt-1.5 w-[min(13rem,calc(100vw-1.5rem))] p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-50 animate-scale-up space-y-0.5">
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
                <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Galeri Template</span>
              </button>

              <div className="border-t border-slate-100 dark:border-slate-800 my-1" />

              <button
                type="button"
                disabled={isClearingConversation || isPreparingConversation}
                onClick={() => setShowDeleteConfirm(true)}
                title={isPreparingConversation ? 'Menyiapkan identitas percakapan agar penghapusan tersimpan dengan benar.' : 'Bersihkan percakapan RuangKerja'}
                className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors flex items-center gap-2 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Bersihkan Obrolan</span>
              </button>

              {/* Delete Confirmation Sub-Popover */}
              {showDeleteConfirm && (
                <div className="p-2.5 mt-1 bg-rose-50/90 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 rounded-lg text-xs space-y-2">
                  <p className="text-xs font-semibold text-rose-900 dark:text-rose-100">Bersihkan percakapan?</p>
                  <p className="text-[11px] text-rose-800 dark:text-rose-200">
                    Semua pesan di RuangKerja ini akan dihapus. Dokumen dan artefak Canvas tetap tersimpan.
                  </p>
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      type="button"
                      disabled={isClearingConversation || isPreparingConversation}
                      onClick={() => setShowDeleteConfirm(false)}
                      className="px-2 py-0.5 rounded text-[11px] text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      disabled={isClearingConversation || isPreparingConversation}
                      onClick={async () => {
                        const cleared = await onConfirmClearWorkspace();
                        if (cleared !== false) {
                          setShowDeleteConfirm(false);
                          setShowMoreMenu(false);
                        }
                      }}
                      className="px-2 py-0.5 rounded bg-rose-600 text-white font-semibold text-[11px] hover:bg-rose-700 transition-colors cursor-pointer disabled:cursor-wait disabled:opacity-60"
                    >
                      {isClearingConversation ? 'Membersihkan…' : 'Bersihkan'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
});
