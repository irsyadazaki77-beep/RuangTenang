import React, { useEffect, useState } from 'react';
import { FileText, Pencil, Save } from 'lucide-react';
import type { ResearchSource, ResearchSourceMetadata } from '../../../../shared/contracts/files';
import { WorkspaceApiService } from '../services/workspaceApiService';

export function WorkspaceSourceLibrary({ chatId, onPreview }: { chatId?: string; onPreview: (sourceId: string) => void }) {
  const [sources, setSources] = useState<ResearchSource[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<ResearchSourceMetadata | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!chatId) { setSources([]); return; }
    const controller = new AbortController();
    void WorkspaceApiService.fetchResearchSources(chatId, controller.signal).then(setSources).catch(reason => { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : 'Sumber gagal dimuat.'); });
    return () => controller.abort();
  }, [chatId]);
  const beginEdit = (source: ResearchSource) => {
    setEditingId(source.id);
    setDraft({ title: source.title, ...(source.author ? { author: source.author } : {}), ...(source.year ? { year: source.year } : {}), ...(source.doi ? { doi: source.doi } : {}), ...(source.url ? { url: source.url } : {}) });
  };
  const save = async (source: ResearchSource) => {
    if (!chatId || !draft) return;
    try { const saved = await WorkspaceApiService.updateResearchSource(chatId, source.id, draft); setSources(current => current.map(item => item.id === source.id ? saved : item)); setEditingId(null); setDraft(null); setError(null); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Metadata sumber gagal disimpan.'); }
  };
  if (!chatId) return <p className="py-8 text-center text-xs text-slate-500">Sumber tersedia setelah Workspace tersimpan.</p>;
  if (!sources.length) return <p className="py-8 text-center text-xs text-slate-500">Belum ada sumber dokumen siap di Workspace ini.</p>;
  return <div className="space-y-2 py-2">
    {error && <p role="alert" className="px-1 text-xs text-rose-600">{error}</p>}
    {sources.map(source => <article key={source.id} className="rounded-lg border border-slate-200 p-2.5 dark:border-slate-800">
      <div className="flex items-start gap-2"><FileText className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" /><div className="min-w-0 flex-1"><button type="button" onClick={() => onPreview(source.id)} className="block max-w-full truncate text-left text-xs font-semibold text-slate-800 hover:text-emerald-700 dark:text-slate-100">{source.title}</button><p className="mt-0.5 truncate text-[10px] text-slate-500">{source.fileName}{source.pageCount ? ` · ${source.pageCount} halaman` : ''}</p><p className="mt-1 text-[10px] text-slate-500">{source.metadataConfidence === 'user_provided' ? 'Metadata dari pengguna' : 'Metadata belum diketahui'}{source.author ? ` · ${source.author}` : ''}{source.year ? ` · ${source.year}` : ''}</p>{source.doi && <p className="mt-1 break-all text-[10px] text-amber-700 dark:text-amber-300">DOI belum diverifikasi: {source.doi}</p>}</div><button type="button" aria-label={`Edit metadata ${source.title}`} onClick={() => editingId === source.id ? setEditingId(null) : beginEdit(source)} className="rounded p-1 text-slate-400 hover:text-emerald-700"><Pencil className="h-3.5 w-3.5" /></button></div>
      {editingId === source.id && draft && <div className="mt-2 grid gap-2 border-t border-slate-100 pt-2 dark:border-slate-800">
        <input aria-label="Judul sumber" value={draft.title} maxLength={240} onChange={event => setDraft({ ...draft, title: event.target.value })} placeholder="Judul" className="h-8 rounded border border-slate-200 bg-transparent px-2 text-xs dark:border-slate-700" />
        <input aria-label="Penulis sumber" value={draft.author || ''} maxLength={240} onChange={event => setDraft({ ...draft, author: event.target.value || undefined })} placeholder="Penulis (opsional)" className="h-8 rounded border border-slate-200 bg-transparent px-2 text-xs dark:border-slate-700" />
        <input aria-label="Tahun sumber" type="number" min={1000} max={2200} value={draft.year || ''} onChange={event => setDraft({ ...draft, year: event.target.value ? Number(event.target.value) : undefined })} placeholder="Tahun" className="h-8 rounded border border-slate-200 bg-transparent px-2 text-xs dark:border-slate-700" />
        <input aria-label="DOI sumber" value={draft.doi || ''} maxLength={300} onChange={event => setDraft({ ...draft, doi: event.target.value || undefined })} placeholder="DOI (format diperiksa, tidak diverifikasi eksternal)" className="h-8 rounded border border-slate-200 bg-transparent px-2 text-xs dark:border-slate-700" />
        <input aria-label="URL sumber" value={draft.url || ''} maxLength={1000} onChange={event => setDraft({ ...draft, url: event.target.value || undefined })} placeholder="URL HTTPS (opsional)" className="h-8 rounded border border-slate-200 bg-transparent px-2 text-xs dark:border-slate-700" />
        <button type="button" onClick={() => void save(source)} className="inline-flex h-8 items-center justify-center gap-1 rounded bg-emerald-700 px-2 text-xs font-semibold text-white"><Save className="h-3 w-3" />Simpan metadata</button>
      </div>}
    </article>)}
  </div>;
}
