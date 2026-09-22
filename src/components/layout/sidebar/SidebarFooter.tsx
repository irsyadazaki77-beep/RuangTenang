import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Settings, 
  Sun, 
  Moon, 
  LogOut, 
  LogIn, 
  AlertCircle,
  MoreVertical,
  ShieldCheck
} from 'lucide-react';
import { useTheme } from '../../../contexts/ThemeContext';
import { SidebarTooltip } from './SidebarTooltip';
import { safeLocalStorage } from '../../../lib/storage';
import { motion, AnimatePresence } from 'motion/react';

interface SidebarFooterProps {
  isCollapsed: boolean;
  user?: any;
  onOpenSettings?: () => void;
  onOpenAuth?: () => void;
  onLogout?: () => void;
  onCloseMobile: () => void;
}

export const SidebarFooter: React.FC<SidebarFooterProps> = ({
  isCollapsed,
  user,
  onOpenSettings,
  onOpenAuth,
  onLogout,
  onCloseMobile
}) => {
  const navigate = useNavigate();
  const { actualTheme, toggleTheme } = useTheme();
  const [todayMood, setTodayMood] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Load today's mood from local storage if available
  useEffect(() => {
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const localLogs = safeLocalStorage.getItem('ruangtenang_mood_logs');
      if (localLogs) {
        const parsed = JSON.parse(localLogs);
        if (Array.isArray(parsed)) {
          const found = parsed.find((l: any) => l.date === todayStr);
          if (found) {
            const moodEmojis: Record<number, string> = {
              1: '😢',
              2: '🙁',
              3: '😐',
              4: '🙂',
              5: '😊'
            };
            setTodayMood(moodEmojis[found.mood] || '🙂');
          }
        }
      }
    } catch {
      // ignore
    }
  }, []);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen]);

  const handleOpenEmergency = () => {
    navigate('/emergency');
    onCloseMobile();
  };

  const isGuest = user?.role === 'guest' || !user;

  if (isCollapsed) {
    return (
      <div className="mt-auto border-t border-slate-200/60 dark:border-slate-800/80 p-2 space-y-1.5 flex flex-col items-center shrink-0">
        {/* Urgent Crisis SOS */}
        <SidebarTooltip content="Bantuan Darurat (SOS 24 Jam)" show={true} position="right">
          <button
            type="button"
            onClick={handleOpenEmergency}
            className="w-9 h-9 rounded-lg bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-rose-600 dark:text-rose-400 border border-rose-200/80 dark:border-rose-800/60 flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Bantuan Darurat SOS"
          >
            <AlertCircle className="w-4 h-4 text-rose-500" />
          </button>
        </SidebarTooltip>

        {/* Theme Toggle */}
        <SidebarTooltip content={actualTheme === 'dark' ? 'Mode Terang' : 'Mode Gelap'} show={true} position="right">
          <button
            type="button"
            onClick={toggleTheme}
            className="w-9 h-9 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/70 dark:hover:bg-slate-800 flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Ganti Tema"
          >
            {actualTheme === 'dark' ? (
              <Moon className="w-4 h-4 text-amber-400" />
            ) : (
              <Sun className="w-4 h-4 text-amber-600" />
            )}
          </button>
        </SidebarTooltip>

        {/* Profile / Auth Button */}
        {isGuest ? (
          <SidebarTooltip content="Masuk Akun" show={true} position="right">
            <button
              type="button"
              onClick={() => {
                onOpenAuth?.();
                onCloseMobile();
              }}
              className="w-9 h-9 rounded-lg bg-slate-200/80 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center transition-colors cursor-pointer"
              aria-label="Masuk Akun"
            >
              <LogIn className="w-4 h-4" />
            </button>
          </SidebarTooltip>
        ) : (
          <SidebarTooltip content={`Profil: ${user?.name || 'User'}`} show={true} position="right">
            <button
              type="button"
              onClick={() => {
                onOpenSettings?.();
                onCloseMobile();
              }}
              className="w-9 h-9 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center shadow-2xs hover:ring-2 hover:ring-emerald-500/40 transition-all cursor-pointer relative"
              aria-label="Pengaturan Profil"
            >
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
              {todayMood && (
                <span className="absolute -bottom-0.5 -right-0.5 text-[9px] leading-none">
                  {todayMood}
                </span>
              )}
            </button>
          </SidebarTooltip>
        )}
      </div>
    );
  }

  return (
    <div ref={menuRef} className="mt-auto border-t border-slate-200/60 dark:border-slate-800/80 px-2.5 py-2 space-y-1.5 shrink-0 relative bg-slate-50/40 dark:bg-[#111315]/80">
      {/* 1. Compact SOS Strip Button (1 Line) */}
      <button 
        type="button"
        onClick={handleOpenEmergency} 
        className="w-full flex items-center justify-between px-2.5 py-1.2 rounded-lg text-xs font-semibold text-rose-700 dark:text-rose-300 bg-rose-50/80 dark:bg-rose-950/40 hover:bg-rose-100/90 dark:hover:bg-rose-900/40 border border-rose-200/80 dark:border-rose-900/60 transition-colors cursor-pointer"
        title="Layanan Tanggap Krisis & Telepon Darurat 24 Jam"
      >
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
          <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
          <span>Bantuan Darurat (SOS)</span>
        </div>
        <span className="text-[10px] text-rose-600/80 dark:text-rose-400 font-medium">
          24 Jam
        </span>
      </button>

      {/* 2. Unified Profile Bar with Popover Trigger */}
      <div className="relative">
        <div className="flex items-center justify-between gap-1 p-0.5 rounded-lg hover:bg-slate-200/50 dark:hover:bg-slate-800/60 transition-colors">
          {isGuest ? (
            <button 
              type="button"
              onClick={() => { onOpenAuth?.(); onCloseMobile(); }} 
              className="flex items-center gap-2 py-1 px-1.5 rounded-md text-left flex-1 min-w-0 cursor-pointer"
              title="Masuk Akun"
            >
              <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 shrink-0">
                <LogIn className="w-3.5 h-3.5" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate leading-tight">
                  Masuk Akun
                </span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 truncate leading-none mt-0.5">
                  Sinkronkan riwayat
                </span>
              </div>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="flex items-center gap-2 py-1 px-1.5 rounded-md text-left flex-1 min-w-0 cursor-pointer"
              title={user?.name || 'Profil Pengguna'}
              aria-expanded={isMenuOpen}
            >
              <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold shrink-0 shadow-2xs relative">
                {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                {todayMood && (
                  <span className="absolute -bottom-1 -right-1 text-[9px] bg-white dark:bg-slate-800 rounded-full px-0.5 leading-none shadow-2xs">
                    {todayMood}
                  </span>
                )}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate leading-tight">
                  {user?.name || 'User'}
                </span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 truncate leading-none mt-0.5">
                  {user?.role === 'counselor' ? 'Konselor Kampus' : 'Mahasiswa'}
                </span>
              </div>
            </button>
          )}

          {/* Direct Controls or Menu Toggle */}
          <div className="flex items-center gap-0.5 shrink-0 pr-0.5">
            <button
              type="button"
              onClick={toggleTheme}
              className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/70 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              aria-label="Ganti Tema"
              title={actualTheme === 'dark' ? 'Mode Terang' : 'Mode Gelap'}
            >
              {actualTheme === 'dark' ? (
                <Moon className="w-3.5 h-3.5 text-amber-400" />
              ) : (
                <Sun className="w-3.5 h-3.5 text-amber-600" />
              )}
            </button>

            {!isGuest ? (
              <button
                type="button"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                  isMenuOpen 
                    ? 'bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white' 
                    : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/70 dark:hover:bg-slate-700'
                }`}
                aria-label="Menu Pengguna"
                title="Menu Pengguna"
              >
                <MoreVertical className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => { onOpenSettings?.(); onCloseMobile(); }}
                className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/70 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                aria-label="Pengaturan"
                title="Pengaturan"
              >
                <Settings className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Upward Dropdown / Popover Menu */}
        <AnimatePresence>
          {isMenuOpen && !isGuest && (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.96 }}
              transition={{ duration: 0.12 }}
              className="absolute bottom-full left-0 right-0 mb-2 z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl p-1.5 space-y-1"
            >
              {/* User Header Details */}
              <div className="px-2.5 py-2 border-b border-slate-100 dark:border-slate-800/80">
                <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                  {user?.name || 'Pengguna'}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                  {user?.email || 'user@kampus.ac.id'}
                </p>
                <div className="flex items-center gap-1 mt-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                  <ShieldCheck className="w-3 h-3" />
                  <span>{user?.role === 'counselor' ? 'Akun Terverifikasi Konselor' : 'Mahasiswa Aktif'}</span>
                </div>
              </div>

              {/* Action Links */}
              <button
                type="button"
                onClick={() => {
                  setIsMenuOpen(false);
                  onOpenSettings?.();
                  onCloseMobile();
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer text-left"
              >
                <Settings className="w-3.5 h-3.5 text-slate-400" />
                <span>Pengaturan Akun</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  toggleTheme();
                }}
                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer text-left"
              >
                <div className="flex items-center gap-2">
                  {actualTheme === 'dark' ? (
                    <Moon className="w-3.5 h-3.5 text-amber-400" />
                  ) : (
                    <Sun className="w-3.5 h-3.5 text-amber-600" />
                  )}
                  <span>Tema Tampilan</span>
                </div>
                <span className="text-[10px] text-slate-400 capitalize">
                  {actualTheme === 'dark' ? 'Gelap' : 'Terang'}
                </span>
              </button>

              {onLogout && (
                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    onLogout();
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer text-left font-medium border-t border-slate-100 dark:border-slate-800/80 pt-1.5 mt-1"
                >
                  <LogOut className="w-3.5 h-3.5 text-rose-500" />
                  <span>Keluar Akun</span>
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

