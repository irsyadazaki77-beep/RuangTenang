import React from 'react';
import { ChevronRight, Maximize2, Minimize2 } from 'lucide-react';

interface BreadcrumbBarProps {
  filePath: string;
  lineCount: number;
  isDark?: boolean;
  isZenMode: boolean;
  onToggleZenMode: () => void;
  onNavigateSegment?: (segmentPath: string) => void;
}

export const BreadcrumbBar: React.FC<BreadcrumbBarProps> = ({
  filePath,
  lineCount,
  isDark = true,
  isZenMode,
  onToggleZenMode,
  onNavigateSegment
}) => {
  const parts = filePath.split(/[/\\]/);

  return (
    <div
      className={`h-7 px-3 border-b flex items-center justify-between text-[11px] select-none transition-colors ${
        isDark ? 'bg-[#090d16] border-[#1f293d] text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'
      }`}
    >
      {/* Clickable Breadcrumbs Path */}
      <div className="flex items-center gap-1.5 truncate min-w-0">
        <span
          onClick={() => onNavigateSegment?.('')}
          className="hover:text-sky-400 cursor-pointer font-medium text-slate-500"
        >
          workspace
        </span>
        {parts.map((part, index) => {
          const isLast = index === parts.length - 1;
          const subPath = parts.slice(0, index + 1).join('/');

          return (
            <React.Fragment key={subPath}>
              <ChevronRight className="w-3 h-3 text-slate-600 shrink-0" />
              <span
                onClick={() => onNavigateSegment?.(subPath)}
                className={`truncate ${
                  isLast
                    ? isDark
                      ? 'text-sky-300 font-semibold'
                      : 'text-sky-700 font-bold'
                    : 'hover:text-slate-200 cursor-pointer'
                }`}
              >
                {part}
              </span>
            </React.Fragment>
          );
        })}
      </div>

      {/* Editor Metadata & Zen Mode Toggle */}
      <div className="flex items-center gap-3 shrink-0 font-mono text-[10px]">
        <span className="hidden sm:inline">{lineCount} lines</span>
        <span className="hidden md:inline">UTF-8</span>
        <span className="text-sky-400 font-bold">
          {filePath.endsWith('.js')
            ? 'JavaScript'
            : filePath.endsWith('.ts')
            ? 'TypeScript'
            : filePath.endsWith('.tsx') || filePath.endsWith('.jsx')
            ? 'React JSX'
            : filePath.endsWith('.html')
            ? 'HTML5'
            : filePath.endsWith('.css')
            ? 'CSS3'
            : filePath.endsWith('.py')
            ? 'Python'
            : filePath.endsWith('.json')
            ? 'JSON'
            : 'Plain Text'}
        </span>

        {/* Zen Mode Button */}
        <button
          type="button"
          onClick={onToggleZenMode}
          className={`flex items-center gap-1 px-1.5 py-0.5 rounded cursor-pointer transition-colors ${
            isZenMode
              ? 'bg-indigo-600 text-white font-bold'
              : isDark
              ? 'hover:bg-slate-800 text-slate-400 hover:text-white'
              : 'hover:bg-slate-200 text-slate-600 hover:text-slate-900'
          }`}
          title="Zen Mode: Fokus penuh tanpa distraksi (Ctrl+K Z)"
        >
          {isZenMode ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
          <span className="hidden xl:inline">{isZenMode ? 'Exit Zen' : 'Zen'}</span>
        </button>
      </div>
    </div>
  );
};
