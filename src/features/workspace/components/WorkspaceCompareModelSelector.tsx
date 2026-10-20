import React, { useMemo, useRef, useState } from 'react';
import { Brain, Check, ChevronDown, Sparkles, Zap } from 'lucide-react';
import { useAiModelCatalog } from '../../../lib/aiModelCatalog';
import {
  KERJA_PROFILES,
  KerjaProfileId,
  isKerjaProfile
} from '../../../lib/aiModels';

interface Props {
  selectedModelIds: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
  hasAttachment?: boolean;
}

const PROFILE_ICONS: Record<KerjaProfileId, React.ComponentType<{ className?: string }>> = {
  'kerja-fast': Zap,
  'kerja-santai': Sparkles,
  'kerja-hard': Brain,
};

export const WorkspaceCompareModelSelector = React.memo(function WorkspaceCompareModelSelector({
  selectedModelIds,
  onChange,
  disabled = false,
  hasAttachment = false
}: Props) {
  const { models, profiles, loading: isCatalogLoading, error: catalogError } = useAiModelCatalog();
  const [open, setOpen] = useState(false);
  const [notice, setNotice] = useState('');
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Compatible streaming catalog models (for developer/canonical model comparison)
  const compatible = useMemo(
    () => models.filter(model => model.selectable && model.capabilities.includes('chat') && model.capabilities.includes('streaming')),
    [models]
  );
  const kerjaProfiles = useMemo(() => profiles.filter(profile => profile.scope === 'kerja'), [profiles]);

  // Check if caller is comparing official profiles or canonical models
  const isProfileMode = useMemo(() => {
    return selectedModelIds.some(isKerjaProfile) || compatible.length === 0;
  }, [selectedModelIds, compatible.length]);

  const selectedNames = useMemo(() => {
    return selectedModelIds.map(id => {
      if (isKerjaProfile(id)) {
        const p = kerjaProfiles.find(item => item.id === id) || KERJA_PROFILES.find(item => item.id === id);
        return p ? p.name : id;
      }
      return models.find(m => m.id === id)?.name || id;
    });
  }, [kerjaProfiles, models, selectedModelIds]);

  const close = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };

  const toggle = (id: string) => {
    setNotice('');
    if (selectedModelIds.includes(id)) {
      if (selectedModelIds.length <= 2) {
        setNotice('Pilih minimal 2 model untuk membandingkan.');
        return;
      }
      onChange(selectedModelIds.filter(item => item !== id));
      return;
    }
    if (selectedModelIds.length >= 3) {
      setNotice('Maksimal 3 model dapat dibandingkan sekaligus.');
      return;
    }
    onChange([...selectedModelIds, id]);
  };

  return (
    <div className="relative shrink-0">
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(value => !value)}
        className="h-8 max-w-[min(55vw,16rem)] inline-flex items-center gap-1.5 rounded-lg px-2 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-200/70 dark:hover:bg-slate-800 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 transition-colors"
        aria-label={`Pilih model comparison, ${selectedModelIds.length} model`}
      >
        <span className="font-semibold text-emerald-700 dark:text-emerald-400">Compare</span>
        <span className="truncate font-medium">{selectedModelIds.length} model</span>
        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden="true" />
      </button>

      {open && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 cursor-default"
            aria-label="Tutup pilihan model comparison"
            onClick={close}
          />
          <div
            role="dialog"
            aria-label="Pilih model comparison"
            onKeyDown={event => {
              if (event.key === 'Escape') {
                event.preventDefault();
                close();
              }
            }}
            className="fixed inset-x-2 bottom-3 z-50 max-h-[min(70dvh,34rem)] overflow-y-auto rounded-xl border border-slate-200 bg-white p-3 shadow-2xl dark:border-slate-700 dark:bg-slate-900 md:absolute md:inset-x-auto md:bottom-full md:left-0 md:mb-2 md:w-88"
          >
            <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
              Model yang dibandingkan
            </div>
            <p className="mt-0.5 text-[10.5px] text-slate-500 dark:text-slate-400">
              Pilih 2–3 {isProfileMode ? 'profil AI RuangKerja' : 'model AI'}. Prompt, konteks, dan lampiran yang dipilih dikirim ke semua kandidat. Profil memakai model/provider yang tersedia di server; provider aktual tampil pada hasil.
            </p>

            {isProfileMode && isCatalogLoading && <p role="status" className="mt-2 text-[10.5px] text-slate-500">Memuat ketersediaan profil…</p>}
            {isProfileMode && catalogError && <p role="alert" className="mt-2 text-[10.5px] text-amber-700 dark:text-amber-300">Ketersediaan profil belum dapat dimuat. Muat ulang halaman sebelum menjalankan perbandingan.</p>}

            {hasAttachment && (
              <p
                role="status"
                className="mt-2 text-[10.5px] text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-1 rounded"
              >
                Lampiran aktif akan dibagikan secara adil (shared snapshot) ke seluruh kandidat.
              </p>
            )}

            {notice && (
              <p
                role="status"
                className="mt-2 text-[10.5px] text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 px-2 py-1 rounded"
              >
                {notice}
              </p>
            )}

            <div className="mt-2.5 space-y-1.5" role="group" aria-label="Model tersedia untuk comparison">
              {isProfileMode ? (
                kerjaProfiles.length ? kerjaProfiles.map(profile => {
                  const checked = selectedModelIds.includes(profile.id);
                  const IconComponent = PROFILE_ICONS[profile.id as KerjaProfileId] || Sparkles;
                  const unavailableReason = profile.available ? 'Tidak tersedia untuk paket akun ini.' : 'Tidak ada model yang tersedia untuk profil ini saat ini.';

                  return (
                    <button
                      key={profile.id}
                      type="button"
                      aria-pressed={checked}
                      aria-label={`${profile.name}${profile.selectable ? '' : ` · ${unavailableReason}`}`}
                      disabled={!profile.selectable && !checked}
                      onClick={() => toggle(profile.id)}
                      className={`flex w-full items-start gap-2.5 rounded-lg p-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:cursor-not-allowed disabled:opacity-50 ${
                        checked
                          ? 'bg-emerald-50 dark:bg-emerald-950/40'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                      }`}
                    >
                      <span
                        aria-hidden="true"
                        className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                          checked
                            ? 'border-emerald-600 bg-emerald-600 text-white'
                            : 'border-slate-300 dark:border-slate-600'
                        }`}
                      >
                        {checked && <Check className="h-3 w-3 stroke-[3]" />}
                      </span>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <IconComponent className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          <span className="font-semibold text-xs text-slate-900 dark:text-slate-100">
                            {profile.name}
                          </span>
                        </div>
                        <span className="block mt-0.5 text-[10.5px] text-slate-500 dark:text-slate-400 leading-snug">
                          {profile.selectable ? profile.description : unavailableReason}
                        </span>
                      </div>
                    </button>
                  );
                }) : <p role="status" className="rounded bg-slate-50 px-2 py-2 text-[10.5px] text-slate-500 dark:bg-slate-950">Profil RuangKerja belum tersedia dari katalog server.</p>
              ) : (
                compatible.map(model => {
                  const checked = selectedModelIds.includes(model.id);

                  return (
                    <button
                      key={model.id}
                      type="button"
                      aria-pressed={checked}
                      aria-label={model.name}
                      onClick={() => toggle(model.id)}
                      className="flex min-h-10 w-full items-center gap-2 rounded-lg px-2 text-left text-xs hover:bg-slate-50 dark:hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                    >
                      <span
                        aria-hidden="true"
                        className={`flex h-4 w-4 items-center justify-center rounded border ${
                          checked
                            ? 'border-emerald-600 bg-emerald-600 text-white'
                            : 'border-slate-300 dark:border-slate-600'
                        }`}
                      >
                        {checked && <Check className="h-3 w-3" />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{model.name}</span>
                        <span className="block truncate text-[10px] text-slate-500">{model.provider}</span>
                      </span>
                    </button>
                  );
                })
              )}
            </div>

            <div className="mt-2.5 border-t border-slate-100 pt-2 text-[10.5px] text-slate-500 dark:border-slate-800">
              Terpilih: <span className="font-medium text-slate-700 dark:text-slate-300">{selectedNames.join(' · ') || 'Belum ada model dipilih'}</span>
            </div>

            <button
              type="button"
              onClick={close}
              className="mt-2 h-7.5 w-full rounded-lg bg-slate-100 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 transition-colors"
            >
              Selesai
            </button>
          </div>
        </>
      )}
    </div>
  );
});
