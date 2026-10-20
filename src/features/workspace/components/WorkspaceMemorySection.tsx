import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Bookmark, Plus, Trash2, Edit2, AlertCircle } from 'lucide-react';
import { WorkspaceApiService } from '../services/workspaceApiService';
import type { WorkspaceMemoryCategory, WorkspaceMemoryItem } from '../../../../shared/contracts/workspaceMemory';
import type { WorkspaceChapterScope } from '../types';
import { CHAPTER_SCOPE_LABELS } from '../utils/workspaceContext';

interface Props {
  chatId?: string;
  canPersist: boolean;
  activeChapterScope?: WorkspaceChapterScope;
  onChangeChapterScope?: (scope: WorkspaceChapterScope) => void;
}

const CHAPTER_SCOPES: WorkspaceChapterScope[] = ['ALL', 'BAB_1', 'BAB_2', 'BAB_3', 'BAB_4', 'BAB_5', 'LAMPIRAN'];

const CATEGORY_LABELS: Record<WorkspaceMemoryCategory, { label: string; color: string }> = {
  goal: { label: 'Tujuan', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' },
  decision: { label: 'Keputusan', color: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300' },
  preference: { label: 'Preferensi', color: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300' },
  constraint: { label: 'Batasan', color: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' },
  progress: { label: 'Progres', color: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300' }
};

export const WorkspaceMemorySection: React.FC<Props> = ({
  chatId,
  canPersist,
  activeChapterScope = 'ALL',
  onChangeChapterScope
}) => {
  const [memories, setMemories] = useState<WorkspaceMemoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterScope, setFilterScope] = useState<WorkspaceChapterScope>(activeChapterScope);

  // New Memory Form State
  const [isAdding, setIsAdding] = useState(false);
  const [newCategory, setNewCategory] = useState<WorkspaceMemoryCategory>('decision');
  const [newChapterTag, setNewChapterTag] = useState<WorkspaceChapterScope>(activeChapterScope);
  const [newContent, setNewContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Edit Memory Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

  useEffect(() => {
    setFilterScope(activeChapterScope);
    setNewChapterTag(activeChapterScope);
  }, [activeChapterScope]);

  const loadMemories = useCallback(async () => {
    if (!chatId || !canPersist) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await WorkspaceApiService.fetchWorkspaceMemories(chatId);
      setMemories(data);
    } catch (err: any) {
      setError(err?.message || 'Gagal memuat memori.');
    } finally {
      setIsLoading(false);
    }
  }, [chatId, canPersist]);

  useEffect(() => {
    loadMemories();
  }, [loadMemories]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatId || !newContent.trim()) return;

    setIsSaving(true);
    setError(null);
    try {
      const prefix = newChapterTag !== 'ALL' ? `[${CHAPTER_SCOPE_LABELS[newChapterTag].shortLabel}] ` : '';
      const rawContent = newContent.trim();
      const formattedContent = prefix && !rawContent.startsWith('[') ? `${prefix}${rawContent}` : rawContent;
      const item = await WorkspaceApiService.createWorkspaceMemory(chatId, {
        category: newCategory,
        content: formattedContent,
        provenance: newChapterTag !== 'ALL' ? `Input Pengguna (${CHAPTER_SCOPE_LABELS[newChapterTag].shortLabel})` : 'Input Pengguna'
      });
      setMemories(prev => [item, ...prev]);
      setNewContent('');
      setIsAdding(false);
    } catch (err: any) {
      setError(err?.message || 'Gagal menambahkan memori.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async (mem: WorkspaceMemoryItem) => {
    if (!chatId) return;
    try {
      const updated = await WorkspaceApiService.updateWorkspaceMemory(chatId, mem.id, {
        isActive: !mem.isActive
      });
      setMemories(prev => prev.map(m => m.id === mem.id ? updated : m));
    } catch (err: any) {
      setError(err?.message || 'Gagal mengubah status memori.');
    }
  };

  const handleSaveEdit = async (memId: string) => {
    if (!chatId || !editContent.trim()) return;
    try {
      const updated = await WorkspaceApiService.updateWorkspaceMemory(chatId, memId, {
        content: editContent.trim()
      });
      setMemories(prev => prev.map(m => m.id === memId ? updated : m));
      setEditingId(null);
    } catch (err: any) {
      setError(err?.message || 'Gagal menyimpan perubahan.');
    }
  };

  const handleDelete = async (memId: string) => {
    if (!chatId) return;
    try {
      await WorkspaceApiService.deleteWorkspaceMemory(chatId, memId);
      setMemories(prev => prev.filter(m => m.id !== memId));
    } catch (err: any) {
      setError(err?.message || 'Gagal menghapus memori.');
    }
  };

  const filteredMemories = useMemo(() => {
    if (filterScope === 'ALL') return memories;
    const tagPrefix = `[${CHAPTER_SCOPE_LABELS[filterScope].shortLabel.toLowerCase()}]`;
    return memories.filter(m => {
      const lower = m.content.toLowerCase();
      // Tampilkan memori yang khusus untuk bab ini ATAU memori umum (tanpa tag [Bab ...])
      const hasAnyChapterTag = /^\[(bab\s*\d|lampiran)\]/i.test(m.content);
      return lower.startsWith(tagPrefix) || !hasAnyChapterTag;
    });
  }, [memories, filterScope]);

  return (
    <div className="w-full">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5">
          <Bookmark className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
            Memori Proyek Workspace ({memories.filter(m => m.isActive && m.status === 'active').length})
          </span>
        </div>
        {canPersist && !isAdding && (
          <button
            type="button"
            onClick={() => setIsAdding(true)}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:text-emerald-300 dark:hover:bg-emerald-950"
          >
            <Plus className="h-3 w-3" />
            <span>Tambah</span>
          </button>
        )}
      </div>

      {/* Chapter Scope Filter Strip for Multi-turn Memory Per-Bab */}
      <div className="mb-2.5 flex items-center gap-1 overflow-x-auto no-scrollbar pb-1">
        {CHAPTER_SCOPES.map(scope => {
          const isSelected = filterScope === scope;
          return (
            <button
              key={scope}
              type="button"
              onClick={() => {
                setFilterScope(scope);
                onChangeChapterScope?.(scope);
              }}
              className={`px-2 py-0.5 rounded-md text-[10px] font-medium whitespace-nowrap transition-colors cursor-pointer ${
                isSelected
                  ? 'bg-emerald-600 text-white font-semibold'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
              }`}
            >
              {CHAPTER_SCOPE_LABELS[scope].shortLabel}
            </button>
          );
        })}
      </div>

      <p className="text-[11px] text-slate-500 mb-2">
        AI mengingat tujuan, keputusan, dan batasan per-bab maupun lintas-bab proyek ini. Data terenkripsi dan terisolasi.
      </p>

      {error && (
        <div className="mb-2 flex items-center gap-1.5 rounded-md bg-rose-50 p-2 text-[11px] text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Add Form */}
      {isAdding && (
        <form onSubmit={handleAdd} className="mb-3 rounded-lg border border-slate-200 bg-slate-50/50 p-2.5 dark:border-slate-700 dark:bg-slate-900/50">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <label className="text-[11px] font-medium text-slate-600 dark:text-slate-300">Kategori:</label>
            <select
              value={newCategory}
              onChange={e => setNewCategory(e.target.value as WorkspaceMemoryCategory)}
              className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs outline-none dark:border-slate-700 dark:bg-slate-950"
            >
              <option value="goal">Tujuan Proyek</option>
              <option value="decision">Keputusan Kunci</option>
              <option value="preference">Preferensi Format</option>
              <option value="constraint">Batasan Tugas</option>
              <option value="progress">Progres Penting</option>
            </select>
            <label className="text-[11px] font-medium text-slate-600 dark:text-slate-300 ml-1">Cakupan:</label>
            <select
              value={newChapterTag}
              onChange={e => setNewChapterTag(e.target.value as WorkspaceChapterScope)}
              aria-label="Cakupan Bab Memori"
              className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs outline-none dark:border-slate-700 dark:bg-slate-950"
            >
              {CHAPTER_SCOPES.map(s => (
                <option key={s} value={s}>{CHAPTER_SCOPE_LABELS[s].shortLabel}</option>
              ))}
            </select>
          </div>
          <textarea
            value={newContent}
            onChange={e => setNewContent(e.target.value.slice(0, 1000))}
            maxLength={1000}
            rows={2}
            placeholder="Contoh: Skripsi menggunakan format sitasi APA 7th dan fokus pada sampel N=120."
            className="w-full resize-y rounded-md border border-slate-200 bg-white p-2 text-xs outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-950"
          />
          <div className="mt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => { setIsAdding(false); setNewContent(''); }}
              className="rounded-md px-2 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSaving || !newContent.trim()}
              className="rounded-md bg-emerald-700 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
            >
              {isSaving ? 'Menyimpan…' : 'Simpan Memori'}
            </button>
          </div>
        </form>
      )}

      {/* Memory List */}
      {isLoading ? (
        <p className="text-[11px] text-slate-400 py-2 text-center">Memuat memori…</p>
      ) : filteredMemories.length === 0 ? (
        <p className="text-[11px] text-slate-400 py-1">Belum ada memori proyek tersimpan di cakupan ini.</p>
      ) : (
        <ul className="space-y-2 max-h-60 overflow-y-auto pr-1">
          {filteredMemories.map(mem => {
            const cat = CATEGORY_LABELS[mem.category] || CATEGORY_LABELS.decision;
            const isEditing = editingId === mem.id;
            const isStale = mem.status === 'superseded' || mem.status === 'obsolete';

            return (
              <li
                key={mem.id}
                className={`rounded-lg border p-2 text-xs transition-colors ${
                  !mem.isActive || isStale
                    ? 'border-slate-200/50 bg-slate-50/50 opacity-60 dark:border-slate-800/50 dark:bg-slate-900/40'
                    : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900'
                }`}
              >
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold ${cat.color}`}>
                    {cat.label}
                  </span>
                  {isStale && (
                    <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                      (Tergantikan)
                    </span>
                  )}
                  <div className="flex items-center gap-1 ml-auto">
                    <button
                      type="button"
                      onClick={() => handleToggleActive(mem)}
                      title={mem.isActive ? 'Nonaktifkan memori' : 'Aktifkan memori'}
                      className="text-[10px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      {mem.isActive ? 'Aktif' : 'Nonaktif'}
                    </button>
                    {!isEditing && (
                      <button
                        type="button"
                        onClick={() => { setEditingId(mem.id); setEditContent(mem.content); }}
                        title="Edit memori"
                        className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                      >
                        <Edit2 className="h-3 w-3" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDelete(mem.id)}
                      title="Hapus memori"
                      className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>

                {isEditing ? (
                  <div className="mt-1">
                    <textarea
                      value={editContent}
                      onChange={e => setEditContent(e.target.value)}
                      rows={2}
                      className="w-full resize-y rounded border border-slate-200 bg-white p-1.5 text-xs outline-none dark:border-slate-700 dark:bg-slate-950"
                    />
                    <div className="mt-1 flex justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="rounded px-2 py-0.5 text-[10px] text-slate-500 hover:bg-slate-100"
                      >
                        Batal
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSaveEdit(mem.id)}
                        className="rounded bg-emerald-700 px-2 py-0.5 text-[10px] text-white hover:bg-emerald-800"
                      >
                        Simpan
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-slate-700 dark:text-slate-200 text-[11px] leading-relaxed break-words">
                    {mem.content}
                  </p>
                )}

                {mem.provenance && (
                  <p className="mt-1 text-[10px] text-slate-400 italic">
                    Sumber: {mem.provenance}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
