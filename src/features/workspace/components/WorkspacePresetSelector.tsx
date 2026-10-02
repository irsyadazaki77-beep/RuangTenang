import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Check, 
  ChevronDown, 
  Plus, 
  Copy, 
  Pencil, 
  Trash2, 
  Search, 
  Zap, 
  Scale, 
  Brain, 
  BookOpen, 
  Code2, 
  Star
} from 'lucide-react';
import { WorkspaceAiPreset, PresetId } from '../../../lib/aiPresets';
import { PresetFormModal } from './PresetFormModal';

interface WorkspacePresetSelectorProps {
  allPresets: WorkspaceAiPreset[];
  activePreset: WorkspaceAiPreset;
  activePresetId: PresetId;
  summary: string;
  isManualOverride: boolean;
  disabled?: boolean;
  onSelectPreset: (presetId: PresetId) => void;
  onCreatePreset: (preset: Partial<WorkspaceAiPreset>) => { success: boolean; error?: string };
  onUpdatePreset: (id: string, preset: Partial<WorkspaceAiPreset>) => { success: boolean; error?: string };
  onDuplicatePreset: (sourceId: string) => { success: boolean; error?: string };
  onDeletePreset: (id: string) => { success: boolean; error?: string };
  onResetPersonalization?: () => void;
}

