import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  Heart, 
  Compass, 
  Stethoscope, 
  Users, 
  Bell, 
  Sparkles, 
  FileCode, 
  Quote, 
  FileText, 
  BookOpen,
  LayoutDashboard,
  ChevronDown
} from 'lucide-react';
import { WorkspaceMode } from '../../../features/workspace/types';
import { SidebarTooltip } from './SidebarTooltip';
import { motion, AnimatePresence } from 'motion/react';

interface SidebarNavLinksProps {
  isCollapsed: boolean;
  currentMode: WorkspaceMode;
  unreadNotificationsCount?: number;
  onOpenNotifications?: () => void;
  onCloseMobile: () => void;
  onSwitchMode?: (mode: WorkspaceMode) => void;
}

export const SidebarNavLinks: React.FC<SidebarNavLinksProps> = ({
  isCollapsed,
  currentMode,
  unreadNotificationsCount = 0,
  onOpenNotifications,
  onCloseMobile,
  onSwitchMode: _onSwitchMode
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isExpanded, setIsExpanded] = useState(false);

  const isRuangKerja = currentMode === 'RUANG_KERJA';

  const handleNavigate = (path: string) => {
    navigate(path);
    onCloseMobile();
  };

  const handleTriggerTemplate = (templateId: string) => {
    navigate('/workspace');
    window.dispatchEvent(new CustomEvent('ruangkerja_trigger_template', { detail: templateId }));
    onCloseMobile();
  };

  if (isCollapsed) {
    return (
      <div className="py-2 px-2 border-t border-slate-200/60 dark:border-slate-800/60 space-y-1 flex flex-col items-center shrink-0">
        {isRuangKerja ? (
          <>
            <SidebarTooltip content="Live Canvas Workspace" show={true} position="right">
              <button
                type="button"
                onClick={() => handleNavigate('/workspace')}
                className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
                  location.pathname === '/workspace'
                    ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold'
                    : 'text-slate-500 hover:bg-slate-200/70 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
                aria-label="Canvas Workspace"
              >
                <LayoutDashboard className="w-4 h-4" />
              </button>
            </SidebarTooltip>

            <SidebarTooltip content="Generator Sitasi (APA/IEEE)" show={true} position="right">
              <button
                type="button"
                onClick={() => handleTriggerTemplate('format-sitasi')}
                className="w-9 h-9 rounded-lg flex items-center justify-center text-amber-500 hover:bg-slate-200/70 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                aria-label="Generator Sitasi"
              >
                <Quote className="w-4 h-4" />
              </button>
            </SidebarTooltip>

            <SidebarTooltip content="Format Skripsi & Paper" show={true} position="right">
              <button
                type="button"
                onClick={() => handleTriggerTemplate('struktur-proposal')}
                className="w-9 h-9 rounded-lg flex items-center justify-center text-emerald-600 dark:text-emerald-400 hover:bg-slate-200/70 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                aria-label="Format Skripsi"
              >
                <FileText className="w-4 h-4" />
              </button>
            </SidebarTooltip>
          </>
        ) : (
          <>
            <SidebarTooltip content="Mood Tracker & Jurnal" show={true} position="right">
              <button
                type="button"
                onClick={() => handleNavigate('/mood')}
                className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
                  location.pathname === '/mood'
                    ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold'
                    : 'text-slate-500 hover:bg-slate-200/70 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
                aria-label="Mood Tracker"
              >
                <Heart className="w-4 h-4" />
              </button>
            </SidebarTooltip>

            <SidebarTooltip content="Tenang Mandiri & Mindfulness" show={true} position="right">
              <button
                type="button"
                onClick={() => handleNavigate('/mindfulness')}
                className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
                  location.pathname === '/mindfulness'
                    ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold'
                    : 'text-slate-500 hover:bg-slate-200/70 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
                aria-label="Tenang Mandiri"
              >
                <Compass className="w-4 h-4" />
              </button>
            </SidebarTooltip>

            <SidebarTooltip content="Skrining Mandiri PHQ/GAD" show={true} position="right">
              <button
                type="button"
                onClick={() => handleNavigate('/screening')}
                className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
                  location.pathname === '/screening'
                    ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold'
                    : 'text-slate-500 hover:bg-slate-200/70 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
                aria-label="Skrining Mandiri"
              >
                <Stethoscope className="w-4 h-4" />
              </button>
            </SidebarTooltip>

            <SidebarTooltip content="Direktori Konselor" show={true} position="right">
              <button
                type="button"
                onClick={() => handleNavigate('/counselors')}
                className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
                  location.pathname === '/counselors'
                    ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold'
                    : 'text-slate-500 hover:bg-slate-200/70 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
                aria-label="Direktori Konselor"
              >
                <Users className="w-4 h-4" />
              </button>
            </SidebarTooltip>
          </>
        )}

        {/* Notifications Icon */}
        <SidebarTooltip content="Notifikasi" show={true} position="right">
          <button
            type="button"
            onClick={() => {
              onOpenNotifications?.();
              onCloseMobile();
            }}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-200/70 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200 transition-colors cursor-pointer relative"
            aria-label="Notifikasi"
          >
            <Bell className="w-4 h-4" />
            {unreadNotificationsCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-900" />
            )}
          </button>
        </SidebarTooltip>
      </div>
    );
  }

  return (
    <div className="px-2.5 py-1.5 border-t border-slate-200/60 dark:border-slate-800/70 shrink-0 space-y-1">
      {/* Collapsible Accordion Header */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-2 py-1 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100/80 dark:hover:bg-slate-800/60 transition-colors cursor-pointer group select-none"
        aria-expanded={isExpanded}
      >
        <div className="flex items-center gap-1.5">
          {isRuangKerja ? (
            <>
              <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>Alat & Fitur Akademik</span>
            </>
          ) : (
            <>
              <Heart className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span>Layanan & Fitur Kampus</span>
            </>
          )}
        </div>
        <ChevronDown 
          className={`w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-transform duration-200 ${
            isExpanded ? 'rotate-180' : ''
          }`} 
        />
      </button>

      {/* Accordion Body */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden space-y-0.5 pt-0.5"
          >
            {isRuangKerja ? (
              /* Academic Tools */
              <>
                <button 
                  type="button"
                  onClick={() => handleNavigate('/workspace')} 
                  className={`w-full flex items-center justify-between px-2 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                    location.pathname === '/workspace'
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 font-semibold'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <FileCode className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>Canvas Workspace</span>
                  </div>
                  <span className="text-[9px] bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 px-1 rounded font-bold">
                    Live
                  </span>
                </button>

                <button 
                  type="button"
                  onClick={() => handleTriggerTemplate('format-sitasi')} 
                  className="w-full flex items-center gap-2 px-2 py-1 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors cursor-pointer"
                >
                  <Quote className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span className="truncate">Generator Sitasi (APA/IEEE)</span>
                </button>

                <button 
                  type="button"
                  onClick={() => handleTriggerTemplate('struktur-proposal')} 
                  className="w-full flex items-center gap-2 px-2 py-1 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span className="truncate">Format Skripsi & Paper</span>
                </button>

                <button 
                  type="button"
                  onClick={() => handleTriggerTemplate('resume-jurnal')} 
                  className="w-full flex items-center gap-2 px-2 py-1 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors cursor-pointer"
                >
                  <BookOpen className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span className="truncate">Bedah Jurnal & Catatan</span>
                </button>
              </>
            ) : (
              /* Campus Services */
              <>
                <button 
                  type="button"
                  onClick={() => handleNavigate('/mood')} 
                  className={`w-full flex items-center gap-2 px-2 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                    location.pathname === '/mood'
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-semibold'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <Heart className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>Mood & Jurnal</span>
                </button>

                <button 
                  type="button"
                  onClick={() => handleNavigate('/mindfulness')} 
                  className={`w-full flex items-center gap-2 px-2 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                    location.pathname === '/mindfulness'
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-semibold'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <Compass className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>Tenang Mandiri</span>
                </button>

                <button 
                  type="button"
                  onClick={() => handleNavigate('/screening')} 
                  className={`w-full flex items-center gap-2 px-2 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                    location.pathname === '/screening'
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-semibold'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <Stethoscope className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>Skrining Mandiri</span>
                </button>

                <button 
                  type="button"
                  onClick={() => handleNavigate('/counselors')} 
                  className={`w-full flex items-center gap-2 px-2 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                    location.pathname === '/counselors'
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-semibold'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <Users className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>Direktori Konselor</span>
                </button>

                <button 
                  type="button"
                  onClick={() => handleNavigate('/counselor-portal')} 
                  className={`w-full flex items-center justify-between px-2 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                    location.pathname === '/counselor-portal'
                      ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-semibold'
                      : 'text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50/70 dark:hover:bg-indigo-950/30'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Stethoscope className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                    <span>Portal Konselor</span>
                  </div>
                  <span className="text-[9px] bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 px-1 rounded font-bold">
                    Klinis
                  </span>
                </button>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Notifications Row */}
      <button 
        type="button"
        onClick={() => { onOpenNotifications?.(); onCloseMobile(); }} 
        className="w-full flex items-center justify-between px-2 py-1 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100/80 dark:hover:bg-slate-800/60 transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-1.5">
          <Bell className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span>Notifikasi</span>
        </div>
        {unreadNotificationsCount > 0 && (
          <span className="bg-rose-500 text-white font-bold text-[9px] h-3.5 min-w-3.5 px-1 rounded-full flex items-center justify-center leading-none">
            {unreadNotificationsCount}
          </span>
        )}
      </button>
    </div>
  );
};

