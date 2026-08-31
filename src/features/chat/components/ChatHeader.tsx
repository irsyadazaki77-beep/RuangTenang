import React from 'react';
import { Menu, Settings, Moon, Sun, Sparkles, Ghost, Shield } from 'lucide-react';
import { ChatMode, ResponseStyle } from '../types';
import { AiQuotaBadge } from '../../../components/AiQuotaBadge';
import { VersionBadge } from '../../../components/changelog/VersionBadge';
import { AVAILABLE_AI_MODELS } from '../../../lib/aiModels';
import { UserSession } from '../../../types';
import { useTheme } from '../../../contexts/ThemeContext';

interface ChatHeaderProps {
  user: UserSession | null;
  onOpenSidebar?: () => void;
  onOpenSettings?: () => void;
  onOpenChangelog?: () => void;
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
  user, onOpenSidebar, onOpenSettings, onOpenChangelog,
  chatMode, setChatMode, responseStyle, setResponseStyle,
  aiModel, setAiModel, isTemporary, setIsTemporary,
  activePlugin, setActivePlugin
}: ChatHeaderProps) {
  const { actualTheme, toggleTheme } = useTheme();

  return (
    <header className="h-14 border-b border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md sticky top-0 z-20 w-full shrink-0 flex items-center justify-between px-3 sm:px-4">
      {/* Left side: Mobile menu, brand logo & title, privacy badge */}
      <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1">
        {onOpenSidebar && (
          <button
            onClick={onOpenSidebar}
            className="lg:hidden p-2 -ml-1 text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 active:bg-slate-200 rounded-xl shrink-0 transition-colors cursor-pointer min-w-[40px] min-h-[40px] flex items-center justify-center"
            aria-label="Buka Menu Sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-7 h-7 rounded-lg bg-teal-50 dark:bg-teal-950/70 border border-teal-200/80 dark:border-teal-900 shadow-3xs flex items-center justify-center p-1">
            <img src="/favicon.svg" alt="RuangTenang" className="w-full h-full object-contain" />
          </div>
          <span className="font-bold text-sm sm:text-base text-slate-900 dark:text-slate-100 tracking-tight hidden xs:inline">
            RuangTenang
          </span>
        </div>
        
        {/* Privacy / Guest indicator */}
        <div className="shrink-0 ml-1">
          {user?.role === 'guest' ? (
            <div className="flex text-[11px] font-medium bg-amber-50 dark:bg-amber-950/60 border border-amber-200/80 dark:border-amber-900/80 text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded-full items-center gap-1">
              <Ghost className="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0" />
              <span className="hidden sm:inline">Sesi Tamu</span>
            </div>
          ) : (
            <button
              onClick={() => setIsTemporary(!isTemporary)}
              className={`flex text-[11px] font-medium px-2 py-0.5 rounded-full items-center gap-1 border transition-colors cursor-pointer ${
                isTemporary
                  ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-300'
                  : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200/80 dark:hover:bg-slate-700'
              }`}
              title={isTemporary ? 'Percakapan bersifat sementara (tidak disimpan di database)' : 'Percakapan tersimpan secara privat'}
            >
              {isTemporary ? <Ghost className="w-3 h-3 text-amber-600 dark:text-amber-400" /> : <Shield className="w-3 h-3 text-teal-600 dark:text-teal-400" />}
              <span className="hidden sm:inline">{isTemporary ? 'Mode Privat' : 'Tersimpan'}</span>
            </button>
          )}
        </div>
      </div>
      
      {/* Right side: Version Badge, AI Quota Badge, Theme Toggle, Chat Settings */}
      <div className="flex items-center gap-1.5 sm:gap-2 relative shrink-0">
        <VersionBadge variant="compact" onClick={onOpenChangelog} />
        <AiQuotaBadge userId={user?.id} userTier={user?.tier} variant="compact" onOpenSettings={onOpenSettings} />
        
        {/* Theme Toggle Button */}
        <button 
          onClick={toggleTheme} 
          className="p-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer min-w-[36px] min-h-[36px] flex items-center justify-center" 
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
              ? 'bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-slate-100'
              : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
          aria-label="Pengaturan Chat"
          title="Pengaturan Mode & Karakter AI"
        >
          <Settings className="w-4 h-4" />
        </button>
        
        {activePlugin === 'chat_settings' && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setActivePlugin(null)} />
            <div className="absolute top-full right-0 mt-2 w-72 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl rounded-2xl p-4 z-50 space-y-3.5 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-xs uppercase tracking-wider">
                  Preferensi Respon AI
                </h3>
              </div>
              
              <div className="space-y-1.5">
                <label className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold">
                  Mode Percakapan
                </label>
                <select
                  value={chatMode}
                  onChange={e => setChatMode(e.target.value as ChatMode)}
                  className="w-full text-xs font-medium bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-200 focus:ring-1 focus:ring-teal-500 outline-none cursor-pointer"
                >
                  <option value="Teman Cerita">Teman Cerita (Empatis & Santai)</option>
                  <option value="Refleksi Diri">Refleksi Diri (Tanya Balik Sokratik)</option>
                  <option value="Fokus Solusi">Fokus Solusi (Aksi Nyata & Terstruktur)</option>
                  <option value="Produktivitas">Produktivitas (Manajemen Beban & Waktu)</option>
                  <option value="Persiapan Konseling">Persiapan Konseling (Pemetaan Masalah)</option>
                </select>
              </div>
              
              <div className="space-y-1.5">
                <label className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold">
                  Gaya Respons
                </label>
                <select
                  value={responseStyle}
                  onChange={e => setResponseStyle(e.target.value as ResponseStyle)}
                  className="w-full text-xs font-medium bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-200 focus:ring-1 focus:ring-teal-500 outline-none cursor-pointer"
                >
                  <option value="Singkat">Singkat & Ringkas</option>
                  <option value="Seimbang">Seimbang (Standar)</option>
                  <option value="Mendalam">Mendalam & Komprehensif</option>
                  <option value="Fokus mendengarkan">Fokus Mendengarkan (Reflektif)</option>
                  <option value="Fokus solusi">Fokus Solusi & Langkah Konkret</option>
                </select>
              </div>
              
              <div className="space-y-1.5">
                <label className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-teal-600 dark:text-teal-400" /> Model Gemini
                </label>
                <select 
                  value={aiModel} 
                  onChange={e => setAiModel(e.target.value)} 
                  className="w-full text-xs font-medium bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-200 focus:ring-1 focus:ring-teal-500 outline-none cursor-pointer"
                >
                  <optgroup label="Gemini 3.x Series">
                    {AVAILABLE_AI_MODELS.filter(m => m.category === 'Gemini 3.x Series' && m.allowedTiers.includes(user?.tier || 'Free')).map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </optgroup>
                  <optgroup label="Gemini 2.5 Series">
                    {AVAILABLE_AI_MODELS.filter(m => m.category === 'Gemini 2.5 Series' && m.allowedTiers.includes(user?.tier || 'Free')).map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </optgroup>
                </select>
              </div>
            </div>
          </>
        )}
      </div>
    </header>
  );
}

