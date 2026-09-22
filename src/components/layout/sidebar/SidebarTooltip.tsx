import React from 'react';

interface SidebarTooltipProps {
  content: string;
  show: boolean;
  children: React.ReactNode;
  position?: 'right' | 'top';
}

export const SidebarTooltip: React.FC<SidebarTooltipProps> = ({
  content,
  show,
  children,
  position = 'right'
}) => {
  if (!show) return <>{children}</>;

  return (
    <div className="relative group flex items-center justify-center">
      {children}
      <div 
        role="tooltip"
        className={`absolute z-50 pointer-events-none whitespace-nowrap px-2.5 py-1 text-[11px] font-medium text-slate-100 bg-slate-900/95 dark:bg-slate-800/95 border border-slate-700/60 rounded-lg shadow-xl opacity-0 scale-95 transition-all duration-150 group-hover:opacity-100 group-hover:scale-100 ${
          position === 'right' 
            ? 'left-full ml-2 top-1/2 -translate-y-1/2' 
            : 'bottom-full mb-2 left-1/2 -translate-x-1/2'
        }`}
      >
        {content}
        <div 
          className={`absolute w-1.5 h-1.5 bg-slate-900 dark:bg-slate-800 border-slate-700/60 rotate-45 ${
            position === 'right' 
              ? '-left-1 top-1/2 -translate-y-1/2 border-l border-b' 
              : '-bottom-1 left-1/2 -translate-x-1/2 border-r border-b'
          }`}
        />
      </div>
    </div>
  );
};
