import React, { useState, useEffect } from 'react';
import { X, Sparkles } from 'lucide-react';
import { WorkspaceAiPreset, WorkspaceResponseMode, WorkspaceResponseStyle } from '../../../lib/aiPresets';
import { AUTO_ROUTING_MODEL_ID } from '../../../lib/aiModels';
import { useAiModelCatalog } from '../../../lib/aiModelCatalog';
import {
  VALID_TASK_CATEGORIES,
  VALID_RESPONSE_MODES,
  VALID_RESPONSE_STYLES,
  VALID_LATENCY_PREFERENCES
} from '../utils/workspacePresetManager';

interface PresetFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (preset: Partial<WorkspaceAiPreset>) => { success: boolean; error?: string };
  initialData?: WorkspaceAiPreset | null;
  mode: 'create' | 'edit';
}

const TASK_CATEGORY_LABELS: Record<string, string> = {
  general_chat: 'Umum & Diskusi',
  academic_writing: 'Penulisan Akademik / Skripsi',
  research: 'Riset & Tinjauan Pustaka',
  coding: 'Pemrograman / Coding',
  document_analysis: 'Analisis Dokumen',
  summarization: 'Perangkuman',
  brainstorming: 'Curah Pendapat (Brainstorming)',
  structured_reasoning: 'Penalaran Terstruktur',
  translation: 'Penerjemahan'
};

const LATENCY_LABELS: Record<string, string> = {
  fast: 'Cepat (Prioritas Latensi)',
  balanced: 'Seimbang (Rekomendasi)',
  deep: 'Mendalam (Prioritas Penalaran)'
};

export const PresetFormModal: React.FC<PresetFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  mode
}) => {
  const { models } = useAiModelCatalog();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [preferredModelId, setPreferredModelId] = useState<string>(AUTO_ROUTING_MODEL_ID);
  const [taskCategory, setTaskCategory] = useState<string>('academic_writing');
  const [latencyPreference, setLatencyPreference] = useState<string>('balanced');
  const [responseMode, setResponseMode] = useState<WorkspaceResponseMode>('Seimbang');
  const [responseStyle, setResponseStyle] = useState<WorkspaceResponseStyle>('Default');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      setName(initialData.name || '');
      setDescription(initialData.description || '');
      setPreferredModelId(initialData.preferredModelId || AUTO_ROUTING_MODEL_ID);
      setTaskCategory(initialData.taskCategory || 'academic_writing');
      setLatencyPreference(initialData.latencyPreference || 'balanced');
      setResponseMode(initialData.responseMode || 'Seimbang');
      setResponseStyle(initialData.responseStyle || 'Default');
    } else {
      setName('');
      setDescription('');
      setPreferredModelId(AUTO_ROUTING_MODEL_ID);
      setTaskCategory('academic_writing');
      setLatencyPreference('balanced');
      setResponseMode('Seimbang');
      setResponseStyle('Default');
    }
    setErrorMsg(null);
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const isAuto = preferredModelId === AUTO_ROUTING_MODEL_ID;
    const finalRoutingMode = isAuto ? 'auto' : 'manual';

    const result = onSubmit({
      name: name.trim(),
      description: description.trim() || undefined,
      routingMode: finalRoutingMode,
      preferredModelId: isAuto ? undefined : preferredModelId,
      taskCategory: taskCategory as any,
      latencyPreference: latencyPreference as any,
      responseMode,
      responseStyle
    });

    if (result.success) {
      onClose();
    } else {
      setErrorMsg(result.error || 'Terjadi kesalahan saat menyimpan preset.');
    }
  };

  return (
    <div 
      role="dialog" 
      aria-modal="true" 
      aria-labelledby="preset-form-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in"
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          onClose();
        }
      }}
    >
      <div 
        className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90dvh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <h2 id="preset-form-title" className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
              {mode === 'create' ? 'Buat Preset AI Baru' : 'Edit Preset AI'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Tutup form preset"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 text-xs sm:text-sm">
          {errorMsg && (
            <div role="alert" className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs">
              {errorMsg}
            </div>
          )}

          {/* Preset Name */}
          <div>
            <label htmlFor="preset-name" className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
              Nama Preset <span className="text-rose-500">*</span>
            </label>
            <input
              id="preset-name"
              type="text"
              required
              maxLength={50}
              placeholder="Contoh: Skripsi Saya, Review Makalah, Refactor Python"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="preset-description" className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
              Deskripsi Singkat (Opsional)
            </label>
            <input
              id="preset-description"
              type="text"
              maxLength={160}
              placeholder="Keterangan singkat tujuan atau instruksi preset ini..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Model / Auto Smart Routing */}
          <div>
            <label htmlFor="preset-model" className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
              Model AI / Penentuan Otomatis
            </label>
            <select
              id="preset-model"
              value={preferredModelId}
              onChange={(e) => setPreferredModelId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value={AUTO_ROUTING_MODEL_ID}>Auto — Pilih otomatis via Smart Router (Disarankan)</option>
              {models.filter(m => m.selectable).map(m => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.provider} · {m.speed})
                </option>
              ))}
            </select>
            <p className="mt-1 text-[11px] text-slate-400">
              Jika memilih model spesifik, preset akan menggunakan model tersebut sebagai preferensi.
            </p>
          </div>

          {/* Task Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="preset-task" className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                Kategori Tugas
              </label>
              <select
                id="preset-task"
                value={taskCategory}
                onChange={(e) => setTaskCategory(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {VALID_TASK_CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>
                    {TASK_CATEGORY_LABELS[cat] || cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Latency Preference */}
            <div>
              <label htmlFor="preset-latency" className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                Prioritas Kecepatan
              </label>
              <select
                id="preset-latency"
                value={latencyPreference}
                onChange={(e) => setLatencyPreference(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {VALID_LATENCY_PREFERENCES.map(lat => (
                  <option key={lat} value={lat}>
                    {LATENCY_LABELS[lat] || lat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Response Mode & Style */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="preset-mode" className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                Mode Respons
              </label>
              <select
                id="preset-mode"
                value={responseMode}
                onChange={(e) => setResponseMode(e.target.value as WorkspaceResponseMode)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {VALID_RESPONSE_MODES.map(mode => (
                  <option key={mode} value={mode}>{mode}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="preset-style" className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                Gaya Bahasa
              </label>
              <select
                id="preset-style"
                value={responseStyle}
                onChange={(e) => setResponseStyle(e.target.value as WorkspaceResponseStyle)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {VALID_RESPONSE_STYLES.map(style => (
                  <option key={style} value={style}>{style}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors font-medium cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold transition-colors shadow-xs active:scale-95 cursor-pointer"
            >
              {mode === 'create' ? 'Simpan Preset' : 'Perbarui Preset'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
