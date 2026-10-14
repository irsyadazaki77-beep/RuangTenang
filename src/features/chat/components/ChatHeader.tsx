import React, { useEffect, useState } from 'react';
import { 
  Menu, 
  Moon, 
  Sun, 
  Ghost, 
  Brain, 
  ChevronDown, 
  Search, 
  MoreVertical, 
  Sparkles, 
  Bookmark, 
  GitBranch, 
  HeartPulse, 
  Eye, 
  EyeOff, 
  Shield, 
  Lock,
  Check,
  Zap
} from 'lucide-react';
import { UserSession } from '../../../types';
import { useTheme } from '../../../contexts/ThemeContext';
import { usePrivacyVault } from '../../../contexts/PrivacyVaultContext';
import { 
  DEFAULT_TENANG_PROFILE_ID,
  TENANG_PROFILES,
  isTenangProfile,
  migrateLegacyTenangModelToProfile,
  type TenangProfileId
} from '../../../lib/aiModels';
import { BrandLogo } from '../../../components/ui/BrandLogo';

interface ChatHeaderProps {
  user: UserSession | null;
  chatId?: string;
  isBranch?: boolean;
  parentChatTitle?: string;
  onOpenSidebar?: () => void;
  onOpenSettings?: () => void;
  onOpenChangelog?: () => void;
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
  onOpenGrounding?: () => void;
  hasMessages?: boolean;
  isPrivacyMode?: boolean;
  onTogglePrivacy?: () => void;
}

