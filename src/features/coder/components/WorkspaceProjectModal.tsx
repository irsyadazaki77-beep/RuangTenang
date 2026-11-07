import React, { useState } from 'react';
import {
  FolderOpen,
  Plus,
  X,
  ArrowRight,
  HardDrive
} from 'lucide-react';

export interface WorkspaceProject {
  id: string;
  name: string;
  path: string;
  updatedAt?: string;
}

export interface WorkspaceProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  projects: WorkspaceProject[];
  currentProjectId: string;
  onSelectProject: (projectId: string) => void;
  onCreateProject: (name: string, templateId?: string) => Promise<void>;
  isDark?: boolean;
}

export const WorkspaceProjectModal: React.FC<WorkspaceProjectModalProps> = ({
  isOpen,
  onClose,
  projects,
  currentProjectId,
  onSelectProject,
  onCreateProject,
  isDark = true
}) => {
  const [newProjectName, setNewProjectName] = useState('');
  const [selectedTemplate] = useState('web-starter');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newProjectName.trim();
    if (!trimmed) {
      setError('Nama proyek wajib diisi.');
      return;
    }
    setError('');
    setIsCreating(true);
    try {
      await onCreateProject(trimmed, selectedTemplate);
      setNewProjectName('');
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Gagal membuat proyek baru.');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
      <div
        className={`w-full max-w-lg rounded-xl border shadow-2xl flex flex-col overflow-hidden max-h-[85vh] ${
          isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
        }`}
      >
        {/* Header */}
        <div
          className={`px-4 py-3 border-b flex items-center justify-between ${
            isDark ? 'border-slate-800 bg-slate-950/40' : 'border-slate-100 bg-slate-50'
          }`}
        >
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-400">
              <FolderOpen className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">Manajemen Proyek Ruang Coder</h3>
              <p className="text-[11px] text-slate-400">Kelola direktori kerja tugas dan praktikum kuliah</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 overflow-y-auto space-y-4 flex-1">
          {/* Create New Form */}
          <form onSubmit={handleCreate} className="space-y-2 p-3 rounded-lg border border-dashed border-sky-500/30 bg-sky-500/5">
            <label className="block text-xs font-semibold text-sky-400">
              + Buat Proyek / Tugas Baru
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={newProjectName}
                onChange={e => setNewProjectName(e.target.value)}
                placeholder="Contoh: praktikum-web-react, tugas-struktur-data"
                className={`flex-1 px-3 py-1.5 text-xs rounded-lg border font-mono focus:outline-hidden focus:ring-1 focus:ring-sky-500 ${
                  isDark
                    ? 'bg-slate-950 border-slate-800 text-white placeholder-slate-500'
                    : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
                }`}
              />
              <button
                type="submit"
                disabled={isCreating}
                className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{isCreating ? 'Membuat...' : 'Buat'}</span>
              </button>
            </div>
            {error && <p className="text-[11px] text-rose-400">{error}</p>}
          </form>

          {/* Project List */}
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-400">Daftar Proyek Tersimpan:</label>
            <div className="space-y-1">
              {projects.map(proj => {
                const isActive = proj.id === currentProjectId;
                return (
                  <div
                    key={proj.id}
                    className={`p-2.5 rounded-lg border flex items-center justify-between gap-3 transition-colors ${
                      isActive
                        ? isDark
                          ? 'bg-sky-950/30 border-sky-500/40'
                          : 'bg-sky-50 border-sky-300'
                        : isDark
                        ? 'bg-slate-950/50 border-slate-800 hover:border-slate-700'
                        : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`p-1.5 rounded-md ${isActive ? 'bg-sky-500/20 text-sky-400' : 'bg-slate-800 text-slate-400'}`}>
                        <HardDrive className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-xs truncate capitalize">{proj.name}</span>
                          {isActive && (
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-sky-500/20 text-sky-400">
                              Aktif
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-500 font-mono truncate">{proj.path}</p>
                      </div>
                    </div>

                    {!isActive && (
                      <button
                        type="button"
                        onClick={() => {
                          onSelectProject(proj.id);
                          onClose();
                        }}
                        className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer shrink-0"
                      >
                        <span>Buka</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          className={`px-4 py-2.5 border-t flex items-center justify-end ${
            isDark ? 'border-slate-800 bg-slate-950/40' : 'border-slate-100 bg-slate-50'
          }`}
        >
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-slate-800 text-slate-300 transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
