import React, { useState, useRef, useEffect, RefObject } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  SquarePen,
  Search,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  Archive,
  ChevronDown,
  Check,
  ArrowLeftRight
} from 'lucide-react';
import { WorkspaceMode } from '../../../features/workspace/types';
import { BrandLogo } from '../../ui/BrandLogo';
import { SidebarTooltip } from './SidebarTooltip';

interface SidebarHeaderProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onCloseMobile: () => void;
  currentMode: WorkspaceMode;
  onSwitchMode?: (mode: WorkspaceMode) => void;
  onNewChat: () => void;
  search: string;
  onSearchChange: (val: string) => void;
  searchInputRef: RefObject<HTMLInputElement>;
  showArchived?: boolean;
  onToggleArchiveView?: () => void;
  onOpenCommandPalette?: () => void;
}

export const SidebarHeader: React.FC<SidebarHeaderProps> = ({
  isCollapsed,
  onToggleCollapse,
  onCloseMobile,
  currentMode,
  onSwitchMode,
  onNewChat,
  search,
  onSearchChange,
  searchInputRef,
  showArchived = false,
  onToggleArchiveView,
  onOpenCommandPalette,
}) => {
  const isRuangKerja = currentMode === 'RUANG_KERJA';
  const [isModeMenuOpen, setIsModeMenuOpen] = useState(false);
  const [isInlineSearchOpen, setIsInlineSearchOpen] = useState(false);
  const modeMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside or Escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (modeMenuRef.current && !modeMenuRef.current.contains(e.target as Node)) {
        setIsModeMenuOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsModeMenuOpen(false);
      }
    };
    if (isModeMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isModeMenuOpen]);

  const handleSearchClick = () => {
    if (onOpenCommandPalette) {
      onOpenCommandPalette();
      return;
    }
    setIsInlineSearchOpen(prev => !prev);
    setTimeout(() => searchInputRef.current?.focus(), 60);
  };

  if (isCollapsed) {
    return (
      <div className="p-2 space-y-1.5 shrink-0 flex flex-col items-center">
        <BrandLogo mode={currentMode} size="sm" iconOnly />
        {/* Expand Button */}
        <SidebarTooltip content="Buka Lebar Sidebar (Ctrl+B)" show={true} position="right">
          <button
            type="button"
            onClick={onToggleCollapse}
            className="w-9 h-9 rounded-lg hover:bg-slate-200/80 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer flex items-center justify-center"
            aria-label="Perluas Sidebar"
          >
            <PanelLeftOpen className="w-4 h-4 text-slate-700 dark:text-slate-200" />
          </button>
        </SidebarTooltip>

        {/* New Chat Icon Button */}
        <SidebarTooltip content={isRuangKerja ? 'Ruang Kerja Baru (⌘N)' : 'Obrolan Baru (⌘N)'} show={true} position="right">
          <button
            type="button"
            onClick={onNewChat}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-200/80 dark:hover:bg-slate-800 transition-all cursor-pointer active:scale-95"
            aria-label="Chat Baru (Obrolan Baru)"
          >
            <SquarePen className="w-4 h-4" />
          </button>
        </SidebarTooltip>

        {/* Search Icon Trigger (Ctrl+K) */}
        <SidebarTooltip content="Cari Obrolan & Pintasan (Ctrl+K)" show={true} position="right">
          <button
            type="button"
            onClick={handleSearchClick}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/70 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Cari Obrolan"
          >
            <Search className="w-4 h-4" />
          </button>
        </SidebarTooltip>

        {/* Mode Switcher Toggle Button */}
        <SidebarTooltip
          content={isRuangKerja ? 'Beralih ke RuangTenang' : 'Beralih ke RuangKerja'}
          show={true}
          position="right"
        >
          <button
            type="button"
            onClick={() => onSwitchMode?.(isRuangKerja ? 'RUANG_TENANG' : 'RUANG_KERJA')}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/70 dark:hover:bg-slate-800 transition-all cursor-pointer"
            aria-label={isRuangKerja ? 'Beralih ke RuangTenang' : 'Beralih ke RuangKerja'}
          >
            <ArrowLeftRight className="w-4 h-4" />
          </button>
        </SidebarTooltip>
      </div>
    );
  }

  return (
    <div className="px-2.5 pt-2.5 pb-1.5 space-y-2 shrink-0">
      {/* Single Clean Top Row: Brand Selector Dropdown + Minimal Action Icons (ChatGPT / Gemini style) */}
      <div className="flex items-center justify-between min-h-[36px]">
        {/* Brand Dropdown Trigger */}
        <div ref={modeMenuRef} className="relative min-w-0">
          <button
            type="button"
            onClick={() => setIsModeMenuOpen(prev => !prev)}
            className="flex items-center gap-2 px-2 py-1.5 -ml-1 rounded-xl hover:bg-slate-200/60 dark:hover:bg-slate-800/70 transition-colors cursor-pointer text-left group"
            aria-label={`Mode: ${isRuangKerja ? 'RuangKerja' : 'RuangTenang'}`}
            aria-expanded={isModeMenuOpen}
          >
            <BrandLogo mode={currentMode} size="xs" />
            <div className="flex items-center gap-1 min-w-0">
              <span className="font-semibold text-sm tracking-tight text-slate-900 dark:text-slate-100 truncate">
                {isRuangKerja ? 'RuangKerja' : 'RuangTenang'}
              </span>
              <ChevronDown
                className={`w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-transform duration-150 shrink-0 ${
                  isModeMenuOpen ? 'rotate-180' : ''
                }`}
              />
            </div>
          </button>

          {/* Floating Dropdown Menu (ChatGPT / Gemini style) */}
          <AnimatePresence>
            {isModeMenuOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 4 }}
                transition={{ duration: 0.12 }}
                className="absolute left-0 top-full mt-1.5 z-50 w-[236px] bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-xl p-1.5 space-y-1"
                onClick={e => e.stopPropagation()}
              >
                <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 select-none">
                  Pilih Mode Ruang
                </div>

                {/* Option: RuangTenang */}
                <button
                  type="button"
                  onClick={() => {
                    onSwitchMode?.('RUANG_TENANG');
                    setIsModeMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between p-2 rounded-lg text-left transition-colors cursor-pointer ${
                    !isRuangKerja
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 ring-1 ring-emerald-500/20'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                  aria-label="RuangTenang"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <img src="/favicon.svg" alt="" className="w-5 h-5 rounded object-contain shrink-0" />
                    <div className="min-w-0">
                      <div className="text-xs font-semibold truncate text-slate-900 dark:text-slate-100">RuangTenang</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">Refleksi, skrining & dukungan emosional</div>
                    </div>
                  </div>
                  {!isRuangKerja && <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />}
                </button>

                {/* Option: RuangKerja */}
                <button
                  type="button"
                  onClick={() => {
                    onSwitchMode?.('RUANG_KERJA');
                    setIsModeMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between p-2 rounded-lg text-left transition-colors cursor-pointer ${
                    isRuangKerja
                      ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 ring-1 ring-indigo-500/20'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                  aria-label="RuangKerja"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <img src="/ruangkerja.svg" alt="" className="w-5 h-5 rounded object-contain shrink-0" />
                    <div className="min-w-0">
                      <div className="text-xs font-semibold truncate text-slate-900 dark:text-slate-100">RuangKerja</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">Asisten akademik & workspace dokumen</div>
                    </div>
                  </div>
                  {isRuangKerja && <Check className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right Actions: Search (Ctrl+K), Archive, New Chat, Collapse */}
        <div className="flex items-center gap-0.5">
          <SidebarTooltip content="Cari Obrolan & Pintasan (Ctrl+K)" show={true} position="bottom">
            <button
              type="button"
              onClick={handleSearchClick}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-200/70 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              aria-label="Cari Obrolan (Ctrl+K)"
            >
              <Search className="w-4 h-4" />
            </button>
          </SidebarTooltip>

          {onToggleArchiveView && (
            <SidebarTooltip content={showArchived ? 'Lihat Obrolan Aktif' : 'Arsip Obrolan'} show={true} position="bottom">
              <button
                type="button"
                onClick={onToggleArchiveView}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  showArchived
                    ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-200/70 dark:hover:bg-slate-800'
                }`}
                aria-label="Arsip Obrolan"
              >
                <Archive className="w-4 h-4" />
              </button>
            </SidebarTooltip>
          )}

          <SidebarTooltip content={isRuangKerja ? 'Ruang Kerja Baru (⌘N)' : 'Obrolan Baru (⌘N)'} show={true} position="bottom">
            <button
              type="button"
              onClick={onNewChat}
              className="p-1.5 rounded-lg transition-all duration-150 cursor-pointer text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-200/70 dark:hover:bg-slate-800 active:scale-95"
              aria-label="Chat Baru (Obrolan Baru)"
            >
              <SquarePen className="w-4 h-4" />
            </button>
          </SidebarTooltip>

          {/* Desktop Collapse Button */}
          <SidebarTooltip content="Kecilkan Sidebar (Ctrl+B)" show={true} position="bottom">
            <button
              type="button"
              onClick={onToggleCollapse}
              className="hidden lg:flex p-1.5 rounded-lg hover:bg-slate-200/70 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors cursor-pointer"
              aria-label="Kecilkan Sidebar (Ctrl+B)"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          </SidebarTooltip>

          {/* Mobile Close Drawer Button */}
          <button
            type="button"
            onClick={onCloseMobile}
            className="lg:hidden p-1.5 rounded-lg hover:bg-slate-200/70 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer flex items-center justify-center"
            aria-label="Tutup Sidebar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Optional inline search fallback if search text is active */}
      {(isInlineSearchOpen || Boolean(search)) && (
        <div className="flex items-center gap-1.5 h-[32px] px-2.5 rounded-lg bg-slate-100/80 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-750">
          <Search className="w-3.5 h-3.5 text-slate-400 shrink-0 pointer-events-none" />
          <input
            ref={searchInputRef}
            value={search}
            onChange={e => onSearchChange(e.target.value)}
            placeholder="Filter riwayat..."
            className="flex-1 w-full bg-transparent text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 outline-none leading-none min-w-0"
          />
          <button
            type="button"
            onClick={() => {
              onSearchChange('');
              setIsInlineSearchOpen(false);
            }}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded cursor-pointer shrink-0"
            aria-label="Tutup filter"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};
