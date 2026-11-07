import React from 'react';
import { GitBranch, XCircle, AlertTriangle, Sparkles } from 'lucide-react';

interface CoderStatusBarProps {
  isDark?: boolean;
  branch?: string;
  errorCount: number;
  warningCount: number;
  cursor: { line: number; column: number };
  language: string;
  aiLabel: string;
  isDirty?: boolean;
  onOpenProblems: () => void;
  onOpenGit: () => void;
}

/** Status bar 24px ala VS Code/Cursor di dasar workspace. */
export const CoderStatusBar: React.FC<CoderStatusBarProps> = ({
  isDark = true,
  branch = 'main',
  errorCount,
  warningCount,
  cursor,
  language,
  aiLabel,
  isDirty = false,
  onOpenProblems,
  onOpenGit
}) => {
  const item = `h-full px-2 flex items-center gap-1 transition-colors ${
    isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-200'
  }`;
  return (
    <footer
      aria-label="Status Bar"
      data-testid="coder-statusbar"
      className={`hidden lg:flex fixed bottom-0 left-0 right-0 h-6 z-30 items-center justify-between border-t text-[10px] select-none ${
        isDark ? 'bg-[#090d16] border-[#1f293d] text-slate-400' : 'bg-[#f1f5f9] border-slate-200 text-slate-600'
      }`}
    >
      <div className="flex items-center h-full pl-12">
        <button type="button" onClick={onOpenGit} className={`${item} cursor-pointer`} title="Source Control">
          <GitBranch className="w-3 h-3" />
          <span className="font-mono">
            {branch}
            {isDirty ? '*' : ''}
          </span>
        </button>
        <button type="button" onClick={onOpenProblems} className={`${item} cursor-pointer`} title="Buka Problems">
          <XCircle className={`w-3 h-3 ${errorCount > 0 ? 'text-rose-400' : ''}`} />
          <span data-testid="status-errors">{errorCount}</span>
          <AlertTriangle className={`w-3 h-3 ml-1 ${warningCount > 0 ? 'text-amber-400' : ''}`} />
          <span data-testid="status-warnings">{warningCount}</span>
        </button>
      </div>
      <div className="flex items-center h-full">
        <span className={item} data-testid="status-cursor">
          Ln {cursor.line}, Col {cursor.column}
        </span>
        <span className={item}>Spaces: 2</span>
        <span className={item}>UTF-8</span>
        <span className={item}>{language}</span>
        <span className={`${item} text-sky-400`}>
          <Sparkles className="w-3 h-3" />
          {aiLabel}
        </span>
      </div>
    </footer>
  );
};

export default CoderStatusBar;
