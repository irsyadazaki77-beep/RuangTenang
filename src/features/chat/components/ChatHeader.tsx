import React, { useState } from 'react';
import { Menu, Moon, Sun, Ghost, Brain, ChevronDown, Search, MoreVertical, Sparkles, Bookmark, GitBranch } from 'lucide-react';
import { ChatMode, ResponseStyle } from '../types';
import { UserSession } from '../../../types';
import { useTheme } from '../../../contexts/ThemeContext';
import { AVAILABLE_AI_MODELS } from '../../../lib/aiModels';
import { BrandLogo } from '../../../components/ui/BrandLogo';

interface ChatHeaderProps {
  user: UserSession | null;
  chatId?: string;
  isBranch?: boolean;
  parentChatTitle?: string;
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
  onToggleSearch?: () => void;
  isSearchOpen?: boolean;
  onOpenSummary?: () => void;
  onOpenBookmarks?: () => void;
  onOpenMemory?: () => void;
  hasMessages?: boolean;
}

export function ChatHeader({
  user, chatId, isBranch, parentChatTitle, onOpenSidebar,
  chatMode, setChatMode, responseStyle, setResponseStyle,
  aiModel, setAiModel,
  isTemporary, setIsTemporary,
  activePlugin, setActivePlugin,
  onToggleSearch, isSearchOpen,
  onOpenSummary, onOpenBookmarks, onOpenMemory,
  hasMessages = false
}: ChatHeaderProps) {
  const { actualTheme, toggleTheme } = useTheme();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const currentModel = AVAILABLE_AI_MODELS.find(m => m.id === aiModel) || AVAILABLE_AI_MODELS[0];
  const isSettingsOpen = activePlugin === 'chat_settings';

  return (
    <header className="h-12 sm:h-12 sticky top-0 z-20 w-full shrink-0 flex items-center justify-between px-3 sm:px-4 bg-stone-50/85 dark:bg-[#0c1117]/85 backdrop-blur-md border-b border-stone-200/60 dark:border-slate-800/60 transition-colors">
      {/* Left side: Mobile menu button & Minimalist Model Trigger */}
      <div className="flex items-center gap-1 sm:gap-2 min-w-0 flex-1">
        {onOpenSidebar && (
          <button
            onClick={onOpenSidebar}
            className="lg:hidden w-10 h-10 min-w-[40px] min-h-[40px] flex items-center justify-center text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-200/50 dark:hover:bg-slate-800/60 rounded-xl shrink-0 transition-colors cursor-pointer"
            aria-label="Buka Menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        <div className="relative min-w-0">
          <button
            onClick={() => setActivePlugin(isSettingsOpen ? null : 'chat_settings')}
            className="flex items-center gap-1.5 px-2 py-1.5 min-h-[40px] rounded-xl hover:bg-stone-200/50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer text-left group min-w-0"
            title="Pilih Model dan Preferensi"
          >
            <BrandLogo size="xs" iconOnly />
            <span className="font-semibold text-[14px] text-stone-900 dark:text-stone-100 tracking-tight whitespace-nowrap">RuangTenang</span>
            <span className="hidden sm:inline-flex text-[12px] text-stone-400 dark:text-slate-500 font-normal truncate">
              · {currentModel?.tag || 'Gemini'}
            </span>
            <ChevronDown className={`w-3.5 h-3.5 text-stone-400 transition-transform duration-150 shrink-0 ${isSettingsOpen ? 'rotate-180 text-teal-600 dark:text-teal-400' : 'group-hover:text-stone-600 dark:group-hover:text-slate-300'}`} />
          </button>

          {/* Preferences Popover */}
          {isSettingsOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setActivePlugin(null)} />
              <div className="absolute top-full left-0 mt-1 w-72 sm:w-80 bg-white dark:bg-slate-900 rounded-2xl p-3.5 z-50 space-y-3.5 shadow-lg border border-slate-200/80 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-120">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                  <span className="font-medium text-xs text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                    <Brain className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                    Preferensi & Model
                  </span>
                  <span className="text-[10.5px] text-slate-400 font-normal">
                    {user?.tier || 'Free'} Plan
                  </span>
                </div>

                {/* Model Selection */}
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    Model AI
                  </label>
                  <select
                    value={aiModel}
                    onChange={e => setAiModel(e.target.value)}
                    className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-800 dark:text-slate-200 outline-none focus:border-teal-500 cursor-pointer"
                  >
                    {AVAILABLE_AI_MODELS.map(m => {
                      const isAllowed = m.allowedTiers.includes(user?.tier || 'Free');
                      return (
                        <option key={m.id} value={m.id} disabled={!isAllowed}>
                          {m.name} {!isAllowed ? '(Pro Tier)' : ''}
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Focus mode */}
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    Fokus Pendampingan
                  </label>
                  <select
                    value={chatMode}
                    onChange={e => setChatMode(e.target.value as ChatMode)}
                    className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-800 dark:text-slate-200 outline-none focus:border-teal-500 cursor-pointer"
                  >
                    <option value="Teman Cerita">Teman Cerita (Santai & Empatik)</option>
                    <option value="Refleksi Diri">Refleksi Diri (Pertanyaan Pemantik)</option>
                    <option value="Fokus Solusi">Fokus Solusi (Langkah Konkret)</option>
                    <option value="Produktivitas">Produktivitas (Manajemen Waktu)</option>
                  </select>
                </div>

                {/* Response style */}
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    Gaya Respons
                  </label>
                  <select
                    value={responseStyle}
                    onChange={e => setResponseStyle(e.target.value as ResponseStyle)}
                    className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-800 dark:text-slate-200 outline-none focus:border-teal-500 cursor-pointer"
                  >
                    <option value="Singkat">Singkat & Ringkas</option>
                    <option value="Seimbang">Seimbang</option>
                    <option value="Mendalam">Mendalam & Komprehensif</option>
                    <option value="Fokus mendengarkan">Fokus Mendengarkan (Minimal Solusi)</option>
                  </select>
                </div>

                {/* Temporary Chat Toggle inside Popover */}
                {user?.role !== 'guest' && (
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="text-[11.5px] font-medium text-slate-800 dark:text-slate-200">Mode Sementara</div>
                      <div className="text-[10px] text-slate-400">Jangan simpan riwayat chat</div>
                    </div>
                    <button
                      onClick={() => setIsTemporary(!isTemporary)}
                      className={`w-9 h-5 rounded-full p-0.5 transition-colors cursor-pointer ${isTemporary ? 'bg-amber-500' : 'bg-slate-200 dark:bg-slate-700'}`}
                    >
                      <div className={`w-4 h-4 rounded-full bg-white shadow-xs transform transition-transform ${isTemporary ? 'translate-x-4' : 'translate-x-0'}`} />
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Branch conversation indicator */}
        {isBranch && (
          <span
            className="inline-flex items-center gap-1 text-[11px] font-medium text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/60 px-2 py-0.5 rounded-full border border-teal-200/60 dark:border-teal-900/60"
            title={parentChatTitle ? `Cabang dari: ${parentChatTitle}` : 'Cabang Percakapan'}
          >
            <GitBranch className="w-3 h-3" />
            <span className="hidden sm:inline">Cabang</span>
          </span>
        )}

        {/* Temporary / Guest badge if active */}
        {user?.role === 'guest' ? (
          <span className="hidden sm:inline-flex items-center gap-1 text-[11px] px-2 py-0.5 whitespace-nowrap rounded-full border border-amber-200/60 dark:border-amber-900/60 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 shrink-0">
            <Ghost className="w-3 h-3" /> Sesi Tamu
          </span>
        ) : isTemporary ? (
          <button
            onClick={() => setIsTemporary(false)}
            className="hidden sm:inline-flex items-center gap-1 text-[11px] px-2 py-0.5 whitespace-nowrap rounded-full border border-amber-200/60 dark:border-amber-900/60 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/40 cursor-pointer shrink-0"
            title="Klik untuk menonaktifkan mode sementara"
          >
            <Ghost className="w-3 h-3" /> Sementara
          </button>
        ) : null}
      </div>

      {/* Right side: Search, More Actions, and Theme toggle */}
      <div className="flex items-center gap-1 shrink-0">
        {onToggleSearch && hasMessages && (
          <button
            onClick={onToggleSearch}
            className={`w-10 h-10 min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl transition-colors cursor-pointer ${
              isSearchOpen
                ? 'text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/60'
                : 'text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-200/50 dark:hover:bg-slate-800/60'
            }`}
            title="Cari dalam Percakapan (Ctrl+F)"
            aria-label="Cari dalam Percakapan"
          >
            <Search className="w-4 h-4" />
          </button>
        )}

        {/* Three dots contextual menu */}
        <div className="relative">
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="w-10 h-10 min-w-[40px] min-h-[40px] flex items-center justify-center text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-200/50 dark:hover:bg-slate-800/60 rounded-xl transition-colors cursor-pointer"
            title="Menu Percakapan"
            aria-label="Menu Percakapan"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {isMenuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setIsMenuOpen(false)} />
              <div className="absolute top-full right-0 mt-1 w-56 bg-white dark:bg-slate-900 rounded-2xl p-1.5 z-50 shadow-xl border border-stone-200/80 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-120 text-xs">
                {chatId && hasMessages && (
                  <button
                    onClick={() => {
                      setIsMenuOpen(false);
                      onOpenSummary?.();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 min-h-[40px] rounded-xl text-stone-700 dark:text-slate-300 hover:bg-stone-100 dark:hover:bg-slate-800 text-left transition-colors cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="font-medium">Ringkas Sesi</div>
                      <div className="text-[10.5px] text-stone-400">Refleksi terstruktur sesi ini</div>
                    </div>
                  </button>
                )}

                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    onOpenBookmarks?.();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 min-h-[40px] rounded-xl text-stone-700 dark:text-slate-300 hover:bg-stone-100 dark:hover:bg-slate-800 text-left transition-colors cursor-pointer"
                >
                  <Bookmark className="w-4 h-4 text-amber-500 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">Pesan Tersimpan</div>
                    <div className="text-[10.5px] text-stone-400">Daftar kutipan penting kamu</div>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    onOpenMemory?.();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 min-h-[40px] rounded-xl text-stone-700 dark:text-slate-300 hover:bg-stone-100 dark:hover:bg-slate-800 text-left transition-colors cursor-pointer"
                >
                  <Brain className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">Kontrol Memori AI</div>
                    <div className="text-[10.5px] text-stone-400">Atur konteks personal refleksi</div>
                  </div>
                </button>
              </div>
            </>
          )}
        </div>

        <button 
          onClick={toggleTheme} 
          className="w-10 h-10 min-w-[40px] min-h-[40px] flex items-center justify-center text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-200/50 dark:hover:bg-slate-800/60 rounded-xl transition-colors cursor-pointer" 
          aria-label="Ganti Tema"
          title={actualTheme === 'dark' ? 'Mode Terang' : 'Mode Gelap'}
        >
          {actualTheme === 'dark' ? <Moon className="w-4 h-4 text-amber-400" /> : <Sun className="w-4 h-4 text-amber-600" />}
        </button>
      </div>
    </header>
  );
}

