import React from 'react';
import { Menu, Ghost, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AiQuotaBadge } from '../AiQuotaBadge';

interface TopbarProps {
  onOpenSidebar?: () => void;
  title?: string;
  showBackButton?: boolean;
  user?: any;
  onOpenSettings?: () => void;
  rightElement?: React.ReactNode;
}

export function Topbar({ onOpenSidebar, title = 'RuangTenang', showBackButton, user, onOpenSettings, rightElement }: TopbarProps) {
  const navigate = useNavigate();

  return (
    <div className="h-13 border-b border-stone-200/60 flex items-center justify-between px-3 sm:px-4 bg-white/90 backdrop-blur-md sticky top-0 z-10 w-full min-w-0 shrink-0">
      <div className="flex items-center gap-2 min-w-0 flex-1">
        {onOpenSidebar && (
          <button onClick={onOpenSidebar} className="lg:hidden p-1.5 -ml-1 text-slate-600 hover:bg-slate-100 active:bg-slate-200 rounded-lg shrink-0 transition-colors" aria-label="Buka Menu">
            <Menu className="w-5 h-5" />
          </button>
        )}
        
        {showBackButton && (
          <button onClick={() => navigate(-1)} className="p-1.5 -ml-1 text-slate-600 hover:bg-slate-100 active:bg-slate-200 rounded-lg shrink-0 transition-colors" aria-label="Kembali">
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}

        <div className="flex items-center gap-2 pr-2 border-r border-slate-200/80 shrink-0">
          <img src="/favicon.svg" alt="RuangTenang" className="w-5 h-5 sm:w-6 sm:h-6 object-contain" />
          <span className="font-bold text-xs sm:text-sm text-slate-900 hidden xs:inline tracking-tight">{title}</span>
        </div>

        {user?.role === 'guest' && (
          <div className="text-[10px] sm:text-xs bg-amber-50 text-amber-800 px-2 py-0.5 rounded-md border border-amber-200/80 flex items-center gap-1 shrink-0 ml-2">
            <Ghost className="w-3 h-3 shrink-0" />
            <span className="hidden xs:inline">Sesi Tamu</span>
          </div>
        )}
      </div>
      
      <div className="flex items-center gap-1.5 sm:gap-2 relative shrink-0">
        <AiQuotaBadge userId={user?.id} userTier={user?.tier} variant="compact" onOpenSettings={onOpenSettings} />
        {rightElement}
      </div>
    </div>
  );
}
