import React, { useMemo, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { useAiModelCatalog } from '../../../lib/aiModelCatalog';

interface Props {
  selectedModelIds: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
  hasAttachment?: boolean;
}

export const WorkspaceCompareModelSelector = React.memo(function WorkspaceCompareModelSelector({ selectedModelIds, onChange, disabled = false, hasAttachment = false }: Props) {
  const { models } = useAiModelCatalog();
  const [open, setOpen] = useState(false);
  const [notice, setNotice] = useState('');
  const triggerRef = useRef<HTMLButtonElement>(null);
  const selectedNames = useMemo(() => selectedModelIds.map(id => models.find(model => model.id === id)?.name || id), [models, selectedModelIds]);
  const compatible = models.filter(model => model.selectable && model.capabilities.includes('chat') && model.capabilities.includes('streaming'));
  const close = () => { setOpen(false); triggerRef.current?.focus(); };

  const toggle = (id: string) => {
    setNotice('');
    if (selectedModelIds.includes(id)) {
      if (selectedModelIds.length <= 2) { setNotice('Pilih minimal 2 model untuk membandingkan.'); return; }
      onChange(selectedModelIds.filter(modelId => modelId !== id));
      return;
    }
    if (selectedModelIds.length >= 3) { setNotice('Maksimal 3 model dapat dibandingkan sekaligus.'); return; }
    onChange([...selectedModelIds, id]);
  };

  return <div className="relative shrink-0">
    <button ref={triggerRef} type="button" disabled={disabled} aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(value => !value)} className="h-8 max-w-[min(52vw,15rem)] inline-flex items-center gap-1.5 rounded-lg px-2 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-800 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500" aria-label={`Pilih model comparison, ${selectedModelIds.length} model`}>
      <span className="text-emerald-700 dark:text-emerald-400">Compare</span><span className="truncate font-medium">{selectedModelIds.length} model</span><ChevronDown className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
    </button>
    {open && <>
      <button type="button" className="fixed inset-0 z-40 cursor-default" aria-label="Tutup pilihan model comparison" onClick={close} />
      <div role="dialog" aria-label="Pilih model comparison" onKeyDown={event => { if (event.key === 'Escape') { event.preventDefault(); close(); } }} className="fixed inset-x-2 bottom-3 z-50 max-h-[min(70dvh,34rem)] overflow-y-auto rounded-xl border border-slate-200 bg-white p-3 shadow-2xl dark:border-slate-700 dark:bg-slate-900 md:absolute md:inset-x-auto md:bottom-full md:left-0 md:mb-2 md:w-80">
        <div className="text-sm font-semibold">Model yang dibandingkan</div>
        <p className="mt-1 text-[11px] text-slate-500">Pilih 2–3 model. Model dengan akses akun yang tidak tersedia dinonaktifkan.</p>
        {hasAttachment && <p role="status" className="mt-2 text-[11px] text-amber-700 dark:text-amber-300">Lampiran belum didukung dalam mode Compare.</p>}
        {notice && <p role="status" className="mt-2 text-[11px] text-amber-700 dark:text-amber-300">{notice}</p>}
        <div className="mt-2 space-y-1" role="group" aria-label="Model tersedia untuk comparison">
          {compatible.map(model => {
            const checked = selectedModelIds.includes(model.id);
            const incompatible = hasAttachment;
            const reason = incompatible ? 'Model ini tidak mendukung lampiran aktif.' : '';
            return <button key={model.id} type="button" aria-pressed={checked} aria-label={`${model.name}${reason ? `. ${reason}` : ''}`} title={reason} disabled={incompatible} onClick={() => toggle(model.id)} className="flex min-h-10 w-full items-center gap-2 rounded-lg px-2 text-left text-xs hover:bg-slate-50 dark:hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500">
              <span aria-hidden="true" className={`flex h-4 w-4 items-center justify-center rounded border ${checked ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-300 dark:border-slate-600'}`}>{checked && <Check className="h-3 w-3" />}</span>
              <span className="min-w-0 flex-1"><span className="block truncate font-medium">{model.name}</span><span className="block truncate text-[10px] text-slate-500">{model.provider}</span></span>
            </button>;
          })}
        </div>
        <div className="mt-2 border-t border-slate-100 pt-2 text-[10px] text-slate-500 dark:border-slate-800">{selectedNames.join(' · ') || 'Belum ada model dipilih'}</div>
        <button type="button" onClick={close} className="mt-2 h-8 rounded-lg bg-slate-100 px-3 text-xs font-medium hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500">Selesai</button>
      </div>
    </>}
  </div>;
});
