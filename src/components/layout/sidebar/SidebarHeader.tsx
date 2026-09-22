import React, { RefObject } from 'react';
import { motion } from 'motion/react';
import { 
  SquarePen, 
  Search, 
  X, 
  PanelLeftClose, 
  PanelLeftOpen,
  Archive,
  Heart,
  GraduationCap
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
}) => {
  const isRuangKerja = currentMode === 'RUANG_KERJA';

  if (isCollapsed) {
    return (
      <div className="p-2 space-y-2 shrink-0 border-b border-slate-200/60 dark:border-slate-800/60 flex flex-col items-center">
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
            className="w-9 h-9 rounded-lg flex items-center justify-center text-white bg-emerald-600 hover:bg-emerald-700 transition-all cursor-pointer shadow-xs active:scale-95"
            aria-label="Chat Baru (Obrolan Baru)"
          >
            <SquarePen className="w-4 h-4" />
          </button>
        </SidebarTooltip>

        {/* Mode Switcher Icons */}
        <div className="flex flex-col gap-1 items-center pt-1 border-t border-slate-200/60 dark:border-slate-800/60 w-full">
          <SidebarTooltip content="Beralih ke RuangTenang" show={true} position="right">
            <button
              type="button"
              onClick={() => onSwitchMode?.('RUANG_TENANG')}
              className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                !isRuangKerja
                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                  : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800'
              }`}
              aria-label="RuangTenang"
            >
              <Heart className={`w-4 h-4 ${!isRuangKerja ? 'fill-emerald-500/20' : ''}`} />
            </button>
          </SidebarTooltip>

          <SidebarTooltip content="Beralih ke RuangKerja" show={true} position="right">
            <button
              type="button"
              onClick={() => onSwitchMode?.('RUANG_KERJA')}
              className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                isRuangKerja
                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                  : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800'
              }`}
              aria-label="RuangKerja"
            >
              <GraduationCap className="w-4 h-4" />
            </button>
          </SidebarTooltip>
        </div>

        {/* Search Icon Trigger */}
        <SidebarTooltip content="Cari Obrolan (Ctrl+K atau /)" show={true} position="right">
          <button
            type="button"
            onClick={() => {
              onToggleCollapse();
              setTimeout(() => searchInputRef.current?.focus(), 150);
            }}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/70 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Cari Obrolan"
          >
            <Search className="w-4 h-4" />
          </button>
        </SidebarTooltip>
      </div>
    );
  }

  return (
    <div className="p-3 space-y-2 shrink-0 border-b border-slate-200/60 dark:border-slate-800/60">
      {/* 1. Baris 1 (Top Bar): Brand Logo Ringkas + New Chat & Collapse Buttons */}
      <div className="flex items-center justify-between min-h-[32px]">
        {/* Brand Kiri */}
        <div className="flex items-center gap-2 min-w-0">
          <BrandLogo mode={currentMode} size="xs" />
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="font-bold text-sm tracking-tight text-slate-900 dark:text-slate-100 truncate">
              RuangTenang
            </span>
            {isRuangKerja && (
              <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300/60 dark:border-emerald-700/60 rounded-md shrink-0">
                RuangKerja
              </span>
            )}
          </div>
        </div>

        {/* Aksi Kanan: New Chat & Collapse */}
        <div className="flex items-center gap-1">
          <SidebarTooltip content={isRuangKerja ? 'Ruang Kerja Baru (⌘N)' : 'Obrolan Baru (⌘N)'} show={true} position="bottom">
            <button
              type="button"
              onClick={onNewChat}
              className="p-1.5 rounded-lg transition-all duration-150 cursor-pointer text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-800 active:scale-95 hover:text-emerald-600 dark:hover:text-emerald-400"
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

      {/* 2. Baris 2 (Mode Switcher Minimalis): Compact Segmented Slider setinggi ~32px */}
      <div className="p-0.5 bg-slate-200/60 dark:bg-slate-800/70 rounded-lg flex items-center border border-slate-300/40 dark:border-slate-700/50 relative">
        <button
          type="button"
          onClick={() => onSwitchMode?.('RUANG_TENANG')}
          className={`flex-1 h-7 flex items-center justify-center gap-1.5 px-2 rounded-md text-xs transition-colors cursor-pointer relative z-10 ${
            !isRuangKerja
              ? 'text-emerald-800 dark:text-emerald-300 font-semibold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-medium'
          }`}
          title="Mode Konseling & Relaksasi Mental"
          aria-label="RuangTenang"
        >
          {!isRuangKerja && (
            <motion.div
              layoutId="sidebarActiveModePill"
              className="absolute inset-0 bg-white dark:bg-slate-900 rounded-md shadow-2xs -z-10 ring-1 ring-black/5 dark:ring-white/10"
              transition={{ type: 'spring', stiffness: 450, damping: 32 }}
            />
          )}
          <span className="text-xs leading-none">🌿</span>
          <span className="truncate">RuangTenang</span>
        </button>

        <button
          type="button"
          onClick={() => onSwitchMode?.('RUANG_KERJA')}
          className={`flex-1 h-7 flex items-center justify-center gap-1.5 px-2 rounded-md text-xs transition-colors cursor-pointer relative z-10 ${
            isRuangKerja
              ? 'text-emerald-800 dark:text-emerald-300 font-semibold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-medium'
          }`}
          title="Mode Asisten Akademik & Live Canvas"
          aria-label="RuangKerja"
        >
          {isRuangKerja && (
            <motion.div
              layoutId="sidebarActiveModePill"
              className="absolute inset-0 bg-white dark:bg-slate-900 rounded-md shadow-2xs -z-10 ring-1 ring-black/5 dark:ring-white/10"
              transition={{ type: 'spring', stiffness: 450, damping: 32 }}
            />
          )}
          <span className="text-xs leading-none">💼</span>
          <span className="truncate">RuangKerja</span>
        </button>
      </div>

      {/* 3. Search Bar Kompak & Archive Icon Button */}
      <div className="flex items-center gap-1.5">
        <div 
          className="flex-1 h-[32px] px-2.5 rounded-lg flex items-center gap-1.5 text-xs bg-slate-100/80 dark:bg-slate-800/60 hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-colors cursor-text border border-slate-200/70 dark:border-slate-750 focus-within:ring-1 focus-within:border-emerald-500/70 focus-within:ring-emerald-500/20"
          onClick={() => searchInputRef.current?.focus()}
        >
          <Search className="w-3.5 h-3.5 text-slate-400 shrink-0 pointer-events-none" />
          <input 
            ref={searchInputRef}
            value={search} 
            onChange={e => onSearchChange(e.target.value)}
            placeholder="Cari obrolan..." 
            className="flex-1 w-full bg-transparent text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none leading-none min-w-0"
          />
          {search ? (
            <button 
              type="button"
              onClick={(e) => { 
                e.stopPropagation(); 
                onSearchChange(''); 
                searchInputRef.current?.focus();
              }} 
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer shrink-0"
              aria-label="Bersihkan pencarian"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <span className="hidden sm:inline text-[9.5px] text-slate-400 dark:text-slate-500 select-none font-mono shrink-0 px-1 py-0.2 bg-slate-200/60 dark:bg-slate-700/60 rounded">
              /
            </span>
          )}
        </div>

        {onToggleArchiveView && (
          <SidebarTooltip content={showArchived ? 'Lihat Obrolan Aktif' : 'Lihat Obrolan Terarsip'} show={true} position="bottom">
            <button
              type="button"
              onClick={onToggleArchiveView}
              className={`h-[32px] w-[32px] rounded-lg flex items-center justify-center transition-colors cursor-pointer shrink-0 border ${
                showArchived
                  ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                  : 'bg-slate-100/80 dark:bg-slate-800/60 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 border-slate-200/70 dark:border-slate-750 hover:bg-slate-200/50 dark:hover:bg-slate-800'
              }`}
              aria-label="Arsip Obrolan"
            >
              <Archive className="w-3.5 h-3.5" />
            </button>
          </SidebarTooltip>
        )}
      </div>
    </div>
  );
};

