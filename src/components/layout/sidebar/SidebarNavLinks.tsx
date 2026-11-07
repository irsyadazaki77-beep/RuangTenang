import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  MessageSquare,
  Heart,
  Compass,
  Stethoscope,
  Users,
  Bell,
  LayoutDashboard,
  ChevronDown,
  Lock,
  Code2
} from 'lucide-react';
import { WorkspaceMode } from '../../../features/workspace/types';
import { SidebarTooltip } from './SidebarTooltip';
import { usePrivacyVault } from '../../../contexts/PrivacyVaultContext';
import { useAuth } from '../../../contexts/AuthContext';
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
  const { user } = useAuth();
  const { isVaultConfigured, isVaultUnlocked, lockVault, triggerPanicScreen } = usePrivacyVault();

  const canAccessCounselorPortal = Boolean(
    user && (user.role === 'konselor' || user.role === 'admin' || (user.role as string) === 'peer_counselor')
  );

  // Default expanded if currently on a secondary route
  const [isExpanded, setIsExpanded] = useState(() => location.pathname !== '/');

  useEffect(() => {
    if (location.pathname !== '/') {
      setIsExpanded(true);
    }
  }, [location.pathname]);

  const isRuangKerja = currentMode === 'RUANG_KERJA';
  const isRuangCoder = currentMode === 'RUANG_CODER';

  const handleNavigate = (path: string) => {
    navigate(path);
    onCloseMobile();
  };

  if (isCollapsed) {
    return (
      <div className="sidebar-nav py-2 px-2 border-t border-slate-200/60 dark:border-slate-800/60 space-y-1 flex flex-col items-center shrink-0">
        <SidebarTooltip content="AI Chat (Utama)" show={true} position="right">
          <button
            type="button"
            onClick={() => handleNavigate('/')}
            className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
              location.pathname === '/'
                ? 'bg-teal-500/20 text-teal-600 dark:text-teal-400 font-bold'
                : 'text-slate-500 hover:bg-slate-200/70 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
            aria-label="AI Chat"
          >
            <MessageSquare className="w-4 h-4" />
          </button>
        </SidebarTooltip>

        {isRuangCoder ? (
          <SidebarTooltip content="RuangCoder Web IDE" show={true} position="right">
            <button
              type="button"
              onClick={() => handleNavigate('/coder')}
              className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
                location.pathname.startsWith('/coder')
                  ? 'bg-sky-500/20 text-sky-600 dark:text-sky-400 font-bold'
                  : 'text-slate-500 hover:bg-slate-200/70 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
              aria-label="RuangCoder Web IDE"
            >
              <Code2 className="w-4 h-4" />
            </button>
          </SidebarTooltip>
        ) : isRuangKerja ? (
          <SidebarTooltip content="Live Canvas Workspace" show={true} position="right">
            <button
              type="button"
              onClick={() => handleNavigate('/workspace')}
              className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
                location.pathname.startsWith('/workspace')
                  ? 'bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 font-bold'
                  : 'text-slate-500 hover:bg-slate-200/70 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
              aria-label="Canvas Workspace"
            >
              <LayoutDashboard className="w-4 h-4" />
            </button>
          </SidebarTooltip>
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
    <div className="sidebar-nav px-2.5 py-2 border-t border-slate-200/50 dark:border-white/[0.06] shrink-0 space-y-1">
      {/* Collapsible Accordion Header */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-white/70 dark:hover:bg-white/5 transition-all cursor-pointer group select-none btn-tactile"
        aria-expanded={isExpanded}
      >
        <div className="flex items-center gap-2">
          {isRuangCoder ? (
            <>
              <Code2 className="w-3.5 h-3.5 text-sky-500 dark:text-sky-400 shrink-0" />
              <span>RuangCoder IDE</span>
            </>
          ) : isRuangKerja ? (
            <>
              <LayoutDashboard className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400 shrink-0" />
              <span>Ruang Fokus & Dokumen</span>
            </>
          ) : (
            <>
              <Heart className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
              <span>Catatan & Refleksi Diri</span>
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
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            className="overflow-hidden space-y-1 pt-0.5"
          >
            {isRuangCoder ? (
              <button
                type="button"
                onClick={() => handleNavigate('/coder')}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer btn-tactile ${
                  location.pathname.startsWith('/coder')
                    ? 'bg-sky-50/90 dark:bg-sky-950/50 text-sky-800 dark:text-sky-200 font-semibold border border-sky-200/70 dark:border-sky-800/50 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-white/70 dark:hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-lg bg-sky-100/80 dark:bg-sky-900/40 flex items-center justify-center shrink-0">
                    <Code2 className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                  </span>
                  <span>RuangCoder IDE</span>
                </div>
              </button>
            ) : isRuangKerja ? (
              <button
                type="button"
                onClick={() => handleNavigate('/workspace')}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer btn-tactile ${
                  location.pathname.startsWith('/workspace')
                    ? 'bg-white/90 dark:bg-white/10 text-slate-900 dark:text-slate-100 font-semibold border border-slate-200/70 dark:border-white/10 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-white/70 dark:hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center shrink-0">
                    <LayoutDashboard className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  </span>
                  <span>Beranda RuangKerja</span>
                </div>
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => handleNavigate('/mood')}
                  className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer btn-tactile ${
                    location.pathname === '/mood'
                      ? 'bg-white/95 dark:bg-teal-950/50 text-teal-800 dark:text-teal-200 font-semibold border border-teal-200/70 dark:border-teal-800/50 shadow-2xs'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-white/70 dark:hover:bg-white/5'
                  }`}
                >
                  <span className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${location.pathname === '/mood' ? 'bg-teal-100/80 dark:bg-teal-900/60 text-teal-700 dark:text-teal-300' : 'bg-teal-50/70 dark:bg-white/5 text-teal-600 dark:text-teal-400'}`}>
                    <Heart className="w-3.5 h-3.5" />
                  </span>
                  <span>Mood & Jurnal</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleNavigate('/mindfulness')}
                  className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer btn-tactile ${
                    location.pathname === '/mindfulness'
                      ? 'bg-white/95 dark:bg-teal-950/50 text-teal-800 dark:text-teal-200 font-semibold border border-teal-200/70 dark:border-teal-800/50 shadow-2xs'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-white/70 dark:hover:bg-white/5'
                  }`}
                >
                  <span className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${location.pathname === '/mindfulness' ? 'bg-teal-100/80 dark:bg-teal-900/60 text-teal-700 dark:text-teal-300' : 'bg-teal-50/70 dark:bg-white/5 text-teal-600 dark:text-teal-400'}`}>
                    <Compass className="w-3.5 h-3.5" />
                  </span>
                  <span>Tenang Mandiri</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleNavigate('/screening')}
                  className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer btn-tactile ${
                    location.pathname === '/screening'
                      ? 'bg-white/95 dark:bg-teal-950/50 text-teal-800 dark:text-teal-200 font-semibold border border-teal-200/70 dark:border-teal-800/50 shadow-2xs'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-white/70 dark:hover:bg-white/5'
                  }`}
                >
                  <span className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${location.pathname === '/screening' ? 'bg-teal-100/80 dark:bg-teal-900/60 text-teal-700 dark:text-teal-300' : 'bg-teal-50/70 dark:bg-white/5 text-teal-600 dark:text-teal-400'}`}>
                    <Stethoscope className="w-3.5 h-3.5" />
                  </span>
                  <span>Skrining Mandiri</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleNavigate('/counselors')}
                  className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer btn-tactile ${
                    location.pathname === '/counselors'
                      ? 'bg-white/95 dark:bg-teal-950/50 text-teal-800 dark:text-teal-200 font-semibold border border-teal-200/70 dark:border-teal-800/50 shadow-2xs'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-white/70 dark:hover:bg-white/5'
                  }`}
                >
                  <span className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${location.pathname === '/counselors' ? 'bg-teal-100/80 dark:bg-teal-900/60 text-teal-700 dark:text-teal-300' : 'bg-teal-50/70 dark:bg-white/5 text-teal-600 dark:text-teal-400'}`}>
                    <Users className="w-3.5 h-3.5" />
                  </span>
                  <span>Direktori Konselor</span>
                </button>

                {canAccessCounselorPortal && (
                  <button
                    type="button"
                    onClick={() => handleNavigate('/counselor-portal')}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer btn-tactile ${
                      location.pathname === '/counselor-portal'
                        ? 'bg-indigo-50/90 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 font-semibold border border-indigo-200/70 dark:border-indigo-800/50 shadow-2xs'
                        : 'text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50/70 dark:hover:bg-indigo-950/30'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="w-6 h-6 rounded-lg bg-indigo-100/80 dark:bg-indigo-900/40 flex items-center justify-center shrink-0">
                        <Stethoscope className="w-3.5 h-3.5 text-indigo-500" />
                      </span>
                      <span>Portal Konselor</span>
                    </div>
                  </button>
                )}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bilik Privasi & Kunci Layar Row */}
      {isVaultConfigured && (
        <button
          type="button"
          onClick={() => {
            if (isVaultUnlocked) {
              lockVault();
            } else {
              triggerPanicScreen();
            }
            onCloseMobile();
          }}
          className="w-full flex items-center justify-between px-2 py-1 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100/80 dark:hover:bg-slate-800/60 transition-colors cursor-pointer"
          title={isVaultUnlocked ? "Kunci Bilik Privasi Sekarang" : "Bilik Privasi Terkunci (Alt+X)"}
        >
          <div className="flex items-center gap-1.5">
            <Lock className={`w-3.5 h-3.5 shrink-0 ${isVaultUnlocked ? 'text-amber-500' : 'text-emerald-500'}`} />
            <span>Bilik Privasi & PIN</span>
          </div>
          <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${isVaultUnlocked ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'}`}>
            {isVaultUnlocked ? 'Terbuka' : 'Terkunci'}
          </span>
        </button>
      )}

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
