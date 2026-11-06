import React, { useState } from 'react';
import {
  X,
  FolderKanban,
  Plus,
  Check,
  Trash2,
  Sparkles,
  BookOpen
} from 'lucide-react';
import { useProjects, AiProject } from './projectStore';
import { useToast } from '../../components/Toast';

interface ProjectsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentChatId?: string;
}

export const ProjectsModal: React.FC<ProjectsModalProps> = ({
  isOpen,
  onClose,
  currentChatId
}) => {
  const { showToast } = useToast();
  const {
    projects,
    activeProjectId,
    selectProject,
    createProject,
    updateProject,
    deleteProject,
    assignChat
  } = useProjects();

  const [selectedTabProjectId, setSelectedTabProjectId] = useState<string | null>(
    activeProjectId || projects[0]?.id || null
  );
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newInstructions, setNewInstructions] = useState('');
  const [newPinnedContext, setNewPinnedContext] = useState('');
  const [newFocus, _setNewFocus] = useState<AiProject['defaultFocus']>('UNIFIED');

  if (!isOpen) return null;

  const inspectedProject = projects.find(p => p.id === selectedTabProjectId) || projects[0] || null;

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    const created = createProject({
      name: newName.trim(),
      description: newDesc.trim() || 'Ruang proyek terfokus dengan instruksi kustom.',
      customInstructions: newInstructions.trim(),
      pinnedContext: newPinnedContext.trim(),
      defaultFocus: newFocus
    });
    if (currentChatId) {
      assignChat(currentChatId, created.id);
    }
    setSelectedTabProjectId(created.id);
    setIsCreating(false);
    setNewName('');
    setNewDesc('');
    setNewInstructions('');
    setNewPinnedContext('');
    showToast(`Proyek "${created.name}" diaktifkan`, 'success');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-stone-950/50 backdrop-blur-xs animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label="Manajemen Projects & Custom Instructions"
    >
      <div className="w-full max-w-3xl max-h-[88dvh] rounded-2xl border border-stone-200 dark:border-slate-800 bg-[#FAF9F6] dark:bg-[#0D1117] text-stone-900 dark:text-slate-100 shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-stone-200/80 dark:border-slate-800 flex items-center justify-between gap-3 bg-white/80 dark:bg-slate-900/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl border border-stone-200 dark:border-slate-700 bg-stone-50 dark:bg-slate-800 flex items-center justify-center text-teal-700 dark:text-teal-400">
              <FolderKanban className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold tracking-tight">
                Projects & Custom Instructions
              </h2>
              <p className="text-[11px] text-stone-500 dark:text-slate-400">
                Kelompokkan riset, instruksi sistem kustom, dan pengetahuan jangka panjang ala Claude Projects
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-stone-400 hover:text-stone-800 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Tutup Projects"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Split */}
        <div className="flex-1 min-h-0 flex flex-col sm:flex-row overflow-hidden">
          {/* Left Column: Project List */}
          <div className="w-full sm:w-64 shrink-0 border-b sm:border-b-0 sm:border-r border-stone-200/80 dark:border-slate-800 p-3 space-y-2 overflow-y-auto bg-stone-50/50 dark:bg-slate-900/40">
            <div className="flex items-center justify-between px-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-400 dark:text-slate-500">
                Daftar Proyek ({projects.length})
              </span>
              <button
                type="button"
                onClick={() => setIsCreating(true)}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-[11px] font-semibold transition-colors cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>Baru</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                selectProject(null);
                showToast('Berjalan tanpa konteks proyek khusus', 'info');
              }}
              className={`w-full text-left px-3 py-2 rounded-xl text-xs transition-colors flex items-center justify-between cursor-pointer ${
                activeProjectId === null
                  ? 'bg-white dark:bg-slate-800 font-semibold text-stone-900 dark:text-white border border-stone-200/90 dark:border-slate-700'
                  : 'text-stone-600 dark:text-slate-400 hover:bg-stone-100 dark:hover:bg-slate-800/60'
              }`}
            >
              <span>Tanpa Proyek Khusus (Umum)</span>
              {activeProjectId === null && <Check className="w-3.5 h-3.5 text-teal-600" />}
            </button>

            <div className="space-y-1">
              {projects.map(proj => {
                const isSelected = inspectedProject?.id === proj.id && !isCreating;
                const isActive = activeProjectId === proj.id;
                return (
                  <button
                    key={proj.id}
                    type="button"
                    onClick={() => {
                      setIsCreating(false);
                      setSelectedTabProjectId(proj.id);
                    }}
                    className={`w-full text-left px-3 py-2.5 rounded-xl text-xs transition-colors cursor-pointer border ${
                      isSelected
                        ? 'bg-white dark:bg-slate-800 border-stone-200 dark:border-slate-700 text-stone-900 dark:text-white'
                        : 'border-transparent text-stone-600 dark:text-slate-300 hover:bg-stone-100 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="font-semibold truncate">{proj.name}</span>
                      {isActive && (
                        <span className="text-[10px] font-medium text-teal-700 dark:text-teal-400 shrink-0">
                          · Aktif
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-stone-400 dark:text-slate-500 truncate mt-0.5">
                      {proj.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Column: Project Editor or Creation Form */}
          <div className="flex-1 p-4 sm:p-5 overflow-y-auto space-y-4">
            {isCreating ? (
              <form onSubmit={handleCreate} className="space-y-3.5">
                <h3 className="text-sm font-semibold">Buat Proyek AI Baru</h3>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-stone-600 dark:text-slate-300">
                    Nama Proyek
                  </label>
                  <input
                    type="text"
                    required
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    placeholder="Misal: Skripsi Bab 4 — Analisis Regresi & Pembahasan"
                    className="w-full rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500/30"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-stone-600 dark:text-slate-300">
                    Deskripsi Singkat
                  </label>
                  <input
                    type="text"
                    value={newDesc}
                    onChange={e => setNewDesc(e.target.value)}
                    placeholder="Tujuan utama ruang kerja atau proyek ini..."
                    className="w-full rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500/30"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-stone-600 dark:text-slate-300">
                    Custom Instructions (Instruksi Kustom untuk AI)
                  </label>
                  <textarea
                    rows={3}
                    value={newInstructions}
                    onChange={e => setNewInstructions(e.target.value)}
                    placeholder="Contoh: Gunakan gaya akademik baku, sertakan sitasi APA 7th, dan selalu berikan ringkasan eksekutif di awal..."
                    className="w-full rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 text-xs leading-relaxed focus:outline-none focus:ring-2 focus:ring-teal-500/30 resize-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-stone-600 dark:text-slate-300">
                    Pengetahuan & Konteks Disematkan (Project Knowledge)
                  </label>
                  <textarea
                    rows={3}
                    value={newPinnedContext}
                    onChange={e => setNewPinnedContext(e.target.value)}
                    placeholder="Tempelkan variabel penelitian, hipotesis, atau catatan penting yang harus selalu diingat AI di proyek ini..."
                    className="w-full rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 text-xs leading-relaxed focus:outline-none focus:ring-2 focus:ring-teal-500/30 resize-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsCreating(false)}
                    className="px-3.5 py-2 rounded-xl text-xs font-medium text-stone-600 dark:text-slate-400 hover:bg-stone-100 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold cursor-pointer"
                  >
                    Simpan & Aktifkan Proyek
                  </button>
                </div>
              </form>
            ) : inspectedProject ? (
              <div className="space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-2 pb-3 border-b border-stone-200/70 dark:border-slate-800">
                  <div>
                    <h3 className="text-sm font-semibold">{inspectedProject.name}</h3>
                    <p className="text-xs text-stone-500 dark:text-slate-400 mt-0.5">
                      {inspectedProject.description}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const nextActive = activeProjectId === inspectedProject.id ? null : inspectedProject.id;
                        selectProject(nextActive);
                        if (nextActive && currentChatId) {
                          assignChat(currentChatId, nextActive);
                        }
                        showToast(
                          nextActive
                            ? `Proyek "${inspectedProject.name}" diterapkan pada percakapan`
                            : 'Proyek dinonaktifkan untuk sesi ini',
                          'success'
                        );
                      }}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                        activeProjectId === inspectedProject.id
                          ? 'bg-teal-700 text-white'
                          : 'border border-stone-300 dark:border-slate-700 hover:border-teal-500 text-stone-800 dark:text-slate-200'
                      }`}
                    >
                      {activeProjectId === inspectedProject.id ? '✓ Proyek Aktif' : 'Gunakan Proyek Ini'}
                    </button>

                    {projects.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          deleteProject(inspectedProject.id);
                          showToast('Proyek dihapus', 'info');
                        }}
                        className="p-1.5 rounded-xl text-stone-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                        title="Hapus Proyek"
                        aria-label="Hapus Proyek"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold flex items-center gap-1.5 text-stone-700 dark:text-slate-200">
                    <Sparkles className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                    <span>Custom Instructions Proyek</span>
                  </label>
                  <textarea
                    rows={4}
                    value={inspectedProject.customInstructions}
                    onChange={e => updateProject(inspectedProject.id, { customInstructions: e.target.value })}
                    placeholder="Tulis pedoman khusus bagaimana AI harus merespons di dalam proyek ini..."
                    className="w-full rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 text-xs leading-relaxed text-stone-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500/30 resize-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold flex items-center gap-1.5 text-stone-700 dark:text-slate-200">
                    <BookOpen className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                    <span>Konteks & Pengetahuan Proyek (Pinned Context)</span>
                  </label>
                  <textarea
                    rows={3}
                    value={inspectedProject.pinnedContext}
                    onChange={e => updateProject(inspectedProject.id, { pinnedContext: e.target.value })}
                    placeholder="Ringkasan topik, rumusan masalah, atau referensi utama proyek..."
                    className="w-full rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 text-xs leading-relaxed text-stone-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500/30 resize-none"
                  />
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};
