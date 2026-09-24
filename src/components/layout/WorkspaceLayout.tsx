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
  subtitle: _subtitle,
  badge,
  onOpenSidebar,
  onOpenChangelog: _onOpenChangelog,
  children,
  headerActions,
}) => {
  const navigate = useNavigate();
  const shouldReduceMotion = useReducedMotion();

  return (
    <div className="flex-1 flex flex-col h-[100dvh] max-h-[100dvh] overflow-hidden bg-slate-50/50 dark:bg-transparent backdrop-blur-[2px] relative min-w-0">
      {/* Top Navbar */}
      <header className="h-13 px-3 sm:px-4 bg-white/90 dark:bg-[#0F172A]/90 backdrop-blur-md flex items-center justify-between shrink-0 sticky top-0 z-20 border-b border-slate-200/80 dark:border-slate-800/80">
        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
          {onOpenSidebar && (
            <button
              onClick={onOpenSidebar}
              className="lg:hidden p-1.5 -ml-1 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label="Buka Menu Sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100/90 dark:bg-slate-800/80 hover:bg-slate-200/90 dark:hover:bg-slate-700/80 border border-slate-200/60 dark:border-slate-700/60 rounded-xl transition-all group shrink-0 cursor-pointer min-h-[44px] sm:min-h-[32px]"
            title="Kembali ke Chat RuangTenang"
          >
            <BrandLogo size="xs" iconOnly />
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
            <span className="hidden xs:inline">Chat</span>
          </button>

          {title && (
            <>
              <div className="h-3.5 w-px border-l border-slate-200 dark:border-slate-800 hidden sm:block shrink-0 mx-1" />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="font-semibold text-xs sm:text-sm text-slate-900 dark:text-slate-100 truncate">
                    {title}
                  </h1>
                  {badge && (
                    <span className="hidden md:inline-flex px-2 py-0.5 text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/80 rounded-full">
                      {badge}
                    </span>
                  )}
                </div>
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
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 bg-slate-100/80 dark:bg-slate-800/80 hover:bg-slate-200/80 dark:hover:bg-slate-700/80 border border-slate-200/60 dark:border-slate-700/60 transition-colors cursor-pointer"
            title="Buka Command Palette (⌘K)"
          >
            <span>Cari atau Aksi</span>
            <kbd className="px-1.5 py-0.5 text-[9.5px] font-mono font-bold bg-white dark:bg-slate-900 rounded border border-slate-300 dark:border-slate-700">⌘K</kbd>
          </button>
          {headerActions}
          <button
            onClick={() => navigate('/')}
            className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-emerald-700 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center"
            title="Buka Chat Baru"
            aria-label="Chat Baru"
          >
            <MessageSquare className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <motion.main 
        initial={shouldReduceMotion ? undefined : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={shouldReduceMotion ? undefined : { opacity: 0, y: -8 }}
        transition={{ duration: 0.2 }}
        className="flex-1 min-w-0 w-full overflow-y-auto overscroll-contain pb-safe"
      >
        {children}
      </motion.main>
    </div>
  );
};
