import React from 'react';
import { Menu, Settings, Moon, Sun, Ghost, Shield } from 'lucide-react';
import { ChatMode, ResponseStyle } from '../types';
import { UserSession } from '../../../types';
import { useTheme } from '../../../contexts/ThemeContext';

interface ChatHeaderProps {
  user: UserSession | null;
  onOpenSidebar?: () => void;
  onOpenSettings?: () => void;
  onOpenChangelog?: () => void; // Kept for backwards compatibility but not used in header anymore
  chatMode: ChatMode;
  setChatMode: (mode: ChatMode) => void;
  responseStyle: ResponseStyle;
  setResponseStyle: (style: ResponseStyle) => void;
  aiModel: string;
  setAiModel: (model: string) => void;
  isTemporary: boolean;
  setIsTemporary: (val: boolean) => void;
  activePlugin: string | null;
  setActivePlugin: (plugin: string | null) => void;
}

export function ChatHeader({
  user, onOpenSidebar,
  chatMode, setChatMode, responseStyle, setResponseStyle,
  isTemporary, setIsTemporary,
  activePlugin, setActivePlugin
}: ChatHeaderProps) {
  const { actualTheme, toggleTheme } = useTheme();

  return (
    <header className="h-14 surface-card sticky top-0 z-20 w-full shrink-0 flex items-center justify-between px-3 sm:px-4 border-b-0 border-b">
      {/* Left side: Mobile menu, brand logo & title, privacy badge */}
      <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1">
        {onOpenSidebar && (
          <button
            onClick={onOpenSidebar}
            className="lg:hidden p-2 -ml-1 text-secondary hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl shrink-0 transition-colors cursor-pointer min-w-[40px] min-h-[40px] flex items-center justify-center"
            aria-label="Buka Menu Sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-7 h-7 rounded-lg bg-teal-50 dark:bg-teal-950/70 border border-teal-200/80 dark:border-teal-900 shadow-3xs flex items-center justify-center p-1">
            <img src="/favicon.svg" alt="RuangTenang" className="w-full h-full object-contain" />
          </div>
          <span className="font-bold text-sm sm:text-base text-primary tracking-tight hidden xs:inline">
            RuangTenang
          </span>
        </div>
        
        {/* Privacy / Guest indicator */}
        <div className="shrink-0 ml-1">
          {user?.role === 'guest' ? (
            <div className="flex text-xs font-medium bg-amber-50 dark:bg-amber-950/60 border border-amber-200/80 dark:border-amber-900/80 text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded-full items-center gap-1">
              <Ghost className="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0" />
              <span className="hidden sm:inline">Sesi Tamu</span>
            </div>
          ) : (
            <button
              onClick={() => setIsTemporary(!isTemporary)}
              className={`flex text-xs font-medium px-2.5 py-1 rounded-full items-center gap-1.5 border transition-colors cursor-pointer ${
                isTemporary
                  ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-300'
                  : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
              title={isTemporary ? 'Sementara: Percakapan tidak disimpan ke riwayat akun.' : 'Tersimpan Privat: Percakapan tersimpan di akun dan dapat dibuka kembali.'}
            >
              {isTemporary ? <Ghost className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" /> : <Shield className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />}
              <span className="hidden sm:inline">{isTemporary ? 'Sementara' : 'Tersimpan Privat'}</span>
            </button>
          )}
        </div>
      </div>
      
      {/* Right side: Theme Toggle, Chat Settings */}
      <div className="flex items-center gap-1.5 sm:gap-2 relative shrink-0">
        
        {/* Theme Toggle Button */}
        <button 
          onClick={toggleTheme} 
          className="p-2 text-secondary hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer min-w-[36px] min-h-[36px] flex items-center justify-center" 
          aria-label="Ganti Tema Tampilan"
          title={actualTheme === 'dark' ? 'Beralih ke Mode Terang' : 'Beralih ke Mode Gelap'}
        >
          {actualTheme === 'dark' ? <Moon className="w-4 h-4 text-amber-400" /> : <Sun className="w-4 h-4 text-amber-600" />}
        </button>

        {/* Chat Parameters Popover Toggle */}
        <button
          onClick={() => setActivePlugin(activePlugin === 'chat_settings' ? null : 'chat_settings')}
          className={`p-2 rounded-xl transition-colors cursor-pointer min-w-[36px] min-h-[36px] flex items-center justify-center ${
            activePlugin === 'chat_settings'
              ? 'bg-slate-200 dark:bg-slate-700 text-primary'
              : 'text-secondary hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
          aria-label="Pengaturan Chat"
          title="Pengaturan Percakapan"
        >
          <Settings className="w-4 h-4" />
        </button>
        
        {activePlugin === 'chat_settings' && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setActivePlugin(null)} />
            <div className="absolute top-full right-0 mt-2 w-72 surface-card rounded-2xl p-4 z-50 space-y-4 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-2 border-b border-default">
                <h3 className="font-semibold text-primary text-sm">
                  Preferensi Percakapan
                </h3>
              </div>
              
              <div className="space-y-1.5">
                <label className="text-xs text-secondary font-medium">
                  Fokus Percakapan
                </label>
                <select
                  value={chatMode}
                  onChange={e => setChatMode(e.target.value as ChatMode)}
                  className="w-full text-sm font-medium surface-muted rounded-xl px-3 py-2 text-primary focus:ring-1 focus:ring-teal-500 outline-none cursor-pointer"
                >
                  <option value="Teman Cerita">Teman Cerita (Santai)</option>
                  <option value="Refleksi Diri">Refleksi Diri (Tanya Balik)</option>
                  <option value="Fokus Solusi">Fokus Solusi (Aksi Nyata)</option>
                  <option value="Produktivitas">Produktivitas (Waktu)</option>
                </select>
              </div>
              
              <div className="space-y-1.5">
                <label className="text-xs text-secondary font-medium">
                  Gaya Respons
                </label>
                <select
                  value={responseStyle}
                  onChange={e => setResponseStyle(e.target.value as ResponseStyle)}
                  className="w-full text-sm font-medium surface-muted rounded-xl px-3 py-2 text-primary focus:ring-1 focus:ring-teal-500 outline-none cursor-pointer"
                >
                  <option value="Singkat">Singkat</option>
                  <option value="Seimbang">Seimbang</option>
                  <option value="Mendalam">Mendalam</option>
                  <option value="Fokus mendengarkan">Fokus Mendengarkan</option>
                </select>
              </div>
            </div>
          </>
        )}
      </div>
    </header>
  );
}

