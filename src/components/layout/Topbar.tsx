import React from 'react';
import { Menu, Ghost, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AiQuotaBadge } from '../AiQuotaBadge';
import { VersionBadge } from '../changelog/VersionBadge';

interface TopbarProps {
  onOpenSidebar?: () => void;
  title?: string;
  showBackButton?: boolean;
  user?: any;
  onOpenSettings?: () => void;
  onOpenChangelog?: () => void;
  rightElement?: React.ReactNode;
}

export function Topbar({ onOpenSidebar, title = 'RuangTenang', showBackButton, user, onOpenSettings, onOpenChangelog, rightElement }: TopbarProps) {
  const navigate = useNavigate();

  return (
    <div className="h-14 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between px-3 sm:px-4 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md sticky top-0 z-10 w-full min-w-0 shrink-0">
      <div className="flex items-center gap-2 min-w-0 flex-1">
        {onOpenSidebar && (
          <button 
            onClick={onOpenSidebar} 
            className="lg:hidden p-2 -ml-1 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 active:bg-slate-200 rounded-xl shrink-0 transition-colors cursor-pointer" 
            aria-label="Buka Menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        
        {showBackButton && (
          <button 
            onClick={() => navigate(-1)} 
            className="p-2 -ml-1 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 active:bg-slate-200 rounded-xl shrink-0 transition-colors cursor-pointer" 
            aria-label="Kembali"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}

        <div className="flex items-center gap-2 pr-2 border-r border-slate-200/80 dark:border-slate-800 shrink-0">
          <div className="w-6 h-6 rounded-lg bg-teal-50 dark:bg-teal-950/70 border border-teal-200/80 dark:border-teal-900 shadow-3xs flex items-center justify-center p-0.5">
            <img src="/favicon.svg" alt="RuangTenang" className="w-full h-full object-contain" />
          </div>
          <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100 hidden xs:inline tracking-tight">{title}</span>
        </div>

        {user?.role === 'guest' && (
          <div className="text-[10px] sm:text-xs bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded-full border border-amber-200/80 dark:border-amber-900/80 flex items-center gap-1 shrink-0 ml-2 font-medium">
            <Ghost className="w-3 h-3 shrink-0 text-amber-600 dark:text-amber-400" />
            <span className="hidden xs:inline">Sesi Tamu</span>
          </div>
        )}
      </div>
      
      <div className="flex items-center gap-1.5 sm:gap-2 relative shrink-0">
        <VersionBadge variant="compact" onClick={onOpenChangelog} />
        <AiQuotaBadge userId={user?.id} userTier={user?.tier} variant="compact" onOpenSettings={onOpenSettings} />
        {rightElement}
      </div>
    </div>
  );
}
