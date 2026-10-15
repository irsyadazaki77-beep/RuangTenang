import React, { useEffect, useRef, useState } from 'react';
import { Brain, Check, ChevronDown, Sparkles, Zap } from 'lucide-react';
import {
  DEFAULT_KERJA_PROFILE_ID,
  isKerjaProfile,
  KerjaProfileId,
  KERJA_PROFILES
} from '../../../lib/aiModels';
import { migrateLegacyWorkspaceModelToProfile } from '../utils/workspaceModelPreference';
import { useAiModelCatalog } from '../../../lib/aiModelCatalog';

interface WorkspaceModelSelectorProps {
  value: string;
  onChange: (modelId: string) => void;
  disabled?: boolean;
  overlayPlacement?: 'anchored' | 'viewport';
}

const PROFILE_ICONS: Record<KerjaProfileId, React.ComponentType<{ className?: string }>> = {
  'kerja-fast': Zap,
  'kerja-santai': Sparkles,
  'kerja-hard': Brain,
};

export const WorkspaceModelSelector = React.memo(function WorkspaceModelSelector({
  value,
  onChange,
  disabled = false,
  overlayPlacement = 'anchored'
}: WorkspaceModelSelectorProps) {
  const { models } = useAiModelCatalog();
  // Normalize legacy values to an official Kerja profile
  const activeProfileId: KerjaProfileId = isKerjaProfile(value)
    ? value
    : migrateLegacyWorkspaceModelToProfile(value);

  // If incoming value was a legacy model, update parent to the normalized profile ID
  useEffect(() => {
    if (value && !isKerjaProfile(value)) {
      onChange(activeProfileId);
    }
  }, [value, activeProfileId, onChange]);

  const activeProfile = KERJA_PROFILES.find(p => p.id === activeProfileId) ?? KERJA_PROFILES[1];
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(() =>
    Math.max(0, KERJA_PROFILES.findIndex(p => p.id === activeProfileId))
  );
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const listId = 'workspace-profile-options';

  useEffect(() => {
    const idx = KERJA_PROFILES.findIndex(p => p.id === activeProfileId);
    if (idx !== -1) setActiveIndex(idx);
  }, [activeProfileId]);

  useEffect(() => {
    if (open) listRef.current?.focus();
  }, [open]);

  const close = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };

  const selectIndex = (index: number) => {
    const profile = KERJA_PROFILES[index];
    if (profile) {
      onChange(profile.id);
      close();
    }
  };

  const ActiveIcon = PROFILE_ICONS[activeProfile.id] || Sparkles;
  const displayName = isKerjaProfile(value)
    ? activeProfile.name
    : (models.find(m => m.id === value)?.name || activeProfile.name);

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={`Pilih model, ${displayName}`}
        onClick={() => setOpen(prev => !prev)}
        onKeyDown={event => {
          if (event.key === 'Escape' && open) {
            event.preventDefault();
            close();
          }
        }}
        className="inline-flex h-9 w-9 shrink-0 items-center justify-center gap-1 rounded-lg px-0 text-xs text-slate-700 transition-colors hover:bg-slate-200/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-200 dark:hover:bg-slate-800 sm:h-8 sm:w-auto sm:max-w-[min(30vw,10.5rem)] sm:justify-start sm:gap-1.5 sm:px-2"
        title={disabled ? 'Profil AI tidak dapat diubah selama pemrosesan' : `Profil AI: ${displayName}`}
      >
        <ActiveIcon className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
        <span className="hidden truncate font-medium sm:inline">{activeProfile.name}</span>
        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden="true" />
      </button>

      {open && !disabled && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 cursor-default"
            aria-label="Tutup pilihan profil AI"
            onClick={close}
          />
          <div
            className={`fixed inset-x-2 bottom-3 z-50 overflow-hidden rounded-xl border border-slate-200 bg-white p-2 shadow-2xl dark:border-slate-800 dark:bg-slate-900 ${
              overlayPlacement === 'anchored'
                ? 'md:absolute md:inset-auto md:bottom-full md:left-0 md:mb-2 md:w-84'
                : 'md:inset-x-auto md:bottom-20 md:left-4 md:w-84'
            }`}
            onKeyDown={event => {
              if (event.key === 'Escape') {
                event.preventDefault();
                close();
              } else if (event.key === 'ArrowDown') {
                event.preventDefault();
                setActiveIndex(i => (i + 1) % KERJA_PROFILES.length);
              } else if (event.key === 'ArrowUp') {
                event.preventDefault();
                setActiveIndex(i => (i - 1 + KERJA_PROFILES.length) % KERJA_PROFILES.length);
              } else if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                selectIndex(activeIndex);
              }
            }}
          >
            <div className="px-2.5 py-1.5 border-b border-slate-150 dark:border-slate-800/80 mb-1">
              <div className="font-semibold text-xs text-slate-900 dark:text-slate-100">
                Tingkat Kemampuan AI
              </div>
              <p className="text-[10.5px] text-slate-500 dark:text-slate-400 mt-0.5">
                RuangKerja memilih model dan provider terbaik secara otomatis sesuai profil.
              </p>
            </div>

            <div
              id={listId}
              ref={listRef}
              role="listbox"
              aria-label="Profil AI RuangKerja"
              tabIndex={0}
              className="space-y-1 outline-none"
            >
              {KERJA_PROFILES.map((profile, index) => {
                const isSelected = profile.id === activeProfileId;
                const isFocused = index === activeIndex;
                const IconComponent = PROFILE_ICONS[profile.id] || Sparkles;
                const isDefault = profile.id === DEFAULT_KERJA_PROFILE_ID;

                return (
                  <button
                    key={profile.id}
                    type="button"
                    role="option"
                    id={`workspace-profile-${profile.id}`}
                    aria-selected={isSelected}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => selectIndex(index)}
                    className={`flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                      isSelected
                        ? 'bg-emerald-50 dark:bg-emerald-950/50 text-slate-900 dark:text-slate-100'
                        : isFocused
                        ? 'bg-slate-100 dark:bg-slate-800/70 text-slate-800 dark:text-slate-200'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div
                      className={`p-1.5 rounded-md mt-0.5 shrink-0 ${
                        isSelected
                          ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      <IconComponent className="w-4 h-4" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold">{profile.name}</span>
                        {isDefault && (
                          <span className="text-[9.5px] font-medium px-1.5 py-0.2 rounded bg-emerald-200/70 dark:bg-emerald-900/70 text-emerald-800 dark:text-emerald-200">
                            Default
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-[10.5px] text-slate-500 dark:text-slate-400 leading-snug">
                        {profile.description}
                      </p>
                    </div>

                    {isSelected && (
                      <Check
                        className="mt-1 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400"
                        aria-hidden="true"
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
});
