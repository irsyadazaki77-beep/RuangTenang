import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Search, Sparkles } from 'lucide-react';
import { useAiModelCatalog } from '../../../lib/aiModelCatalog';
import { AUTO_ROUTING_MODEL_ID } from '../../../lib/aiModels';

interface WorkspaceModelSelectorProps {
  value: string;
  onChange: (modelId: string) => void;
  disabled?: boolean;
  overlayPlacement?: 'anchored' | 'viewport';
}

/** Uses the server's sanitized model catalog and supports Auto Smart Routing. */
export const WorkspaceModelSelector = React.memo(function WorkspaceModelSelector({
  value,
  onChange,
  disabled = false,
  overlayPlacement = 'anchored'
}: WorkspaceModelSelectorProps) {
  const { models, loading, error, defaultModel } = useAiModelCatalog();
  const isAuto = value === AUTO_ROUTING_MODEL_ID;
  const selectedModel = isAuto
    ? { id: AUTO_ROUTING_MODEL_ID, name: 'Auto — Pilih otomatis', speed: 'Adaptif', provider: 'Sistem', category: 'Smart Routing' }
    : (models.find(model => model.id === value)
      ?? models.find(model => model.id === defaultModel)
      ?? models[0]);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const searchRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listId = 'workspace-model-options';

  const filteredModels = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return models.filter(model => !query ||
      `${model.name} ${model.id} ${model.category} ${model.provider}`.toLocaleLowerCase().includes(query));
  }, [models, search]);

  const groups = useMemo(() => filteredModels.reduce<Record<string, typeof filteredModels>>((result, model) => {
    (result[model.category] ??= []).push(model);
    return result;
  }, {}), [filteredModels]);

  useEffect(() => {
    setActiveIndex(Math.max(0, filteredModels.findIndex(model => model.id === value)));
  }, [filteredModels, value]);

  useEffect(() => {
    if (value === AUTO_ROUTING_MODEL_ID) return;
    if (models.length && !models.some(model => model.id === value && model.selectable)) onChange(defaultModel);
  }, [models, value, defaultModel, onChange]);

  useEffect(() => {
    if (open) searchRef.current?.focus();
  }, [open]);

  const close = () => {
    setOpen(false);
    setSearch('');
    triggerRef.current?.focus();
  };

  const selectActive = () => {
    if (activeIndex === -1) {
      onChange(AUTO_ROUTING_MODEL_ID);
      close();
      return;
    }
    const model = filteredModels[activeIndex];
    if (model?.selectable) {
      onChange(model.id);
      close();
    }
  };

  const moveActive = (direction: number) => {
    if (filteredModels.length === 0) return;
    setActiveIndex(index => (index + direction + filteredModels.length) % filteredModels.length);
  };

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={`Pilih model, ${selectedModel?.name ?? 'Default'}`}
        onClick={() => setOpen(value => !value)}
        onKeyDown={event => { if (event.key === 'Escape' && open) close(); }}
        className="h-8 max-w-[min(28vw,10rem)] inline-flex min-w-0 items-center gap-1.5 rounded-lg px-2 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
        title={disabled ? 'Model tidak dapat diubah selama respons berlangsung' : 'Pilih model'}
      >
        <Sparkles className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
        <span className="truncate font-medium">{isAuto ? 'Auto' : selectedModel?.name ?? (loading ? 'Memuat...' : 'Default')}</span>
        <ChevronDown className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      </button>
      {open && !disabled && (
        <>
          <button type="button" className="fixed inset-0 z-40 cursor-default" aria-label="Tutup pilihan model" onClick={close} />
          <div
            className={`fixed inset-x-2 bottom-3 z-50 max-h-[min(70dvh,34rem)] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900 ${overlayPlacement === 'anchored' ? 'md:absolute md:inset-auto md:bottom-full md:left-0 md:mb-2 md:w-[min(24rem,calc(100vw-2rem))]' : 'md:inset-x-auto md:bottom-20 md:left-4 md:w-[min(24rem,calc(100vw-2rem))]'}`}
            onKeyDown={event => {
              if (event.key === 'Escape') { event.preventDefault(); close(); }
              if (event.key === 'ArrowDown') { event.preventDefault(); moveActive(1); }
              if (event.key === 'ArrowUp') { event.preventDefault(); moveActive(-1); }
              if (event.key === 'Enter' && (event.target === searchRef.current || (event.target as HTMLElement).getAttribute('role') === 'listbox')) {
                event.preventDefault(); selectActive();
              }
            }}
          >
            <div className="border-b border-slate-100 p-3 dark:border-slate-800">
              <div className="font-semibold text-sm">Pilih Model</div>
              <label className="mt-2 flex h-9 items-center gap-2 rounded-lg border border-slate-200 px-2.5 dark:border-slate-700">
                <Search className="h-4 w-4 text-slate-400" aria-hidden="true" />
                <input ref={searchRef} value={search} onChange={event => setSearch(event.target.value)} placeholder="Cari model..." aria-label="Cari model" aria-controls={listId} aria-autocomplete="list" aria-activedescendant={filteredModels[activeIndex] ? `workspace-model-${filteredModels[activeIndex].id}` : undefined} className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
              </label>
              <p className="mt-1.5 text-[11px] text-slate-500">{error ? 'Daftar model tidak dapat dimuat.' : 'Pilih model spesifik atau biarkan sistem memilih otomatis.'}</p>
            </div>
            <div id={listId} role="listbox" aria-label="Model AI" tabIndex={0} className="max-h-[min(48dvh,24rem)] overflow-y-auto p-2 outline-none">
              {/* Auto Model Option */}
              {(!search || 'auto otomatis smart routing'.includes(search.toLowerCase())) && (
                <div className="mb-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    role="option"
                    id="workspace-model-auto"
                    aria-selected={isAuto}
                    onClick={() => { onChange(AUTO_ROUTING_MODEL_ID); close(); }}
                    className={`flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${isAuto ? 'bg-emerald-50 dark:bg-emerald-950/40' : 'hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                  >
                    <div className="p-1 rounded-md bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 mt-0.5">
                      <Sparkles className="w-3.5 h-3.5" />
                    </div>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-900 dark:text-emerald-200">
                        Auto — Pilih otomatis
                        <span className="text-[10px] font-normal px-1.5 py-0.2 rounded bg-emerald-200/60 dark:bg-emerald-800/60 text-emerald-800 dark:text-emerald-300">Rekomendasi</span>
                      </span>
                      <span className="mt-0.5 block text-[10px] text-slate-500 dark:text-slate-400">
                        Sistem memilih model paling sesuai berdasarkan berkas, analisis tugas, dan kapabilitas.
                      </span>
                    </span>
                    {isAuto && <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />}
                  </button>
                </div>
              )}

              {Object.entries(groups).map(([category, models]) => (
                <section key={category} aria-label={category}>
                  <h3 className="px-2 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400">{category}</h3>
                  {models.map(model => {
                    const index = filteredModels.findIndex(item => item.id === model.id);
                    const isSelected = model.id === value;
                    return (
                      <button
                        key={model.id}
                        type="button"
                        role="option"
                        id={`workspace-model-${model.id}`}
                        aria-selected={isSelected}
                        aria-disabled={!model.selectable}
                        onMouseEnter={() => setActiveIndex(index)}
                        disabled={!model.selectable}
                        onClick={() => { onChange(model.id); close(); }}
                        className={`flex w-full items-start gap-2 rounded-lg px-2.5 py-2 text-left disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${index === activeIndex ? 'bg-emerald-50 dark:bg-emerald-950/40' : 'hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-xs font-medium">{model.name}</span>
                          <span className="mt-0.5 block truncate text-[10px] text-slate-500">{model.provider} · {model.speed} · {model.availability === 'configured' ? 'Terkonfigurasi' : model.availability === 'temporarily_unavailable' ? 'Sementara tidak tersedia' : 'Penyedia belum dikonfigurasi'}</span>
                        </span>
                        {isSelected && <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />}
                      </button>
                    );
                  })}
                </section>
              ))}
              {filteredModels.length === 0 && (!search || !'auto otomatis smart routing'.includes(search.toLowerCase())) && (
                <p className="p-4 text-center text-xs text-slate-500">{loading ? 'Memuat model...' : error ? 'Daftar model tidak dapat dimuat.' : 'Model tidak ditemukan.'}</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
});
