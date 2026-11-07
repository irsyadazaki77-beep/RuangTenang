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
  EyeOff,
  Shield,
  Lock,
  Check,
  Zap,
  PhoneCall,
  Headphones,
  Wind
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { UserSession } from '../../../types';
import { useTheme } from '../../../contexts/ThemeContext';
import { usePrivacyVault } from '../../../contexts/PrivacyVaultContext';
import {
  DEFAULT_TENANG_PROFILE_ID,
  TENANG_PROFILES,
  isTenangProfile,
  isAutoRoutingModel,
  migrateLegacyTenangModelToProfile,
  type TenangProfileId
} from '../../../lib/aiModels';
import { BrandLogo } from '../../../components/ui/BrandLogo';
import { TopModeSwitcherPill } from '../../../components/layout/TopModeSwitcherPill';
import { useFocusTrap } from '../../../hooks/useFocusTrap';
import { isOllamaOnlyCatalog, useAiModelCatalog } from '../../../lib/aiModelCatalog';

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
  onOpenWalkAndTalk?: () => void;
  onOpenFirstAid?: () => void;
  onOpenSleepSanctuary?: () => void;
  onOpenPrivacyCenter?: () => void;
  onOpenSelfCareGenerator?: () => void;
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
  onTogglePrivacy,
  onOpenWalkAndTalk,
  onOpenFirstAid,
  onOpenSleepSanctuary,
  onOpenPrivacyCenter,
  onOpenSelfCareGenerator
}: ChatHeaderProps) {
  const navigate = useNavigate();
  const { actualTheme, toggleTheme } = useTheme();
  const { triggerPanicScreen } = usePrivacyVault();
  const { models: aiModels, profiles: catalogProfiles, loading: aiModelCatalogLoading, error: aiModelCatalogError, refresh: refreshAiModelCatalog } = useAiModelCatalog();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSanctuaryOpen, setIsSanctuaryOpen] = useState(false);
  const isSettingsOpen = activePlugin === 'chat_settings';
  const isOllamaOnly = isOllamaOnlyCatalog(aiModels);
  const ollamaModels = aiModels.filter(model => model.provider === 'ollama' && model.availability !== 'provider_not_configured');
  const ollamaTemporarilyUnavailable = ollamaModels.length > 0 && ollamaModels.every(model => model.availability === 'temporarily_unavailable');

  const isAuto = isAutoRoutingModel(aiModel);
  const activeProfileId: TenangProfileId = isTenangProfile(aiModel)
    ? aiModel
    : migrateLegacyTenangModelToProfile(aiModel);

  const catalogTenangProfiles = catalogProfiles.filter(profile => profile.scope === 'tenang');
  const tenangProfiles = catalogTenangProfiles.length > 0 ? catalogTenangProfiles : TENANG_PROFILES;
  const activeProfile = isAuto
    ? { id: 'auto' as any, name: 'Otomatis (Cerdas)', tag: 'Adaptif', description: 'Menyesuaikan model otomatis berdasarkan kebutuhan, perintah, & lampiran (PDF/gambar).' }
    : (tenangProfiles.find(profile => profile.id === activeProfileId) ?? tenangProfiles[1] ?? TENANG_PROFILES[1]);

  useEffect(() => {
    if (isSettingsOpen) void refreshAiModelCatalog();
  }, [isSettingsOpen, refreshAiModelCatalog]);

  const selectedManualModel = aiModels.find(model => model.id === aiModel);

  const settingsSheetRef = useFocusTrap<HTMLDivElement>({
    isOpen: isSettingsOpen,
    onClose: () => setActivePlugin(null),
    lockScroll: false,
  });

  return (
    <header className="sticky top-0 z-20 w-full shrink-0 flex items-center justify-between px-2.5 sm:px-4 pt-safe pt-[env(safe-area-inset-top,0px)] min-h-[calc(3.25rem+env(safe-area-inset-top,0px))] bg-white/78 dark:bg-[#0e1319]/80 backdrop-blur-2xl border-b border-slate-200/50 dark:border-white/[0.05] shadow-[0_2px_16px_-4px_rgba(13,148,136,0.04)] transition-colors">

      {/* Left: Mobile Navigation Drawer Toggle & Identity / Model Trigger */}
      <div className="flex items-center gap-1 sm:gap-2 min-w-0 flex-1">
        {onOpenSidebar && (
          <button
            onClick={onOpenSidebar}
            className="p-2 rounded-full lg:hidden text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors shrink-0 btn-tactile"
            aria-label="Buka Menu Samping"
          >
            <Menu className="w-4.5 h-4.5" />
          </button>
        )}

        <div className="relative min-w-0">
          <button
            onClick={() => setActivePlugin(isSettingsOpen ? null : 'chat_settings')}
            className="inline-flex h-9 items-center gap-1.5 px-3.5 rounded-full border border-slate-200/75 bg-white/90 hover:bg-white hover:border-teal-300/70 dark:border-white/10 dark:bg-white/[0.06] dark:hover:bg-white/10 dark:hover:border-teal-500/40 backdrop-blur-md shadow-2xs transition-all duration-200 cursor-pointer text-left group min-w-0 btn-tactile"
            title="Pilih Model dan Preferensi"
          >
            <BrandLogo size="xs" iconOnly />
            <span className="font-semibold text-xs sm:text-[13px] text-slate-900 dark:text-slate-100 tracking-tight whitespace-nowrap">
              RuangTenang
            </span>
            <span className="hidden md:inline-flex text-[11px] text-slate-400 dark:text-slate-400 font-normal truncate">
              · {selectedManualModel?.name || activeProfile.name}
            </span>
            <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 shrink-0 ${isSettingsOpen ? 'rotate-180 text-teal-600 dark:text-teal-400' : 'group-hover:text-slate-600 dark:group-hover:text-slate-300'}`} />
          </button>

          {/* Preferences Popover */}
          {isSettingsOpen && (
            <>
              <div className="fixed inset-0 z-40 bg-slate-950/40 sm:bg-transparent" onClick={() => setActivePlugin(null)} />
              <div
                ref={settingsSheetRef}
                tabIndex={-1}
                role="dialog"
                aria-modal="true"
                aria-label="Preferensi dan Model AI"
                className="fixed inset-x-0 bottom-0 z-50 w-full max-h-[85dvh] overflow-y-auto rounded-t-3xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl p-3.5 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] space-y-3 shadow-2xl border border-stone-200/80 dark:border-slate-800 animate-in slide-in-from-bottom duration-200 text-xs sm:absolute sm:inset-x-auto sm:bottom-auto sm:top-full sm:left-0 sm:mt-2 sm:w-82 sm:max-h-[min(82dvh,32rem)] sm:rounded-2xl sm:pb-3.5 sm:shadow-[0_18px_48px_-12px_rgba(15,23,42,0.22)] sm:slide-in-from-bottom-0 sm:zoom-in-95 sm:duration-150"
              >
                <div className="flex items-center justify-between pb-2 border-b border-stone-100 dark:border-slate-800">
                  <span className="font-semibold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                    <Brain className="w-3.5 h-3.5 text-teal-700 dark:text-teal-400" />
                    Gaya Pendampingan & Model
                  </span>
                  <span className="text-[10px] text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/60 px-2 py-0.5 rounded-full font-medium">
                    {user?.tier || 'Free'} Plan
                  </span>
                </div>

                {isOllamaOnly && (
                  <div className={`rounded-lg border px-2.5 py-2 text-[10px] leading-relaxed ${ollamaTemporarilyUnavailable
                    ? 'border-amber-200 bg-amber-50/70 text-amber-950 dark:border-amber-900/70 dark:bg-amber-950/30 dark:text-amber-200'
                    : 'border-emerald-200 bg-emerald-50/70 text-emerald-900 dark:border-emerald-900/70 dark:bg-emerald-950/30 dark:text-emerald-200'}`}>
                    {ollamaTemporarilyUnavailable ? (
                      <>
                        <strong className="font-semibold">Ollama sementara ditandai tidak tersedia.</strong> Ada kegagalan berulang pada permintaan terakhir. Periksa koneksi server dan pastikan model yang dipilih terpasang.
                      </>
                    ) : (
                      <>
                        <strong className="font-semibold">Provider yang dikonfigurasi: Ollama.</strong> Pesan diproses di endpoint server; endpoint dapat berada di komputer lain. Status konfigurasi ini tidak memastikan Ollama sedang merespons.
                      </>
                    )}
                  </div>
                )}
                {aiModelCatalogError && (
                  <p role="status" className="rounded-lg border border-amber-200 bg-amber-50/70 px-2.5 py-2 text-[10px] leading-relaxed text-amber-950 dark:border-amber-900/70 dark:bg-amber-950/30 dark:text-amber-200">
                    Status provider terbaru tidak dapat dimuat. Informasi yang terlihat mungkin berasal dari katalog tersimpan; tutup lalu buka pengaturan untuk mencoba lagi.
                  </p>
                )}

                {/* Model Selection -> 3 Official Ruang Tenang Profiles */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[10.5px] font-semibold text-stone-700 dark:text-slate-300">
                      Gaya Respons Teman AI
                    </label>
                    <span className="text-[9.5px] text-teal-700 dark:text-teal-400 font-medium">
                      Menyesuaikan kebutuhanmu
                    </span>
                  </div>
                  <div role="radiogroup" aria-label="Profil AI RuangTenang" className="space-y-1">
                    <button
                      type="button"
                      role="radio"
                      aria-checked={isAuto}
                      onClick={() => setAiModel('auto')}
                      className={`flex w-full items-start gap-2 rounded-lg p-2 text-left transition-colors cursor-pointer ${
                        isAuto
                          ? 'bg-teal-50 dark:bg-teal-950/50 ring-1 ring-teal-500/50'
                          : 'hover:bg-stone-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <div className={`p-1 rounded-md mt-0.5 shrink-0 ${
                        isAuto
                          ? 'bg-teal-100 dark:bg-teal-900/60 text-teal-700 dark:text-teal-300'
                          : 'bg-stone-100 dark:bg-slate-800 text-stone-500 dark:text-slate-400'
                      }`}>
                        <Sparkles className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11.5px] font-semibold text-stone-800 dark:text-stone-200">
                            Otomatis (Cerdas)
                          </span>
                          <span className="text-[9px] font-medium px-1 py-0.2 rounded bg-teal-100/70 dark:bg-teal-900/60 text-teal-800 dark:text-teal-300">
                            Rekomendasi
                          </span>
                        </div>
                        <p className="text-[10px] text-stone-600 dark:text-slate-400 mt-0.5 leading-snug">
                          Menyesuaikan model otomatis berdasarkan jenis instruksi dan berkas (PDF/gambar/analisis).
                        </p>
                      </div>
                      {isAuto && (
                        <Check className="w-3.5 h-3.5 text-teal-700 dark:text-teal-400 mt-1 shrink-0" />
                      )}
                    </button>
                    {tenangProfiles.map(profile => {
                      const isSelected = !isAuto && !selectedManualModel && profile.id === activeProfileId;
                      const IconComp = profile.id === 'tenang-turbo' ? Brain : profile.id === 'tenang-low' ? Zap : Sparkles;
                      const isDefault = profile.id === DEFAULT_TENANG_PROFILE_ID;
                      const isSelectable = profile.selectable && !aiModelCatalogLoading;

                      return (
                        <button
                          key={profile.id}
                          type="button"
                          role="radio"
                          aria-checked={isSelected}
                          aria-disabled={!isSelectable}
                          disabled={!isSelectable}
                          title={!isSelectable ? (aiModelCatalogLoading ? 'Memuat status ketersediaan provider…' : 'Tidak ada model yang tersedia untuk profil ini saat ini.') : undefined}
                          onClick={() => { if (isSelectable) setAiModel(profile.id); }}
                          className={`flex w-full items-start gap-2 rounded-lg p-2 text-left transition-colors ${isSelectable ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'} ${
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
                            <p className="text-[10px] text-stone-600 dark:text-slate-400 mt-0.5 leading-snug">
                              {profile.description}
                            </p>
                          </div>
                          {isSelected && (
                            <Check className="w-3.5 h-3.5 text-teal-700 dark:text-teal-400 mt-1 shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {aiModels.some(model => model.provider === 'ollama' && model.selectable) && (
                  <div className="space-y-1 border-t border-stone-100 pt-2 dark:border-slate-800">
                    <div className="text-[10.5px] font-semibold text-stone-700 dark:text-slate-300">Model Perangkat Lokal</div>
                    <div role="radiogroup" aria-label="Model lokal RuangTenang" className="max-h-40 space-y-1 overflow-y-auto">
                      {aiModels.filter(model => model.provider === 'ollama' && model.selectable).map(model => (
                        <button
                          key={model.id}
                          type="button"
                          role="radio"
                          aria-checked={aiModel === model.id}
                          onClick={() => setAiModel(model.id)}
                          className={`flex w-full items-center justify-between rounded-lg p-2 text-left text-[11px] ${aiModel === model.id ? 'bg-teal-50 font-semibold text-teal-900 dark:bg-teal-950/50 dark:text-teal-200' : 'text-stone-700 hover:bg-stone-100 dark:text-slate-300 dark:hover:bg-slate-800'}`}
                        >
                          <span>{model.name}</span>
                          {aiModel === model.id && <Check className="h-3.5 w-3.5 shrink-0" />}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Temporary Chat Toggle inside Popover */}
                <div className="pt-2 border-t border-stone-100 dark:border-slate-800 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[11px] font-medium text-stone-800 dark:text-slate-200">Mode Sementara</div>
                    <div className="text-[9.5px] leading-relaxed text-stone-600 dark:text-stone-400">Pesan baru tidak masuk ke riwayat. AI tetap memproses pesan; lampiran tetap diunggah ke server.</div>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={isTemporary}
                    aria-label="Aktifkan mode sementara"
                    onClick={() => setIsTemporary(!isTemporary)}
                    className={`h-5 w-9 shrink-0 rounded-full p-0.5 transition-colors cursor-pointer ${isTemporary ? 'bg-amber-500' : 'bg-stone-200 dark:bg-slate-700'}`}
                  >
                    <div className={`h-4 w-4 rounded-full bg-white shadow-xs transition-transform ${isTemporary ? 'translate-x-4' : 'translate-x-0'}`} />
                  </button>
                </div>
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

        {user?.role === 'guest' ? (
          <span className="hidden lg:inline-flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400 font-medium">
            <Ghost className="w-3 h-3" /> Tamu
          </span>
        ) : isTemporary ? (
          <span className="hidden lg:inline-flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400 font-medium">
            <Ghost className="w-3 h-3" /> Sementara
          </span>
        ) : null}

        {onOpenPrivacyCenter && (
          <button
            type="button"
            onClick={onOpenPrivacyCenter}
            className="hidden md:inline-flex h-9 items-center gap-1.5 px-3 rounded-full border border-slate-200/70 bg-white/75 dark:border-white/10 dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:border-teal-300 dark:hover:border-teal-500/40 hover:text-teal-700 dark:hover:text-teal-300 backdrop-blur-md shadow-3xs transition-all duration-200 cursor-pointer text-xs font-medium"
            title="Percakapan Terenkripsi & Privat. Klik untuk membuka Pusat Privasi & Hapus Jejak"
            aria-label="Pusat Privasi & Hapus Jejak"
          >
            <Shield className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
            <span className="hidden xl:inline text-[11.5px]">Privat & Terenkripsi</span>
          </button>
        )}
      </div>

      {/* Center Mode Switcher Pill */}
      <TopModeSwitcherPill activeMode="RUANG_TENANG" className="mx-2 shrink-0" />

      {/* Right side: Zen Minimalist controls with Pojok Reda (Sanctuary Drawer) */}
      <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">

        {/* 1. Search in Conversation (Only visible when messages exist) */}
        {onToggleSearch && hasMessages && (
          <button
            onClick={onToggleSearch}
            className={`w-9 h-9 flex items-center justify-center rounded-full transition-colors cursor-pointer ${
              isSearchOpen
                ? 'text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/60 border border-teal-200/60 dark:border-teal-800/60'
                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-white/10'
            }`}
            title="Cari dalam Percakapan (Ctrl+F)"
            aria-label="Cari dalam Percakapan"
          >
            <Search className="w-4 h-4" />
          </button>
        )}

        {/* Active Privacy Mode Pill (Quick exit when masked) */}
        {onTogglePrivacy && isPrivacyMode && (
          <button
            onClick={onTogglePrivacy}
            className="flex h-9 items-center gap-1.5 px-3 text-xs rounded-full bg-amber-100/90 text-amber-900 border border-amber-300/80 dark:bg-amber-950/80 dark:text-amber-200 dark:border-amber-700/60 shadow-3xs transition-all cursor-pointer"
            title="Mode Privasi Aktif - Klik untuk buka tampilan obrolan"
            aria-label="Buka Tampilan Obrolan"
          >
            <EyeOff className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span className="text-[11px] font-semibold hidden sm:inline">Layar Disamarkan</span>
          </button>
        )}

        {/* 2. Unified Pojok Reda (Sanctuary Drawer for Relaxation, Soundscape, Grounding & Voice) */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setIsSanctuaryOpen(prev => !prev);
              setIsMenuOpen(false);
            }}
            aria-expanded={isSanctuaryOpen}
            aria-label="Pojok Reda & Alat Relaksasi"
            title="Pojok Reda: Penenang Cepat, Suara Alam, Curhat Suara & Grounding"
            className={`inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full text-xs font-medium transition-all duration-200 cursor-pointer border backdrop-blur-md ${
              isSanctuaryOpen
                ? 'bg-teal-700 text-white border-teal-700 shadow-2xs'
                : 'bg-white/85 hover:bg-teal-50/50 text-slate-700 hover:text-teal-800 border-slate-200/80 hover:border-teal-300 dark:bg-white/5 dark:hover:bg-teal-950/40 dark:text-slate-200 dark:border-white/10 dark:hover:border-teal-500/40 shadow-3xs'
            }`}
          >
            <Wind className={`w-3.5 h-3.5 shrink-0 ${isSanctuaryOpen ? 'text-white' : 'text-teal-600 dark:text-teal-400'}`} />
            <span className="hidden sm:inline">Pojok Reda</span>
          </button>

          {isSanctuaryOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setIsSanctuaryOpen(false)} />
              <div
                role="dialog"
                aria-label="Pojok Reda dan Alat Relaksasi"
                className="absolute top-full right-0 mt-1.5 w-68 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl p-2 z-50 shadow-xl border border-stone-200/80 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-120 text-xs space-y-1"
              >
                <div className="px-2.5 py-1.5 border-b border-stone-100 dark:border-slate-800 flex items-center justify-between">
                  <span className="font-semibold text-stone-800 dark:text-slate-100 flex items-center gap-1.5">
                    <Wind className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                    <span>Pojok Reda & Relaksasi</span>
                  </span>
                  <span className="text-[10px] text-teal-700 dark:text-teal-400 font-medium">Jeda Aman</span>
                </div>

                {onOpenFirstAid && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsSanctuaryOpen(false);
                      onOpenFirstAid();
                    }}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-rose-700 dark:text-rose-300 bg-rose-50/60 dark:bg-rose-950/30 hover:bg-rose-100/80 dark:hover:bg-rose-950/50 text-left transition-colors cursor-pointer"
                  >
                    <HeartPulse className="w-4 h-4 text-rose-500 shrink-0 animate-pulse" />
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold">Pertolongan Pertama (Tenang Cepat)</div>
                      <div className="text-[10px] text-rose-500/90 dark:text-rose-400/80">Penenang napas & detak 60 detik</div>
                    </div>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setIsSanctuaryOpen(false);
                    window.dispatchEvent(new CustomEvent('ruangtenang_open_soundscape'));
                  }}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-stone-700 dark:text-slate-300 hover:bg-stone-100 dark:hover:bg-slate-800 text-left transition-colors cursor-pointer"
                  aria-label="Putar Suara Latar Penenang"
                >
                  <Headphones className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">Suara Alam & Latar Penenang</div>
                    <div className="text-[10px] text-stone-400">Hujan, ombak, hutan & frekuensi tenang</div>
                  </div>
                </button>

                {onOpenGrounding && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsSanctuaryOpen(false);
                      onOpenGrounding();
                    }}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-stone-700 dark:text-slate-300 hover:bg-stone-100 dark:hover:bg-slate-800 text-left transition-colors cursor-pointer"
                  >
                    <HeartPulse className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="font-medium">Latihan Grounding 5-4-3-2-1</div>
                      <div className="text-[10px] text-stone-400">Teknik panca indera saat panik</div>
                    </div>
                  </button>
                )}

                {onOpenWalkAndTalk && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsSanctuaryOpen(false);
                      onOpenWalkAndTalk();
                    }}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-stone-700 dark:text-slate-300 hover:bg-stone-100 dark:hover:bg-slate-800 text-left transition-colors cursor-pointer"
                    aria-label="Mode Curhat Suara"
                  >
                    <PhoneCall className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="font-medium">Curhat Suara (Walk & Talk)</div>
                      <div className="text-[10px] text-stone-400">Bercerita dua arah lewat suara</div>
                    </div>
                  </button>
                )}

                {onOpenSleepSanctuary && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsSanctuaryOpen(false);
                      onOpenSleepSanctuary();
                    }}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-stone-700 dark:text-slate-300 hover:bg-stone-100 dark:hover:bg-slate-800 text-left transition-colors cursor-pointer"
                  >
                    <Moon className="w-4 h-4 text-amber-500 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="font-medium">Mode Pengantar Tidur</div>
                      <div className="text-[10px] text-stone-400">Kunci beban pikiran sebelum tidur</div>
                    </div>
                  </button>
                )}

                {onOpenSelfCareGenerator && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsSanctuaryOpen(false);
                      onOpenSelfCareGenerator();
                    }}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-teal-700 dark:text-teal-300 hover:bg-teal-50 dark:hover:bg-teal-950/40 text-left transition-colors cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4 text-teal-500 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="font-medium flex items-center gap-1.5">
                        <span>Self-Care Widget Generator</span>
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-teal-500/20 text-teal-700 dark:text-teal-300 font-bold border border-teal-500/30">
                          Coder
                        </span>
                      </div>
                      <div className="text-[10px] text-stone-400">Buat widget pernapasan interaktif</div>
                    </div>
                  </button>
                )}
              </div>
            </>
          )}
        </div>

        {/* 3. More Actions Popover (Unified Home for Session, Privacy & Theme) */}
        <div className="relative">
          <button
            onClick={() => {
              setIsMenuOpen(!isMenuOpen);
              setIsSanctuaryOpen(false);
            }}
            className="w-8.5 h-8.5 flex items-center justify-center text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-white/10 rounded-full transition-colors cursor-pointer"
            title="Menu & Opsi Tambahan"
            aria-label="Menu & Opsi Tambahan"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {isMenuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setIsMenuOpen(false)} />
              <div className="absolute top-full right-0 mt-1.5 w-62 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl p-1.5 z-50 shadow-xl border border-stone-200/80 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-120 text-xs">

                {/* Theme Switcher inside Menu */}
                <button
                  type="button"
                  onClick={() => {
                    toggleTheme();
                    setIsMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-stone-700 dark:text-slate-300 hover:bg-stone-100 dark:hover:bg-slate-800 text-left transition-colors cursor-pointer"
                  aria-label="Ganti Tema Tampilan"
                >
                  {actualTheme === 'dark' ? (
                    <Moon className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  ) : (
                    <Sun className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">Tema: {actualTheme === 'dark' ? 'Mode Gelap' : 'Mode Terang'}</div>
                    <div className="text-[10px] text-stone-400">Ketuk untuk beralih tampilan</div>
                  </div>
                </button>

                <div className="my-1 border-t border-stone-200/60 dark:border-slate-800" />

                {/* Privacy & Panic entries */}
                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    triggerPanicScreen();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-stone-700 dark:text-slate-300 hover:bg-stone-100 dark:hover:bg-slate-800 text-left transition-colors cursor-pointer"
                >
                  <Lock className="w-3.5 h-3.5 text-stone-500 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="font-medium flex items-center justify-between">
                      <span>Layar Cepat (Panic Screen)</span>
                      <kbd className="hidden sm:inline-block text-[9px] font-mono px-1 py-0.5 rounded bg-stone-100 dark:bg-slate-800 text-stone-500">Alt+X</kbd>
                    </div>
                    <div className="text-[10px] text-stone-400">Sembunyikan tampilan seketika</div>
                  </div>
                </button>

                {onTogglePrivacy && (
                  <button
                    onClick={() => {
                      setIsMenuOpen(false);
                      onTogglePrivacy();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-stone-700 dark:text-slate-300 hover:bg-stone-100 dark:hover:bg-slate-800 text-left transition-colors cursor-pointer"
                  >
                    {isPrivacyMode ? (
                      <EyeOff className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    ) : (
                      <Shield className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="font-medium">{isPrivacyMode ? 'Buka Mode Privasi' : 'Mode Privasi Layar'}</div>
                      <div className="text-[10px] text-stone-400">{isPrivacyMode ? 'Tampilkan kembali chat' : 'Samarkan layar dari pandangan'}</div>
                    </div>
                  </button>
                )}

                {onOpenPrivacyCenter && (
                  <button
                    onClick={() => {
                      setIsMenuOpen(false);
                      onOpenPrivacyCenter();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-stone-700 dark:text-slate-300 hover:bg-stone-100 dark:hover:bg-slate-800 text-left transition-colors cursor-pointer"
                  >
                    <Shield className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="font-medium">Pusat Privasi & Hapus Jejak</div>
                      <div className="text-[10px] text-stone-400">Enkripsi & Hapus Jejak Curhat</div>
                    </div>
                  </button>
                )}

                <div className="my-1 border-t border-stone-200/60 dark:border-slate-800" />

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

                <div className="my-1 border-t border-stone-200/60 dark:border-slate-800" />

                {/* Emergency Hotline / SOS Quick Link */}
                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    navigate('/emergency');
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-left transition-colors cursor-pointer"
                >
                  <PhoneCall className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-rose-600 dark:text-rose-400 flex items-center justify-between">
                      <span>Bantuan Krisis & SOS</span>
                      <span className="text-[9px] bg-rose-100 dark:bg-rose-900/60 px-1 py-0.2 rounded font-bold">119</span>
                    </div>
                    <div className="text-[10px] text-rose-500/80">Hotline & kontak darurat kampus</div>
                  </div>
                </button>
              </div>
            </>
          )}
        </div>

      </div>
    </header>
  );
}
