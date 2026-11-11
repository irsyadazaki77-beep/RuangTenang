import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Menu, MessageSquare } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { BrandLogo } from '../ui/BrandLogo';

interface WorkspaceLayoutProps {
  title?: string;
  subtitle?: string;
  badge?: string;
  onOpenSidebar?: () => void;
  onOpenChangelog?: () => void;
  children: React.ReactNode;
  headerActions?: React.ReactNode;
}

export const WorkspaceLayout: React.FC<WorkspaceLayoutProps> = ({
  title,
  subtitle,
  badge,
  onOpenSidebar,
  onOpenChangelog: _onOpenChangelog,
  children,
  headerActions,
}) => {
  const navigate = useNavigate();
  const shouldReduceMotion = useReducedMotion();

  return (
    <div data-space="tenang" className="flex-1 flex flex-col h-[100dvh] max-h-[100dvh] overflow-hidden surface-page sanctuary-ambient-glow relative min-w-0">
      {/* Top Navbar */}
      <header className="h-14 px-3 sm:px-5 bg-white/85 dark:bg-[#0e141b]/88 backdrop-blur-2xl flex items-center justify-between shrink-0 sticky top-0 z-20 border-b border-slate-200/60 dark:border-white/[0.06] shadow-[0_2px_16px_-4px_rgba(13,148,136,0.04)]">
        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
          {onOpenSidebar && (
            <button
              onClick={onOpenSidebar}
              className="lg:hidden p-1.5 -ml-1 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100/80 dark:hover:bg-white/10 rounded-xl transition-colors cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center btn-tactile"
              aria-label="Buka Menu Sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-teal-800 dark:hover:text-teal-200 bg-white/90 dark:bg-white/[0.06] hover:bg-teal-50/70 dark:hover:bg-teal-950/40 border border-slate-200/75 dark:border-white/10 hover:border-teal-300/70 dark:hover:border-teal-500/40 rounded-full transition-all group shrink-0 cursor-pointer min-h-[44px] sm:min-h-[36px] shadow-2xs btn-tactile"
            title="Kembali ke Chat RuangTenang"
          >
            <BrandLogo size="xs" iconOnly />
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
            <span className="hidden xs:inline">Bilik Cerita</span>
          </button>

          {title && (
            <>
              <div className="h-4 w-px border-l border-slate-200/70 dark:border-white/10 hidden sm:block shrink-0 mx-1" />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="font-semibold text-xs sm:text-sm text-slate-900 dark:text-slate-100 truncate tracking-tight">
                    {title}
                  </h1>
                  {badge && (
                    <span className="hidden md:inline-flex px-2.5 py-0.5 text-[10px] font-semibold bg-teal-50/90 dark:bg-teal-950/70 text-teal-700 dark:text-teal-300 border border-teal-200/70 dark:border-teal-800/70 rounded-full">
                      {badge}
                    </span>
                  )}
                </div>
                {subtitle && (
                  <p className="hidden lg:block text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-xl leading-tight mt-0.5">
                    {subtitle}
                  </p>
                )}
              </div>
            </>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => {
              window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true }));
            }}
            aria-label="Cari atau buka aksi"
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 bg-white/80 dark:bg-white/[0.06] hover:bg-slate-100/80 dark:hover:bg-white/10 border border-slate-200/75 dark:border-white/10 transition-all cursor-pointer shadow-3xs btn-tactile"
            title="Buka Command Palette (⌘K)"
          >
            <span>Cari atau Aksi</span>
            <kbd className="px-1.5 py-0.5 text-[9.5px] font-mono font-bold bg-slate-100/80 dark:bg-slate-900 rounded-md border border-slate-200 dark:border-slate-700">⌘K</kbd>
          </button>
          {headerActions}
          <button
            onClick={() => navigate('/')}
            className="p-2 text-slate-500 dark:text-slate-400 hover:text-teal-700 dark:hover:text-teal-300 hover:bg-teal-50/80 dark:hover:bg-teal-950/40 rounded-full transition-colors cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center btn-tactile"
            title="Buka Chat Baru"
            aria-label="Chat Baru"
          >
            <MessageSquare className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <motion.main 
        initial={shouldReduceMotion ? undefined : { opacity: 0, y: 10, scale: 0.995 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={shouldReduceMotion ? undefined : { opacity: 0, y: -8, scale: 0.995 }}
        transition={{ type: 'spring', stiffness: 320, damping: 28 }}
        className="flex-1 min-w-0 w-full overflow-y-auto overscroll-contain pb-safe"
      >
        {children}
      </motion.main>
    </div>
  );
};