export const WorkspacePresetSelector: React.FC<WorkspacePresetSelectorProps> = React.memo(({
  allPresets,
  activePreset,
  activePresetId,
  summary,
  isManualOverride,
  disabled = false,
  onSelectPreset,
  onCreatePreset,
  onUpdatePreset,
  onDuplicatePreset,
  onDeletePreset,
  onResetPersonalization
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [modalInitialData, setModalInitialData] = useState<WorkspaceAiPreset | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listId = 'workspace-preset-options';

  useEffect(() => {
    if (open) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    } else {
      setSearch('');
      setDeleteConfirmId(null);
    }
  }, [open]);

  const closeMenu = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };

  const getPresetIcon = (iconName: string) => {
    switch (iconName.toLowerCase()) {
      case 'zap': return <Zap className="w-3.5 h-3.5" />;
      case 'scale': return <Scale className="w-3.5 h-3.5" />;
      case 'brain': return <Brain className="w-3.5 h-3.5" />;
      case 'bookopen': return <BookOpen className="w-3.5 h-3.5" />;
      case 'code2': return <Code2 className="w-3.5 h-3.5" />;
      case 'search': return <Search className="w-3.5 h-3.5" />;
      default: return <Star className="w-3.5 h-3.5" />;
    }
  };

  const filteredPresets = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return allPresets;
    return allPresets.filter(p => 
      p.name.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      (p.taskCategory && p.taskCategory.toLowerCase().includes(q))
    );
  }, [allPresets, search]);

  const groups = useMemo(() => {
    const order: Array<'Recommended' | 'Academic' | 'Development' | 'Custom'> = [
      'Recommended',
      'Academic',
      'Development',
      'Custom'
    ];
    const grouped: Record<string, WorkspaceAiPreset[]> = {};

    for (const p of filteredPresets) {
      const g = p.group || (p.scope === 'custom' ? 'Custom' : 'Recommended');
      (grouped[g] ??= []).push(p);
    }

    return order
      .filter(g => grouped[g] && grouped[g].length > 0)
      .map(g => ({ group: g, items: grouped[g] }));
  }, [filteredPresets]);

  return (
    <div className="relative shrink-0">
      {/* Compact Trigger Button */}
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={`Preset AI: ${activePreset.name}${isManualOverride ? ' (dengan override manual)' : ''}`}
        onClick={() => setOpen(prev => !prev)}
        onKeyDown={(e) => { if (e.key === 'Escape' && open) closeMenu(); }}
        className="h-8 max-w-[min(48vw,16rem)] inline-flex items-center gap-1.5 rounded-lg px-2 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-200/70 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 transition-colors cursor-pointer"
        title={`Preset aktif: ${activePreset.name} (${summary})`}
      >
        <span className="text-slate-400 font-normal">Preset</span>
        <div className="flex items-center gap-1 min-w-0">
          <span className="text-emerald-600 dark:text-emerald-400 shrink-0">
            {getPresetIcon(activePreset.icon)}
          </span>
          <span className="truncate font-semibold text-slate-800 dark:text-slate-100">
            {activePreset.name}
          </span>
        </div>
        {isManualOverride && (
          <span className="hidden sm:inline text-[9px] px-1 py-0.5 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-medium">
            Custom
          </span>
        )}
        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden="true" />
      </button>

      {/* Popover Menu */}
      {open && !disabled && (
        <>
          <button 
            type="button" 
            className="fixed inset-0 z-40 cursor-default" 
            aria-label="Tutup menu preset" 
            onClick={closeMenu} 
          />
          <div
            className="fixed inset-x-2 bottom-3 z-50 max-h-[min(75dvh,36rem)] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900 md:absolute md:inset-auto md:bottom-full md:left-0 md:mb-2 md:w-[min(26rem,calc(100vw-2rem))]"
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                e.preventDefault();
                closeMenu();
              }
            }}
          >
            {/* Header & Search */}
            <div className="border-b border-slate-100 p-3 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold text-sm text-slate-900 dark:text-slate-100">Preset AI RuangKerja</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    Pilih konfigurasi siap pakai sesuai kebutuhan tugas akademik Anda.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setModalMode('create');
                    setModalInitialData(null);
                    setIsModalOpen(true);
                    setOpen(false);
                  }}
                  className="h-7 px-2.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer shrink-0"
                  aria-label="Buat preset baru"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Baru</span>
                </button>
              </div>

              {/* Search input if more than 5 presets */}
              {allPresets.length > 5 && (
                <label className="mt-2.5 flex h-8 items-center gap-2 rounded-lg border border-slate-200 px-2.5 dark:border-slate-700">
                  <Search className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                  <input
                    ref={searchInputRef}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Cari preset..."
                    aria-label="Cari preset"
                    className="min-w-0 flex-1 bg-transparent text-xs outline-none text-slate-800 dark:text-slate-200"
                  />
                </label>
              )}
            </div>

            {/* List of Presets */}
            <div 
              id={listId} 
              role="listbox" 
              aria-label="Daftar Preset AI" 
              tabIndex={0} 
              className="max-h-[min(48dvh,24rem)] overflow-y-auto p-2 outline-none space-y-3"
            >
              {groups.map(({ group, items }) => (
                <section key={group} aria-label={group}>
                  <h3 className="px-2 pb-1 pt-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    {group === 'Recommended' ? 'Rekomendasi' : group === 'Academic' ? 'Akademik' : group === 'Development' ? 'Pengembangan' : 'Preset Kustom Anda'}
                  </h3>
                  <div className="space-y-1">
                    {items.map(preset => {
                      const isSelected = preset.id === activePresetId;
                      return (
                        <div
                          key={preset.id}
                          className={`group relative rounded-xl p-2 transition-all flex items-start justify-between gap-2 ${
                            isSelected 
                              ? 'bg-emerald-50/90 dark:bg-emerald-950/40 border border-emerald-500/30' 
                              : 'hover:bg-slate-50 dark:hover:bg-slate-800/80 border border-transparent'
                          }`}
                        >
                          <button
                            type="button"
                            role="option"
                            aria-selected={isSelected}
                            onClick={() => {
                              onSelectPreset(preset.id);
                              closeMenu();
                            }}
                            className="flex-1 text-left flex items-start gap-2.5 outline-none cursor-pointer"
                          >
                            <div className={`p-1.5 rounded-lg mt-0.5 shrink-0 ${
                              isSelected
                                ? 'bg-emerald-600 text-white'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                            }`}>
                              {getPresetIcon(preset.icon)}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <span className="font-semibold text-xs text-slate-900 dark:text-slate-100">
                                  {preset.name}
                                </span>
                                {preset.scope === 'custom' && (
                                  <span className="text-[9px] px-1 py-0.2 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-medium">
                                    Kustom
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2 leading-relaxed">
                                {preset.description}
                              </p>
                              <div className="mt-1 text-[10px] text-slate-400 font-mono">
                                {preset.routingMode === 'auto' ? 'Auto' : (preset.preferredModelId || 'Manual')} · {preset.responseMode || 'Seimbang'} · {preset.responseStyle || 'Default'}
                              </div>
                            </div>
                          </button>

                          {/* Quick Actions per preset */}
                          <div className="flex items-center gap-1 shrink-0 pt-0.5">
                            {isSelected && (
                              <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mr-1" aria-hidden="true" />
                            )}

                            {/* Duplicate Action */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onDuplicatePreset(preset.id);
                                closeMenu();
                              }}
                              className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                              title={`Duplikasi ${preset.name} sebagai preset kustom`}
                              aria-label={`Duplikasi preset ${preset.name}`}
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>

                            {/* Custom Only Actions: Edit & Delete */}
                            {preset.scope === 'custom' && (
                              <>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setModalMode('edit');
                                    setModalInitialData(preset);
                                    setIsModalOpen(true);
                                    setOpen(false);
                                  }}
                                  className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                                  title={`Edit preset ${preset.name}`}
                                  aria-label={`Edit preset ${preset.name}`}
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDeleteConfirmId(preset.id);
                                  }}
                                  className="p-1 rounded-md text-rose-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors cursor-pointer"
                                  title={`Hapus preset ${preset.name}`}
                                  aria-label={`Hapus preset ${preset.name}`}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                          </div>

                          {/* Delete Confirmation Inline Banner */}
                          {deleteConfirmId === preset.id && (
                            <div className="absolute inset-0 z-10 bg-white dark:bg-slate-900 border border-rose-300 dark:border-rose-900 rounded-xl p-2 flex items-center justify-between gap-2 animate-fade-in">
                              <span className="text-xs text-rose-700 dark:text-rose-300 font-medium truncate">
                                Hapus &ldquo;{preset.name}&rdquo;?
                              </span>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDeleteConfirmId(null);
                                  }}
                                  className="px-2 py-0.5 rounded text-[11px] text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                                >
                                  Batal
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onDeletePreset(preset.id);
                                    setDeleteConfirmId(null);
                                  }}
                                  className="px-2 py-0.5 rounded bg-rose-600 text-white font-semibold text-[11px] hover:bg-rose-700"
                                >
                                  Hapus
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </section>
              ))}

              {filteredPresets.length === 0 && (
                <p className="p-4 text-center text-xs text-slate-500">
                  Preset tidak ditemukan untuk pencarian &ldquo;{search}&rdquo;.
                </p>
              )}
            </div>

            {/* Footer Summary & Reset */}
            <div className="p-2.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
              <span className="truncate max-w-[180px]" title={summary}>
                Aktif: <strong className="text-slate-700 dark:text-slate-200">{summary}</strong>
              </span>
              {onResetPersonalization && (
                <button
                  type="button"
                  onClick={() => {
                    onResetPersonalization();
                    closeMenu();
                  }}
                  className="text-emerald-700 dark:text-emerald-400 hover:underline font-medium cursor-pointer shrink-0"
                >
                  Reset Preferensi
                </button>
              )}
            </div>
          </div>
        </>
      )}

      {/* Modal Form for Create / Edit Custom Preset */}
      <PresetFormModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setModalInitialData(null);
        }}
        onSubmit={(data) => {
          if (modalMode === 'create') {
            return onCreatePreset(data);
          } else if (modalInitialData) {
            return onUpdatePreset(modalInitialData.id, data);
          }
          return { success: false, error: 'Data tidak valid' };
        }}
        initialData={modalInitialData}
        mode={modalMode}
      />
    </div>
  );
});
