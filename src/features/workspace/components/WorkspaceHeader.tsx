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
  activeArtifact: WorkspaceArtifact | null;
  isCanvasOpen: boolean;
  mobileActiveTab: WorkspaceTab;
  hasUnreadArtifact: boolean;
  onOpenSidebar?: () => void;
  onSwitchMode?: (mode: WorkspaceMode) => void;
  onSetMobileActiveTab: (tab: WorkspaceTab) => void;
  onToggleCanvas: () => void;
  onCreateNewArtifact: (type: ArtifactType) => void;
  onOpenTemplateGallery: () => void;
  onConfirmClearWorkspace: () => void;
}

export const WorkspaceHeader: React.FC<WorkspaceHeaderProps> = ({
  activeArtifact,
  isCanvasOpen,
  mobileActiveTab,
  hasUnreadArtifact,
  onOpenSidebar,
  onSwitchMode,
  onSetMobileActiveTab,
  onToggleCanvas,
  onCreateNewArtifact,
  onOpenTemplateGallery,
  onConfirmClearWorkspace
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
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="h-13 px-3 sm:px-4 lg:px-6 bg-white dark:bg-[#0F172A] border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-3 z-30 shrink-0">
      {/* Left Zone: Workspace Identity & Mobile Navigation Toggle */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        {onOpenSidebar && (
          <button
            type="button"
            onClick={onOpenSidebar}
            className="lg:hidden p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Buka Sidebar Menu"
          >
            <Layers className="w-4 h-4" />
          </button>
        )}

        <div className="flex items-center gap-2 min-w-0">
          <BrandLogo mode="RUANG_KERJA" size="sm" />
          <span className="font-bold text-sm sm:text-base text-slate-900 dark:text-slate-100 tracking-tight leading-none">
            RuangKerja
          </span>
        </div>

        {/* Active Document Kicker (Desktop) */}
        {activeArtifact && (
          <div className="hidden xl:flex items-center gap-1.5 text-xs text-slate-400 pl-3 border-l border-slate-200 dark:border-slate-800 min-w-0">
            <span className="truncate max-w-[200px] text-slate-600 dark:text-slate-300 font-medium">
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
        <div className="lg:hidden flex items-center p-0.5 bg-slate-100/90 dark:bg-slate-800/90 rounded-lg border border-slate-200/60 dark:border-slate-700/60">
          <button
            type="button"
            onClick={() => onSetMobileActiveTab('chat')}
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
        </div>

        {/* Primary Action: + Draf Baru Dropdown */}
        <div className="relative" ref={newArtifactMenuRef}>
          <button
            type="button"
            onClick={() => setShowNewArtifactMenu(!showNewArtifactMenu)}
            className="h-8 px-2.5 sm:px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs active:scale-95"
            title="Buat Berkas / Draf Baru"
          >
            <FilePlus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Draf Baru</span>
            <ChevronDown className="w-3 h-3 opacity-80" />
          </button>

          {showNewArtifactMenu && (
            <div className="absolute right-0 top-full mt-1.5 w-48 p-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-50 animate-scale-up space-y-0.5">
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
          className="hidden lg:flex h-8 px-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200/80 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium items-center gap-1.5 transition-colors cursor-pointer"
          title={isCanvasOpen ? 'Sembunyikan Panel Canvas' : 'Tampilkan Panel Canvas'}
        >
          {isCanvasOpen ? (
            <>
              <PanelRightClose className="w-3.5 h-3.5" />
              <span>Tutup Canvas</span>
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
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {showMoreMenu && (
            <div className="absolute right-0 top-full mt-1.5 w-52 p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-50 animate-scale-up space-y-0.5">
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
                onClick={() => setShowDeleteConfirm(true)}
                className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors flex items-center gap-2 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Bersihkan Obrolan</span>
              </button>

              {/* Delete Confirmation Sub-Popover */}
              {showDeleteConfirm && (
                <div className="p-2.5 mt-1 bg-rose-50/90 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 rounded-lg text-xs space-y-2">
                  <p className="text-[11px] text-rose-800 dark:text-rose-200">
                    Bersihkan riwayat percakapan sesi ini? Artefak Canvas tetap tersimpan.
                  </p>
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(false)}
                      className="px-2 py-0.5 rounded text-[11px] text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowDeleteConfirm(false);
                        setShowMoreMenu(false);
                        onConfirmClearWorkspace();
                      }}
                      className="px-2 py-0.5 rounded bg-rose-600 text-white font-semibold text-[11px] hover:bg-rose-700 transition-colors cursor-pointer"
                    >
                      Ya, Bersihkan
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
};
