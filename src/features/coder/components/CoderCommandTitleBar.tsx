import React from 'react';
import { Search, Play, FlaskConical, PanelLeft, PanelBottom, PanelRight } from 'lucide-react';

interface CoderCommandTitleBarProps {
  projectName: string;
  activeFilePath: string;
  isMac: boolean;
  isDark?: boolean;
  isSidebarVisible: boolean;
  isDockOpen: boolean;
  isAgentOpen: boolean;
  onOpenSearch: () => void;
  onRun: () => void;
  onRunTests: () => void;
  onToggleSidebar: () => void;
  onToggleDock: () => void;
  onToggleAgent: () => void;
}

const ToggleButton: React.FC<{
  active: boolean;
  label: string;
  shortcut: string;
  isDark: boolean;
  onClick: () => void;
  children: React.ReactNode;
}> = ({ active, label, shortcut, isDark, onClick, children }) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={active}
    aria-label={label}
    title={`${label} (${shortcut})`}
    className={`w-7 h-7 rounded-md flex items-center justify-center transition-colors cursor-pointer ${
      active
        ? isDark
          ? 'bg-slate-800 text-sky-400'
          : 'bg-white text-sky-600 shadow-xs'
        : isDark
        ? 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
        : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/70'
    }`}
  >
    {children}
  </button>
);

/** Titlebar ala Cursor: search pill di tengah, Run di kanan, 3 toggle layout. */
export const CoderCommandTitleBar: React.FC<CoderCommandTitleBarProps> = ({
  projectName,
  activeFilePath,
  isMac,
  isDark = true,
  isSidebarVisible,
  isDockOpen,
  isAgentOpen,
  onOpenSearch,
  onRun,
  onRunTests,
  onToggleSidebar,
  onToggleDock,
  onToggleAgent
}) => {
  const mod = isMac ? 'Cmd' : 'Ctrl';
  return (
    <header
      aria-label="Command Center"
      data-testid="coder-titlebar"
      className={`hidden lg:flex fixed top-0 left-0 right-0 h-9 z-30 items-center gap-3 px-3 border-b select-none ${
        isDark ? 'bg-[#090d16] border-[#1f293d] text-slate-300' : 'bg-[#f1f5f9] border-slate-200 text-slate-700'
      }`}
    >
      <div className="w-48 shrink-0 truncate text-[11px] font-semibold pl-12">{projectName}</div>

      <button
        type="button"
        onClick={onOpenSearch}
        aria-label="Cari file atau perintah"
        className={`mx-auto flex items-center gap-2 h-6 w-full max-w-md px-3 rounded-md border text-[11px] cursor-pointer transition-colors ${
          isDark
            ? 'bg-slate-900/80 border-slate-700/80 text-slate-400 hover:border-sky-500/50 hover:text-slate-200'
            : 'bg-white border-slate-300 text-slate-500 hover:border-sky-400'
        }`}
      >
        <Search className="w-3 h-3 shrink-0" />
        <span className="truncate flex-1 text-left">{activeFilePath || 'RuangCoder'}</span>
        <kbd className="font-mono text-[9px] opacity-70">{mod}+P</kbd>
      </button>

      <div className="flex items-center gap-1.5 shrink-0">
        <button
          type="button"
          onClick={onRunTests}
          title="Jalankan unit test"
          aria-label="Jalankan unit test"
          className={`h-6 px-2 rounded-md flex items-center gap-1 text-[11px] font-semibold border cursor-pointer transition-colors ${
            isDark
              ? 'border-slate-700 text-slate-300 hover:bg-slate-800'
              : 'border-slate-300 text-slate-700 hover:bg-white'
          }`}
        >
          <FlaskConical className="w-3 h-3" />
          <span className="hidden xl:inline">Test</span>
        </button>
        <button
          type="button"
          onClick={onRun}
          title="Jalankan & muat ulang preview (F5)"
          aria-label="Run"
          className="h-6 px-2.5 rounded-md flex items-center gap-1 text-[11px] font-bold bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer transition-colors"
        >
          <Play className="w-3 h-3" />
          <span>Run</span>
        </button>

        <div
          className={`flex items-center gap-0.5 p-0.5 rounded-lg border ${
            isDark ? 'border-slate-800 bg-slate-900/80' : 'border-slate-300 bg-slate-200/70'
          }`}
        >
          <ToggleButton active={isSidebarVisible} label="Sidebar" shortcut={`${mod}+B`} isDark={isDark} onClick={onToggleSidebar}>
            <PanelLeft className="w-3.5 h-3.5" />
          </ToggleButton>
          <ToggleButton active={isDockOpen} label="Panel bawah" shortcut={`${mod}+J`} isDark={isDark} onClick={onToggleDock}>
            <PanelBottom className="w-3.5 h-3.5" />
          </ToggleButton>
          <ToggleButton active={isAgentOpen} label="Agent AI" shortcut={`${mod}+L`} isDark={isDark} onClick={onToggleAgent}>
            <PanelRight className="w-3.5 h-3.5" />
          </ToggleButton>
        </div>
      </div>
    </header>
  );
};

export default CoderCommandTitleBar;
