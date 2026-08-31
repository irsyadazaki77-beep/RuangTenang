import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Menu, MessageSquare } from 'lucide-react';
import { motion } from 'motion/react';
import { VersionBadge } from '../changelog/VersionBadge';

interface WorkspaceLayoutProps {
  title: string;
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
  onOpenChangelog,
  children,
  headerActions,
}) => {
  const navigate = useNavigate();

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 bg-stone-50/60 dark:bg-slate-950 relative min-w-0 overflow-y-auto">
      {/* Top Navbar */}
      <header className="h-14 border-b border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-3 sm:px-6 flex items-center justify-between shrink-0 sticky top-0 z-20">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {onOpenSidebar && (
            <button
              onClick={onOpenSidebar}
              className="lg:hidden p-2 -ml-1 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 active:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              aria-label="Buka Menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white bg-slate-100/90 dark:bg-slate-800 hover:bg-slate-200/90 dark:hover:bg-slate-700 rounded-xl transition-all group shrink-0 cursor-pointer"
            title="Kembali ke Ruang Percakapan"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            <span className="hidden xs:inline">Kembali ke Chat</span>
          </button>

          <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block shrink-0" />

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-sm sm:text-base text-slate-900 dark:text-slate-100 truncate">
                {title}
              </h1>
              {badge && (
                <span className="hidden md:inline-flex px-2 py-0.5 text-[10px] font-semibold bg-teal-50 dark:bg-teal-950/80 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-900 rounded-full">
                  {badge}
                </span>
              )}
            </div>
            {subtitle && (
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate hidden sm:block">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <VersionBadge variant="compact" onClick={onOpenChangelog} />
          {headerActions}
          <button
            onClick={() => navigate('/')}
            className="p-2 text-slate-500 dark:text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 hover:bg-teal-50 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            title="Buka Chat Baru"
            aria-label="Chat Baru"
          >
            <MessageSquare className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <motion.main 
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.2 }}
        className="flex-1 min-w-0 w-full"
      >
        {children}
      </motion.main>
    </div>
  );
};
