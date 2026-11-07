import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Pin,
  PinOff,
  Columns,
  Rows,
  Copy
} from 'lucide-react';

export type SplitEditorMode = 'none' | 'vertical' | 'horizontal';

export interface TabContextMenuState {
  x: number;
  y: number;
  tabPath: string;
}

interface AdvancedTabBarProps {
  openTabs: string[];
  activeFilePath: string;
  pinnedTabs: string[];
  dirtyTabs: Set<string>;
  splitMode: SplitEditorMode;
  isDark?: boolean;
  onSelectTab: (tabPath: string) => void;
  onCloseTab: (tabPath: string, e?: React.MouseEvent) => void;
  onCloseOthers: (tabPath: string) => void;
  onCloseToTheRight: (tabPath: string) => void;
  onCloseSaved: () => void;
  onTogglePinTab: (tabPath: string) => void;
  onSplitEditor: (mode: SplitEditorMode, secondaryPath?: string) => void;
  onCopyPath: (tabPath: string) => void;
  getFileIcon: (fileName: string) => React.ReactNode;
}

export const AdvancedTabBar: React.FC<AdvancedTabBarProps> = ({
  openTabs,
  activeFilePath,
  pinnedTabs,
  dirtyTabs,
  splitMode,
  isDark = true,
  onSelectTab,
  onCloseTab,
  onCloseOthers,
  onCloseToTheRight,
  onCloseSaved,
  onTogglePinTab,
  onSplitEditor,
  onCopyPath,
  getFileIcon
}) => {
  const [contextMenu, setContextMenu] = useState<TabContextMenuState | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close context menu on external click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setContextMenu(null);
      }
    };
    if (contextMenu) {
      window.addEventListener('mousedown', handleOutsideClick);
    }
    return () => window.removeEventListener('mousedown', handleOutsideClick);
  }, [contextMenu]);

  const handleContextMenu = (tabPath: string, e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({
      x: Math.min(e.clientX, window.innerWidth - 220),
      y: Math.min(e.clientY, window.innerHeight - 300),
      tabPath
    });
  };

  // Separate pinned and unpinned tabs
  const pinnedList = openTabs.filter(t => pinnedTabs.includes(t));
  const unpinnedList = openTabs.filter(t => !pinnedTabs.includes(t));

  return (
    <div
      className={`h-9 shrink-0 border-b flex items-center justify-between px-2 select-none overflow-x-auto transition-colors ${
        isDark ? 'bg-[#090d16] border-[#1f293d]' : 'bg-[#f8fafc] border-slate-200'
      }`}
    >
      {/* Tabs Container */}
      <div className="flex items-center gap-1 overflow-x-auto min-w-0 py-0.5 scrollbar-none">
        {/* Pinned Tabs (Compact, leftmost) */}
        {pinnedList.map(tabPath => {
          const isActive = tabPath === activeFilePath;
          const isDirty = dirtyTabs.has(tabPath);
          return (
            <div
              key={tabPath}
              onClick={() => onSelectTab(tabPath)}
              onContextMenu={e => handleContextMenu(tabPath, e)}
              className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs cursor-pointer border transition-all ${
                isActive
                  ? isDark
                    ? 'bg-slate-800 text-sky-300 border-sky-500/50 font-bold shadow-2xs'
                    : 'bg-white text-sky-700 border-sky-400 font-bold shadow-2xs'
                  : isDark
                  ? 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-850'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-200/60'
              }`}
              title={`${tabPath} (Pinned)`}
            >
              <Pin className="w-2.5 h-2.5 text-sky-400 shrink-0" />
              {getFileIcon(tabPath)}
              <span className="truncate max-w-[90px]">{tabPath}</span>
              {isDirty && (
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shrink-0" title="Belum disimpan" />
              )}
            </div>
          );
        })}

        {pinnedList.length > 0 && unpinnedList.length > 0 && (
          <div className={`h-4 w-px mx-0.5 ${isDark ? 'bg-slate-800' : 'bg-slate-300'}`} />
        )}

        {/* Regular / Unpinned Tabs */}
        {unpinnedList.map(tabPath => {
          const isActive = tabPath === activeFilePath;
          const isDirty = dirtyTabs.has(tabPath);
          return (
            <div
              key={tabPath}
              onClick={() => onSelectTab(tabPath)}
              onContextMenu={e => handleContextMenu(tabPath, e)}
              className={`group flex items-center gap-2 px-3 py-1 rounded-t-md text-xs cursor-pointer border-t-2 transition-all ${
                isActive
                  ? isDark
                    ? 'bg-[#0f172a] border-sky-400 text-sky-200 font-semibold'
                    : 'bg-white border-sky-600 text-slate-900 font-bold shadow-2xs'
                  : isDark
                  ? 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-850'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-200/60'
              }`}
            >
              {getFileIcon(tabPath)}
              <span className="truncate max-w-[130px]">{tabPath}</span>

              {/* Dirty indicator or Close button */}
              {isDirty ? (
                <button
                  type="button"
                  onClick={e => onCloseTab(tabPath, e)}
                  className="w-3 h-3 flex items-center justify-center p-0 text-amber-400 hover:text-rose-400 transition-colors"
                  title="Perubahan belum disimpan. Klik untuk menutup tab"
                >
                  <span className="w-2 h-2 rounded-full bg-amber-400 group-hover:hidden" />
                  <X className="w-3 h-3 hidden group-hover:block" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={e => onCloseTab(tabPath, e)}
                  className={`p-0.5 rounded opacity-60 group-hover:opacity-100 transition-opacity ${
                    isDark ? 'hover:bg-slate-700 text-slate-400 hover:text-white' : 'hover:bg-slate-200 text-slate-500 hover:text-slate-900'
                  }`}
                  title="Tutup Tab (Ctrl+W)"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Split Editor Mode Quick Controls */}
      <div className="flex items-center gap-1 pl-2 shrink-0">
        <div
          className={`flex items-center p-0.5 rounded-lg border ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-200 border-slate-300'
          }`}
        >
          <button
            type="button"
            onClick={() => onSplitEditor(splitMode === 'vertical' ? 'none' : 'vertical')}
            className={`p-1 rounded text-xs transition-colors cursor-pointer ${
              splitMode === 'vertical'
                ? isDark
                  ? 'bg-sky-600/30 text-sky-400 font-bold'
                  : 'bg-white text-sky-700 font-bold shadow-2xs'
                : isDark
                ? 'text-slate-400 hover:text-white'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            title="Split Editor ke Kanan (Side-by-Side)"
          >
            <Columns className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onSplitEditor(splitMode === 'horizontal' ? 'none' : 'horizontal')}
            className={`p-1 rounded text-xs transition-colors cursor-pointer ${
              splitMode === 'horizontal'
                ? isDark
                  ? 'bg-sky-600/30 text-sky-400 font-bold'
                  : 'bg-white text-sky-700 font-bold shadow-2xs'
                : isDark
                ? 'text-slate-400 hover:text-white'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            title="Split Editor ke Bawah (Horizontal)"
          >
            <Rows className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* VS Code Context Menu */}
      {contextMenu && (
        <div
          ref={menuRef}
          style={{ top: `${contextMenu.y}px`, left: `${contextMenu.x}px` }}
          className={`fixed z-50 w-52 py-1.5 rounded-xl border shadow-2xl text-xs backdrop-blur-md animate-in fade-in-50 duration-100 ${
            isDark ? 'bg-slate-900/95 border-slate-700 text-slate-200' : 'bg-white/95 border-slate-200 text-slate-800'
          }`}
        >
          <div className="px-3 py-1 font-semibold text-[10px] text-slate-400 uppercase tracking-wider truncate border-b border-slate-800/50 mb-1">
            {contextMenu.tabPath}
          </div>

          <button
            type="button"
            onClick={() => {
              onCloseTab(contextMenu.tabPath);
              setContextMenu(null);
            }}
            className={`w-full flex items-center justify-between px-3 py-1.5 text-left transition-colors ${
              isDark ? 'hover:bg-slate-800 hover:text-white' : 'hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <span>Tutup Tab</span>
            <span className="text-[10px] text-slate-400 font-mono">Ctrl+W</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onCloseOthers(contextMenu.tabPath);
              setContextMenu(null);
            }}
            className={`w-full flex items-center justify-between px-3 py-1.5 text-left transition-colors ${
              isDark ? 'hover:bg-slate-800 hover:text-white' : 'hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <span>Tutup Tab Lainnya</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onCloseToTheRight(contextMenu.tabPath);
              setContextMenu(null);
            }}
            className={`w-full flex items-center justify-between px-3 py-1.5 text-left transition-colors ${
              isDark ? 'hover:bg-slate-800 hover:text-white' : 'hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <span>Tutup ke Kanan</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onCloseSaved();
              setContextMenu(null);
            }}
            className={`w-full flex items-center justify-between px-3 py-1.5 text-left transition-colors ${
              isDark ? 'hover:bg-slate-800 hover:text-white' : 'hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <span>Tutup yang Sudah Disimpan</span>
          </button>

          <div className={`my-1 h-px ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />

          <button
            type="button"
            onClick={() => {
              onTogglePinTab(contextMenu.tabPath);
              setContextMenu(null);
            }}
            className={`w-full flex items-center gap-2 px-3 py-1.5 text-left transition-colors ${
              isDark ? 'hover:bg-slate-800 hover:text-white' : 'hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            {pinnedTabs.includes(contextMenu.tabPath) ? (
              <>
                <PinOff className="w-3.5 h-3.5 text-amber-400" />
                <span>Lepas Sematan (Unpin)</span>
              </>
            ) : (
              <>
                <Pin className="w-3.5 h-3.5 text-sky-400" />
                <span>Sematkan Tab (Pin)</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              onSplitEditor('vertical', contextMenu.tabPath);
              setContextMenu(null);
            }}
            className={`w-full flex items-center gap-2 px-3 py-1.5 text-left transition-colors ${
              isDark ? 'hover:bg-slate-800 hover:text-white' : 'hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Columns className="w-3.5 h-3.5 text-purple-400" />
            <span>Belah ke Kanan (Split Right)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onSplitEditor('horizontal', contextMenu.tabPath);
              setContextMenu(null);
            }}
            className={`w-full flex items-center gap-2 px-3 py-1.5 text-left transition-colors ${
              isDark ? 'hover:bg-slate-800 hover:text-white' : 'hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Rows className="w-3.5 h-3.5 text-emerald-400" />
            <span>Belah ke Bawah (Split Down)</span>
          </button>

          <div className={`my-1 h-px ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />

          <button
            type="button"
            onClick={() => {
              onCopyPath(contextMenu.tabPath);
              setContextMenu(null);
            }}
            className={`w-full flex items-center gap-2 px-3 py-1.5 text-left transition-colors ${
              isDark ? 'hover:bg-slate-800 hover:text-white' : 'hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Copy className="w-3.5 h-3.5 text-slate-400" />
            <span>Salin Path Berkas</span>
          </button>
        </div>
      )}
    </div>
  );
};