export function ChatHeader({
  user, chatId, isBranch, parentChatTitle, onOpenSidebar,
  aiModel, setAiModel,
  isTemporary, setIsTemporary,
  activePlugin, setActivePlugin,
  onToggleSearch, isSearchOpen,
  onOpenSummary, onOpenBookmarks, onOpenMemory, onOpenGrounding,
  hasMessages = false,
  isPrivacyMode = false,
  onTogglePrivacy
}: ChatHeaderProps) {
  const { actualTheme, toggleTheme } = useTheme();
  const { isIncognitoMode, toggleIncognito, triggerPanicScreen } = usePrivacyVault();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const isSettingsOpen = activePlugin === 'chat_settings';

  const activeProfileId: TenangProfileId = isTenangProfile(aiModel)
    ? aiModel
    : migrateLegacyTenangModelToProfile(aiModel);

  const activeProfile = TENANG_PROFILES.find(p => p.id === activeProfileId) ?? TENANG_PROFILES[1];

  useEffect(() => {
    if (aiModel && !isTenangProfile(aiModel)) {
      setAiModel(activeProfileId);
    }
  }, [aiModel, activeProfileId, setAiModel]);

  return (
    <header className="sticky top-0 z-20 w-full shrink-0 flex items-center justify-between px-2.5 sm:px-4 pt-safe pt-[env(safe-area-inset-top,0px)] min-h-[calc(3rem+env(safe-area-inset-top,0px))] bg-stone-50/80 dark:bg-slate-950/70 backdrop-blur-2xl border-b border-stone-200/40 dark:border-slate-800/40 transition-colors">
      
      {/* Left: Mobile Navigation Drawer Toggle & Identity / Model Trigger */}
      <div className="flex items-center gap-1 sm:gap-2 min-w-0 flex-1">
        {onOpenSidebar && (
          <button
            onClick={onOpenSidebar}
            className="lg:hidden w-9 h-9 min-w-[36px] min-h-[36px] flex items-center justify-center text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-200/50 dark:hover:bg-slate-800/60 rounded-lg shrink-0 transition-colors cursor-pointer"
            aria-label="Buka Menu Samping"
          >
            <Menu className="w-4.5 h-4.5" />
          </button>
        )}

        <div className="relative min-w-0">
          <button
            onClick={() => setActivePlugin(isSettingsOpen ? null : 'chat_settings')}
            className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg hover:bg-stone-200/40 dark:hover:bg-slate-800/50 transition-colors cursor-pointer text-left group min-w-0"
            title="Pilih Model dan Preferensi"
          >
            <BrandLogo size="xs" iconOnly />
            <span className="font-semibold text-xs sm:text-[13.5px] text-stone-850 dark:text-stone-100 tracking-tight whitespace-nowrap">
              RuangTenang
            </span>
            <span className="hidden md:inline-flex text-[11px] text-stone-400 dark:text-slate-500 font-normal truncate">
              · {activeProfile.name}
            </span>
            <ChevronDown className={`w-3 h-3 text-stone-400 transition-transform duration-150 shrink-0 ${isSettingsOpen ? 'rotate-180 text-teal-600 dark:text-teal-400' : 'group-hover:text-stone-600 dark:group-hover:text-slate-300'}`} />
          </button>

          {/* Preferences Popover */}
          {isSettingsOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setActivePlugin(null)} />
              <div className="absolute top-full left-0 mt-1.5 w-72 sm:w-80 bg-white dark:bg-slate-900 rounded-xl p-3 z-50 space-y-3 shadow-lg border border-stone-200/80 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-120 text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-stone-100 dark:border-slate-800">
                  <span className="font-medium text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                    <Brain className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                    Preferensi & Model
                  </span>
                  <span className="text-[10px] text-stone-400 font-normal">
                    {user?.tier || 'Free'} Plan
                  </span>
                </div>

                {/* Model Selection -> 3 Official Ruang Tenang Profiles */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[10.5px] font-semibold text-stone-600 dark:text-slate-300">
                      Tingkat Kemampuan AI
                    </label>
                    <span className="text-[9.5px] text-teal-650 dark:text-teal-400 font-medium">
                      Otomatis dirutekan
                    </span>
                  </div>
                  <div role="radiogroup" aria-label="Profil AI RuangTenang" className="space-y-1">
                    {TENANG_PROFILES.map(profile => {
                      const isSelected = profile.id === activeProfileId;
                      const IconComp = profile.id === 'tenang-turbo' ? Brain : profile.id === 'tenang-low' ? Zap : Sparkles;
                      const isDefault = profile.id === DEFAULT_TENANG_PROFILE_ID;

                      return (
                        <button
                          key={profile.id}
                          type="button"
                          role="radio"
                          aria-checked={isSelected}
                          onClick={() => setAiModel(profile.id)}
                          className={`flex w-full items-start gap-2 rounded-lg p-2 text-left transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-teal-50 dark:bg-teal-950/50 ring-1 ring-teal-500/50'
                              : 'hover:bg-stone-100 dark:hover:bg-slate-800'
                          }`}
                        >
                          <div className={`p-1 rounded-md mt-0.5 shrink-0 ${
                            isSelected
                              ? 'bg-teal-100 dark:bg-teal-900/60 text-teal-700 dark:text-teal-300'
                              : 'bg-stone-100 dark:bg-slate-800 text-stone-500 dark:text-slate-400'
                          }`}>
                            <IconComp className="w-3.5 h-3.5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[11.5px] font-semibold text-stone-800 dark:text-stone-200">
                                {profile.name}
                              </span>
                              {isDefault && (
                                <span className="text-[9px] font-medium px-1 py-0.2 rounded bg-teal-100/70 dark:bg-teal-900/60 text-teal-800 dark:text-teal-300">
                                  Default
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-stone-500 dark:text-slate-400 mt-0.5 leading-snug">
                              {profile.description}
                            </p>
                          </div>
                          {isSelected && (
                            <Check className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 mt-1 shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Temporary Chat Toggle inside Popover */}
                {user?.role !== 'guest' && (
                  <div className="pt-2 border-t border-stone-100 dark:border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="text-[11px] font-medium text-stone-800 dark:text-slate-200">Mode Sementara</div>
                      <div className="text-[9.5px] text-stone-400">Pesan tidak disimpan ke riwayat</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsTemporary(!isTemporary)}
                      className={`w-8 h-4.5 rounded-full p-0.5 transition-colors cursor-pointer ${isTemporary ? 'bg-amber-500' : 'bg-stone-200 dark:bg-slate-700'}`}
                    >
                      <div className={`w-3.5 h-3.5 rounded-full bg-white shadow-xs transform transition-transform ${isTemporary ? 'translate-x-3.5' : 'translate-x-0'}`} />
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Discreet Branch / Anonymous state (Unboxed metadata style) */}
        {isBranch && (
          <span
            className="hidden sm:inline-flex items-center gap-1 text-[11px] text-teal-700 dark:text-teal-400 font-medium truncate"
            title={parentChatTitle ? `Cabang dari: ${parentChatTitle}` : 'Cabang Percakapan'}
          >
            <GitBranch className="w-3 h-3" />
            <span>Cabang</span>
          </span>
        )}

        {isIncognitoMode && (
          <button
            onClick={toggleIncognito}
            className="hidden sm:inline-flex items-center gap-1 text-[11px] text-purple-700 dark:text-purple-400 font-medium cursor-pointer"
            title="Mode Anonim Aktif. Klik untuk nonaktifkan."
          >
            <Shield className="w-3 h-3 text-purple-600 dark:text-purple-400" />
            <span>Anonim</span>
          </button>
        )}

        {user?.role === 'guest' ? (
          <span className="hidden lg:inline-flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400 font-medium">
            <Ghost className="w-3 h-3" /> Tamu
          </span>
        ) : isTemporary ? (
          <span className="hidden lg:inline-flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400 font-medium">
            <Ghost className="w-3 h-3" /> Sementara
          </span>
        ) : null}
      </div>

      {/* Right side: Focused primary actions with progressive disclosure */}
      <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
        
        {/* 1. Search in Conversation (Visible when messages exist) */}
        {onToggleSearch && hasMessages && (
          <button
            onClick={onToggleSearch}
            className={`w-9 h-9 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg transition-colors cursor-pointer ${
              isSearchOpen
                ? 'text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/60'
                : 'text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-200/40 dark:hover:bg-slate-800/50'
            }`}
            title="Cari dalam Percakapan (Ctrl+F)"
            aria-label="Cari dalam Percakapan"
          >
            <Search className="w-4 h-4" />
          </button>
        )}

        {/* 2. Desktop Quick Privacy & Panic shortcuts (hidden on small mobile to avoid crowding) */}
        <button
          onClick={triggerPanicScreen}
          className="hidden sm:flex w-9 h-9 min-w-[36px] min-h-[36px] items-center justify-center text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-200/40 dark:hover:bg-slate-800/50 rounded-lg transition-colors cursor-pointer"
          title="Sembunyikan Layar / Panic Screen (Alt+X atau Dobel Esc)"
          aria-label="Sembunyikan Layar"
        >
          <Lock className="w-3.5 h-3.5" />
        </button>

        {onTogglePrivacy && (
          <button
            onClick={onTogglePrivacy}
            className={`hidden sm:flex w-9 h-9 min-w-[36px] min-h-[36px] items-center justify-center rounded-lg transition-all cursor-pointer ${
              isPrivacyMode
                ? 'text-amber-700 dark:text-amber-300 bg-amber-100/90 dark:bg-amber-950/80 ring-1 ring-amber-400/60 shadow-3xs'
                : 'text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-200/40 dark:hover:bg-slate-800/50'
            }`}
            title={isPrivacyMode ? "Buka Tampilan Obrolan" : "Mode Privasi (Samarkan Layar)"}
            aria-label={isPrivacyMode ? "Buka Tampilan Obrolan" : "Mode Privasi"}
          >
            {isPrivacyMode ? <EyeOff className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" /> : <Eye className="w-3.5 h-3.5" />}
          </button>
        )}

        {/* 3. More Actions Popover (Unified Home for Secondary Utilities) */}
        <div className="relative">
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="w-9 h-9 min-w-[36px] min-h-[36px] flex items-center justify-center text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-200/40 dark:hover:bg-slate-800/50 rounded-lg transition-colors cursor-pointer"
            title="Menu & Opsi Tambahan"
            aria-label="Menu & Opsi Tambahan"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {isMenuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setIsMenuOpen(false)} />
              <div className="absolute top-full right-0 mt-1.5 w-60 bg-white dark:bg-slate-900 rounded-xl p-1.5 z-50 shadow-xl border border-stone-200/80 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-120 text-xs">
                
                {/* Mobile-only Panic & Privacy entries inside More */}
                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    triggerPanicScreen();
                  }}
                  className="sm:hidden w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-stone-700 dark:text-slate-300 hover:bg-stone-100 dark:hover:bg-slate-800 text-left transition-colors cursor-pointer"
                >
                  <Lock className="w-3.5 h-3.5 text-stone-500 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">Layar Cepat (Panic Screen)</div>
                    <div className="text-[10px] text-stone-400">Sembunyikan tampilan seketika</div>
                  </div>
                </button>

                {onTogglePrivacy && (
                  <button
                    onClick={() => {
                      setIsMenuOpen(false);
                      onTogglePrivacy();
                    }}
                    className="sm:hidden w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-stone-700 dark:text-slate-300 hover:bg-stone-100 dark:hover:bg-slate-800 text-left transition-colors cursor-pointer"
                  >
                    {isPrivacyMode ? (
                      <EyeOff className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    ) : (
                      <Shield className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="font-medium">{isPrivacyMode ? 'Buka Mode Privasi' : 'Mode Privasi Layar'}</div>
                      <div className="text-[10px] text-stone-400">{isPrivacyMode ? 'Tampilkan kembali chat' : 'Samarkan layar dari sekitar'}</div>
                    </div>
                  </button>
                )}

                {/* Grounding Technique */}
                {onOpenGrounding && (
                  <button
                    onClick={() => {
                      setIsMenuOpen(false);
                      onOpenGrounding();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-stone-700 dark:text-slate-300 hover:bg-stone-100 dark:hover:bg-slate-800 text-left transition-colors cursor-pointer"
                  >
                    <HeartPulse className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="font-medium">Latihan Grounding 5-4-3-2-1</div>
                      <div className="text-[10px] text-stone-400">Teknik redakan panik & cemas</div>
                    </div>
                  </button>
                )}

                {/* Session Summary */}
                {chatId && hasMessages && (
                  <button
                    onClick={() => {
                      setIsMenuOpen(false);
                      onOpenSummary?.();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-stone-700 dark:text-slate-300 hover:bg-stone-100 dark:hover:bg-slate-800 text-left transition-colors cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="font-medium">Ringkasan Sesi</div>
                      <div className="text-[10px] text-stone-400">Rangkuman poin refleksi Anda</div>
                    </div>
                  </button>
                )}

                {/* Bookmarks */}
                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    onOpenBookmarks?.();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-stone-700 dark:text-slate-300 hover:bg-stone-100 dark:hover:bg-slate-800 text-left transition-colors cursor-pointer"
                >
                  <Bookmark className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">Pesan Tersimpan</div>
                    <div className="text-[10px] text-stone-400">Daftar kutipan penting</div>
                  </div>
                </button>

                {/* AI Memory Control */}
                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    onOpenMemory?.();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-stone-700 dark:text-slate-300 hover:bg-stone-100 dark:hover:bg-slate-800 text-left transition-colors cursor-pointer"
                >
                  <Brain className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">Kontrol Memori AI</div>
                    <div className="text-[10px] text-stone-400">Atur konteks personal refleksi</div>
                  </div>
                </button>
              </div>
            </>
          )}
        </div>

        {/* 4. Theme Toggle (Sun / Moon) */}
        <button 
          onClick={toggleTheme} 
          className="w-9 h-9 min-w-[36px] min-h-[36px] flex items-center justify-center text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-200/40 dark:hover:bg-slate-800/50 rounded-lg transition-colors cursor-pointer" 
          aria-label="Ganti Tema Tampilan"
          title={actualTheme === 'dark' ? 'Mode Terang' : 'Mode Gelap'}
        >
          {actualTheme === 'dark' ? <Moon className="w-3.5 h-3.5 text-amber-400" /> : <Sun className="w-3.5 h-3.5 text-amber-600" />}
        </button>

      </div>
    </header>
  );
}
